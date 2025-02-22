import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'

export default function ProtectedRoute () {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null // or a loading spinner
  }

  if (!user) {
    return <Layout initialLoginOpen={true} />
  }

  return <Outlet />
}
