import '@mantine/core/styles.css'
import {
  AppShell,
  Title,
  UnstyledButton,
  Group,
  rem,
  Button,
  Modal,
  TextInput,
  Stack,
  PasswordInput,
  Image,
  Text,
  ActionIcon
} from '@mantine/core'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import {
  IconHistory,
  IconTrash,
  IconUpload,
  IconSettings,
  IconRobot
} from '@tabler/icons-react'

interface LayoutProps {
  initialLoginOpen?: boolean
}

export default function Layout ({ initialLoginOpen = false }: LayoutProps) {
  const { user, logout, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginModalOpen, setLoginModalOpen] = useState(initialLoginOpen)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    try {
      await login(username, password)
      setLoginModalOpen(false)
      setUsername('')
      setPassword('')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding='md'
      layout='alt'
    >
      <AppShell.Navbar
        p='xs'
        style={{ backgroundColor: '#1e4388', color: 'white' }}
      >
        <AppShell.Section>
          {/* Placeholder for Innov8 logo */}
          <div
            style={{
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}
          >
            <Text size='xl' fw={700} style={{ color: 'white' }}>
              INNOV8
            </Text>
          </div>

          <Group
            p='xs'
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <IconRobot size={24} color='white' />
            <Text fw={500} style={{ color: 'white' }}>
              Manufacturing GPT
            </Text>
          </Group>
        </AppShell.Section>

        <AppShell.Section grow mt='md'>
          <UnstyledButton
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: rem(8),
              borderRadius: rem(4),
              color: 'white',
              gap: rem(8),
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <IconHistory size={20} />
            <Text size='sm'>Open chat history</Text>
          </UnstyledButton>
        </AppShell.Section>

        <AppShell.Section>
          <Group justify='space-between' p='xs'>
            <ActionIcon variant='subtle' color='gray' title='Clear chat'>
              <IconTrash size={20} color='white' />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='gray'
              title='Manage file uploads'
            >
              <IconUpload size={20} color='white' />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='gray'
              title='Developer settings'
            >
              <IconSettings size={20} color='white' />
            </ActionIcon>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Header
        p='xs'
        style={{
          backgroundColor: '#1a1b1e',
          color: 'white',
          marginLeft: 0,
          width: 'calc(100% - 250px)'
        }}
      >
        <Group justify='space-between' h='100%'>
          <Group>
            <Text>Chat</Text>
            <Text>Ask a question</Text>
          </Group>
          {user ? (
            <Button variant='filled' onClick={logout}>
              Logout
            </Button>
          ) : (
            <Button variant='filled' onClick={() => setLoginModalOpen(true)}>
              Login
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ backgroundColor: 'white' }}>
        <Outlet />
      </AppShell.Main>

      <Modal
        opened={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        title='Login'
        centered
      >
        <Stack>
          <TextInput
            label='Username'
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <PasswordInput
            label='Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button onClick={handleLogin}>Login</Button>
        </Stack>
      </Modal>
    </AppShell>
  )
}
