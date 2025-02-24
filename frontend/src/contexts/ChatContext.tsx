import React, { createContext, useContext, useState, useEffect } from 'react'
import { documents } from '../lib/api'
import { notifications } from '@mantine/notifications'
import { useAuth } from './AuthContext'

interface ChatMessage {
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    text: string
    metadata: Record<string, any>
    relevance?: number
  }>
}

interface ChatSession {
  id: string
  name: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

interface ChatContextType {
  sessions: Record<string, ChatSession>
  currentSessionId: string
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  createNewSession: () => void
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void
  deleteSession: (sessionId: string) => void
  clearChat: () => void
  sendMessage: (message: string, indexName?: string) => Promise<void>
  setCurrentSessionId: (id: string) => void
  pageType: 'chat' | 'query'
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider ({
  children,
  pageType
}: {
  children: React.ReactNode
  pageType: 'chat' | 'query'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({})

  // Initialize or clear sessions based on auth state and page type
  useEffect(() => {
    // Clear existing sessions when page type changes
    setSessions({})
    setCurrentSessionId('')

    if (user) {
      const saved = localStorage.getItem(`${pageType}Sessions`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const convertedSessions = Object.fromEntries(
            Object.entries(parsed).map(([id, session]: [string, any]) => [
              id,
              {
                ...session,
                messages: session.messages.map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                })),
                createdAt: new Date(session.createdAt),
                updatedAt: new Date(session.updatedAt)
              }
            ])
          )
          setSessions(convertedSessions)

          // Set current session to first available or create new one
          if (Object.keys(convertedSessions).length > 0) {
            setCurrentSessionId(Object.keys(convertedSessions)[0])
          } else {
            const newSessionId = new Date().toISOString()
            const newSession = {
              id: newSessionId,
              name: 'New Chat',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date()
            }
            setSessions({ [newSessionId]: newSession })
            setCurrentSessionId(newSessionId)
            localStorage.setItem(
              `${pageType}Sessions`,
              JSON.stringify({ [newSessionId]: newSession })
            )
          }
        } catch (e) {
          console.error('Failed to parse chat sessions:', e)
          setSessions({})
        }
      } else {
        // Create initial session if none exists
        const newSessionId = new Date().toISOString()
        const newSession = {
          id: newSessionId,
          name: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
        setSessions({ [newSessionId]: newSession })
        setCurrentSessionId(newSessionId)
        localStorage.setItem(
          `${pageType}Sessions`,
          JSON.stringify({ [newSessionId]: newSession })
        )
      }
    } else {
      // Clear sessions when not logged in
      setSessions({})
      setCurrentSessionId('')
      localStorage.removeItem(`${pageType}Sessions`)
    }
  }, [user, pageType])

  const messages = sessions[currentSessionId]?.messages || []

  useEffect(() => {
    if (Object.keys(sessions).length > 0) {
      localStorage.setItem(`${pageType}Sessions`, JSON.stringify(sessions))
    }
  }, [sessions])

  const createNewSession = () => {
    const newSessionId = new Date().toISOString()
    setSessions(prev => ({
      ...prev,
      [newSessionId]: {
        id: newSessionId,
        name: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }))
    setCurrentSessionId(newSessionId)
  }

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        ...updates,
        updatedAt: new Date()
      }
    }))
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = { ...prev }
      delete newSessions[sessionId]
      return newSessions
    })
    if (sessionId === currentSessionId) {
      const remainingIds = Object.keys(sessions)
      if (remainingIds.length > 0) {
        setCurrentSessionId(remainingIds[0])
      } else {
        createNewSession()
      }
    }
  }

  const clearChat = () => {
    updateSession(currentSessionId, { messages: [] })
    setError(null)
  }

  const sendMessage = async (message: string, indexName?: string) => {
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setLoading(true)
    setError(null)

    const newMessages = [
      ...messages,
      {
        type: 'user' as const,
        content: userMessage,
        timestamp: new Date()
      }
    ]
    updateSession(currentSessionId, { messages: newMessages })

    try {
      const result = await documents.query({
        query: userMessage,
        ...(indexName ? { index_name: indexName } : {})
      })

      if (!result?.answer) {
        throw new Error('No response received')
      }

      updateSession(currentSessionId, {
        messages: [
          ...newMessages,
          {
            type: 'assistant',
            content: result.answer,
            timestamp: new Date(),
            sources: result.sources
          }
        ]
      })

      notifications.show({
        title: 'Success',
        message: 'Message sent successfully',
        color: 'green'
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSessionId,
        messages,
        loading,
        error,
        createNewSession,
        updateSession,
        deleteSession,
        clearChat,
        sendMessage,
        setCurrentSessionId,
        pageType
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat () {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
