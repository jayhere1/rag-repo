import { useState } from 'react'
import {
  Container,
  Title,
  Button,
  Card,
  Group,
  TextInput,
  Stack,
  Modal,
  Text
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { indexes } from '../lib/api'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'

export default function IndexesPage () {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newIndexName, setNewIndexName] = useState('')
  const [newIndexDescription, setNewIndexDescription] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: indexList = [], isLoading } = useQuery({
    queryKey: ['indexes'],
    queryFn: indexes.list
  })

  const createIndexMutation = useMutation({
    mutationFn: (variables: { name: string; description: string }) =>
      indexes.create(variables.name, variables.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes'] })
      setIsCreateModalOpen(false)
      setNewIndexName('')
      setNewIndexDescription('')
      notifications.show({
        title: 'Success',
        message: 'Index created successfully',
        color: 'green'
      })
    },
    onError: error => {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to create index',
        color: 'red'
      })
    }
  })

  const handleCreateIndex = (e: React.FormEvent) => {
    e.preventDefault()
    createIndexMutation.mutate({
      name: newIndexName,
      description: newIndexDescription
    })
  }

  const handleIndexClick = (indexName: string) => {
    navigate(`/indexes/${indexName}/documents`)
  }

  return (
    <Container size='lg'>
      <Group position='apart' mb='xl'>
        <Title order={2}>Document Indexes</Title>
        {user?.roles.includes('admin') && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create New Index
          </Button>
        )}
      </Group>

      <Stack spacing='md'>
        {indexList.map(indexName => (
          <Card
            key={indexName}
            shadow='sm'
            p='lg'
            radius='md'
            withBorder
            sx={{ cursor: 'pointer' }}
            onClick={() => handleIndexClick(indexName)}
          >
            <Text size='lg' weight={500}>
              {indexName}
            </Text>
          </Card>
        ))}
        {!isLoading && indexList.length === 0 && (
          <Text color='dimmed' align='center'>
            No indexes found. Create one to get started.
          </Text>
        )}
      </Stack>

      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Create New Index'
      >
        <form onSubmit={handleCreateIndex}>
          <Stack>
            <TextInput
              label='Index Name'
              placeholder='Enter index name'
              value={newIndexName}
              onChange={e => setNewIndexName(e.target.value)}
              required
            />
            <TextInput
              label='Description'
              placeholder='Enter index description'
              value={newIndexDescription}
              onChange={e => setNewIndexDescription(e.target.value)}
            />
            <Button
              type='submit'
              loading={createIndexMutation.isPending}
              fullWidth
            >
              Create Index
            </Button>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}
