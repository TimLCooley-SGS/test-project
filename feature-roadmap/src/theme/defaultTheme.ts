import { Theme } from '../types/theme';

// Default theme schema and values
const defaultTheme: Theme = {
  colors: {
    primary: '#4a90d9',
    secondary: '#667eea',
    background: '#f5f7fa',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    accent: '#10b981',
    error: '#ef4444',
    border: '#e1e5eb',
    hover: '#f0f2f5',
  },
  typography: {
    fontFamily: 'Inter',
    headingFamily: 'Inter',
    baseFontSize: '16px',
    headingWeight: '600',
  },
  spacing: {
    borderRadius: '8px',
    cardPadding: '20px',
    gap: '16px',
  },
  logos: {
    main: null,
    favicon: null,
    brandName: 'Feature Roadmap',
    showBrandName: true,
  },
};

export default defaultTheme;
