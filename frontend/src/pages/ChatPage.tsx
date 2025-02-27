import { useState, useEffect, ReactElement, useRef } from 'react'
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
import { useChat } from '../contexts/ChatContext'
import { useParams } from 'react-router-dom'

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

export default function ChatPage (): ReactElement {
  const { indexName } = useParams()
  const [message, setMessage] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [selectedSource, setSelectedSource] = useState<{
    text: string
    metadata: Record<string, any>
  } | null>(null)

  const { user } = useAuth()
  const {
    messages,
    loading,
    error,
    sessions,
    currentSessionId,
    sendMessage,
    createNewSession,
    updateSession,
    deleteSession,
    clearChat,
    setCurrentSessionId
  } = useChat()

  const viewport = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({
        top: viewport.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setMessage('')
    await sendMessage(userMessage, indexName)
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

      <ScrollArea
        h='calc(100vh - 200px)'
        mb='xl'
        viewportRef={viewport}
        style={{ background: 'var(--mantine-color-gray-0)' }}
      >
        <Stack gap='lg' p='md'>
          {messages.map((msg, index) => (
            <Card
              key={index}
              withBorder={false}
              shadow='sm'
              style={{
                maxWidth: '80%',
                marginLeft: msg.type === 'assistant' ? 0 : 'auto',
                marginRight: msg.type === 'user' ? 0 : 'auto',
                backgroundColor:
                  msg.type === 'user' ? 'var(--mantine-color-blue-6)' : 'white',
                borderRadius: '1rem',
                ...(msg.type === 'user'
                  ? { borderTopRightRadius: '0.25rem' }
                  : { borderTopLeftRadius: '0.25rem' })
              }}
            >
              <Stack gap='md'>
                <Group gap='xs' mb='xs'>
                  {msg.type === 'user' ? (
                    <IconUser size={20} color='white' />
                  ) : (
                    <IconRobot size={20} color='var(--mantine-color-blue-6)' />
                  )}
                  <Text size='sm' c={msg.type === 'user' ? 'white' : 'dimmed'}>
                    {msg.type === 'user' ? 'You' : 'Assistant'} •{' '}
                    {msg.timestamp.toLocaleTimeString()}
                  </Text>
                </Group>
                <Box>
                  <Text
                    style={{
                      color: msg.type === 'user' ? 'white' : 'inherit',
                      lineHeight: 1.6
                    }}
                  >
                    {msg.content.split(/\n\s*Citation\s*\n/)[0].trim()}
                  </Text>
                </Box>
                {msg.type === 'assistant' &&
                  msg.sources &&
                  msg.sources.length > 0 && (
                    <Box>
                      <Text fw={500} mb='sm'>
                        Citation
                      </Text>
                      {msg.sources.map((source, idx) => (
                        <Group
                          key={idx}
                          gap='xs'
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedSource(source)
                          }}
                        >
                          <Text size='sm' c='blue'>
                            {idx + 1}.
                          </Text>
                          <Text
                            size='sm'
                            style={{ textDecoration: 'underline' }}
                          >
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
          padding: '16px',
          borderRadius: '1rem',
          backgroundColor: 'white'
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
              size='md'
              radius='xl'
              styles={{
                input: {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: 'none',
                  '&:focus': {
                    border: 'none',
                    backgroundColor: 'var(--mantine-color-gray-1)'
                  }
                }
              }}
            />
            <ActionIcon
              variant='subtle'
              color='gray'
              size='xl'
              radius='xl'
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
              size='xl'
              radius='xl'
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

      {/* Document Preview Drawer */}
      <Drawer
        opened={selectedSource !== null}
        onClose={() => setSelectedSource(null)}
        position='right'
        size='lg'
        title={
          <Title order={3}>
            {selectedSource?.metadata?.filename || 'Document Preview'}
          </Title>
        }
      >
        {selectedSource && (
          <Box p='md'>
            <Text>{selectedSource.text}</Text>
          </Box>
        )}
      </Drawer>
    </Container>
  )
}
