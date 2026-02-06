import React, { useState } from 'react';
import { useIntegrations } from '../../context/IntegrationsContext';
import {
  IntegrationConfig,
  IntegrationType,
  IntegrationCategory,
} from '../../types/integrations';
import {
  INTEGRATION_CATEGORIES,
  getIntegrationsByCategory,
  getIntegrationMeta,
} from '../../integrations/presets';
import Icon, { IconName } from '../../components/Icon';
import './Integrations.css';

type ViewMode = 'configured' | 'add';

interface FormData {
  [key: string]: string;
}

function Integrations(): React.ReactElement {
  const {
    integrations,
    addIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegration,
    testConnection,
  } = useIntegrations();

  const [viewMode, setViewMode] = useState<ViewMode>('configured');
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const integrationsByCategory = getIntegrationsByCategory();

  const handleSelectType = (type: IntegrationType): void => {
    setSelectedType(type);
    setFormData({ name: getIntegrationMeta(type)?.name || '' });
    setTestResult(null);
    setEditingId(null);
  };

  const handleEdit = (integration: IntegrationConfig): void => {
    setSelectedType(integration.type);
    setEditingId(integration.id);
    // Extract form data from integration config
    const data: FormData = { name: integration.name };
    const meta = getIntegrationMeta(integration.type);
    if (meta) {
      meta.fields.forEach((field) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data[field.key] = (integration as any)[field.key] as string || '';
      });
    }
    setFormData(data);
    setViewMode('add');
    setTestResult(null);
  };

  const handleCancel = (): void => {
    setSelectedType(null);
    setFormData({});
    setEditingId(null);
    setTestResult(null);
    setViewMode('configured');
  };

  const handleFieldChange = (key: string, value: string): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleTestConnection = async (): Promise<void> => {
    if (!selectedType) return;

    const meta = getIntegrationMeta(selectedType);
    if (!meta) return;

    setTestLoading(true);
    setTestResult(null);

    const config = {
      id: editingId || 'test',
      type: selectedType,
      name: formData.name || meta.name,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...meta.fields.reduce((acc, field) => {
        acc[field.key] = formData[field.key] || '';
        return acc;
      }, {} as Record<string, string>),
    } as IntegrationConfig;

    const result = await testConnection(config);
    setTestResult(result);
    setTestLoading(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedType) return;

    const meta = getIntegrationMeta(selectedType);
    if (!meta) return;

    setSaving(true);

    const configData = {
      type: selectedType,
      name: formData.name || meta.name,
      enabled: true,
      ...meta.fields.reduce((acc, field) => {
        acc[field.key] = formData[field.key] || '';
        return acc;
      }, {} as Record<string, string>),
    };

    if (editingId) {
      updateIntegration(editingId, configData);
    } else {
      addIntegration(configData as Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>);
    }

    setSaving(false);
    handleCancel();
  };

  const handleDelete = (id: string): void => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      deleteIntegration(id);
    }
  };

  const isFormValid = (): boolean => {
    if (!selectedType) return false;
    const meta = getIntegrationMeta(selectedType);
    if (!meta) return false;

    return meta.fields.every((field) => !field.required || formData[field.key]?.trim());
  };

  const selectedMeta = selectedType ? getIntegrationMeta(selectedType) : null;

  return (
    <div className="integrations-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Integrations</h1>
          <p>Connect to external product management tools</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'configured' ? 'active' : ''}`}
              onClick={() => { setViewMode('configured'); handleCancel(); }}
            >
              Configured
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'add' ? 'active' : ''}`}
              onClick={() => setViewMode('add')}
            >
              Add New
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'configured' && (
        <>
          {integrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="link" size={48} /></div>
              <h3>No integrations configured</h3>
              <p>Add an integration to push suggestions to external tools</p>
              <button className="form-btn primary" onClick={() => setViewMode('add')}>
                Add Integration
              </button>
            </div>
          ) : (
            <div className="integrations-list">
              {integrations.map((integration) => {
                const meta = getIntegrationMeta(integration.type);
                return (
                  <div key={integration.id} className="integration-item">
                    <div className="integration-icon"><Icon name={(meta?.icon || 'link') as IconName} size={24} /></div>
                    <div className="integration-info">
                      <div className="integration-name">{integration.name}</div>
                      <div className="integration-type">{meta?.name || integration.type}</div>
                    </div>
                    <span className={`integration-status ${integration.enabled ? 'enabled' : 'disabled'}`}>
                      {integration.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <div className="integration-actions">
                      <button
                        className="action-btn"
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        {integration.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleEdit(integration)}
                      >
                        Edit
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(integration.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {viewMode === 'add' && (
        <>
          {!selectedType ? (
            <div className="preset-picker">
              {(Object.entries(integrationsByCategory) as [IntegrationCategory, typeof integrationsByCategory[IntegrationCategory]][]).map(
                ([category, presets]) => (
                  <div key={category} className="preset-category">
                    <h3>{INTEGRATION_CATEGORIES[category]}</h3>
                    <div className="preset-grid">
                      {presets.map((preset) => (
                        <div
                          key={preset.type}
                          className={`preset-card ${selectedType === preset.type ? 'selected' : ''}`}
                          onClick={() => handleSelectType(preset.type)}
                        >
                          <div className="preset-card-icon"><Icon name={preset.icon as IconName} size={24} /></div>
                          <div className="preset-card-name">{preset.name}</div>
                          <div className="preset-card-desc">{preset.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="config-form">
              <h3>
                <span><Icon name={(selectedMeta?.icon || 'link') as IconName} size={20} /></span>
                {editingId ? 'Edit' : 'Configure'} {selectedMeta?.name}
              </h3>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder={`My ${selectedMeta?.name || 'Integration'}`}
                />
              </div>

              {selectedMeta?.fields.map((field) => (
                <div key={field.key} className="form-group">
                  <label>
                    {field.label}
                    {field.required && <span style={{ color: 'var(--color-error)' }}> *</span>}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  <Icon name={testResult.success ? 'check' : 'x'} size={14} /> {testResult.message}
                </div>
              )}

              {testLoading && (
                <div className="test-result loading">
                  Testing connection...
                </div>
              )}

              <div className="form-actions">
                <button className="form-btn secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  className="form-btn test"
                  onClick={handleTestConnection}
                  disabled={!isFormValid() || testLoading}
                >
                  Test Connection
                </button>
                <button
                  className="form-btn primary"
                  onClick={handleSave}
                  disabled={!isFormValid() || saving}
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Integrations;
