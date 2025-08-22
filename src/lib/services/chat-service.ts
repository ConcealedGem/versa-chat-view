import { Message } from '../hooks/use-chat'
import { processStream } from '../utils/stream-helpers'

// 获取认证token并创建headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  // 确保代码在浏览器环境中运行
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    console.log('getAuthHeaders: token found:', token ? 'YES' : 'NO')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  
  return headers
}

// 添加一个全局事件总线，用于触发登录框显示
// export const authEvents = {
//   // 当需要登录时触发
//   onNeedLogin: null as ((callback: () => void) => void) | null,
// }

// 修改 authEvents 的实现
export const authEvents = {
  _listeners: new Set<(callback: () => void) => void>(),
  _retryTimeout: null as NodeJS.Timeout | null,
  _isTriggering: false, // 添加标志，防止在触发过程中移除监听器

  // 添加监听器
  addListener(listener: (callback: () => void) => void) {
    this._listeners.add(listener);
    console.log('authEvents: Listener added. Current listeners count:', this._listeners.size);
  },

  // 移除监听器（智能移除，避免在触发过程中移除）
  removeListener(listener: (callback: () => void) => void) {
    // 如果正在触发登录，延迟移除
    if (this._isTriggering) {
      console.log('authEvents: Delaying listener removal due to active trigger');
      setTimeout(() => {
        this._listeners.delete(listener);
        console.log('authEvents: Listener removed after delay. Current listeners count:', this._listeners.size);
      }, 1000);
    } else {
      this._listeners.delete(listener);
      console.log('authEvents: Listener removed. Current listeners count:', this._listeners.size);
    }
  },

  // 触发登录
  triggerLogin(retryCallback: () => void) {
    console.log('authEvents: Attempting to trigger login. Listeners count:', this._listeners.size);
    
    if (this._listeners.size > 0) {
      this._isTriggering = true;
      // 通知所有监听器
      this._listeners.forEach(listener => {
        try {
          listener(retryCallback);
        } catch (error) {
          console.error('Error in login listener:', error);
        }
      });
      // 重置触发标志
      setTimeout(() => {
        this._isTriggering = false;
      }, 100);
    } else {
      console.warn('No login listeners registered. Login dialog may not appear.');
      // 可以选择抛出错误或者设置重试逻辑
      throw new Error('登录处理程序未设置，无法显示登录弹窗。');
    }
  }
};

/**
 * 发送聊天消息的参数接口
 */
interface SendChatMessageOptions {
  messages: Message[]
  body?: Record<string, unknown>
  controller?: AbortController
  onStart?: (reader: ReadableStreamDefaultReader<Uint8Array>) => void
  onUpdate?: {
    setMessages: (updater: (messages: Message[]) => Message[]) => void
    setReasoning?: (reasoning: string) => void
    setCompletedContent?: (content: string) => void
  }
  onFinish?: () => void
  onError?: (error: Error) => void
}

/**
 * 重新生成消息的参数接口
 */
interface RegenerateMessageOptions {
  messages: Message[]
  assistantMessageIndex: number
  body?: Record<string, unknown>
  setIsLoading: (loading: boolean) => void
  setMessages: (updater: (messages: Message[]) => Message[]) => void
  onError?: (error: Error) => void
}

/**
 * 发送聊天消息到API
 */
export async function sendChatMessage({
  messages,
  body = {},
  controller,
  onStart,
  onUpdate,
  onFinish,
  onError
}: SendChatMessageOptions): Promise<void> {
  try {
    const token = localStorage.getItem('token')
    const headers = getAuthHeaders()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('token found, sending chat message')
    } else {
      console.log('No token found, cannot send chat message')
    }
    const response = await fetch('http://localhost:8000/api/chat/stream', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        messages,
        ...body
      }),
      signal: controller?.signal
    })

    console.log('Response received:', response.status, response.statusText)
    console.log('Response ok:', response.ok)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    // 检查是否未登录（状态码401表示未授权）
    if (response.status === 401) {
      console.log('检测到401未授权状态，准备触发登录弹窗')
      return new Promise((resolve, reject) => {
        authEvents.triggerLogin(() => {
          console.log('登录成功，重新发送请求')
          console.log('Retrying with new token...')
          sendChatMessage({
            messages,
            body,
            controller,
            onStart,
            onUpdate,
            onFinish,
            onError
          }).then(resolve).catch(reject)
        })
      })
    }

    // 检查响应是否包含错误信息
    if (!response.ok) {
      // 尝试解析错误响应
      try {
        const errorData = await response.clone().json()
        // 检查是否包含未登录相关的错误码
        if (errorData.code === 'not_authenticated' || 
            errorData.detail?.includes('用户未登录') || 
            errorData.message?.includes('未登录')) {
          console.log('检测到未登录错误信息，准备触发登录弹窗')
          return new Promise((resolve) => {
            authEvents.triggerLogin(() => {
              console.log('登录成功，重新发送请求')
              sendChatMessage({
                messages,
                body,
                controller,
                onStart,
                onUpdate,
                onFinish,
                onError
              }).then(resolve)
            })
          })
        }
      } catch (parseError) {
        // 解析错误响应失败，继续抛出原始错误
        console.error('解析错误响应失败:', parseError)
      }
      
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    console.log('About to process stream...')
    // 处理事件流
    const reader = response.body?.getReader()
    console.log('Reader obtained:', reader ? 'YES' : 'NO')
    if (!reader) {
      throw new Error('无法读取响应流')
    }
    
    // 通知调用者reader已准备好
    console.log('Calling onStart...')
    onStart?.(reader)
    
    console.log('Starting processStream...')
    // 使用共享的流处理函数
    await processStream(reader, {
      setMessages: onUpdate?.setMessages || (() => {}),
      setReasoning: onUpdate?.setReasoning,
      setCompletedContent: onUpdate?.setCompletedContent
    })

    console.log('Stream processing completed, calling onFinish...')
    onFinish?.()
  } catch (err) {
    const error = err as Error
    onError?.(error)
  }
}

/**
 * 重新生成消息
 */
export function regenerateMessage({
  messages,
  assistantMessageIndex,
  body = {},
  setIsLoading,
  setMessages,
  onError
}: RegenerateMessageOptions): void {
  // 创建一个请求，将历史消息直到但不包括最后一条助手消息
  const messagesToSend = messages.slice(0, assistantMessageIndex)

  // 设置加载状态
  setIsLoading(true)

  // 发送API请求
  fetch('http://localhost:8000/api/chat/stream', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages: messagesToSend,
      ...body
    })
  })
    .then(async response => {
      // 检查是否未登录（状态码401表示未授权）
      if (response.status === 401) {
        console.log('重新生成消息时检测到401未授权状态，准备触发登录弹窗')
        authEvents.triggerLogin(() => {
          console.log('登录成功，重新尝试生成消息')
          regenerateMessage({
            messages,
            assistantMessageIndex,
            body,
            setIsLoading,
            setMessages,
            onError
          })
        })
        return
      }

      // 检查响应是否包含错误信息
      if (!response.ok) {
        // 尝试解析错误响应
        try {
          const errorData = await response.clone().json()
          // 检查是否包含未登录相关的错误码
          if (errorData.code === 'not_authenticated' || 
              errorData.detail?.includes('用户未登录') || 
              errorData.message?.includes('未登录')) {
            console.log('检测到未登录错误信息，准备触发登录弹窗')
            authEvents.triggerLogin(() => {
              console.log('登录成功，重新尝试生成消息')
              regenerateMessage({
                messages,
                assistantMessageIndex,
                body,
                setIsLoading,
                setMessages,
                onError
              })
            })
            return
          }
        } catch (parseError) {
          // 解析错误响应失败，继续抛出原始错误
          console.error('解析错误响应失败:', parseError)
        }
        
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 处理返回的事件流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      // 更新消息状态，将助手消息内容清空，准备接收新内容
      setMessages(currentMessages => {
        const updatedMessages = [...currentMessages]
        if (assistantMessageIndex < updatedMessages.length) {
          updatedMessages[assistantMessageIndex] = {
            ...updatedMessages[assistantMessageIndex],
            content: '',
            reasoning: '',
            sources: []
          }
        }
        return updatedMessages
      })
      
      // 处理流式响应
      processStream(reader, {
        setMessages,
        messageIndex: assistantMessageIndex
      })
        .then(() => {
          setIsLoading(false)
        })
        .catch(error => {
          console.error('Error reading stream:', error)
          setIsLoading(false)
          onError?.(error)
        })
    })
    .catch(error => {
      console.error('Regeneration error:', error)
      setIsLoading(false)
      onError?.(error)
    })
}