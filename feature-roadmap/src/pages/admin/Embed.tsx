import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAdminEmbedConfig, updateAdminEmbedConfig } from '../../api';
import { EmbedConfig, EmbedView } from '../../types/embed';
import { DEFAULT_EMBED_CONFIG } from '../../types/embed';
import { User } from '../../types/theme';
import Icon from '../../components/Icon';
import './Embed.css';

type PreviewTab = 'preview' | 'code';

interface EmbedProps {
  user: User;
}

function Embed({ user }: EmbedProps): React.ReactElement {
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_EMBED_CONFIG);
  const [slug, setSlug] = useState<string>(user.organizationSlug || '');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('code');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  // Load config from API on mount
  useEffect(() => {
    fetchAdminEmbedConfig()
      .then(data => {
        setConfig({ ...DEFAULT_EMBED_CONFIG, ...data.config });
        setSlug(data.slug);
      })
      .catch(err => {
        console.error('Failed to load embed config:', err);
      })
      .finally(() => {
        setLoading(false);
        // Allow saves after initial load completes
        setTimeout(() => { initialLoadRef.current = false; }, 100);
      });
  }, []);

  // Debounced auto-save on config changes
  useEffect(() => {
    if (initialLoadRef.current || loading) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      updateAdminEmbedConfig(config).catch(err => {
        console.error('Failed to save embed config:', err);
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, loading]);

  const handleToggle = (key: keyof EmbedConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleViewToggle = (view: EmbedView) => {
    setConfig(prev => {
      const views = prev.allowedViews.includes(view)
        ? prev.allowedViews.filter(v => v !== view)
        : [...prev.allowedViews, view];

      // Ensure at least one view is selected
      if (views.length === 0) return prev;

      // Update default view if it's no longer allowed
      const defaultView = views.includes(prev.defaultView) ? prev.defaultView : views[0];

      return { ...prev, allowedViews: views, defaultView };
    });
  };

  const handleInputChange = (key: keyof EmbedConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const generateEmbedCode = useCallback((): string => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    params.set('slug', slug);
    params.set('view', config.defaultView);
    if (!config.showHeader) params.set('header', 'false');
    if (!config.showVoting) params.set('voting', 'false');
    if (!config.showFilters) params.set('filters', 'false');
    if (config.allowSubmissions) params.set('submit', 'true');
    if (config.customCss) params.set('css', 'custom');

    const embedUrl = `${baseUrl}/embed?${params.toString()}`;

    return `<iframe
  src="${embedUrl}"
  width="${config.width}"
  height="${config.height}"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="Feature Roadmap"
></iframe>`;
  }, [config, slug]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const viewLabels: Record<EmbedView, string> = {
    suggestions: 'Suggestions',
    roadmap: 'Roadmap',
    both: 'Both Views',
  };

  if (loading) {
    return <div className="embed-page" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="embed-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Embed Options</h1>
          <p>Configure how your roadmap can be embedded on external websites</p>
        </div>
        <div className={`status-badge ${config.enabled ? 'enabled' : 'disabled'}`}>
          <span className="status-dot"></span>
          {config.enabled ? 'Embed Enabled' : 'Embed Disabled'}
        </div>
      </div>

      <div className="embed-layout">
        <div className="embed-settings">
          {/* Enable/Disable */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="toggle-right" size={18} /></span> Embed Status</h3>
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label-text">Enable Embed</span>
                <span className="toggle-description">
                  Allow your roadmap to be embedded on external websites
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => handleToggle('enabled')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Views */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="eye" size={18} /></span> Allowed Views</h3>
            <div className="checkbox-group">
              {(['suggestions', 'roadmap', 'both'] as EmbedView[]).map(view => (
                <label key={view} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={config.allowedViews.includes(view)}
                    onChange={() => handleViewToggle(view)}
                  />
                  <span>{viewLabels[view]}</span>
                </label>
              ))}
            </div>

            <div className="select-row" style={{ marginTop: '16px' }}>
              <label>Default View</label>
              <select
                value={config.defaultView}
                onChange={(e) => handleInputChange('defaultView', e.target.value)}
              >
                {config.allowedViews.map(view => (
                  <option key={view} value={view}>{viewLabels[view]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Display Options */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="settings" size={18} /></span> Display Options</h3>
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label-text">Show Header</span>
                <span className="toggle-description">Display the page title and description</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.showHeader}
                  onChange={() => handleToggle('showHeader')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label-text">Show Voting</span>
                <span className="toggle-description">Allow users to vote on suggestions</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.showVoting}
                  onChange={() => handleToggle('showVoting')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label-text">Show Filters</span>
                <span className="toggle-description">Display category and status filters</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.showFilters}
                  onChange={() => handleToggle('showFilters')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label-text">Allow Submissions</span>
                <span className="toggle-description">Let visitors submit new suggestions</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.allowSubmissions}
                  onChange={() => handleToggle('allowSubmissions')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Size */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="settings" size={18} /></span> Embed Size</h3>
            <div className="size-inputs">
              <div className="size-input">
                <label>Width</label>
                <input
                  type="text"
                  value={config.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                  placeholder="100%"
                />
              </div>
              <div className="size-input">
                <label>Height</label>
                <input
                  type="text"
                  value={config.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="600px"
                />
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="palette" size={18} /></span> Custom CSS</h3>
            <div className="css-editor">
              <label>Custom Styles</label>
              <textarea
                value={config.customCss}
                onChange={(e) => handleInputChange('customCss', e.target.value)}
                placeholder={`/* Override embed styles */
.embed-container {
  /* Custom container styles */
}

.suggestion-card {
  /* Custom card styles */
}

/* Useful CSS variables you can override:
--color-primary: #3b82f6;
--color-background: #f9fafb;
--color-surface: #ffffff;
--color-text: #1f2937;
--color-border: #e5e7eb;
--border-radius: 8px;
*/`}
              />
              <p className="css-hint">
                Use custom CSS to match your website's branding. The embed runs in an iframe,
                so your site's CSS won't affect it. Add overrides here instead.
              </p>
            </div>
          </div>

          {/* Domain Restrictions */}
          <div className="settings-section">
            <h3><span className="section-icon"><Icon name="lock" size={18} /></span> Domain Restrictions</h3>
            <div className="domain-input">
              <label>Allowed Domains</label>
              <input
                type="text"
                value={config.allowedDomains.join(', ')}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  allowedDomains: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                }))}
                placeholder="example.com, app.example.com"
              />
              <p className="domain-hint">
                Leave empty to allow all domains. Separate multiple domains with commas.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="embed-preview">
          <div className="preview-header">
            <h3>Preview</h3>
            <div className="preview-tabs">
              <button
                className={`preview-tab ${previewTab === 'code' ? 'active' : ''}`}
                onClick={() => setPreviewTab('code')}
              >
                Code
              </button>
              <button
                className={`preview-tab ${previewTab === 'preview' ? 'active' : ''}`}
                onClick={() => setPreviewTab('preview')}
              >
                Live
              </button>
            </div>
          </div>

          <div className="preview-content">
            {!config.enabled ? (
              <div className="preview-disabled">
                <span className="preview-disabled-icon"><Icon name="lock" size={48} /></span>
                <p>Enable embed to see the preview and get your embed code</p>
              </div>
            ) : previewTab === 'preview' ? (
              <div className="preview-frame-container">
                <div className="preview-frame-header">
                  <span className="browser-dot red"></span>
                  <span className="browser-dot yellow"></span>
                  <span className="browser-dot green"></span>
                </div>
                <iframe
                  className="preview-frame"
                  src={`/embed?slug=${slug}&view=${config.defaultView}&preview=true`}
                  title="Embed Preview"
                />
              </div>
            ) : (
              <div className="code-block">
                <pre>{generateEmbedCode()}</pre>
                <button
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyCode}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {config.enabled && (
            <div className="embed-code-section">
              <h4><Icon name="copy" size={16} /> Quick Copy</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-textSecondary)', marginBottom: '12px' }}>
                Paste this code into your website's HTML where you want the roadmap to appear.
              </p>
              <div className="code-block">
                <pre>{generateEmbedCode()}</pre>
                <button
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyCode}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Embed;
