import React, { useState, useEffect } from 'react';
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

  const loadData = async () => {
    try {
      const [s, t] = await Promise.all([
        api.fetchPlatformSettings(),
        api.fetchEmailTemplates(),
      ]);
      setSettings(s);
      setTemplates(t);
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

  if (loading) return <div className="platform-page"><p>Loading...</p></div>;

  return (
    <div className="platform-page settings-page">
      <div className="page-header">
        <h1>Platform Settings</h1>
        <p>Configure platform-wide settings and email templates</p>
      </div>

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
