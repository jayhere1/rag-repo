import { useState } from 'react'
import {
  TextInput,
  Box,
  ActionIcon,
  Group,
  Paper,
  Tabs,
  Container,
  Button,
  Text,
  Overlay
} from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { documents } from '../lib/api'
import { notifications } from '@mantine/notifications'
import { 
  IconSend, 
  IconMicrophone, 
  IconHistory,
  IconTrash,
  IconUpload,
  IconSettings
} from '@tabler/icons-react'

export default function ChatPage() {
  const { indexName } = useParams()
  const [message, setMessage] = useState('')
  const { user } = useAuth()

  const chatMutation = useMutation({
    mutationFn: () =>
      documents.query({
        query: message,
        ...(indexName ? { index_name: indexName } : {})
      }),
    onSuccess: () => {
      setMessage('')
    },
    onError: error => {
      notifications.show({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to send message',
        color: 'red'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      chatMutation.mutate()
    }
  }

  return (
    <Container size="xl" p={0} h="calc(100vh - 60px)" style={{ position: 'relative' }}>
      <Group justify="flex-end" mb="md" gap="sm">
        <Button 
          variant="light" 
          color="gray"
          leftSection={<IconHistory size={20} />}
          onClick={() => {/* TODO: Implement chat history */}}
        >
          Open chat history
        </Button>
        <Button 
          variant="light" 
          color="gray"
          leftSection={<IconTrash size={20} />}
          onClick={() => {/* TODO: Implement clear chat */}}
        >
          Clear chat
        </Button>
        <Button 
          variant="light" 
          color="gray"
          leftSection={<IconUpload size={20} />}
          onClick={() => {/* TODO: Implement file uploads */}}
        >
          Manage file uploads
        </Button>
        <Button 
          variant="light" 
          color="gray"
          leftSection={<IconSettings size={20} />}
          onClick={() => {/* TODO: Implement settings */}}
        >
          Developer settings
        </Button>
      </Group>
      <Box mt="xl">
        <form onSubmit={handleSubmit}>
        <Paper
          shadow="md"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            padding: '10px'
          }}
        >
          <Group>
            <TextInput
              placeholder={user ? "Ask questions from your DATA" : "Please log in to start chatting"}
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ flex: 1 }}
              disabled={!user}
              rightSection={
                <Group gap={8} mr={4}>
                  <ActionIcon 
                    variant="subtle" 
                    color="gray"
                    size="lg"
                    onClick={() => {/* TODO: Implement voice input */}}
                    disabled={!user}
                  >
                    <IconMicrophone size={20} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="filled" 
                    color="blue"
                    size="lg"
                    type="submit"
                    disabled={!user || !message.trim() || chatMutation.isPending}
                  >
                    <IconSend size={20} />
                  </ActionIcon>
                </Group>
              }
              styles={{
                input: {
                  paddingRight: '100px'
                }
              }}
            />
          </Group>
        </Paper>
        </form>
      </Box>
    </Container>
  );
}
