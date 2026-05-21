export const API_URL = 'http://localhost:3000/api/v1';

export const getAuthToken = () => localStorage.getItem('access_token');
export const setAuthToken = (token: string) => localStorage.setItem('access_token', token);
export const removeAuthToken = () => localStorage.removeItem('access_token');

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

export const api = {
  // Auth
  login: (data: any) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => fetchApi('/auth/me', { method: 'GET' }), // We might not have /me, but let's assume we can use the token

  // Organizations
  listUserOrgs: () => fetchApi('/organizations', { method: 'GET' }),
  getOrgAnalytics: (orgId: string) => fetchApi(`/organizations/${orgId}/analytics`, { method: 'GET' }),
  listOrgMembers: (orgId: string) => fetchApi(`/organizations/${orgId}/members`, { method: 'GET' }),
  
  // Events
  listOrgEvents: (orgId: string) => fetchApi(`/organizations/${orgId}/events`, { method: 'GET' }),
};
