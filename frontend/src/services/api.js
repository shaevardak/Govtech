const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'baga-auth-token'

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: token => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function request(path, options = {}) {
  const token = authToken.get()
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Ошибка API (${response.status})`)
  }
  return response.status === 204 ? null : response.json()
}

export const api = {
  register: payload => request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  login: payload => request('/auth/login/', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me/'),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  stores: () => request('/stores/'),
  products: () => request('/products/'),
  priceReports: () => request('/price-reports/'),
  complaints: () => request('/complaints/'),
  reportPrice: (payload) => request('/price-reports/', { method: 'POST', body: JSON.stringify(payload) }),
  submitComplaint: (payload) => request('/complaints/', { method: 'POST', body: JSON.stringify(payload) }),
  updateComplaint: (id, status) => request(`/complaints/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}

export function median(values) {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
