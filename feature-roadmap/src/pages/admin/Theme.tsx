import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors } from '../../types/theme';
import ColorPicker from '../../components/ColorPicker';
import FontPicker from '../../components/FontPicker';
import FileUpload from '../../components/FileUpload';
import './Theme.css';

const TABS = ['Colors', 'Typography', 'Logos', 'Spacing'] as const;
type Tab = typeof TABS[number];

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  textSecondary: 'Text Secondary',
  accent: 'Accent',
  error: 'Error',
  border: 'Border',
  hover: 'Hover',
};

function Theme(): React.ReactElement {
  const { theme, updateTheme, resetTheme, applyPreset, exportTheme, importTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Colors');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (key: keyof ThemeColors, value: string): void => {
    updateTheme({ colors: { [key]: value } });
  };

  const handleTypographyChange = (key: string, value: string): void => {
    updateTheme({ typography: { [key]: value } });
  };

  const handleSpacingChange = (key: string, value: string): void => {
    updateTheme({ spacing: { [key]: value } });
  };

  const handleLogoChange = (key: 'main' | 'favicon', value: string | null): void => {
    updateTheme({ logos: { [key]: value } });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importTheme(file);
        setImportError('');
      } catch (err) {
        setImportError('Invalid theme file: ' + (err as Error).message);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="theme-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Theme Editor</h1>
          <p>Customize the look and feel of your application</p>
        </div>
        <div className="header-actions">
          <button onClick={() => applyPreset('light')} className="preset-btn">
            Light
          </button>
          <button onClick={() => applyPreset('dark')} className="preset-btn">
            Dark
          </button>
          <button onClick={resetTheme} className="reset-btn">
            Reset
          </button>
        </div>
      </div>

      <div className="theme-layout">
        <div className="theme-editor">
          <div className="tab-bar">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'Colors' && (
              <div className="colors-tab">
                <div className="color-grid">
                  {(Object.entries(theme.colors) as [keyof ThemeColors, string][]).map(([key, value]) => (
                    <ColorPicker
                      key={key}
                      label={COLOR_LABELS[key]}
                      value={value}
                      onChange={(val) => handleColorChange(key, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Typography' && (
              <div className="typography-tab">
                <FontPicker
                  label="Body Font"
                  value={theme.typography.fontFamily}
                  onChange={(val) => handleTypographyChange('fontFamily', val)}
                />
                <FontPicker
                  label="Heading Font"
                  value={theme.typography.headingFamily}
                  onChange={(val) => handleTypographyChange('headingFamily', val)}
                />
                <div className="range-picker">
                  <label>Base Font Size: {theme.typography.baseFontSize}</label>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={parseInt(theme.typography.baseFontSize)}
                    onChange={(e) => handleTypographyChange('baseFontSize', `${e.target.value}px`)}
                  />
                </div>
                <div className="select-picker">
                  <label>Heading Weight</label>
                  <select
                    value={theme.typography.headingWeight}
                    onChange={(e) => handleTypographyChange('headingWeight', e.target.value)}
                  >
                    <option value="400">Normal (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi-Bold (600)</option>
                    <option value="700">Bold (700)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'Logos' && (
              <div className="logos-tab">
                <FileUpload
                  label="Main Logo"
                  value={theme.logos.main}
                  onChange={(val) => handleLogoChange('main', val)}
                />
                <FileUpload
                  label="Favicon"
                  value={theme.logos.favicon}
                  onChange={(val) => handleLogoChange('favicon', val)}
                />
              </div>
            )}

            {activeTab === 'Spacing' && (
              <div className="spacing-tab">
                <div className="range-picker">
                  <label>Border Radius: {theme.spacing.borderRadius}</label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={parseInt(theme.spacing.borderRadius)}
                    onChange={(e) => handleSpacingChange('borderRadius', `${e.target.value}px`)}
                  />
                </div>
                <div className="range-picker">
                  <label>Card Padding: {theme.spacing.cardPadding}</label>
                  <input
                    type="range"
                    min="8"
                    max="40"
                    value={parseInt(theme.spacing.cardPadding)}
                    onChange={(e) => handleSpacingChange('cardPadding', `${e.target.value}px`)}
                  />
                </div>
                <div className="range-picker">
                  <label>Gap: {theme.spacing.gap}</label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={parseInt(theme.spacing.gap)}
                    onChange={(e) => handleSpacingChange('gap', `${e.target.value}px`)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="editor-footer">
            <div className="import-export">
              <button onClick={exportTheme} className="export-btn">
                Export Theme
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="import-btn"
              >
                Import Theme
              </button>
            </div>
            {importError && <p className="error-message">{importError}</p>}
          </div>
        </div>

        <div className="theme-preview">
          <h3>Live Preview</h3>
          <div className="preview-card">
            <h4>Sample Card</h4>
            <p>This is how your content will look with the current theme settings.</p>
            <div className="preview-buttons">
              <button className="preview-btn primary">Primary</button>
              <button className="preview-btn secondary">Secondary</button>
            </div>
          </div>
          <div className="preview-form">
            <input type="text" placeholder="Sample input field" />
            <button className="preview-btn accent">Submit</button>
          </div>
          <div className="preview-badges">
            <span className="preview-badge primary">Primary</span>
            <span className="preview-badge accent">Accent</span>
            <span className="preview-badge error">Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Theme;
