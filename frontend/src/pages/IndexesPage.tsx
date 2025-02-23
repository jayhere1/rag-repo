import { useState } from 'react'
import {
  Container,
  Title,
  Button,
  Card,
  Group,
  TextInput,
  Stack,
  Text,
  Tabs
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { indexes } from '../lib/api'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import { modals } from '@mantine/modals'

export default function IndexesPage() {
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

  const deleteIndexMutation = useMutation({
    mutationFn: (indexName: string) => indexes.delete(indexName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes'] })
      notifications.show({
        title: 'Success',
        message: 'Index deleted successfully',
        color: 'green'
      })
    },
    onError: error => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete index',
        color: 'red'
      })
    }
  })

  const handleDeleteIndex = (indexName: string): void => {
    modals.openConfirmModal({
      title: 'Delete Index',
      children: (
        <Text size="sm">
          Are you sure you want to delete the index "{indexName}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteIndexMutation.mutate(indexName)
    })
  }

  const handleIndexClick = (indexName: string) => {
    navigate(`/indexes/${indexName}/documents`)
  }

  return (
    <Container size='lg'>
      <Title order={2} mb='xl'>Index Management</Title>

      <Tabs defaultValue='manage'>
        <Tabs.List>
          <Tabs.Tab value='manage'>Manage Indexes</Tabs.Tab>
          {user?.roles.includes('admin') && (
            <Tabs.Tab value='create'>Create New Index</Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value='manage' pt='xl'>
          <Card withBorder p='xl'>
            {indexList.map((indexName: string) => (
              <Card
                key={indexName}
                shadow='sm'
                p='lg'
                radius='md'
                withBorder
                mb='md'
                style={{ cursor: 'pointer' }}
                onClick={() => handleIndexClick(indexName)}
              >
                <Group justify='apart'>
                  <Text size='lg' fw={500}>
                    {indexName}
                  </Text>
                  <Group>
                    <Button 
                      variant='light' 
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/documents', { state: { selectedIndex: indexName } });
                      }}
                    >
                      View Documents
                    </Button>
                    {user?.roles.includes('admin') && (
                      <Button 
                        variant='light' 
                        color='red' 
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIndex(indexName);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            ))}
            {!isLoading && indexList.length === 0 && (
              <Text ta='center' color='dimmed'>
                No indexes found. Create one to get started.
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        {user?.roles.includes('admin') && (
          <Tabs.Panel value='create' pt='xl'>
            <Card withBorder p='xl'>
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
            </Card>
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  )
}
