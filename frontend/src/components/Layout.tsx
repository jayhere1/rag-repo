import '@mantine/core/styles.css'
import {
  AppShell,
  UnstyledButton,
  Group,
  Button,
  Modal,
  TextInput,
  Stack,
  PasswordInput,
  Image,
  Text
} from '@mantine/core'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import {
  IconRobot,
  IconSend,
  IconMicrophone,
  IconUpload,
  IconHistory,
  IconTools,
  IconUsers,
  IconBuildingFactory2,
  IconShieldCheck
} from '@tabler/icons-react'

export default function Layout () {
  const { user, logout, login } = useAuth()
  const location = useLocation()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // const [expandedSections, setExpandedSections] = useState({
  //   production: true,
  //   workforce: true,
  //   business: true,
  //   safety: true
  // })

  // const [expandedSubSections, setExpandedSubSections] = useState({
  //   documentation: true
  // })

  // const toggleSection = (section: keyof typeof expandedSections) => {
  //   setExpandedSections(prev => ({
  //     ...prev,
  //     [section]: !prev[section]
  //   }))
  // }

  // const toggleSubSection = (section: keyof typeof expandedSubSections) => {
  //   setExpandedSubSections(prev => ({
  //     ...prev,
  //     [section]: !prev[section]
  //   }))
  // }

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
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding='md'
      layout='alt'
    >
      <AppShell.Navbar
        p='xs'
        style={{
          backgroundColor: '#1e4388',
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <AppShell.Section style={{ flex: '1 1 auto', overflow: 'hidden' }}>
          {/* Placeholder for Innov8 logo */}
          <div
            style={{
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              padding: '16px'
            }}
          >
            <Image
              src='/logo.png'
              alt='Innov8 Logo'
              height={28}
              fit='contain'
            />
          </div>

          <Link
            to='/chat'
            style={{
              textDecoration: 'none',
              width: '100%'
            }}
          >
            <Group
              p='xs'
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}
            >
              <IconRobot
                size={24}
                color='white'
                style={{ marginRight: '12px' }}
              />
              <Text fw={700} fz='xl' style={{ color: 'white' }}>
                Innov8 GPT
              </Text>
            </Group>
          </Link>

          {/* User-specific Document Categories */}
          <div
            style={{
              marginTop: '20px',
              overflowY: 'auto',
              height: '100%'
            }}
          >
            {/* Show different sidebar items based on user's login */}
            {user && (
              <div>
                <Text
                  p='xs'
                  fw={700}
                  fz='md'
                  c='white'
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '8px'
                  }}
                >
                  Available channels
                </Text>

                {/* Admin sees all categories */}
                {user.username === 'admin@demo.com' && (
                  <>
                    <Link to='/query' style={{ textDecoration: 'none' }}>
                      <UnstyledButton
                        p='xs'
                        w='100%'
                        c='white'
                        fw={600}
                        fz='md'
                        mb={2}
                        styles={{
                          root: {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }}
                      >
                        <Group gap='xs'>
                          <IconUsers size={20} />
                          HR Documents
                        </Group>
                      </UnstyledButton>
                    </Link>

                    <Link to='/query' style={{ textDecoration: 'none' }}>
                      <UnstyledButton
                        p='xs'
                        w='100%'
                        c='white'
                        fw={600}
                        fz='md'
                        mb={2}
                        styles={{
                          root: {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }}
                      >
                        <Group gap='xs'>
                          <IconBuildingFactory2 size={20} />
                          Operations
                        </Group>
                      </UnstyledButton>
                    </Link>

                    <Link to='/query' style={{ textDecoration: 'none' }}>
                      <UnstyledButton
                        p='xs'
                        w='100%'
                        c='white'
                        fw={600}
                        fz='md'
                        mb={2}
                        styles={{
                          root: {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }}
                      >
                        <Group gap='xs'>
                          <IconShieldCheck size={20} />
                          Safety
                        </Group>
                      </UnstyledButton>
                    </Link>

                    <Link to='/query' style={{ textDecoration: 'none' }}>
                      <UnstyledButton
                        p='xs'
                        w='100%'
                        c='white'
                        fw={600}
                        fz='md'
                        mb={2}
                        styles={{
                          root: {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }}
                      >
                        <Group gap='xs'>
                          <IconTools size={20} />
                          Technical
                        </Group>
                      </UnstyledButton>
                    </Link>
                  </>
                )}

                {/* HR user */}
                {user.username === 'hr@demo.com' && (
                  <Link to='/query' style={{ textDecoration: 'none' }}>
                    <UnstyledButton
                      p='xs'
                      w='100%'
                      c='white'
                      fw={600}
                      fz='md'
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }
                      }}
                    >
                      <Group gap='xs'>
                        <IconUsers size={20} />
                        HR Documents
                      </Group>
                    </UnstyledButton>
                  </Link>
                )}

                {/* Operations user */}
                {user.username === 'operator@demo.com' && (
                  <Link to='/query' style={{ textDecoration: 'none' }}>
                    <UnstyledButton
                      p='xs'
                      w='100%'
                      c='white'
                      fw={600}
                      fz='md'
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }
                      }}
                    >
                      <Group gap='xs'>
                        <IconBuildingFactory2 size={20} />
                        Operations
                      </Group>
                    </UnstyledButton>
                  </Link>
                )}

                {/* Safety user */}
                {user.username === 'safetyinspector@demo.com' && (
                  <Link to='/query' style={{ textDecoration: 'none' }}>
                    <UnstyledButton
                      p='xs'
                      w='100%'
                      c='white'
                      fw={600}
                      fz='md'
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }
                      }}
                    >
                      <Group gap='xs'>
                        <IconShieldCheck size={20} />
                        Safety
                      </Group>
                    </UnstyledButton>
                  </Link>
                )}

                {/* Technical user */}
                {user.username === 'fieldtechnician@demo.com' && (
                  <Link to='/query' style={{ textDecoration: 'none' }}>
                    <UnstyledButton
                      p='xs'
                      w='100%'
                      c='white'
                      fw={600}
                      fz='md'
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }
                      }}
                    >
                      <Group gap='xs'>
                        <IconTools size={20} />
                        Technical
                      </Group>
                    </UnstyledButton>
                  </Link>
                )}
              </div>
            )}
          </div>
        </AppShell.Section>

        <AppShell.Section style={{ flex: '0 0 auto' }}>
          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)'
            }}
          >
            <Image
              src='/BCD ILABS 1.png'
              alt='BCDI Logo'
              height={70}
              fit='contain'
            />
          </div>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Header
        p='xs'
        style={{
          backgroundColor: '#1a1b1e',
          color: 'white',
          marginLeft: 0,
          width: 'calc(100% - 300px)'
        }}
      >
        <Group
          h='100%'
          style={{ position: 'relative', justifyContent: 'space-between' }}
        >
          <div style={{ flex: 1 }}></div>
          <Group
            gap='xl'
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <Link
              to='/chat'
              style={{
                color: location.pathname.includes('/chat') ? '#fff' : '#909296',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                backgroundColor: location.pathname.includes('/chat')
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
                display: 'block'
              }}
            >
              <Group gap={4} wrap='nowrap'>
                <IconSend size={20} />
                <Text>Chat</Text>
              </Group>
            </Link>
            <Link
              to='/query'
              style={{
                color: location.pathname.includes('/query')
                  ? '#fff'
                  : '#909296',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                backgroundColor: location.pathname.includes('/query')
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
                display: 'block'
              }}
            >
              <Group gap={4} wrap='nowrap'>
                <IconMicrophone size={20} />
                <Text>Ask a question</Text>
              </Group>
            </Link>
            {user?.roles?.includes('admin') && (
              <>
                <Link
                  to='/documents'
                  style={{
                    color: location.pathname.includes('/documents')
                      ? '#fff'
                      : '#909296',
                    textDecoration: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    backgroundColor: location.pathname.includes('/documents')
                      ? 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    display: 'block'
                  }}
                >
                  <Group gap={4} wrap='nowrap'>
                    <IconUpload size={20} />
                    <Text>Documents</Text>
                  </Group>
                </Link>
                <Link
                  to='/channels'
                  style={{
                    color: location.pathname.includes('/channels')
                      ? '#fff'
                      : '#909296',
                    textDecoration: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    backgroundColor: location.pathname.includes('/channels')
                      ? 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    display: 'block'
                  }}
                >
                  <Group gap={4} wrap='nowrap'>
                    <IconHistory size={20} />
                    <Text>Channels</Text>
                  </Group>
                </Link>
              </>
            )}
          </Group>
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              paddingRight: '16px'
            }}
          >
            {user ? (
              <Button variant='filled' onClick={logout}>
                Logout
              </Button>
            ) : (
              <Button variant='filled' onClick={() => setLoginModalOpen(true)}>
                Login
              </Button>
            )}
          </div>
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
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleLogin()
              }
            }}
          />
          <PasswordInput
            label='Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleLogin()
              }
            }}
          />
          <Button onClick={handleLogin}>Login</Button>
        </Stack>
      </Modal>
    </AppShell>
  )
}
