import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifications } from '@mantine/notifications'
import { useEffect } from 'react'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !user) {
      notifications.show({
        title: 'Authentication Required',
        message: 'Please log in to access this feature',
        color: 'blue'
      })
    }
  }, [user, isLoading, location.pathname])

  if (isLoading) {
    return null // or a loading spinner
  }

  if (!user) {
    // Redirect to login while preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
