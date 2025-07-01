import { useCallback, useState } from 'react'
import { sendChatMessage } from '../services/chat-service'
import { createEmptyAssistantMessage } from '../utils/stream-helpers'

export interface Message {
  id?: string
  content: string | Array<{
    type: 'text' | 'image_url' | 'file'
    text?: string
    image_url?: {
      url: string
      detail?: 'low' | 'high' | 'auto'
    }
    file?: {
      name: string
      url: string
    }
  }>
  role: 'user' | 'assistant' | 'system'
  reasoning?: string
  sources?: Array<{name: string, url: string}>
  isError?: boolean
}

type ChatData = Record<string, unknown>

interface UseChatOptions {
  initialMessages?: Message[]
  id?: string
  body?: Record<string, unknown>
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
  sendExtraMessageFields?: boolean
}

export function useChat({
  initialMessages = [],
  id: _id, // eslint-disable-line @typescript-eslint/no-unused-vars
  body,
  onFinish,
  onError,
  sendExtraMessageFields: _sendExtraMessageFields // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ChatData | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>()
  const [reasoning, setReasoning] = useState<string>('')
  // 用于内部追踪完整内容
  const [_completedContent, _setCompletedContent] = useState<string>('') // eslint-disable-line @typescript-eslint/no-unused-vars
  // 用于中止请求的控制器
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const append = useCallback((message: Message) => {
    setMessages(msgs => [...msgs, message])
  }, [])

  // 用于追踪 reader 状态
  const [reader, setReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  const stop = useCallback(() => {
    setIsLoading(false)
    // 中止正在进行的请求
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    // 关闭流
    if (reader) {
      reader.cancel().catch(console.error)
      setReader(null)
    }
  }, [abortController, reader])

  // 新增：发送消息的函数，支持复杂内容格式
  const sendMessage = useCallback(async (message: Message) => {
    // 清空输入框和思考过程
    setInput('')
    setReasoning('')
    _setCompletedContent('')

    // 设置加载状态
    setIsLoading(true)

    // 使用setTimeout来避免在渲染期间更新状态
    setTimeout(async () => {
      try {
        // 构建传递给API的消息数组（包括新的用户消息）
        const messagesToSend = [...messages, message]

        // 创建新的AbortController用于此次请求
        const controller = new AbortController()
        setAbortController(controller)

        // 预先创建助手消息
        const assistantMessage = createEmptyAssistantMessage()
        
        // 一次性更新消息状态，包含用户消息和空助手消息
        setMessages(currentMessages => [...currentMessages, message, assistantMessage])

        // 使用聊天服务发送消息
        await sendChatMessage({
          messages: messagesToSend,
          body,
          controller,
          onStart: (newReader) => {
            setReader(newReader)
          },
          onUpdate: {
            setMessages,
            setReasoning,
            setCompletedContent: _setCompletedContent
          },
          onFinish: () => {
            setIsLoading(false)
            // 获取当前最后一条助手消息
            setMessages(currentMessages => {
              const lastMessage = currentMessages[currentMessages.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                onFinish?.(lastMessage)
              }
              return currentMessages
            })
          },
          onError: (err) => {
            setIsLoading(false)
            setError(err)
            onError?.(err)
          }
        })
      } catch (err) {
        setIsLoading(false)
        const error = err as Error
        setError(error)
        onError?.(error)
      }
    }, 0)
  }, [messages, body, onFinish, onError])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!input.trim()) {
        return
      }

      const userMessage: Message = {
        role: 'user',
        content: input
      }

      // 清空输入框和思考过程
      setInput('')
      setReasoning('')
      _setCompletedContent('')

      // 设置加载状态
      setIsLoading(true)

      // 使用setTimeout来避免在渲染期间更新状态
      setTimeout(async () => {
        try {
          // 构建传递给API的消息数组（包括新的用户消息）
          const messagesToSend = [...messages, userMessage]

          // 创建新的AbortController用于此次请求
          const controller = new AbortController()
          setAbortController(controller)

          // 预先创建助手消息
          const assistantMessage = createEmptyAssistantMessage()
          
          // 一次性更新消息状态，包含用户消息和空助手消息
          setMessages(currentMessages => [...currentMessages, userMessage, assistantMessage])

          // 使用聊天服务发送消息
          await sendChatMessage({
            messages: messagesToSend,
            body,
            controller,
            onStart: (newReader) => {
              setReader(newReader)
            },
            onUpdate: {
              setMessages,
              setReasoning,
              setCompletedContent: _setCompletedContent
            },
            onFinish: () => {
              setIsLoading(false)
              // 获取当前最后一条助手消息
              setMessages(currentMessages => {
                const lastMessage = currentMessages[currentMessages.length - 1]
                if (lastMessage && lastMessage.role === 'assistant') {
                  onFinish?.(lastMessage)
                }
                return currentMessages
              })
            },
            onError: (err) => {
              setIsLoading(false)
              setError(err)
              onError?.(err)
            }
          })
        } catch (err) {
          setIsLoading(false)
          const error = err as Error
          setError(error)
          onError?.(error)
        }
      }, 0)
    },
    [input, messages, body, onFinish, onError]
  )

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    data,
    setData,
    error,
    append,
    stop,
    setMessages,
    reasoning,
    setIsLoading,
    sendMessage
  }
}
