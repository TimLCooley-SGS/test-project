import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import defaultTheme from '../theme/defaultTheme';
import { lightPreset, darkPreset } from '../theme/presets';

const THEME_STORAGE_KEY = 'app_theme';

const ThemeContext = createContext(null);

// Inject CSS variables into :root
function applyThemeToDOM(theme) {
  const root = document.documentElement;

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Typography
  root.style.setProperty('--font-family', theme.typography.fontFamily);
  root.style.setProperty('--font-heading', theme.typography.headingFamily);
  root.style.setProperty('--font-size-base', theme.typography.baseFontSize);
  root.style.setProperty('--font-weight-heading', theme.typography.headingWeight);

  // Spacing
  root.style.setProperty('--border-radius', theme.spacing.borderRadius);
  root.style.setProperty('--card-padding', theme.spacing.cardPadding);
  root.style.setProperty('--gap', theme.spacing.gap);

  // Load Google Font if specified
  const fontFamily = theme.typography.fontFamily;
  const headingFamily = theme.typography.headingFamily;
  loadGoogleFont(fontFamily);
  if (headingFamily !== fontFamily) {
    loadGoogleFont(headingFamily);
  }
}

// Load Google Font dynamically
function loadGoogleFont(fontName) {
  if (!fontName || fontName === 'system-ui') return;

  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
      }
    }
    return defaultTheme;
  });

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(theme);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const updateTheme = useCallback((updates) => {
    setTheme((prev) => {
      const newTheme = { ...prev };
      Object.keys(updates).forEach((section) => {
        if (typeof updates[section] === 'object' && updates[section] !== null) {
          newTheme[section] = { ...prev[section], ...updates[section] };
        } else {
          newTheme[section] = updates[section];
        }
      });
      return newTheme;
    });
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(defaultTheme);
  }, []);

  const loadTheme = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  const applyPreset = useCallback((presetName) => {
    if (presetName === 'light') {
      setTheme((prev) => ({ ...lightPreset, logos: prev.logos }));
    } else if (presetName === 'dark') {
      setTheme((prev) => ({ ...darkPreset, logos: prev.logos }));
    }
  }, []);

  const exportTheme = useCallback(() => {
    const dataStr = JSON.stringify(theme, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'theme.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [theme]);

  const importTheme = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          // Validate structure
          if (
            imported.colors &&
            imported.typography &&
            imported.spacing
          ) {
            setTheme(imported);
            resolve(imported);
          } else {
            reject(new Error('Invalid theme structure'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  const value = {
    theme,
    updateTheme,
    resetTheme,
    loadTheme,
    applyPreset,
    exportTheme,
    importTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
