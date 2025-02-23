import { useState } from 'react'
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Stack,
  Text
} from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifications } from '@mantine/notifications'

export default function LoginPage () {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(username, password)
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green'
      })
      // Navigate to the protected page user was trying to access, or default to /indexes
      const destination = location.state?.from?.pathname || '/indexes'
      navigate(destination)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Invalid username or password',
        color: 'red'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container size={420} my={40}>
      <Title
        ta='center'
        styles={(theme: { fontFamily: string }) => ({
          root: {
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900
          }
        })}
      >
        Welcome back!
      </Title>
      <Text color='dimmed' size='sm' ta='center' mt={5}>
        Use your credentials to access the RAG application
      </Text>

      <Paper withBorder shadow='md' p={30} mt={30} radius='md'>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label='Username'
              placeholder='Your username'
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <PasswordInput
              label='Password'
              placeholder='Your password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Button type='submit' loading={isLoading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
