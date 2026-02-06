import { User, Suggestion } from './types/theme';
import { IntegrationConfig, SuggestionPush } from './types/integrations';
import { EmbedConfig, DEFAULT_EMBED_CONFIG } from './types/embed';

// localStorage helper functions

const KEYS = {
  USERS: 'users',
  SUGGESTIONS: 'suggestions',
  CATEGORIES: 'categories',
  INTEGRATIONS: 'integrations',
  PUSH_HISTORY: 'pushHistory',
  EMBED_CONFIG: 'embedConfig',
} as const;

// Generic get/set helpers
export function getData<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? (JSON.parse(data) as T) : null;
}

export function setData<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export function getUsers(): User[] {
  return getData<User[]>(KEYS.USERS) || [];
}

// Suggestions
export function getSuggestions(): Suggestion[] {
  return getData<Suggestion[]>(KEYS.SUGGESTIONS) || [];
}

function setSuggestions(suggestions: Suggestion[]): void {
  setData(KEYS.SUGGESTIONS, suggestions);
}

export function addSuggestion(suggestion: Suggestion): Suggestion[] {
  const suggestions = getSuggestions();
  suggestions.unshift(suggestion);
  setSuggestions(suggestions);
  return suggestions;
}

export function updateSuggestion(suggestionId: string, updates: Partial<Suggestion>): Suggestion[] {
  const suggestions = getSuggestions();
  const index = suggestions.findIndex(s => s.id === suggestionId);
  if (index !== -1) {
    suggestions[index] = { ...suggestions[index], ...updates };
    setSuggestions(suggestions);
  }
  return suggestions;
}

// Categories
export function getCategories(): string[] {
  return getData<string[]>(KEYS.CATEGORIES) || [];
}

export function setCategories(categories: string[]): void {
  setData(KEYS.CATEGORIES, categories);
}

export function addCategory(category: string): string[] {
  const categories = getCategories();
  if (!categories.includes(category)) {
    categories.push(category);
    setCategories(categories);
  }
  return categories;
}

export function deleteCategory(category: string): string[] {
  const categories = getCategories().filter(c => c !== category);
  setCategories(categories);
  return categories;
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Integrations
export function getIntegrations(): IntegrationConfig[] {
  return getData<IntegrationConfig[]>(KEYS.INTEGRATIONS) || [];
}

export function setIntegrations(integrations: IntegrationConfig[]): void {
  setData(KEYS.INTEGRATIONS, integrations);
}

export function addIntegration(integration: IntegrationConfig): IntegrationConfig[] {
  const integrations = getIntegrations();
  integrations.push(integration);
  setIntegrations(integrations);
  return integrations;
}

export function updateIntegration(integrationId: string, updates: Partial<IntegrationConfig>): IntegrationConfig[] {
  const integrations = getIntegrations();
  const index = integrations.findIndex(i => i.id === integrationId);
  if (index !== -1) {
    integrations[index] = { ...integrations[index], ...updates } as IntegrationConfig;
    setIntegrations(integrations);
  }
  return integrations;
}

export function deleteIntegration(integrationId: string): IntegrationConfig[] {
  const integrations = getIntegrations().filter(i => i.id !== integrationId);
  setIntegrations(integrations);
  return integrations;
}

// Push History
export function getPushHistory(): SuggestionPush[] {
  return getData<SuggestionPush[]>(KEYS.PUSH_HISTORY) || [];
}

export function addPushRecord(record: SuggestionPush): SuggestionPush[] {
  const history = getPushHistory();
  history.push(record);
  setData(KEYS.PUSH_HISTORY, history);
  return history;
}

export function getPushesForSuggestion(suggestionId: string): SuggestionPush[] {
  return getPushHistory().filter(p => p.suggestionId === suggestionId);
}

// Embed Config
export function getEmbedConfig(): EmbedConfig {
  return getData<EmbedConfig>(KEYS.EMBED_CONFIG) || DEFAULT_EMBED_CONFIG;
}

export function setEmbedConfig(config: EmbedConfig): void {
  setData(KEYS.EMBED_CONFIG, config);
}

export function updateEmbedConfig(updates: Partial<EmbedConfig>): EmbedConfig {
  const config = getEmbedConfig();
  const updated = { ...config, ...updates };
  setEmbedConfig(updated);
  return updated;
}

// Get user by ID
export function getUserById(userId: string): User | undefined {
  return getUsers().find(u => u.id === userId);
}

// Format currency for display
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}
