import { User, Suggestion } from './types/theme';
import { IntegrationConfig, SuggestionPush } from './types/integrations';

// localStorage helper functions

const KEYS = {
  CURRENT_USER: 'currentUser',
  USERS: 'users',
  SUGGESTIONS: 'suggestions',
  CATEGORIES: 'categories',
  INTEGRATIONS: 'integrations',
  PUSH_HISTORY: 'pushHistory',
} as const;

// Default data for initialization
const defaultUsers: User[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
  { id: 'user1', name: 'Demo User', email: 'user@test.com', role: 'user' },
  { id: 'user2', name: 'Jane Smith', email: 'jane@test.com', role: 'user' },
];

const defaultCategories: string[] = ['UI', 'Performance', 'Mobile', 'Dashboard', 'API', 'Security'];

const defaultSuggestions: Suggestion[] = [
  // Current/Future items
  {
    id: '1',
    title: 'Dark mode',
    description: 'Add dark mode option for better night-time viewing',
    category: 'UI',
    status: 'Under Review',
    sprint: null,
    votes: 5,
    votedBy: ['user1', 'user2'],
    createdBy: 'admin1',
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    title: 'Mobile app',
    description: 'Create a native mobile application for iOS and Android',
    category: 'Mobile',
    status: 'Planned',
    sprint: 'March 2026',
    votes: 12,
    votedBy: ['admin1', 'user1', 'user2'],
    createdBy: 'user1',
    createdAt: '2026-01-20',
  },
  {
    id: '3',
    title: 'Faster loading times',
    description: 'Optimize database queries and implement caching',
    category: 'Performance',
    status: 'In Progress',
    sprint: 'February 2026',
    votes: 8,
    votedBy: ['user2'],
    createdBy: 'user2',
    createdAt: '2026-01-25',
  },
  // Past releases - January 2026
  {
    id: '4',
    title: 'User authentication',
    description: 'Implement secure login with OAuth 2.0 and multi-factor authentication',
    category: 'Security',
    status: 'Done',
    sprint: 'January 2026',
    votes: 15,
    votedBy: ['admin1', 'user1', 'user2'],
    createdBy: 'admin1',
    createdAt: '2025-11-10',
  },
  {
    id: '5',
    title: 'Dashboard redesign',
    description: 'Modern dashboard with customizable widgets and real-time data',
    category: 'Dashboard',
    status: 'Done',
    sprint: 'January 2026',
    votes: 9,
    votedBy: ['user1', 'user2'],
    createdBy: 'user1',
    createdAt: '2025-11-15',
  },
  {
    id: '6',
    title: 'API rate limiting',
    description: 'Implement rate limiting to prevent API abuse and ensure fair usage',
    category: 'API',
    status: 'Done',
    sprint: 'January 2026',
    votes: 7,
    votedBy: ['admin1'],
    createdBy: 'admin1',
    createdAt: '2025-12-01',
  },
  // Past releases - December 2025
  {
    id: '7',
    title: 'Export to CSV',
    description: 'Allow users to export their data to CSV format for reporting',
    category: 'Dashboard',
    status: 'Done',
    sprint: 'December 2025',
    votes: 11,
    votedBy: ['admin1', 'user1', 'user2'],
    createdBy: 'user2',
    createdAt: '2025-10-05',
  },
  {
    id: '8',
    title: 'Email notifications',
    description: 'Send email alerts for important updates and activity',
    category: 'UI',
    status: 'Done',
    sprint: 'December 2025',
    votes: 14,
    votedBy: ['admin1', 'user1', 'user2'],
    createdBy: 'user1',
    createdAt: '2025-10-12',
  },
  // Past releases - November 2025
  {
    id: '9',
    title: 'Search functionality',
    description: 'Add global search to quickly find content across the application',
    category: 'UI',
    status: 'Done',
    sprint: 'November 2025',
    votes: 18,
    votedBy: ['admin1', 'user1', 'user2'],
    createdBy: 'admin1',
    createdAt: '2025-09-01',
  },
  {
    id: '10',
    title: 'Performance monitoring',
    description: 'Integrate APM tools for real-time performance tracking',
    category: 'Performance',
    status: 'Done',
    sprint: 'November 2025',
    votes: 6,
    votedBy: ['admin1', 'user2'],
    createdBy: 'user2',
    createdAt: '2025-09-15',
  },
];

// Initialize data if not exists
export function initializeStorage(): void {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(defaultUsers));
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(defaultCategories));
  }
  if (!localStorage.getItem(KEYS.SUGGESTIONS)) {
    localStorage.setItem(KEYS.SUGGESTIONS, JSON.stringify(defaultSuggestions));
  }
}

// Generic get/set helpers
export function getData<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? (JSON.parse(data) as T) : null;
}

export function setData<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Current User
export function getCurrentUser(): User | null {
  return getData<User>(KEYS.CURRENT_USER);
}

export function setCurrentUser(user: User): void {
  setData(KEYS.CURRENT_USER, user);
}

export function clearCurrentUser(): void {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

// Users
export function getUsers(): User[] {
  return getData<User[]>(KEYS.USERS) || [];
}

export function setUsers(users: User[]): void {
  setData(KEYS.USERS, users);
}

export function updateUser(userId: string, updates: Partial<User>): User[] {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    setUsers(users);
  }
  return users;
}

// Suggestions
export function getSuggestions(): Suggestion[] {
  return getData<Suggestion[]>(KEYS.SUGGESTIONS) || [];
}

export function setSuggestions(suggestions: Suggestion[]): void {
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
