import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

/**
 * AuthCallback - Handles the redirect from Google OAuth.
 * Reads ?user_id=X, persists auth state, then routes:
 *   - new user (no goals)  → /onboarding/buffer
 *   - returning user       → /dashboard
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const userIdParam = searchParams.get('user_id')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      navigate(`/?error=${errorParam}`, { replace: true })
      return
    }

    if (!userIdParam) {
      navigate('/', { replace: true })
      return
    }

    async function finishLogin() {
      try {
        // Fetch user info to get name/email for localStorage
        const me = await api.getMe(userIdParam)
        login({ user_id: userIdParam, name: me.user.name, email: me.user.email })

        // Check if user already has goals — if so skip onboarding
        const goals = await api.getGoals(userIdParam)
        if (goals && goals.length > 0) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/onboarding/buffer', { replace: true })
        }
      } catch (_) {
        // On any error just start onboarding fresh
        login({ user_id: userIdParam })
        navigate('/onboarding/buffer', { replace: true })
      }
    }

    finishLogin()
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-10 py-10 flex flex-col items-center gap-4">
        <svg
          className="w-8 h-8 animate-spin text-stone-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-stone-500">Completing sign-in…</p>
      </div>
    </div>
  )
}
