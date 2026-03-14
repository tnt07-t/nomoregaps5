import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * AuthCallback - Handles the redirect from Google OAuth.
 * Reads ?user_id=X from the URL, persists it, then navigates forward.
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

    if (userIdParam) {
      login({ user_id: userIdParam })
      navigate('/onboarding/preferences', { replace: true })
    } else {
      // No user_id and no error — redirect home
      navigate('/', { replace: true })
    }
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
