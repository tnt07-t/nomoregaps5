import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'
import OnboardingPreferences from './pages/OnboardingPreferences'
import OnboardingGoals from './pages/OnboardingGoals'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }) {
  const userId = localStorage.getItem('timefiller_user_id')
  if (!userId) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/onboarding/preferences"
          element={
            <ProtectedRoute>
              <OnboardingPreferences />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/goals"
          element={
            <ProtectedRoute>
              <OnboardingGoals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
