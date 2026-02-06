// Integration type definitions

export type IntegrationType = 'jira' | 'linear' | 'asana';

export type IntegrationCategory = 'product-management';

// Base configuration shared by all integrations
export interface BaseIntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: IntegrationType;
  createdAt: string;
  updatedAt: string;
}

// Jira-specific configuration
export interface JiraConfig extends BaseIntegrationConfig {
  type: 'jira';
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
}

// Linear-specific configuration
export interface LinearConfig extends BaseIntegrationConfig {
  type: 'linear';
  apiKey: string;
  teamId: string;
}

// Asana-specific configuration
export interface AsanaConfig extends BaseIntegrationConfig {
  type: 'asana';
  accessToken: string;
  workspaceGid: string;
  projectGid: string;
}

// Union type for all integration configurations
export type IntegrationConfig = JiraConfig | LinearConfig | AsanaConfig;

// Track when suggestions are pushed to external tools
export interface SuggestionPush {
  id: string;
  suggestionId: string;
  integrationId: string;
  integrationType: IntegrationType;
  externalId: string;
  externalUrl: string;
  pushedAt: string;
  pushedBy: string;
}

// Form field definition for dynamic form generation
export interface IntegrationFormField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email';
  placeholder: string;
  required: boolean;
}

// Preset metadata for UI display
export interface IntegrationMeta {
  type: IntegrationType;
  name: string;
  icon: string;
  description: string;
  category: IntegrationCategory;
  fields: IntegrationFormField[];
}

// Context type for integration management
export interface IntegrationsContextType {
  integrations: IntegrationConfig[];
  pushHistory: SuggestionPush[];
  addIntegration: (config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>) => IntegrationConfig;
  updateIntegration: (id: string, updates: Partial<IntegrationConfig>) => void;
  deleteIntegration: (id: string) => void;
  toggleIntegration: (id: string) => void;
  pushSuggestion: (suggestionId: string, integrationId: string, userId: string) => Promise<SuggestionPush>;
  getSuggestionPushes: (suggestionId: string) => SuggestionPush[];
  testConnection: (config: IntegrationConfig) => Promise<{ success: boolean; message: string }>;
}
