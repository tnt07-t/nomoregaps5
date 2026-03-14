const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const API_BASE = rawBase.replace(/\/+$/, '')

export function getApiBaseConfigIssue() {
  if (!import.meta.env.PROD) return null

  const configured = (import.meta.env.VITE_API_BASE || '').trim()
  if (!configured) {
    return 'Missing VITE_API_BASE in production. Set it to your backend URL.'
  }

  try {
    const apiUrl = new URL(API_BASE)
    const appUrl = new URL(window.location.origin)
    const sameOrigin = apiUrl.origin === appUrl.origin
    const hasApiPrefix = apiUrl.pathname === '/api' || apiUrl.pathname.startsWith('/api/')

    if (sameOrigin && !hasApiPrefix) {
      return 'VITE_API_BASE points to this frontend domain. Set it to your backend URL.'
    }
  } catch (_) {
    return 'Invalid VITE_API_BASE. Set it to a full backend URL (for example https://api.yourdomain.com).'
  }

  return null
}

/**
 * Generic fetch wrapper with error handling.
 * Returns parsed JSON on success, throws on non-2xx.
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      errMsg = body.detail || body.message || errMsg
    } catch (_) {
      try {
        const text = await res.text()
        if (text.includes('Code: NOT_FOUND')) {
          errMsg = 'Backend endpoint not found. Check VITE_API_BASE points to your backend service.'
        }
      } catch (_) {}
    }
    throw new Error(errMsg)
  }

  // 204 No Content
  if (res.status === 204) return null

  return res.json()
}

export const api = {
  // Auth
  mockLogin: () =>
    apiFetch('/auth/mock-login', { method: 'POST' }),

  getMe: (userId) =>
    apiFetch(`/auth/me?user_id=${userId}`),

  // Preferences
  getPreferences: (userId) =>
    apiFetch(`/preferences/?user_id=${userId}`),

  updatePreferences: (userId, data) =>
    apiFetch(`/preferences/?user_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Goals
  getGoals: (userId) =>
    apiFetch(`/goals/?user_id=${userId}`),

  createGoal: (data) =>
    apiFetch('/goals/', { method: 'POST', body: JSON.stringify(data) }),

  updateGoal: (goalId, data) =>
    apiFetch(`/goals/${goalId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteGoal: (goalId) =>
    apiFetch(`/goals/${goalId}`, { method: 'DELETE' }),

  addTaskToGoal: (goalId, userId, data) =>
    apiFetch(`/goals/${goalId}/tasks?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (goalId, taskId, data) =>
    apiFetch(`/goals/${goalId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (goalId, taskId) =>
    apiFetch(`/goals/${goalId}/tasks/${taskId}`, { method: 'DELETE' }),

  reorderGoals: (goals) =>
    apiFetch('/goals/reorder', {
      method: 'PUT',
      body: JSON.stringify({ goals }),
    }),

  // Events (stubs)
  syncEvents: (userId, force = false) =>
    apiFetch(`/events/sync?user_id=${userId}&force=${force}`, { method: 'POST' }),

  getEvents: (userId) =>
    apiFetch(`/events/?user_id=${userId}`),

  // Suggestions (stubs)
  generateSuggestions: (userId, date = null) => {
    const query = date
      ? `/suggestions/generate?user_id=${userId}&date=${encodeURIComponent(date)}`
      : `/suggestions/generate?user_id=${userId}`
    return apiFetch(query, { method: 'POST' })
  },

  getSuggestions: (userId) =>
    apiFetch(`/suggestions/?user_id=${userId}`),

  // Feedback (stub)
  submitFeedback: (data) =>
    apiFetch('/feedback/', { method: 'POST', body: JSON.stringify(data) }),
}
