'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface Assistant {
  id: string
  name: string
  status: string
  description: string
  'use-type': string[]
}

interface AssistantsResponse {
  success: boolean
  data: {
    assistants: Assistant[]
    active: Assistant
  }
  message: string
}

interface HeaderMenuProps {
  onLogin: () => void
  onLogout: () => void
  onClearCache: () => void
  onAssistantChange?: (assistant: Assistant) => void
}

export function HeaderMenu({ onLogin, onLogout, onClearCache, onAssistantChange }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [activeAssistant, setActiveAssistant] = useState<Assistant | null>(null)
  const [showAssistantSubmenu, setShowAssistantSubmenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 获取助手列表
  const fetchAssistants = useCallback(async () => {
    try {
      console.log('开始获取助手列表...')
      const response = await fetch('http://localhost:8000/api/assistants')
      const data: AssistantsResponse = await response.json()
      
      console.log('助手 API 响应:', data)
      
      if (data.success) {
        console.log('助手列表:', data.data.assistants)
        console.log('当前助手:', data.data.active)
        setAssistants(data.data.assistants)
        setActiveAssistant(data.data.active)
        toast.success(`成功获取 ${data.data.assistants.length} 个助手`)
      } else {
        console.error('API 返回失败:', data.message)
        toast.error('获取助手列表失败: ' + data.message)
      }
    } catch (error) {
      console.error('获取助手列表错误:', error)
      toast.error('获取助手列表失败: ' + (error as Error).message)
    }
  }, [])

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      setIsLoggedIn(!!token)
    }
    
    checkLoginStatus()
    
    // 监听存储变化，响应登录状态更新
    const handleStorageChange = () => {
      checkLoginStatus()
    }
    
    // 监听自定义登录状态变化事件
    const handleLoginStatusChange = () => {
      checkLoginStatus()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('loginStatusChanged', handleLoginStatusChange)
    
    // 定期检查登录状态（作为备用方案）
    const interval = setInterval(checkLoginStatus, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('loginStatusChanged', handleLoginStatusChange)
      clearInterval(interval)
    }
  }, [])

  // 初始化时获取助手列表
  useEffect(() => {
    fetchAssistants()
  }, [])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowAssistantSubmenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 切换助手
  const switchAssistant = useCallback(async (assistantId: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/assistants/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'assistant-id': assistantId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('助手切换成功')
        // 重新获取助手信息
        await fetchAssistants()
        
        // 获取切换后的助手信息并通知父组件
        try {
          const assistantResponse = await fetch('http://localhost:8000/api/assistants')
          const assistantData = await assistantResponse.json()
          
          if (assistantData.success && assistantData.data.active) {
            console.log('HeaderMenu: 准备通知父组件助手切换:', assistantData.data.active);
            onAssistantChange?.(assistantData.data.active)
            console.log('HeaderMenu: 已通知父组件助手切换完成');
          }
        } catch (error) {
          console.error('获取切换后助手信息失败:', error)
        }
        
        setIsOpen(false)
        setShowAssistantSubmenu(false)
      } else {
        toast.error('助手切换失败')
      }
    } catch (error) {
      console.error('切换助手错误:', error)
      toast.error('切换助手失败')
    }
  }, [fetchAssistants, onAssistantChange])

  // 处理登录/退出
  const handleAuthAction = () => {
    if (isLoggedIn) {
      onLogout()
      setIsLoggedIn(false)
    } else {
      onLogin()
    }
    setIsOpen(false)
  }

  // 处理清空缓存
  const handleClearCache = () => {
    onClearCache()
    setIsOpen(false)
  }

  // 处理切换助手菜单
  const handleAssistantMenu = () => {
    console.log('点击切换助手菜单，当前助手数量:', assistants.length)
    if (assistants.length === 0) {
      console.log('助手列表为空，重新获取...')
      fetchAssistants()
    }
    setShowAssistantSubmenu(!showAssistantSubmenu)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 三个点菜单按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="更多选项"
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-50">
          <div className="py-1">
          

            {/* 切换助手 */}
            <div className="relative">
              <button
                onClick={handleAssistantMenu}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between"
              >
                <span>切换助手 ({assistants.length})</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showAssistantSubmenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 助手子菜单 */}
              {showAssistantSubmenu && (
                <div className="mt-1 w-full bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md">
                  <div className="py-1">
                    {activeAssistant && (
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-600">
                        当前: {activeAssistant.name}
                      </div>
                    )}
                    {assistants.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                        暂无助手数据
                      </div>
                    ) : (
                      assistants.map((assistant) => (
                        <button
                          key={assistant.id}
                          onClick={() => switchAssistant(assistant.id)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            activeAssistant?.id === assistant.id
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-600'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{assistant.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {assistant.description}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 分割线 */}
            <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />

            {/* 清空缓存 */}
            <button
              onClick={handleClearCache}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
              清空缓存
            </button>
              {/* 登录/退出 */}
              <button
              onClick={handleAuthAction}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
              {isLoggedIn ? '退出登录' : '退出系统'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}