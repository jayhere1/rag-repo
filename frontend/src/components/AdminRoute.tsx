import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifications } from '@mantine/notifications'
import { useEffect } from 'react'

export default function AdminRoute () {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && user && !user?.roles?.includes('admin')) {
      notifications.show({
        title: 'Access Denied',
        message: 'This feature is only available to administrators',
        color: 'red'
      })
    }
  }, [user, isLoading, location.pathname])

  if (isLoading) {
    return null
  }

  return user && user?.roles?.includes('admin') ? <Outlet /> : null
}
