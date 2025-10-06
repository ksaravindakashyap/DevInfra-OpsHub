const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Auth
  getMe: () => apiRequest<{ id: string; email: string; name: string; avatarUrl: string }>('/me'),
  
  // Organizations
  getOrgs: () => apiRequest<any[]>('/orgs'),
  createOrg: (data: { name: string }) => apiRequest<any>('/orgs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Projects
  getProject: (id: string) => apiRequest<any>(`/projects/${id}`),
  createProject: (orgId: string, data: { name: string; repoFullName: string; defaultBranch?: string }) => 
    apiRequest<any>(`/orgs/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
