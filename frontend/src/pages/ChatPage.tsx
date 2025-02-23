import { useState, useEffect, ReactElement } from 'react'
import {
  TextInput,
  Box,
  ActionIcon,
  Group,
  Paper,
  Container,
  Button,
  Text,
  Stack,
  Card,
  ScrollArea,
  Loader,
  Drawer,
  Title,
  Menu,
  ActionIcon as MantineActionIcon
} from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import { useParams } from 'react-router-dom'
import { documents } from '../lib/api'
import { notifications } from '@mantine/notifications'
import {
  IconSend,
  IconMicrophone,
  IconHistory,
  IconTrash,
  IconUpload,
  IconSettings,
  IconUser,
  IconRobot,
  IconPlus,
  IconDots,
  IconPencil
} from '@tabler/icons-react'

interface ChatMessage {
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    text: string
    metadata: Record<string, any>
    relevance?: number
  }>
}

interface ChatSession {
  id: string
  name: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export default function ChatPage (): ReactElement {
  const { indexName } = useParams()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    // Create a new session if none exists
    const newSessionId = new Date().toISOString()
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '{}')
    if (Object.keys(sessions).length === 0) {
      sessions[newSessionId] = {
        id: newSessionId,
        name: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      localStorage.setItem('chatSessions', JSON.stringify(sessions))
    }
    return Object.keys(sessions)[0]
  })

  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() => {
    const saved = localStorage.getItem('chatSessions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        return Object.fromEntries(
          Object.entries(parsed).map(([id, session]: [string, any]) => [
            id,
            {
              ...session,
              messages: session.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              })),
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt)
            }
          ])
        )
      } catch (e) {
        console.error('Failed to parse chat sessions:', e)
        return {}
      }
    }
    return {}
  })

  const currentSession = sessions[currentSessionId]
  const messages = currentSession?.messages || []

  // Save to localStorage whenever sessions change
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions))
  }, [sessions])

  const createNewSession = () => {
    const newSessionId = new Date().toISOString()
    setSessions(prev => ({
      ...prev,
      [newSessionId]: {
        id: newSessionId,
        name: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }))
    setCurrentSessionId(newSessionId)
    setHistoryOpen(false)
  }

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        ...updates,
        updatedAt: new Date()
      }
    }))
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = { ...prev }
      delete newSessions[sessionId]
      return newSessions
    })
    if (sessionId === currentSessionId) {
      const remainingIds = Object.keys(sessions)
      if (remainingIds.length > 0) {
        setCurrentSessionId(remainingIds[0])
      } else {
        createNewSession()
      }
    }
  }

  const clearChat = () => {
    updateSession(currentSessionId, { messages: [] })
    setError(null)
  }

  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setLoading(true)
    setError(null)

    // Add user message immediately
    const newMessages = [
      ...messages,
      {
        type: 'user' as const,
        content: userMessage,
        timestamp: new Date()
      }
    ]
    updateSession(currentSessionId, { messages: newMessages })
    setMessage('')

    try {
      const result = await documents.query({
        query: userMessage,
        ...(indexName ? { index_name: indexName } : {})
      })

      if (!result?.answer) {
        throw new Error('No response received')
      }

      // Add assistant response with sources
      updateSession(currentSessionId, {
        messages: [
          ...newMessages,
          {
            type: 'assistant',
            content: result.answer,
            timestamp: new Date(),
            sources: result.sources
          }
        ]
      })

      notifications.show({
        title: 'Success',
        message: 'Message sent successfully',
        color: 'green'
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container
      size='xl'
      p={0}
      h='calc(100vh - 60px)'
      style={{ position: 'relative' }}
    >
      <Group justify='flex-end' mb='md' gap='sm'>
        <Button
          variant='light'
          color='gray'
          leftSection={<IconHistory size={20} />}
          onClick={() => setHistoryOpen(true)}
        >
          Open chat history
        </Button>
        <Button
          variant='light'
          color='gray'
          leftSection={<IconTrash size={20} />}
          onClick={clearChat}
        >
          Clear chat
        </Button>
        <Button
          variant='light'
          color='gray'
          leftSection={<IconUpload size={20} />}
          onClick={() => {
            /* TODO: Implement file uploads */
          }}
        >
          Manage file uploads
        </Button>
        <Button
          variant='light'
          color='gray'
          leftSection={<IconSettings size={20} />}
          onClick={() => {
            /* TODO: Implement settings */
          }}
        >
          Developer settings
        </Button>
      </Group>

      <ScrollArea h='calc(100vh - 200px)' mb='xl'>
        <Stack gap='md'>
          {messages.map((msg, index) => (
            <Card
              key={index}
              withBorder
              style={{
                maxWidth: '80%',
                marginLeft: msg.type === 'assistant' ? 0 : 'auto',
                marginRight: msg.type === 'user' ? 0 : 'auto',
                backgroundColor:
                  msg.type === 'user'
                    ? 'var(--mantine-color-blue-0)'
                    : undefined
              }}
            >
              <Group gap='xs' mb='xs'>
                {msg.type === 'user' ? (
                  <IconUser size={20} />
                ) : (
                  <IconRobot size={20} />
                )}
                <Text size='sm' c='dimmed'>
                  {msg.type === 'user' ? 'You' : 'Assistant'} •{' '}
                  {msg.timestamp.toLocaleTimeString()}
                </Text>
              </Group>
              <Stack gap='lg'>
                <Box>
                  <Text fw={500} mb='sm'>
                    Answer
                  </Text>
                  <Text>{msg.content}</Text>
                </Box>
                {msg.type === 'assistant' &&
                  msg.sources &&
                  msg.sources.length > 0 && (
                    <Box>
                      <Text fw={500} mb='sm'>
                        Citation
                      </Text>
                      {msg.sources.map((source, idx) => (
                        <Group key={idx} gap='xs'>
                          <Text size='sm' c='blue'>
                            {idx + 1}.
                          </Text>
                          <Text size='sm'>
                            {source.metadata?.filename || 'Unknown source'}
                          </Text>
                          {source.metadata?.page && (
                            <Text size='sm' c='dimmed'>
                              #page={source.metadata.page}
                            </Text>
                          )}
                        </Group>
                      ))}
                    </Box>
                  )}
              </Stack>
            </Card>
          ))}

          {loading && (
            <Card withBorder shadow='sm' style={{ maxWidth: '80%' }}>
              <Group gap='sm' align='center'>
                <IconRobot
                  size={20}
                  style={{ color: 'var(--mantine-color-blue-6)' }}
                />
                <Text size='sm'>Generating answer...</Text>
                <Loader size='sm' color='blue' />
              </Group>
            </Card>
          )}

          {error && (
            <Card withBorder color='red'>
              <Text c='red'>Error: {error}</Text>
            </Card>
          )}
        </Stack>
      </ScrollArea>

      <Paper
        shadow='md'
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          padding: '10px'
        }}
      >
        <form onSubmit={handleSubmit}>
          <Group>
            <TextInput
              placeholder={
                user
                  ? 'Ask questions from your DATA'
                  : 'Please log in to start chatting'
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ flex: 1 }}
              disabled={!user || loading}
            />
            <ActionIcon
              variant='subtle'
              color='gray'
              size='lg'
              onClick={() => {
                /* TODO: Implement voice input */
              }}
              disabled={!user || loading}
            >
              <IconMicrophone size={20} />
            </ActionIcon>
            <ActionIcon
              variant='filled'
              color='blue'
              size='lg'
              type='submit'
              disabled={!user || !message.trim() || loading}
            >
              <IconSend size={20} />
            </ActionIcon>
          </Group>
        </form>
      </Paper>

      <Drawer
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        position='right'
        size='lg'
        title={
          <Group justify='space-between' style={{ width: '100%' }}>
            <Title order={3}>Chat History</Title>
            <Button
              variant='light'
              leftSection={<IconPlus size={20} />}
              onClick={createNewSession}
            >
              New Chat
            </Button>
          </Group>
        }
      >
        <Stack gap='md'>
          {Object.values(sessions)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map(session => (
              <Card
                key={session.id}
                withBorder
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    session.id === currentSessionId
                      ? 'var(--mantine-color-blue-0)'
                      : undefined
                }}
                onClick={() => {
                  setCurrentSessionId(session.id)
                  setHistoryOpen(false)
                }}
              >
                <Group justify='space-between'>
                  <Box style={{ flex: 1 }}>
                    {editingSessionId === session.id ? (
                      <TextInput
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName.trim()) {
                            updateSession(session.id, {
                              name: editingName.trim()
                            })
                          }
                          setEditingSessionId(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && editingName.trim()) {
                            updateSession(session.id, {
                              name: editingName.trim()
                            })
                            setEditingSessionId(null)
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <Text size='lg' fw={500}>
                        {session.name}
                      </Text>
                    )}
                    <Text size='sm' c='dimmed'>
                      {session.messages.length} messages •{' '}
                      {session.updatedAt.toLocaleDateString()}
                    </Text>
                  </Box>
                  <Menu>
                    <Menu.Target>
                      <MantineActionIcon variant='subtle'>
                        <IconDots size={20} />
                      </MantineActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={20} />}
                        onClick={e => {
                          e.stopPropagation()
                          setEditingSessionId(session.id)
                          setEditingName(session.name)
                        }}
                      >
                        Rename
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={20} />}
                        color='red'
                        onClick={e => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Card>
            ))}
        </Stack>
      </Drawer>
    </Container>
  )
}
