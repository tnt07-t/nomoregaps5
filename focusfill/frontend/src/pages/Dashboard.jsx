import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import BrandHeader from '../components/BrandHeader'

export default function Dashboard() {
  const { userId, userName, login, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Handle user_id from URL (e.g. after OAuth)
  useEffect(() => {
    const userIdParam = searchParams.get('user_id')
    if (userIdParam && !userId) {
      login({ user_id: userIdParam })
    }
  }, [searchParams])

  // Load user info
  useEffect(() => {
    if (!userId) return
    api.getMe(userId)
      .then((data) => {
        setUser(data.user)
        if (data.user.name) {
          login({ user_id: userId, name: data.user.name, email: data.user.email })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const displayName = user?.name || userName || 'there'
  const firstName = displayName.split(' ')[0]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -left-32 top-1/3 w-96 h-96 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#D6CFC4' }}
      />
      <div
        className="absolute -right-20 bottom-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#C8BFB0' }}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-10 py-12 text-center">
          <BrandHeader />

          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-stone-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full text-white text-xl font-bold mb-4"
                  style={{ backgroundColor: '#6B8F71' }}
                >
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-serif text-2xl text-stone-800 mb-2">
                  Welcome, {firstName}!
                </h2>
                <p className="text-sm text-stone-500">
                  Your onboarding is complete. The full calendar dashboard is coming soon.
                </p>
              </div>

              <div
                className="rounded-xl p-5 mb-6 text-left border"
                style={{ backgroundColor: '#F8F6F3', borderColor: '#E7E5E4' }}
              >
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  What happens next
                </p>
                <ul className="space-y-3">
                  {[
                    { label: 'Sync your Google Calendar', done: false },
                    { label: 'Detect free time blocks', done: false },
                    { label: 'Generate task suggestions', done: false },
                    { label: 'Accept or reject to learn your preferences', done: false },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: item.done ? '#6B8F71' : '#D6D3D1', backgroundColor: item.done ? '#6B8F71' : 'transparent' }}
                      >
                        {item.done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-stone-600">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: '#3D3530' }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#2D2520' }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#3D3530' }}
                  onClick={() => alert('Calendar sync coming soon!')}
                >
                  Sync Google Calendar
                </button>

                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="w-full border border-stone-200 rounded-xl px-6 py-3 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          <a href="#" className="hover:text-stone-600 transition-colors">Privacy Policy</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-stone-600 transition-colors">Terms of Service</a>
        </p>
      </div>
    </div>
  )
}
