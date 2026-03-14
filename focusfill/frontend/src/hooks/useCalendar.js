import { useState, useCallback } from 'react'
import { api } from '../utils/api'

export function useCalendar(userId) {
  const [events, setEvents] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sync = useCallback(async (force = false) => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      await api.syncEvents(userId, force)
      const evts = await api.getEvents(userId)
      setEvents(Array.isArray(evts) ? evts : [])
    } catch (err) {
      console.error('[useCalendar] sync error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const generateSuggestions = useCallback(async (dateStr = null) => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const url = dateStr
        ? `/suggestions/generate?user_id=${userId}&date=${dateStr}`
        : `/suggestions/generate?user_id=${userId}`
      const result = await fetch(`http://localhost:8000${url}`, { method: 'POST' }).then(r => r.json())
      setSuggestions(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error('[useCalendar] generateSuggestions error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchSuggestions = useCallback(async () => {
    if (!userId) return
    try {
      const result = await api.getSuggestions(userId)
      setSuggestions(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error('[useCalendar] fetchSuggestions error:', err)
    }
  }, [userId])

  const acceptSuggestion = useCallback(async (suggestionId) => {
    if (!userId) return
    try {
      const updated = await api.submitFeedback({ user_id: userId, suggestion_id: suggestionId, action: 'accepted' })
      setSuggestions(prev =>
        prev.map(s => s.id === suggestionId ? { ...s, status: 'accepted', gcal_event_id: updated.gcal_event_id } : s)
      )
      return updated
    } catch (err) {
      console.error('[useCalendar] acceptSuggestion error:', err)
      throw err
    }
  }, [userId])

  const rejectSuggestion = useCallback(async (suggestionId) => {
    if (!userId) return
    try {
      await api.submitFeedback({ user_id: userId, suggestion_id: suggestionId, action: 'rejected' })
      setSuggestions(prev =>
        prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' } : s)
      )
    } catch (err) {
      console.error('[useCalendar] rejectSuggestion error:', err)
      throw err
    }
  }, [userId])

  return {
    events,
    suggestions,
    loading,
    error,
    sync,
    generateSuggestions,
    fetchSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    setEvents,
    setSuggestions,
  }
}
