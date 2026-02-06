// Embed configuration types

export type EmbedView = 'suggestions' | 'roadmap' | 'both';

export interface EmbedConfig {
  enabled: boolean;
  allowedViews: EmbedView[];
  defaultView: EmbedView;
  showHeader: boolean;
  showVoting: boolean;
  showFilters: boolean;
  allowSubmissions: boolean;
  customCss: string;
  allowedDomains: string[]; // Empty array means all domains allowed
  height: string;
  width: string;
}

export const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  enabled: false,
  allowedViews: ['suggestions', 'roadmap'],
  defaultView: 'suggestions',
  showHeader: true,
  showVoting: true,
  showFilters: true,
  allowSubmissions: false,
  customCss: '',
  allowedDomains: [],
  height: '600px',
  width: '100%',
};
