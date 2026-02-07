import { User, Suggestion, Category } from './types/theme';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

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

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return publicFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return publicFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
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
  updates: { name?: string; email?: string; password?: string; role?: 'admin' | 'user'; customerValue?: number; company?: string; avatarUrl?: string | null }
): Promise<User> {
  return apiFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function inviteUser(email: string, name: string, role: string = 'user'): Promise<{ message: string; user: User }> {
  return apiFetch('/auth/invite', {
    method: 'POST',
    body: JSON.stringify({ email, name, role }),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/users/${id}`, {
    method: 'DELETE',
  });
}

// --- Public Fetch (no auth, no 401 redirect) ---

async function publicFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// --- Public Platform Branding ---

export async function fetchPlatformBranding(): Promise<{ logo: string | null; favicon: string | null; brandName: string | null; boardSlug: string | null }> {
  return publicFetch('/platform/branding');
}

// --- Board Commenter Auth ---

const BOARD_TOKEN_KEY = 'board_commenter_token';

export function getBoardToken(): string | null {
  return localStorage.getItem(BOARD_TOKEN_KEY);
}

export function setBoardToken(token: string): void {
  localStorage.setItem(BOARD_TOKEN_KEY, token);
}

export function clearBoardToken(): void {
  localStorage.removeItem(BOARD_TOKEN_KEY);
}

export interface BoardCommenter {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface BoardComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export async function boardSignup(
  slug: string,
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: BoardCommenter }> {
  return publicFetch(`/board/${slug}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function boardLogin(
  slug: string,
  email: string,
  password: string
): Promise<{ token: string; user: BoardCommenter }> {
  return publicFetch(`/board/${slug}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function boardGetMe(slug: string): Promise<{ user: BoardCommenter }> {
  const token = getBoardToken();
  if (!token) throw new Error('Not authenticated');
  return publicFetch(`/board/${slug}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchBoardComments(slug: string, suggestionId: string): Promise<BoardComment[]> {
  return publicFetch(`/board/${slug}/suggestions/${suggestionId}/comments`);
}

export async function postBoardComment(
  slug: string,
  suggestionId: string,
  content: string
): Promise<BoardComment> {
  const token = getBoardToken();
  if (!token) throw new Error('Not authenticated');
  return publicFetch(`/board/${slug}/suggestions/${suggestionId}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
}

// --- Public Board API ---

export async function fetchBoardSuggestions(slug: string, fingerprint?: string): Promise<any[]> {
  const params = fingerprint ? `?fingerprint=${encodeURIComponent(fingerprint)}` : '';
  return publicFetch(`/board/${slug}/suggestions${params}`);
}

export async function fetchBoardCategories(slug: string): Promise<Category[]> {
  return publicFetch(`/board/${slug}/categories`);
}

export async function boardVote(slug: string, suggestionId: string, fingerprint: string): Promise<{ voted: boolean }> {
  return publicFetch(`/board/${slug}/suggestions/${suggestionId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ fingerprint }),
  });
}

// --- Public Embed API ---

export async function fetchEmbedConfig(slug: string): Promise<any> {
  return publicFetch(`/embed/${slug}/config`);
}

export async function fetchEmbedSuggestions(slug: string, fingerprint?: string): Promise<any[]> {
  const params = fingerprint ? `?fingerprint=${encodeURIComponent(fingerprint)}` : '';
  return publicFetch(`/embed/${slug}/suggestions${params}`);
}

export async function fetchEmbedCategories(slug: string): Promise<Category[]> {
  return publicFetch(`/embed/${slug}/categories`);
}

export async function embedVote(slug: string, suggestionId: string, fingerprint: string): Promise<{ voted: boolean }> {
  return publicFetch(`/embed/${slug}/suggestions/${suggestionId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ fingerprint }),
  });
}

export async function embedCreateSuggestion(
  slug: string,
  title: string,
  description: string,
  categoryId?: string
): Promise<any> {
  return publicFetch(`/embed/${slug}/suggestions`, {
    method: 'POST',
    body: JSON.stringify({ title, description, categoryId }),
  });
}

// --- Admin Embed API ---

export async function fetchAdminEmbedConfig(): Promise<{ config: any; slug: string }> {
  return apiFetch('/embed/config');
}

export async function updateAdminEmbedConfig(config: any): Promise<{ config: any; slug: string }> {
  return apiFetch('/embed/config', {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

// --- Platform (Super Admin) API ---

export async function fetchPlatformOrganizations(): Promise<any[]> {
  return apiFetch('/platform/organizations');
}

export async function updatePlatformOrganization(
  id: string,
  updates: { name?: string; plan?: string; is_active?: boolean }
): Promise<any> {
  return apiFetch(`/platform/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function fetchPlatformUsers(): Promise<any[]> {
  return apiFetch('/platform/users');
}

export async function updatePlatformUser(
  id: string,
  updates: { role?: string; is_super_admin?: boolean }
): Promise<any> {
  return apiFetch(`/platform/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deletePlatformUser(id: string): Promise<void> {
  await apiFetch(`/platform/users/${id}`, { method: 'DELETE' });
}

export async function fetchPlatformSettings(): Promise<any[]> {
  return apiFetch('/platform/settings');
}

export async function updatePlatformSetting(
  key: string,
  value: string,
  description?: string
): Promise<any> {
  return apiFetch(`/platform/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
}

export async function fetchEmailTemplates(): Promise<any[]> {
  return apiFetch('/platform/email-templates');
}

export async function updateEmailTemplate(
  id: string,
  updates: { subject?: string; html_body?: string; is_active?: boolean }
): Promise<any> {
  return apiFetch(`/platform/email-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function sendTestEmail(id: string): Promise<{ message: string }> {
  return apiFetch(`/platform/email-templates/${id}/test`, { method: 'POST' });
}

export async function fetchPlatformAnalytics(): Promise<any> {
  return apiFetch('/platform/analytics');
}

// --- Public Billing ---

export async function fetchPublicPlans(): Promise<any[]> {
  return publicFetch('/billing/public-plans');
}

// --- Billing (Org Admin) ---

export async function fetchBillingPlans(): Promise<any[]> {
  return apiFetch('/billing/plans');
}

export async function fetchBillingSubscription(): Promise<any> {
  return apiFetch('/billing/subscription');
}

export async function createCheckoutSession(planId: string, interval: 'monthly' | 'yearly' = 'monthly'): Promise<{ url: string }> {
  return apiFetch('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, interval }),
  });
}

export async function switchPlan(planId: string, interval: 'monthly' | 'yearly' = 'monthly'): Promise<{ success: boolean }> {
  return apiFetch('/billing/switch-plan', {
    method: 'POST',
    body: JSON.stringify({ planId, interval }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return apiFetch('/billing/portal', { method: 'POST' });
}

export async function fetchBillingInvoices(): Promise<any[]> {
  return apiFetch('/billing/invoices');
}

// --- Platform Plans & Billing (Super Admin) ---

export async function fetchPlatformPlans(): Promise<any[]> {
  return apiFetch('/platform/plans');
}

export async function createPlatformPlan(plan: {
  name: string; slug: string; description?: string;
  price_monthly: number; price_yearly: number;
  features?: string[]; sort_order?: number;
}): Promise<any> {
  return apiFetch('/platform/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
}

export async function updatePlatformPlan(id: string, updates: any): Promise<any> {
  return apiFetch(`/platform/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deletePlatformPlan(id: string): Promise<void> {
  await apiFetch(`/platform/plans/${id}`, { method: 'DELETE' });
}

export async function cancelOrgSubscription(orgId: string): Promise<any> {
  return apiFetch(`/platform/organizations/${orgId}/cancel-subscription`, {
    method: 'POST',
  });
}

export async function fetchPlatformPayments(): Promise<any[]> {
  return apiFetch('/platform/payments');
}

// --- Stripe Mode (Super Admin) ---

export async function fetchStripeMode(): Promise<{ mode: 'test' | 'live'; testKeySet: boolean; liveKeySet: boolean }> {
  return apiFetch('/platform/stripe-mode');
}

export async function updateStripeMode(mode: 'test' | 'live'): Promise<{ mode: 'test' | 'live'; testKeySet: boolean; liveKeySet: boolean }> {
  return apiFetch('/platform/stripe-mode', {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}
