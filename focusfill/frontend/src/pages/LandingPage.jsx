import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, getApiBaseConfigIssue } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import StepIndicator from '../components/StepIndicator'
import BrandHeader from '../components/BrandHeader'

// ─── Google G logo (multicolor SVG) ──────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="w-5 h-5 flex-shrink-0"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  )
}

// ─── Feature list items ───────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Detects gaps automatically',
    description: 'Finds hidden pockets of time between meetings.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Suggests tasks from your goals',
    description: 'Fills empty spaces with meaningful progress.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: 'Writes directly to your calendar',
    description: 'Seamless integration with your existing workflow.',
  },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check for OAuth error or auto-login params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const userIdParam = searchParams.get('user_id')

    if (errorParam) {
      if (errorParam === 'permission_denied') {
        setError('Google Calendar access was denied. NoMoreGaps needs calendar access to work.')
      } else if (errorParam === 'oauth_failed') {
        setError('Google sign-in failed. Please try again.')
      } else {
        setError('An error occurred during sign-in. Please try again.')
      }
    }

    if (userIdParam) {
      // Auto-login from OAuth redirect
      login({ user_id: userIdParam })
      navigate('/onboarding/preferences', { replace: true })
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const configIssue = getApiBaseConfigIssue()
      if (configIssue) {
        setError(configIssue)
        setLoading(false)
        return
      }

      // Real Google OAuth — backend controls mock/real via USE_MOCK_DATA env var
      window.location.href = `${API_BASE}/auth/google`
    } catch (err) {
      setError(err.message || 'Failed to sign in. Is the backend running?')
      setLoading(false)
    }
  }

  const handleTryAgain = () => {
    setError(null)
    // Clear error from URL
    navigate('/', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      {/* Decorative blurred circle — left side */}
      <div
        className="absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-50 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#D6CFC4' }}
      />

      {/* Secondary decorative circle — bottom right */}
      <div
        className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#C8BFB0' }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-10 py-10">
          {/* Step indicator */}
          <StepIndicator step={1} total={4} />

          {/* Brand */}
          <BrandHeader />

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="font-serif text-2xl text-stone-800 mb-2">Begin your journey</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Connect your calendar to transform fragmented time into moments of purpose.
            </p>
          </div>

          {/* Error state */}
          {error ? (
            <div className="mb-6">
              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: '#FEF0ED',
                  borderColor: '#F5C6BC',
                }}
              >
                <div className="flex gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#C0392B"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#C0392B' }}>
                      Sign-in failed
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: '#922B21' }}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleTryAgain}
                className="mt-3 w-full border border-gray-300 rounded-xl px-6 py-3 text-sm text-stone-700 hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Sign in button */
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full border border-gray-300 rounded-xl px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-6"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <GoogleLogo />
              )}
              <span className="text-sm font-medium text-stone-700">
                {loading ? 'Signing in…' : 'Sign in with Google'}
              </span>
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-300 uppercase tracking-widest">Features</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Feature bullets */}
          <ul className="space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex gap-3">
                <div className="mt-0.5 flex-shrink-0" style={{ color: '#6B8F71' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700">{f.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 mt-4">
          <a href="#" className="hover:text-stone-600 transition-colors">Privacy Policy</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-stone-600 transition-colors">Terms of Service</a>
        </p>
      </div>
    </div>
  )
}
