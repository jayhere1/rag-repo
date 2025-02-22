import { useState } from 'react'
import {
  Container,
  Title,
  Button,
  Group,
  Stack,
  Text,
  Card,
  Tabs
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { documents } from '../lib/api'
import { notifications } from '@mantine/notifications'

export default function DocumentsPage () {
  const { indexName = '' } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string | null>('upload')

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documents.upload(indexName, file),
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

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value='upload'>Upload</Tabs.Tab>
          <Tabs.Tab value='manage'>Manage</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='upload' pt='xl'>
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
                <Text size='xl'>Drag & drop files here or click to select</Text>
                <Text size='sm' color='dimmed'>
                  Accepted file types: PDF, DOC, DOCX, TXT (Max 5MB)
                </Text>
              </Stack>
            </Dropzone>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value='manage' pt='xl'>
          <Card withBorder p='xl'>
            <Text ta='center' color='dimmed'>
              Document management features coming soon...
            </Text>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}
