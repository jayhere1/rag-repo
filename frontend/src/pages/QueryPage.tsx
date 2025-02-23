import { useState, useEffect, ReactElement } from 'react'
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
import { IconRobot } from '@tabler/icons-react'
import { useParams } from 'react-router-dom'
import { documents, QueryResponse } from '../lib/api'
import { notifications } from '@mantine/notifications'

export default function QueryPage (): ReactElement {
  const { indexName } = useParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [selectedSource, setSelectedSource] = useState<{
    text: string
    metadata: any
    relevance?: number
  } | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    console.log('Response state changed:', response)
  }, [response])

  console.log('Rendering QueryPage with:', {
    loading,
    error,
    response,
    hasResponse: Boolean(response),
    responseAnswer: response?.answer,
    responseSources: response?.sources?.length
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    console.group('Query Submission')
    console.log('Starting query submission...')
    setLoading(true)
    setError(null)
    setSelectedSource(null)
    setResponse(null)

    try {
      console.log('Sending query:', query.trim())
      const result = await documents.query({
        query: query.trim(),
        ...(indexName ? { index_name: indexName } : {})
      })
      console.group('Response Analysis')
      console.log('Raw response:', result)
      console.log('Response type:', typeof result)
      console.log('Response keys:', Object.keys(result || {}))
      console.log('Has answer:', Boolean(result?.answer))
      console.log('Answer type:', typeof result?.answer)
      console.log('Answer value:', result?.answer)
      console.log('Has sources:', Boolean(result?.sources))
      console.log(
        'Sources type:',
        Array.isArray(result?.sources) ? 'array' : typeof result?.sources
      )
      console.log('Sources length:', result?.sources?.length)
      console.log('Full result structure:', JSON.stringify(result, null, 2))
      console.groupEnd()

      if (!result) {
        throw new Error('No response received')
      }

      if (typeof result !== 'object') {
        throw new Error(`Invalid response type: ${typeof result}`)
      }

      if (!('answer' in result)) {
        throw new Error('Response missing answer field')
      }

      if (!('sources' in result)) {
        throw new Error('Response missing sources field')
      }

      if (!Array.isArray(result.sources)) {
        throw new Error('Sources is not an array')
      }

      console.log('Setting response state:', result)
      setResponse(result)
      console.log('Response state set')
      console.groupEnd()

      notifications.show({
        title: 'Success',
        message: 'Query completed successfully',
        color: 'green'
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to execute query'
      setError(message)
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
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

        {response && (
          <div key={query}>
            <Stack mt='xl' gap='lg'>
              <Card withBorder>
                <Stack gap='lg'>
                  <Box>
                    <Text fw={500} mb='sm'>
                      Answer
                    </Text>
                    <Text>{response.answer}</Text>
                  </Box>
                  {response.sources.length > 0 && (
                    <Box>
                      <Text fw={500} mb='sm'>
                        Citation
                      </Text>
                      <Stack gap='xs'>
                        {response.sources.map((source, index) => (
                          <Group key={index} gap='xs' align='center'>
                            <Text size='sm' c='blue'>
                              {index + 1}.
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
            </Stack>
          </div>
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
