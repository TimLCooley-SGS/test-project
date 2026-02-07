import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchEmbedConfig, fetchEmbedSuggestions, fetchEmbedCategories, embedVote, embedCreateSuggestion, fetchPlatformBranding } from '../api';
import { generateFingerprint } from '../utils/fingerprint';
import { Category } from '../types/theme';
import { EmbedView as EmbedViewType } from '../types/embed';
import Icon from '../components/Icon';
import './EmbedView.css';

const statusColors: Record<string, string> = {
  under_review: '#f59e0b',
  planned: '#3b82f6',
  in_progress: '#8b5cf6',
  done: '#10b981',
};

const statusLabels: Record<string, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
};

interface EmbedSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string | null;
  status: string;
  sprint: string | null;
  votes: number;
  createdAt: string;
  hasVoted: boolean;
}

function EmbedView(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug');

  const [suggestions, setSuggestions] = useState<EmbedSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('Feature Roadmap');
  const [activeView, setActiveView] = useState<EmbedViewType>('suggestions');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Derive display flags from config with URL param overrides
  const showHeader = config ? (searchParams.get('header') !== null ? searchParams.get('header') !== 'false' : config.showHeader) : true;
  const showVoting = config ? (searchParams.get('voting') !== null ? searchParams.get('voting') !== 'false' : config.showVoting) : true;
  const showFilters = config ? (searchParams.get('filters') !== null ? searchParams.get('filters') !== 'false' : config.showFilters) : true;
  const allowSubmit = config ? (searchParams.get('submit') !== null ? searchParams.get('submit') === 'true' : config.allowSubmissions) : false;
  const customCssEnabled = searchParams.get('css') === 'custom';

  // Fetch platform brand name
  useEffect(() => {
    fetchPlatformBranding()
      .then((branding) => {
        if (branding.brandName) {
          setBrandName(branding.brandName);
        }
      })
      .catch(() => {});
  }, []);

  // Load data on mount
  useEffect(() => {
    if (!slug) {
      setError('Missing slug parameter. Please provide ?slug=your-org-slug');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        const fp = await generateFingerprint();
        if (cancelled) return;
        setFingerprint(fp);

        const s = slug!;
        const [configData, suggestionsData, categoriesData] = await Promise.all([
          fetchEmbedConfig(s),
          fetchEmbedSuggestions(s, fp),
          fetchEmbedCategories(s),
        ]);

        if (cancelled) return;
        setConfig(configData);
        setSuggestions(suggestionsData);
        setCategories(categoriesData);

        // Set initial view from config or URL param
        const viewParam = searchParams.get('view') as EmbedViewType;
        setActiveView(viewParam || configData.defaultView || 'suggestions');
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load embed data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [slug, searchParams]);

  // Inject custom CSS if enabled
  useEffect(() => {
    if (customCssEnabled && config?.customCss) {
      const style = document.createElement('style');
      style.id = 'embed-custom-css';
      style.textContent = config.customCss;
      document.head.appendChild(style);

      return () => {
        const existing = document.getElementById('embed-custom-css');
        if (existing) existing.remove();
      };
    }
  }, [customCssEnabled, config?.customCss]);

  const handleVote = useCallback(async (suggestionId: string) => {
    if (!showVoting || !slug || !fingerprint) return;

    // Optimistic update
    setSuggestions(prev => prev.map(s => {
      if (s.id !== suggestionId) return s;
      return {
        ...s,
        hasVoted: !s.hasVoted,
        votes: s.hasVoted ? Math.max(0, s.votes - 1) : s.votes + 1,
      };
    }));

    try {
      await embedVote(slug, suggestionId, fingerprint);
    } catch {
      // Revert on error
      setSuggestions(prev => prev.map(s => {
        if (s.id !== suggestionId) return s;
        return {
          ...s,
          hasVoted: !s.hasVoted,
          votes: s.hasVoted ? Math.max(0, s.votes - 1) : s.votes + 1,
        };
      }));
    }
  }, [showVoting, slug, fingerprint]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !slug) return;

    try {
      const created = await embedCreateSuggestion(slug, newTitle, newDescription, newCategory || undefined);
      setSuggestions(prev => [created, ...prev]);
      setShowForm(false);
      setNewTitle('');
      setNewDescription('');
      setNewCategory('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit suggestion');
    }
  }, [slug, newTitle, newDescription, newCategory]);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions
      .filter(s => filterCategory === 'all' || s.category === filterCategory)
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .sort((a, b) => b.votes - a.votes);
  }, [suggestions, filterCategory, filterStatus]);

  // Group by month for roadmap view
  const roadmapMonths = useMemo(() => {
    const scheduled = suggestions.filter(s => s.sprint && ['planned', 'in_progress', 'done'].includes(s.status));
    const grouped: Record<string, EmbedSuggestion[]> = {};

    scheduled.forEach(s => {
      const month = s.sprint!;
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(s);
    });

    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedMonths.map(month => ({
      month,
      items: grouped[month].sort((a, b) => b.votes - a.votes),
    }));
  }, [suggestions]);

  const statuses = ['under_review', 'planned', 'in_progress', 'done'];

  if (loading) {
    return <div className="embed-view" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div className="embed-view" style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="embed-view">
      {showHeader && (
        <div className="embed-header">
          <h1>{activeView === 'roadmap' ? 'Product Roadmap' : 'Feature Suggestions'}</h1>
          <p>
            {activeView === 'roadmap'
              ? 'See what we\'re working on and what\'s coming next'
              : 'Vote on features you\'d like to see'}
          </p>
        </div>
      )}

      {config && config.allowedViews.length > 1 && !config.allowedViews.includes('both') && (
        <div className="embed-tabs">
          {config.allowedViews.includes('suggestions') && (
            <button
              className={`embed-tab ${activeView === 'suggestions' ? 'active' : ''}`}
              onClick={() => setActiveView('suggestions')}
            >
              Suggestions
            </button>
          )}
          {config.allowedViews.includes('roadmap') && (
            <button
              className={`embed-tab ${activeView === 'roadmap' ? 'active' : ''}`}
              onClick={() => setActiveView('roadmap')}
            >
              Roadmap
            </button>
          )}
        </div>
      )}

      {activeView === 'suggestions' && (
        <>
          {showFilters && (
            <div className="embed-filters">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </div>
          )}

          {showForm && allowSubmit && (
            <form onSubmit={handleSubmit} className="embed-suggestion-card" style={{ marginBottom: '12px' }}>
              <div className="embed-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Suggestion title..."
                  style={{
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.95rem',
                  }}
                  required
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your suggestion..."
                  rows={3}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button type="submit" style={{
                    padding: '10px 20px',
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    color: 'white',
                    cursor: 'pointer',
                  }}>
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="embed-suggestions">
            {filteredSuggestions.length === 0 ? (
              <div className="embed-empty">
                <span className="embed-empty-icon"><Icon name="lightbulb" size={48} /></span>
                <p>No suggestions yet</p>
              </div>
            ) : (
              filteredSuggestions.map(suggestion => (
                <div key={suggestion.id} className="embed-suggestion-card">
                  <div className="embed-vote">
                    <button
                      className={`embed-vote-btn ${suggestion.hasVoted ? 'voted' : ''} ${!showVoting ? 'disabled' : ''}`}
                      onClick={() => handleVote(suggestion.id)}
                      disabled={!showVoting}
                      title={showVoting ? (suggestion.hasVoted ? 'Remove vote' : 'Upvote') : 'Voting disabled'}
                    >
                      <span className="embed-vote-arrow">&#9650;</span>
                      <span className="embed-vote-count">{suggestion.votes}</span>
                    </button>
                  </div>

                  <div className="embed-card-content">
                    <div className="embed-card-header">
                      <h3 className="embed-card-title">{suggestion.title}</h3>
                      <div className="embed-card-badges">
                        <span className="embed-badge category">{suggestion.category}</span>
                        <span
                          className="embed-badge status"
                          style={{ backgroundColor: statusColors[suggestion.status] }}
                        >
                          {statusLabels[suggestion.status] || suggestion.status}
                        </span>
                      </div>
                    </div>

                    <p className="embed-card-description">{suggestion.description}</p>

                    <span className="embed-card-date">
                      Added {new Date(suggestion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {allowSubmit && !showForm && (
            <button className="embed-submit-btn" onClick={() => setShowForm(true)}>
              + New Suggestion
            </button>
          )}
        </>
      )}

      {activeView === 'roadmap' && (
        <div className="embed-roadmap">
          {roadmapMonths.length === 0 ? (
            <div className="embed-empty">
              <span className="embed-empty-icon"><Icon name="map" size={48} /></span>
              <p>No scheduled items yet</p>
            </div>
          ) : (
            roadmapMonths.map(({ month, items }) => (
              <div key={month} className="embed-roadmap-month">
                <div className="embed-month-header">
                  <h3>{month}</h3>
                  <span className="embed-month-count">{items.length} items</span>
                </div>
                <div className="embed-month-items">
                  {items.map(item => (
                    <div key={item.id} className="embed-roadmap-item">
                      <span
                        className="embed-item-status"
                        style={{ backgroundColor: statusColors[item.status] }}
                      />
                      <span className="embed-item-title">{item.title}</span>
                      <span className="embed-item-votes">&#9650; {item.votes}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="embed-powered-by">
        Powered by <a href="/" target="_blank" rel="noopener noreferrer">{brandName}</a>
      </div>
    </div>
  );
}

export default EmbedView;
