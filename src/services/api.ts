import type { Customer, Equipment, ServiceOrder } from '../types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? `API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health'),
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
