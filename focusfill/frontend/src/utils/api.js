export const API_BASE = 'http://localhost:8000'

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
    } catch (_) {}
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
  generateSuggestions: (userId, date) =>
    apiFetch(`/suggestions/generate?user_id=${userId}&date=${date}`, { method: 'POST' }),

  getSuggestions: (userId) =>
    apiFetch(`/suggestions/?user_id=${userId}`),

  // Feedback (stub)
  submitFeedback: (data) =>
    apiFetch('/feedback/', { method: 'POST', body: JSON.stringify(data) }),
}
