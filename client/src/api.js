export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
  // { fieldName: "message" } for inline form errors
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '')) : '';
  let res;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running on port 5000?');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.message || `Request failed (${res.status})`, e?.details);
  }
  return data;
}

export const api = {
  items: () => request('/items'),
  createItem: (b) => request('/items', { method: 'POST', body: b }),
  updateItem: (id, b) => request(`/items/${id}`, { method: 'PUT', body: b }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  availability: (id, start, end) => request(`/items/${id}/availability`, { query: { start, end } }),
  rentals: (query) => request('/rentals', { query }),
  createRental: (b) => request('/rentals', { method: 'POST', body: b }),
  checkout: (id) => request(`/rentals/${id}/checkout`, { method: 'PATCH' }),
  returnRental: (id, b) => request(`/rentals/${id}/return`, { method: 'PATCH', body: b }),
  cancelRental: (id) => request(`/rentals/${id}/cancel`, { method: 'PATCH' }),
  stats: () => request('/stats'),
};
