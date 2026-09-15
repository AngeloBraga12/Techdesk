import type { Customer, Equipment, ServiceOrder } from '../types'

export type AuthUser = { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN' }
export type AdminUser = { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN'; active: boolean; createdAt: string }

// Production uses the same-origin /api rewrite handled by Netlify.
// A localhost URL here would make the deployed frontend try to reach the
// user's own computer, producing the browser's generic "Failed to fetch".
const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? `API error: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string; service: string; database?: string }>('/health'),
  auth: {
    me: () => request<{ user: AuthUser }>('/auth/me'),
    setupStatus: () => request<{ setupRequired: boolean }>('/auth/setup-status'),
    login: (email: string, password: string) => request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
    register: (name: string, email: string, password: string) => request<{ user: AuthUser; bootstrapAdmin: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    bootstrap: (token: string, name: string, email: string, password: string) => request<{ user: AuthUser; bootstrapAdmin: boolean }>('/auth/bootstrap', { method: 'POST', headers: { 'X-Bootstrap-Token': token }, body: JSON.stringify({ name, email, password }) }),
  },
  admin: {
    users: () => request<AdminUser[]>('/admin/users'),
    createUser: (name: string, email: string, password: string) => request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    setUserActive: (id: string, active: boolean) => request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  },
  customers: {
    list: () => request<Customer[]>('/customers'),
    create: (customer: Pick<Customer, 'name' | 'phone' | 'email'>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(customer) }),
    update: (id: string, customer: Partial<Pick<Customer, 'name' | 'phone' | 'email'>>) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(customer) }),
    remove: (id: string) => request<void>(`/customers/${id}`, { method: 'DELETE' }),
  },
  equipment: {
    list: () => request<Equipment[]>('/equipment'),
    create: (item: Omit<Equipment, 'id'>) => request<Equipment>('/equipment', { method: 'POST', body: JSON.stringify(item) }),
    update: (id: string, item: Partial<Omit<Equipment, 'id'>>) => request<Equipment>(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    remove: (id: string) => request<void>(`/equipment/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => request<ServiceOrder[]>('/orders'),
    create: (order: Omit<ServiceOrder, 'id'>) => request<ServiceOrder>('/orders', { method: 'POST', body: JSON.stringify(order) }),
    update: (id: number, order: Partial<Omit<ServiceOrder, 'id'>>) => request<ServiceOrder>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(order) }),
    remove: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
  },
}
