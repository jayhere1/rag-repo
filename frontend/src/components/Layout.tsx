import '@mantine/core/styles.css'
import { AppShell, Title, UnstyledButton, Group, rem } from '@mantine/core'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout () {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  const NavButton = ({ to, label }: { to: string; label: string }) => (
    <UnstyledButton
      style={{
        display: 'block',
        width: '100%',
        padding: rem(8),
        borderRadius: rem(4),
        color: '#000',
        backgroundColor: isActive(to) ? '#e6f7ff' : 'transparent',
        '&:hover': {
          backgroundColor: '#f5f5f5'
        }
      }}
      onClick={() => navigate(to)}
    >
      {label}
    </UnstyledButton>
  )

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding='md'
    >
      <AppShell.Header p='xs'>
        <Title order={3}>RAG Application</Title>
      </AppShell.Header>

      <AppShell.Navbar p='xs'>
        <AppShell.Section grow mt='xs'>
          <NavButton to='/indexes' label='Indexes' />
          <NavButton to='/query' label='Query All Documents' />
        </AppShell.Section>
        <AppShell.Section>
          <Group justify='space-between' p='xs'>
            <span>{user?.username}</span>
            <UnstyledButton onClick={logout}>Logout</UnstyledButton>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
