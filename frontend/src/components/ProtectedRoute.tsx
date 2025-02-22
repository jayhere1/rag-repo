import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute () {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null // or a loading spinner
  }

  if (!user) {
    return <Navigate to='/login' replace />
  }

  return <Outlet />
}
