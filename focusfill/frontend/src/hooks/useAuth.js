import { useState, useEffect } from 'react'

const USER_ID_KEY = 'timefiller_user_id'
const USER_NAME_KEY = 'timefiller_user_name'
const USER_EMAIL_KEY = 'timefiller_user_email'

export function useAuth() {
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem(USER_ID_KEY)
    return stored ? parseInt(stored, 10) : null
  })

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(USER_NAME_KEY) || null
  })

  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem(USER_EMAIL_KEY) || null
  })

  const login = ({ user_id, name, email }) => {
    const id = parseInt(user_id, 10)
    setUserId(id)
    localStorage.setItem(USER_ID_KEY, String(id))
    if (name) {
      setUserName(name)
      localStorage.setItem(USER_NAME_KEY, name)
    }
    if (email) {
      setUserEmail(email)
      localStorage.setItem(USER_EMAIL_KEY, email)
    }
  }

  const logout = () => {
    setUserId(null)
    setUserName(null)
    setUserEmail(null)
    localStorage.removeItem(USER_ID_KEY)
    localStorage.removeItem(USER_NAME_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
  }

  const isAuthenticated = userId !== null

  return { userId, userName, userEmail, login, logout, isAuthenticated }
}
