import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'
import OnboardingBuffer from './pages/OnboardingBuffer'
import OnboardingAudio from './pages/OnboardingAudio'
import OnboardingGoals from './pages/OnboardingGoals'
import OnboardingPreview from './pages/OnboardingPreview'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }) {
  const userId = localStorage.getItem('timefiller_user_id')
  if (!userId) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Legacy redirect */}
        <Route path="/onboarding/preferences" element={<Navigate to="/onboarding/buffer" replace />} />
        <Route path="/onboarding/buffer"  element={<ProtectedRoute><OnboardingBuffer /></ProtectedRoute>} />
        <Route path="/onboarding/audio"   element={<ProtectedRoute><OnboardingAudio /></ProtectedRoute>} />
        <Route path="/onboarding/goals"   element={<ProtectedRoute><OnboardingGoals /></ProtectedRoute>} />
        <Route path="/onboarding/preview" element={<ProtectedRoute><OnboardingPreview /></ProtectedRoute>} />
        <Route path="/dashboard"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
