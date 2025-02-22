import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import IndexesPage from './pages/IndexesPage'
import DocumentsPage from './pages/DocumentsPage'
import QueryPage from './pages/QueryPage'

const queryClient = new QueryClient()

function App () {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path='/login' element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path='/' element={<Layout />}>
                  <Route index element={<Navigate to='/indexes' replace />} />
                  <Route path='indexes' element={<IndexesPage />} />
                  <Route
                    path='indexes/:indexName/documents'
                    element={<DocumentsPage />}
                  />
                  <Route path='query' element={<QueryPage />} />
                  <Route
                    path='indexes/:indexName/query'
                    element={<QueryPage />}
                  />
                </Route>
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}

export default App
