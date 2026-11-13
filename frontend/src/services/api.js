const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  if (!response.ok) throw new Error(`API error ${response.status}`)
  return response.status === 204 ? null : response.json()
}

export const api = {
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
