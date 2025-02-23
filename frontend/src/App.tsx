import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
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
import AdminRoute from './components/AdminRoute'
import IndexesPage from './pages/IndexesPage'
import DocumentsPage from './pages/DocumentsPage'
import QueryPage from './pages/QueryPage'
import ChatPage from './pages/ChatPage'
import RFPPage from './pages/RFPPage'
import BrochurePage from './pages/BrochurePage'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient()

function App () {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={{
          primaryColor: 'blue',
          defaultRadius: 'md',
          components: {
            Tabs: {
              defaultProps: {
                color: 'blue'
              }
            },
            ActionIcon: {
              defaultProps: {
                size: 'lg',
                radius: 'md'
              }
            },
            TextInput: {
              defaultProps: {
                size: 'md'
              },
              styles: {
                input: {
                  '&:focus': {
                    borderColor: 'var(--mantine-color-blue-6)'
                  }
                }
              }
            }
          }
        }}
      >
        <ModalsProvider>
          <Notifications />
          <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="query" element={<QueryPage />} />
                <Route path="rfp" element={<RFPPage />} />
                <Route path="brochure" element={<BrochurePage />} />
                <Route element={<AdminRoute />}>
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route index element={<Navigate to="/indexes" replace />} />
                  <Route path="indexes" element={<IndexesPage />} />
                  <Route path="indexes/:indexName/documents" element={<DocumentsPage />} />
                </Route>
                <Route element={<ProtectedRoute />}>
                  <Route path="indexes/:indexName/query" element={<QueryPage />} />
                  <Route path="indexes/:indexName/chat" element={<ChatPage />} />
                </Route>
              </Route>
            </Routes>
          </Router>
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}

export default App
