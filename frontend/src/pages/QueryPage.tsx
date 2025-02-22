import { useState } from 'react'
import {
  Container,
  Title,
  TextInput,
  Button,
  Stack,
  Card,
  Text,
  Box,
  Loader
} from '@mantine/core'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { documents, QueryResponse } from '../lib/api'
import { notifications } from '@mantine/notifications'

export default function QueryPage () {
  const { indexName = '' } = useParams()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResponse | null>(null)

  const queryMutation = useMutation({
    mutationFn: () =>
      documents.query({
        query,
        index_name: indexName
      }),
    onSuccess: data => {
      setResult(data)
    },
    onError: error => {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to execute query',
        color: 'red'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      queryMutation.mutate()
    }
  }

  return (
    <Container size='lg'>
      <Title order={2} mb='xl'>
        Query {indexName} Documents
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack spacing='md'>
          <TextInput
            label='Your Question'
            placeholder='Ask anything about your documents...'
            value={query}
            onChange={e => setQuery(e.target.value)}
            size='lg'
            required
          />
          <Button
            type='submit'
            loading={queryMutation.isPending}
            disabled={!query.trim()}
            size='lg'
          >
            Ask Question
          </Button>
        </Stack>
      </form>

      {queryMutation.isPending && (
        <Box mt='xl' sx={{ textAlign: 'center' }}>
          <Loader size='xl' />
          <Text mt='md'>Analyzing documents and generating answer...</Text>
        </Box>
      )}

      {result && !queryMutation.isPending && (
        <Stack mt='xl' spacing='lg'>
          <Card withBorder>
            <Title order={3} size='h4' mb='md'>
              Answer
            </Title>
            <Text>{result.answer}</Text>
          </Card>

          <Title order={3} size='h4'>
            Sources
          </Title>
          {result.sources.map((source, index) => (
            <Card key={index} withBorder>
              <Text size='sm' mb='xs' color='dimmed'>
                Source {index + 1}
              </Text>
              <Text>{source.text}</Text>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  )
}
