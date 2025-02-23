import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Card,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Table,
  ActionIcon,
  Loader,
  FileInput,
  MultiSelect,
  Select
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { indexes, documents, Document } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { IconTrash, IconUpload } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<string>('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)

  const { data: indexList = [] } = useQuery({
    queryKey: ['indexes'],
    queryFn: indexes.list
  })

  const fetchAllDocuments = async () => {
    try {
      setIsLoading(true)
      const documentsPromises = indexList.map((indexName: string) => 
        documents.list(indexName).catch(error => {
          console.error(`Error fetching documents for ${indexName}:`, error)
          return { documents: [] }
        })
      )
      const results = await Promise.all(documentsPromises)
      const allDocs = results.flatMap(result => result.documents || [])
      setAllDocuments(allDocs)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch documents',
        color: 'red'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (indexList.length > 0) {
      fetchAllDocuments()
    }
  }, [indexList])

  const handleDelete = async (indexName: string, documentId: string) => {
    try {
      await documents.delete(indexName, documentId)
      notifications.show({
        title: 'Success',
        message: 'Document deleted successfully',
        color: 'green'
      })
      fetchAllDocuments()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete document',
        color: 'red'
      })
    }
  }

  return (
    <Container size='lg'>
      <Stack>
        <Group justify='apart'>
          <Title order={2}>Document Management</Title>
        </Group>

        {user?.roles.includes('admin') && indexList.length > 0 && (
          <Card withBorder p="xl">
            <Stack>
              <Title order={4}>Upload Document</Title>
              <FileInput
                label="Select Document"
                placeholder="Click to select a file"
                value={selectedFile}
                onChange={setSelectedFile}
                accept=".pdf,.doc,.docx,.txt"
                leftSection={<IconUpload size={14} />}
              />
              <Select
                label="Select Index"
                placeholder="Choose an index"
                value={selectedIndex}
                onChange={(value) => setSelectedIndex(value || '')}
                data={indexList.map((index: string) => ({ value: index, label: index }))}
                required
              />
              <MultiSelect
                label="Allowed Roles"
                placeholder="Select roles"
                value={selectedRoles}
                onChange={setSelectedRoles}
                data={['user', 'admin']}
              />
              <MultiSelect
                label="Allowed Users"
                placeholder="Enter usernames"
                value={selectedUsers}
                onChange={setSelectedUsers}
                data={selectedUsers}
                searchable
              />
              <Button
                onClick={async () => {
                  if (!selectedFile || !selectedIndex) return;
                  
                  try {
                    setUploadLoading(true);
                    await documents.upload(selectedIndex, selectedFile, {
                      roles: selectedRoles,
                      users: selectedUsers
                    });
                    notifications.show({
                      title: 'Success',
                      message: 'Document uploaded successfully',
                      color: 'green'
                    });
                    setSelectedFile(null);
                    setSelectedIndex('');
                    setSelectedRoles([]);
                    setSelectedUsers([]);
                    fetchAllDocuments();
                  } catch (error) {
                    notifications.show({
                      title: 'Error',
                      message: error instanceof Error ? error.message : 'Failed to upload document',
                      color: 'red'
                    });
                  } finally {
                    setUploadLoading(false);
                  }
                }}
                loading={uploadLoading}
                disabled={!selectedFile || !selectedIndex || uploadLoading}
              >
                Upload Document
              </Button>
            </Stack>
          </Card>
        )}

        <Card withBorder p='xl'>
        {isLoading ? (
          <Stack align='center' py='xl'>
            <Loader size='lg' />
            <Text>Loading documents...</Text>
          </Stack>
        ) : allDocuments.length === 0 ? (
          <Text ta='center' color='dimmed'>
            No documents found. Upload documents to get started.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Filename</Table.Th>
                <Table.Th>Index</Table.Th>
                <Table.Th>Upload Time</Table.Th>
                <Table.Th>Access</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allDocuments.map(doc => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.metadata.filename}</Table.Td>
                  <Table.Td>
                    <Badge color='blue'>
                      {doc.metadata.index_name}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(doc.metadata.upload_time).toLocaleString()}
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
                    <Group gap='xs'>
                      {user?.roles.includes('admin') && (
                        <ActionIcon
                          color='red'
                          variant='subtle'
                          onClick={() => handleDelete(doc.metadata.index_name, doc.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
      </Stack>
    </Container>
  )
}
