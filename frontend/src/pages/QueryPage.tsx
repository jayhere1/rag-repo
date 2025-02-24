import { useState, useEffect, ReactElement, useRef } from 'react'
import {
  Container,
  Title,
  TextInput,
  Button,
  Stack,
  Card,
  Text,
  Box,
  Loader,
  Badge,
  Anchor,
  Paper,
  ScrollArea,
  Group
} from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { IconRobot, IconUser } from '@tabler/icons-react'
import { useParams } from 'react-router-dom'
import { documents, QueryResponse } from '../lib/api'
import { notifications } from '@mantine/notifications'

export default function QueryPage (): ReactElement {
  const { indexName } = useParams()
  const [query, setQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<{
    text: string
    metadata: any
    relevance?: number
  } | null>(null)
  const { user } = useAuth()
  const { messages, loading, error, sendMessage } = useChat()
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
    if (!query.trim() || loading) return

    const userQuery = query.trim()
    setQuery('')
    await sendMessage(userQuery, indexName)
  }

  return (
    <Container size='xl' style={{ display: 'flex', gap: '1rem' }}>
      <Box style={{ flex: 1 }}>
        <Title order={2} mb='xl'>
          {indexName ? `Query ${indexName} Documents` : 'Query All Documents'}
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap='md'>
            <TextInput
              label='Your Question'
              placeholder={
                user
                  ? 'Ask anything about your documents...'
                  : 'Please log in to ask questions'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              size='lg'
              required
              disabled={!user}
            />
            <Button
              type='submit'
              loading={loading}
              disabled={!user || !query.trim() || loading}
              size='lg'
            >
              {user ? 'Ask Question' : 'Log in to Ask Questions'}
            </Button>
          </Stack>
        </form>

        {loading && (
          <Card withBorder shadow='sm' mt='xl'>
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
          <Box mt='xl'>
            <Text color='red'>Error: {error}</Text>
          </Box>
        )}

        {messages.length > 0 && (
          <Stack mt='xl' gap='lg'>
            {messages.map((msg, index) => (
              <Card key={index} withBorder>
                <Stack gap='lg'>
                  <Box>
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
                    <Text>
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
                        <Stack gap='xs'>
                          {msg.sources.map((source, idx) => (
                            <Group key={idx} gap='xs' align='center'>
                              <Text size='sm' c='blue'>
                                {idx + 1}.
                              </Text>
                              <Anchor
                                onClick={() => setSelectedSource(source)}
                                style={{ cursor: 'pointer' }}
                              >
                                {source.metadata?.filename || 'Unknown source'}
                              </Anchor>
                              {source.metadata?.page && (
                                <Text size='sm' c='dimmed'>
                                  #page={source.metadata.page}
                                </Text>
                              )}
                              {source.metadata?.collection && (
                                <Badge color='blue'>
                                  {source.metadata.collection}
                                </Badge>
                              )}
                            </Group>
                          ))}
                        </Stack>
                      </Box>
                    )}
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {selectedSource && (
        <Paper
          withBorder
          style={{
            flex: 1,
            position: 'sticky',
            top: '1rem',
            maxHeight: 'calc(100vh - 2rem)',
            marginTop: '1rem'
          }}
        >
          <ScrollArea h='calc(100vh - 4rem)' p='md'>
            <Title order={4} mb='md'>
              {selectedSource.metadata?.filename || 'Source Content'}
            </Title>
            <Text style={{ whiteSpace: 'pre-wrap' }}>
              {selectedSource.text}
            </Text>
          </ScrollArea>
        </Paper>
      )}
    </Container>
  )
}
