import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import defaultTheme from '../theme/defaultTheme';
import { lightPreset, darkPreset } from '../theme/presets';
import { Theme, ThemeContextType, DeepPartial } from '../types/theme';
import { fetchPlatformBranding } from '../api';

const THEME_STORAGE_KEY = 'app_theme';

const ThemeContext = createContext<ThemeContextType | null>(null);

// Update favicon dynamically
function updateFavicon(faviconUrl: string | null): void {
  const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

  if (faviconUrl) {
    if (existingLink) {
      existingLink.href = faviconUrl;
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }
}

// Inject CSS variables into :root
function applyThemeToDOM(theme: Theme): void {
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
function loadGoogleFont(fontName: string): void {
  if (!fontName || fontName === 'system-ui') return;

  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Deep merge saved theme with defaults to ensure new properties are included
function mergeWithDefaults(saved: Partial<Theme>): Theme {
  return {
    colors: { ...defaultTheme.colors, ...saved.colors },
    typography: { ...defaultTheme.typography, ...saved.typography },
    spacing: { ...defaultTheme.spacing, ...saved.spacing },
    logos: { ...defaultTheme.logos, ...saved.logos },
  };
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Theme>;
        // Merge with defaults to include any new properties
        return mergeWithDefaults(parsed);
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
      }
    }
    return defaultTheme;
  });

  // Load platform branding as defaults (org-level localStorage overrides take priority)
  useEffect(() => {
    fetchPlatformBranding()
      .then((branding) => {
        setTheme((prev) => {
          const logos = { ...prev.logos };
          if (!logos.main && branding.logo) logos.main = branding.logo;
          if (!logos.favicon && branding.favicon) logos.favicon = branding.favicon;
          if (logos.brandName === defaultTheme.logos.brandName && branding.brandName) {
            logos.brandName = branding.brandName;
          }
          return { ...prev, logos };
        });
      })
      .catch(() => {
        // Platform branding not available — use defaults
      });
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(theme);
    updateFavicon(theme.logos.favicon);
    document.title = theme.logos.brandName;
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const updateTheme = useCallback((updates: DeepPartial<Theme>) => {
    setTheme((prev) => {
      const newTheme = { ...prev };
      (Object.keys(updates) as Array<keyof Theme>).forEach((section) => {
        const update = updates[section];
        if (typeof update === 'object' && update !== null) {
          (newTheme[section] as object) = { ...prev[section], ...update };
        }
      });
      return newTheme;
    });
  }, []);

  const resetTheme = useCallback(() => {
    // Reset to defaults, then re-apply platform branding
    setTheme(defaultTheme);
    fetchPlatformBranding()
      .then((branding) => {
        setTheme((prev) => {
          const logos = { ...prev.logos };
          if (branding.logo) logos.main = branding.logo;
          if (branding.favicon) logos.favicon = branding.favicon;
          if (branding.brandName) logos.brandName = branding.brandName;
          return { ...prev, logos };
        });
      })
      .catch(() => {});
  }, []);

  const loadTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const applyPreset = useCallback((presetName: 'light' | 'dark') => {
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

  const importTheme = useCallback((file: File): Promise<Theme> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as Theme;
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

  const value: ThemeContextType = {
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

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
