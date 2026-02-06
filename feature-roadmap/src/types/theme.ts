// Theme type definitions

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  error: string;
  border: string;
  hover: string;
  icon: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFamily: string;
  baseFontSize: string;
  headingWeight: string;
}

export interface ThemeSpacing {
  borderRadius: string;
  cardPadding: string;
  gap: string;
}

export interface ThemeLogos {
  main: string | null;
  favicon: string | null;
  brandName: string;
  showBrandName: boolean;
}

export interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  logos: ThemeLogos;
}

// Deep partial type for nested updates
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface ThemeContextType {
  theme: Theme;
  updateTheme: (updates: DeepPartial<Theme>) => void;
  resetTheme: () => void;
  loadTheme: (theme: Theme) => void;
  applyPreset: (presetName: 'light' | 'dark') => void;
  exportTheme: () => void;
  importTheme: (file: File) => Promise<Theme>;
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  customerValue?: number; // Value from CRM (e.g., ARR, deal size, tier score)
  company?: string;
  crmId?: string; // ID in external CRM system
}

// Suggestion types
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'Under Review' | 'Planned' | 'In Progress' | 'Done';
  sprint: string | null;
  votes: number;
  votedBy: string[];
  createdBy: string;
  createdAt: string;
  requirements?: string;
  jiraSynced?: boolean;
  jiraSyncedAt?: string;
}
