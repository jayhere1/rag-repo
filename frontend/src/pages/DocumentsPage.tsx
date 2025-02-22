import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Button,
  Group,
  Stack,
  Text,
  Card,
  Tabs,
  TextInput,
  MultiSelect,
  Box,
  Table,
  ActionIcon,
  Badge,
  Pagination,
  Loader
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { Dropzone } from '@mantine/dropzone'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { documents, Document } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { notifications } from '@mantine/notifications'

export default function DocumentsPage () {
  const { user } = useAuth()
  const { indexName = '' } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string | null>('upload')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [newUser, setNewUser] = useState('')
  const [documentsList, setDocumentsList] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await documents.list(indexName, page)
      setDocumentsList(response.documents)
      setTotalPages(Math.ceil(response.documents.length / 10))
    } catch (error) {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to fetch documents',
        color: 'red'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [indexName, page])

  const handleDelete = async (documentId: string) => {
    try {
      await documents.delete(indexName, documentId)
      notifications.show({
        title: 'Success',
        message: 'Document deleted successfully',
        color: 'green'
      })
      fetchDocuments()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to delete document',
        color: 'red'
      })
    }
  }

  const handleAddUser = () => {
    if (newUser && !selectedUsers.includes(newUser)) {
      setSelectedUsers([...selectedUsers, newUser])
      setNewUser('')
    }
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      documents.upload(indexName, file, {
        roles: selectedRoles,
        users: selectedUsers
      }),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Document uploaded successfully',
        color: 'green'
      })
    },
    onError: error => {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to upload document',
        color: 'red'
      })
    }
  })

  const handleDrop = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate(files[0])
    }
  }

  return (
    <Container size='lg'>
      <Group justify='apart' mb='xl'>
        <Title order={2}>{indexName} Documents</Title>
        <Button onClick={() => navigate(`/indexes/${indexName}/query`)}>
          Query Documents
        </Button>
      </Group>

      {user?.roles.includes('admin') ? (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value='upload'>Upload</Tabs.Tab>
            <Tabs.Tab value='manage'>Manage</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='upload' pt='xl'>
            <Stack>
              <Card withBorder p='xl'>
                <Stack gap='md'>
                  <MultiSelect
                    label='Allowed Roles'
                    placeholder='Select roles that can access this document'
                    data={['user', 'admin', 'manager']}
                    value={selectedRoles}
                    onChange={setSelectedRoles}
                  />

                  <Box>
                    <Group align='flex-end' gap='sm'>
                      <TextInput
                        label='Allowed Users'
                        placeholder='Enter username'
                        value={newUser}
                        onChange={e => setNewUser(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button onClick={handleAddUser}>Add User</Button>
                    </Group>
                    {selectedUsers.length > 0 && (
                      <Group mt='xs' gap='xs'>
                        {selectedUsers.map(user => (
                          <Button
                            key={user}
                            variant='light'
                            size='xs'
                            rightSection='×'
                            onClick={() =>
                              setSelectedUsers(
                                selectedUsers.filter(u => u !== user)
                              )
                            }
                          >
                            {user}
                          </Button>
                        ))}
                      </Group>
                    )}
                  </Box>
                </Stack>
              </Card>

              <Card withBorder p='xl'>
                <Dropzone
                  onDrop={handleDrop}
                  maxSize={5 * 1024 ** 2} // 5MB
                  accept={{
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                      ['.docx'],
                    'text/plain': ['.txt']
                  }}
                  loading={uploadMutation.isPending}
                >
                  <Stack align='center' gap='xs'>
                    <Text size='xl'>
                      Drag & drop files here or click to select
                    </Text>
                    <Text size='sm' color='dimmed'>
                      Accepted file types: PDF, DOC, DOCX, TXT (Max 5MB)
                    </Text>
                  </Stack>
                </Dropzone>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value='manage' pt='xl'>
            <Card withBorder p='xl'>
              {isLoading ? (
                <Stack align='center' py='xl'>
                  <Loader size='lg' />
                  <Text>Loading documents...</Text>
                </Stack>
              ) : documentsList.length === 0 ? (
                <Text ta='center' color='dimmed'>
                  No documents found in this index.
                </Text>
              ) : (
                <Stack>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Filename</Table.Th>
                        <Table.Th>Upload Time</Table.Th>
                        <Table.Th>Access</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {documentsList.map(doc => (
                        <Table.Tr key={doc.id}>
                          <Table.Td>{doc.metadata.filename}</Table.Td>
                          <Table.Td>
                            {new Date(
                              doc.metadata.upload_time
                            ).toLocaleString()}
                          </Table.Td>
                          <Table.Td>
                            <Group gap='xs'>
                              {doc.metadata.allowed_roles.map(role => (
                                <Badge key={role} size='sm'>
                                  {role}
                                </Badge>
                              ))}
                              {doc.metadata.allowed_users.length > 0 && (
                                <Badge size='sm' color='violet'>
                                  {doc.metadata.allowed_users.length} users
                                </Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              color='red'
                              variant='subtle'
                              onClick={() => handleDelete(doc.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  {totalPages > 1 && (
                    <Group justify='center' mt='md'>
                      <Pagination
                        value={page}
                        onChange={setPage}
                        total={totalPages}
                      />
                    </Group>
                  )}
                </Stack>
              )}
            </Card>
          </Tabs.Panel>
        </Tabs>
      ) : (
        <Card withBorder p='xl'>
          <Stack align='center' py='xl'>
            <Text size='lg' fw={500} color='dimmed'>
              Document Management
            </Text>
            <Text ta='center' color='dimmed'>
              Only administrators can manage documents in this index.
            </Text>
            <Button
              variant='light'
              onClick={() => navigate(`/indexes/${indexName}/query`)}
            >
              Go to Query Page
            </Button>
          </Stack>
        </Card>
      )}
    </Container>
  )
}
