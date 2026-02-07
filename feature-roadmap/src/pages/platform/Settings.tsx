import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../api';
import './Settings.css';

interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Settings(): React.ReactElement {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Email template editing
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [testMessage, setTestMessage] = useState('');

  // Branding state
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandFavicon, setBrandFavicon] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMessage, setBrandMessage] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [s, t] = await Promise.all([
        api.fetchPlatformSettings(),
        api.fetchEmailTemplates(),
      ]);
      setSettings(s);
      setTemplates(t);

      // Load branding values from settings
      const logoSetting = s.find((x: Setting) => x.key === 'platform_logo');
      const faviconSetting = s.find((x: Setting) => x.key === 'platform_favicon');
      const nameSetting = s.find((x: Setting) => x.key === 'platform_brand_name');
      if (logoSetting) setBrandLogo(logoSetting.value);
      if (faviconSetting) setBrandFavicon(faviconSetting.value);
      if (nameSetting) setBrandName(nameSetting.value);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveSetting = async (key: string, value: string, description?: string) => {
    try {
      const updated = await api.updatePlatformSetting(key, value, description);
      setSettings(prev => {
        const exists = prev.find(s => s.key === key);
        if (exists) {
          return prev.map(s => s.key === key ? updated : s);
        }
        return [...prev, updated];
      });
      setEditingKey(null);
      setNewKey('');
      setNewValue('');
      setNewDesc('');
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleStartEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleEditTemplate = (tpl: EmailTemplate) => {
    setEditingTemplate(tpl.id);
    setTplSubject(tpl.subject);
    setTplBody(tpl.html_body);
  };

  const handleSaveTemplate = async (id: string) => {
    try {
      const updated = await api.updateEmailTemplate(id, {
        subject: tplSubject,
        html_body: tplBody,
      });
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      setEditingTemplate(null);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleToggleTemplate = async (id: string, currentActive: boolean) => {
    try {
      const updated = await api.updateEmailTemplate(id, { is_active: !currentActive });
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      console.error('Failed to toggle template:', err);
    }
  };

  const handleSendTest = async (id: string) => {
    try {
      setTestMessage('Sending...');
      const result = await api.sendTestEmail(id);
      setTestMessage(result.message);
      setTimeout(() => setTestMessage(''), 4000);
    } catch (err: any) {
      setTestMessage(err.message || 'Failed to send');
      setTimeout(() => setTestMessage(''), 4000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 256, 256);
      setBrandLogo(resized);
    } catch (err) {
      console.error('Failed to resize logo:', err);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 64, 64);
      setBrandFavicon(resized);
    } catch (err) {
      console.error('Failed to resize favicon:', err);
    }
  };

  const handleSaveBranding = async () => {
    setBrandSaving(true);
    setBrandMessage('');
    try {
      await Promise.all([
        api.updatePlatformSetting('platform_logo', brandLogo || '', 'Platform logo (data URL)'),
        api.updatePlatformSetting('platform_favicon', brandFavicon || '', 'Platform favicon (data URL)'),
        api.updatePlatformSetting('platform_brand_name', brandName, 'Platform brand name'),
      ]);
      setBrandMessage('Branding saved successfully');
      setTimeout(() => setBrandMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save branding:', err);
      setBrandMessage('Failed to save branding');
      setTimeout(() => setBrandMessage(''), 3000);
    } finally {
      setBrandSaving(false);
    }
  };

  if (loading) return <div className="platform-page"><p>Loading...</p></div>;

  return (
    <div className="platform-page settings-page">
      <div className="page-header">
        <h1>Platform Settings</h1>
        <p>Configure platform-wide settings and email templates</p>
      </div>

      {/* Platform Branding Section */}
      <section className="settings-section">
        <h2>Platform Branding</h2>
        <p className="branding-subtitle">Set the default logo, favicon, and brand name for all users. Org admins can override these via the Theme editor.</p>
        {brandMessage && <div className="test-message">{brandMessage}</div>}
        <div className="branding-grid">
          <div className="branding-field">
            <label>Logo</label>
            <div className="branding-upload">
              {brandLogo ? (
                <div className="branding-preview">
                  <img src={brandLogo} alt="Platform logo" />
                  <button className="cancel-btn" onClick={() => { setBrandLogo(null); if (logoInputRef.current) logoInputRef.current.value = ''; }}>Remove</button>
                </div>
              ) : (
                <div className="branding-placeholder">No logo set</div>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="file-input" />
              <button className="edit-btn" onClick={() => logoInputRef.current?.click()}>Upload Logo</button>
            </div>
            <span className="branding-hint">Max 256px wide. Used in navbar and landing page.</span>
          </div>

          <div className="branding-field">
            <label>Favicon</label>
            <div className="branding-upload">
              {brandFavicon ? (
                <div className="branding-preview favicon-preview">
                  <img src={brandFavicon} alt="Platform favicon" />
                  <button className="cancel-btn" onClick={() => { setBrandFavicon(null); if (faviconInputRef.current) faviconInputRef.current.value = ''; }}>Remove</button>
                </div>
              ) : (
                <div className="branding-placeholder">No favicon set</div>
              )}
              <input ref={faviconInputRef} type="file" accept="image/*" onChange={handleFaviconUpload} className="file-input" />
              <button className="edit-btn" onClick={() => faviconInputRef.current?.click()}>Upload Favicon</button>
            </div>
            <span className="branding-hint">Resized to 64x64. Shown in browser tab.</span>
          </div>

          <div className="branding-field">
            <label>Brand Name</label>
            <input
              className="setting-input"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Feature Roadmap"
            />
            <span className="branding-hint">Displayed next to the logo in the navbar.</span>
          </div>
        </div>
        <div className="branding-actions">
          <button className="save-btn" onClick={handleSaveBranding} disabled={brandSaving}>
            {brandSaving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </section>

      {/* Settings Section */}
      <section className="settings-section">
        <h2>Settings</h2>
        <div className="settings-list">
          {settings.map(s => (
            <div key={s.key} className="setting-item">
              {editingKey === s.key ? (
                <>
                  <div className="setting-key">{s.key}</div>
                  <input
                    className="setting-input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <div className="setting-actions">
                    <button className="save-btn" onClick={() => handleSaveSetting(s.key, editValue, s.description || undefined)}>Save</button>
                    <button className="cancel-btn" onClick={() => setEditingKey(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="setting-key">{s.key}</div>
                  <div className="setting-value">{s.value}</div>
                  {s.description && <div className="setting-desc">{s.description}</div>}
                  <button className="edit-btn" onClick={() => handleStartEdit(s)}>Edit</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="add-setting">
          <h3>Add New Setting</h3>
          <div className="add-setting-form">
            <input placeholder="Key" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <input placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)} />
            <input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <button
              className="save-btn"
              disabled={!newKey || !newValue}
              onClick={() => handleSaveSetting(newKey, newValue, newDesc || undefined)}
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Email Templates Section */}
      <section className="settings-section">
        <h2>Email Templates</h2>
        {testMessage && <div className="test-message">{testMessage}</div>}
        {templates.length === 0 ? (
          <p className="empty-text">No email templates yet. Run the seed migration to add defaults.</p>
        ) : (
          templates.map(tpl => (
            <div key={tpl.id} className="template-card">
              <div className="template-header">
                <div>
                  <span className="template-name">{tpl.name}</span>
                  {tpl.description && <span className="template-desc"> — {tpl.description}</span>}
                </div>
                <div className="template-controls">
                  <button
                    className={`status-toggle ${tpl.is_active ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleTemplate(tpl.id, tpl.is_active)}
                  >
                    {tpl.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button className="test-btn" onClick={() => handleSendTest(tpl.id)}>Send Test</button>
                  {editingTemplate === tpl.id ? (
                    <>
                      <button className="save-btn" onClick={() => handleSaveTemplate(tpl.id)}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingTemplate(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="edit-btn" onClick={() => handleEditTemplate(tpl)}>Edit</button>
                  )}
                </div>
              </div>

              {editingTemplate === tpl.id ? (
                <div className="template-edit">
                  <label>Subject</label>
                  <input value={tplSubject} onChange={e => setTplSubject(e.target.value)} />
                  <label>HTML Body</label>
                  <textarea
                    value={tplBody}
                    onChange={e => setTplBody(e.target.value)}
                    rows={10}
                  />
                  <div className="template-preview">
                    <h4>Preview</h4>
                    <div
                      className="preview-frame"
                      dangerouslySetInnerHTML={{ __html: tplBody }}
                    />
                  </div>
                </div>
              ) : (
                <div className="template-summary">
                  <span className="template-subject">Subject: {tpl.subject}</span>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default Settings;
