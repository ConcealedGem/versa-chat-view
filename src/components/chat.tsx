'use client'

import { CHAT_ID } from '@/lib/constants'
import { Message, useChat } from '@/lib/hooks/use-chat'
import { authEvents, regenerateMessage } from '@/lib/services/chat-service'
import { Model } from '@/lib/types/models'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { toast } from 'sonner'
import { CanvasViewer } from './canvas-viewer'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'
import { HeaderMenu } from './header-menu'
import { LoginModal } from './login-modal'
import { ToolsPanel } from './tools-panel'

export function Chat({
  id,
  savedMessages = [],
  query,
  models
}: {
  id: string
  savedMessages?: Message[]
  query?: string
  models?: Model[]
}) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginCallback, setLoginCallback] = useState<(() => void) | null>(null)
  const [currentAssistant, setCurrentAssistant] = useState<{ id: string; name: string; description: string } | null>(null)
  
  // 左侧面板宽度百分比状态 (初始40%)
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const toolsPanelRef = useRef<{ refreshTools: () => void } | null>(null)

  // 组件顶部 state 区域增加
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  // 新增：思考过程显示状态
  const [showReasoning, setShowReasoning] = useState(true)
  const toggleShowReasoning = () => setShowReasoning(v => !v)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    stop,
    append,
    data,
    setData,
    setIsLoading,
    sendMessage
  } = useChat({
    initialMessages: savedMessages,
    id: CHAT_ID,
    body: {
      id
    },
    onFinish: () => {
      window.history.replaceState({}, '', `/chat/${id}`)
    },
    onError: (error: Error) => {
      console.error('聊天错误:', error)
      
      // 检查是否是网络连接错误
      const isNetworkError = error.message.includes('ERR_CONNECTION_REFUSED') ||
                            error.message.includes('fetch') ||
                            error.message.includes('Network') ||
                            error.message.includes('服务器') ||
                            error.message.includes('HTTP error')
      
      // 显示toast提示
      toast.error(`聊天错误: ${error.message}`)
      
      // 如果是网络错误或服务器错误，添加错误消息到对话框
      if (isNetworkError || error.message.includes('500') || error.message.includes('503')) {
        setMessages(currentMessages => {
          // 检查最后一条消息是否已经是错误消息
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
            // 更新最后一条空的助手消息为错误消息
            const updatedMessages = [...currentMessages]
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: '服务器连接异常，请稍后再试。',
              isError: true
            }
            return updatedMessages
          } else {
            // 添加新的错误消息
            return [...currentMessages, {
              role: 'assistant',
              content: '服务器连接异常，请稍后再试。',
              isError: true
            }]
          }
        })
      }
    }
  })

  // 请求体
  const requestBody = {
    id
  }

  // 使用ref来追踪初始渲染
  const initialRenderRef = useRef(true)

  // 获取当前助手信息
  const fetchCurrentAssistant = useCallback(async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      if (data.success && data.data.active) {
        setCurrentAssistant(data.data.active)
      }
    } catch (error) {
      console.error('获取当前助手信息失败:', error)
    }
  }, [])

  // 处理工具状态更新
  const handleToolStatusUpdate = useCallback((toolName: string, status: string) => {
    console.log(`工具状态更新: ${toolName} -> ${status}`)
    // 这里可以添加其他状态更新逻辑，比如通知其他组件
  }, [])

  // 刷新工具列表的回调
  const handleRefreshTools = useCallback(() => {
    console.log('Chat: handleRefreshTools 被调用');
    fetchCurrentAssistant();
    
    // 通知 ToolsPanel 刷新工具列表
    console.log('Chat: 通知 ToolsPanel 刷新');
    
    // 尝试两种方法：ref 调用和事件派发
    if (toolsPanelRef.current) {
      console.log('Chat: 使用 ref 直接调用 ToolsPanel 刷新');
      toolsPanelRef.current.refreshTools();
    } else {
      console.log('Chat: ref 不可用，使用事件方式');
      window.dispatchEvent(new CustomEvent('refreshTools'));
    }
  }, [fetchCurrentAssistant])

  // 注册登录事件处理
  useEffect(() => {
    const handleNeedLogin = (callback: () => void) => {
      console.log('Chat.tsx: Login dialog triggered');
      setShowLoginModal(true);
      setLoginCallback(() => callback);
    };

    // 注册监听器
    authEvents.addListener(handleNeedLogin);
    console.log('Chat.tsx: Login listener registered');

    // 清理函数
    return () => {
      authEvents.removeListener(handleNeedLogin);
      console.log('Chat.tsx: Cleanup initiated');
    };
  }, []); // 空依赖数组确保只在组件挂载和卸载时运行

  // 处理登录成功
  const handleLoginSuccess = () => {
    console.log('Chat.tsx: Login success, hiding modal');
    setShowLoginModal(false);
    if (loginCallback) {
      console.log('Chat.tsx: Executing retry callback');
      loginCallback();
      setLoginCallback(null);
    }
  };

  // 只在初始渲染或id变化时更新消息
  useEffect(() => {
    if (initialRenderRef.current) {
      setMessages(savedMessages)
      initialRenderRef.current = false
      // 初始化时获取当前助手信息
      fetchCurrentAssistant()
    }
  }, [id, setMessages, fetchCurrentAssistant]);

  const onQuerySelect = (query: string) => {
    append({
      role: 'user',
      content: query
    })
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // 确保在提交前输入不为空
    if (!input.trim()) {
      return
    }
    setData(undefined) // reset data to clear tool call
    handleSubmit(e)
  }

  // 重新生成上一条消息的功能
  const handleRegenerate = () => {
    if (messages.length < 2 || isLoading) return

    // 找到最后一个助手消息和用户消息
    const reversedMessages = [...messages].reverse()
    const lastAssistantIndex = reversedMessages.findIndex(
      m => m.role === 'assistant'
    )
    const lastUserIndex = reversedMessages.findIndex(m => m.role === 'user')

    // 确保找到了用户和助手消息
    if (lastAssistantIndex === -1 || lastUserIndex === -1) return

    // 将助手消息标记为正在重新生成
    const assistantMessageIndex = messages.length - 1 - lastAssistantIndex

    // 获取需要重新提交的用户消息
    const userMessageIndex = messages.length - 1 - lastUserIndex
    const userMessageToResend = messages[userMessageIndex]

    // 初始化一个新的API请求
    setData(undefined)

    // 向API发送请求，使用相同的用户消息触发新的回复
    if (userMessageToResend) {
      // 使用聊天服务重新生成消息
      regenerateMessage({
        messages,
        assistantMessageIndex,
        body: requestBody,
        setIsLoading,
        setMessages,
        onError: (error) => {
          console.error('重新生成失败:', error)
          
          // 检查是否是网络连接错误
          const isNetworkError = error.message.includes('ERR_CONNECTION_REFUSED') ||
                                error.message.includes('fetch') ||
                                error.message.includes('Network') ||
                                error.message.includes('服务器') ||
                                error.message.includes('HTTP error')
          
          // 显示toast提示
          toast.error(`重新生成失败: ${error.message}`)
          
          // 如果是网络错误或服务器错误，更新消息为错误状态
          if (isNetworkError || error.message.includes('500') || error.message.includes('503')) {
            setMessages(currentMessages => {
              const updatedMessages = [...currentMessages]
              if (assistantMessageIndex < updatedMessages.length) {
                updatedMessages[assistantMessageIndex] = {
                  ...updatedMessages[assistantMessageIndex],
                  content: '服务器连接异常，请稍后再试。',
                  isError: true
                }
              }
              return updatedMessages
            })
          }
        }
      })
    }
  }

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  // 处理拖拽过程
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newWidthPercent = ((e.clientX - rect.left) / rect.width) * 100

    // 限制宽度范围在20%到80%之间
    const clampedWidth = Math.min(Math.max(newWidthPercent, 20), 80)
    setLeftPanelWidth(clampedWidth)
  }, [isDragging])

  // 处理拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="flex h-screen w-full bg-white dark:bg-zinc-900"> {/* Main container: horizontal flex, full screen height */}
      {/* 左侧面板（动态宽度或全宽） */}
      <div
        className="relative flex flex-col h-full border-r border-gray-200 dark:border-zinc-700"
        style={{ width: rightPanelCollapsed ? '100%' : `${leftPanelWidth}%` }}
      >
        {/* 悬浮按钮组，右上角，横向排列 */}
        <div className="absolute top-2 right-2 z-50 flex flex-row-reverse gap-2 items-center">
          {/* 缩进/展开按钮 */}
          <button
            onClick={() => setRightPanelCollapsed(v => !v)}
            className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors duration-200 flex items-center justify-center shadow-md"
            title={rightPanelCollapsed ? '展开右侧' : '收起右侧'}
          >
            {rightPanelCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </button>
          {/* 思考过程按钮 */}
          <button
            onClick={toggleShowReasoning}
            className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors duration-200 flex items-center justify-center shadow-md"
            title={showReasoning ? '隐藏思考过程' : '显示思考过程'}
            aria-label="切换显示思考过程"
          >
            {showReasoning ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
          </button>
        </div>
        {/* Chat Messages Area (Scrollable) */}
        <div className="flex-grow overflow-y-auto pt-14"> {/* pt-14 to maintain top spacing */}
          <ChatMessages
            messages={messages}
            data={data}
            onQuerySelect={onQuerySelect}
            isLoading={isLoading}
            chatId={id}
            onRegenerate={handleRegenerate}
            isFullWidth={rightPanelCollapsed}
            showReasoning={showReasoning}
          />
        </div>

        {/* Chat Panel Area (at the bottom of Left Panel) */}
        <div className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <ChatPanel
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            messages={messages}
            setMessages={setMessages}
            stop={stop}
            query={query}
            append={append}
            models={models}
            sendMessage={sendMessage}
            isFullWidth={rightPanelCollapsed}
          />
        </div>
      </div>
      {/* 分割条和右侧面板，只有在未缩进时显示 */}
      {!rightPanelCollapsed && (
        <>
          <div
            className={`w-1 bg-gray-200 dark:bg-zinc-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors relative group ${isDragging ? 'bg-blue-500 dark:bg-blue-400' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-300 transition-colors rounded-full opacity-0 group-hover:opacity-100" />
          </div>
          <div className="flex flex-col h-full" style={{ width: `${100 - leftPanelWidth}%` }}>
            <div className="p-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 shadow-sm flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Observability is essential to agency.</h2>
              <HeaderMenu
                onLogin={() => setShowLoginModal(true)}
                onLogout={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user_id');
                  localStorage.removeItem('username');
                  toast.success('已退出登录');
                  window.dispatchEvent(new CustomEvent('loginStatusChanged'));
                }}
                onClearCache={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  toast.success('缓存已清空');
                  window.location.reload();
                }}
                onAssistantChange={(assistant) => {
                  setCurrentAssistant(assistant);
                  handleRefreshTools();
                }}
              />
            </div>
            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-zinc-700">
              <ToolsPanel
                onStatusUpdate={handleToolStatusUpdate}
                currentAssistant={currentAssistant || undefined}
                onRefreshTools={handleRefreshTools}
              />
            </div>
            <div className="flex-grow overflow-auto p-4">
              <CanvasViewer />
            </div>
          </div>
        </>
      )}
      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}
