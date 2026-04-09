export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

export type LoginResponse = {
  token: string
  user: { id: string; name: string; email: string; role: string }
}

export async function apiRequest<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (init?.token) headers.set('Authorization', `Bearer ${init.token}`)

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`)
  }
  return (await res.json()) as T
}

