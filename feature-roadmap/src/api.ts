import { User, Suggestion, Category } from './types/theme';

const BASE_URL = 'http://localhost:5000/api';

// Token management
const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Status mapping: backend uses snake_case, frontend uses display strings
const statusToFrontend: Record<string, Suggestion['status']> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
};

const statusToBackend: Record<string, string> = {
  'Under Review': 'under_review',
  'Planned': 'planned',
  'In Progress': 'in_progress',
  'Done': 'done',
};

// Map API suggestion response to frontend Suggestion type
function mapSuggestion(s: any): Suggestion {
  return {
    id: s.id,
    title: s.title,
    description: s.description || '',
    category: s.category || '',
    status: statusToFrontend[s.status] || s.status,
    sprint: s.sprint || null,
    votes: s.votes || 0,
    votedBy: s.votedBy || [],
    createdBy: s.createdBy || s.created_by || '',
    createdAt: s.createdAt || s.created_at || '',
    requirements: s.requirements || undefined,
    jiraSynced: s.jiraSynced || s.jira_synced || false,
    jiraSyncedAt: s.jiraSyncedAt || s.jira_synced_at || undefined,
    impactScore: s.impactScore || s.impact_score || 0,
  };
}

// Fetch wrapper with auth
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

// --- Auth ---

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: data.token, user: data.user };
}

export async function register(
  organizationName: string,
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ organizationName, name, email, password }),
  });
  return { token: data.token, user: data.user };
}

export async function getCurrentUser(): Promise<User> {
  const data = await apiFetch('/auth/me');
  return data.user;
}

export function logout(): void {
  clearToken();
}

// --- Suggestions ---

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const data = await apiFetch('/suggestions');
  return data.map(mapSuggestion);
}

export async function createSuggestion(
  title: string,
  description: string,
  categoryId?: string
): Promise<Suggestion> {
  const data = await apiFetch('/suggestions', {
    method: 'POST',
    body: JSON.stringify({ title, description, categoryId }),
  });
  return mapSuggestion(data);
}

export async function updateSuggestion(
  id: string,
  updates: {
    title?: string;
    description?: string;
    categoryId?: string;
    status?: Suggestion['status'];
    sprint?: string | null;
    requirements?: string;
  }
): Promise<any> {
  const body: any = { ...updates };
  // Map status to backend format
  if (body.status) {
    body.status = statusToBackend[body.status] || body.status;
  }
  return apiFetch(`/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function voteSuggestion(id: string): Promise<{ voted: boolean }> {
  return apiFetch(`/suggestions/${id}/vote`, {
    method: 'POST',
  });
}

// --- Categories ---

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch('/categories');
}

export async function createCategory(name: string, color?: string): Promise<Category> {
  return apiFetch('/categories', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function updateCategory(
  id: string,
  updates: { name?: string; color?: string; sortOrder?: number }
): Promise<Category> {
  return apiFetch(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// --- Users ---

export async function fetchUsers(): Promise<User[]> {
  return apiFetch('/users');
}

export async function updateUser(
  id: string,
  updates: { name?: string; email?: string; role?: 'admin' | 'user'; customerValue?: number; company?: string }
): Promise<User> {
  return apiFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/users/${id}`, {
    method: 'DELETE',
  });
}
