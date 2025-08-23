'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTheme, type Theme } from './theme-provider'

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
  const { theme, appliedTheme, toggleTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)



  // 主题相关逻辑现在由 ThemeProvider 处理

  // 获取助手列表
  const fetchAssistants = useCallback(async () => {
    try {
      console.log('开始获取助手列表...')
      const response = await fetch('/api/assistants')
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
      const response = await fetch('/api/assistants/switch', {
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
          const assistantResponse = await fetch('/api/assistants')
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
        <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-neutral-800/95 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl shadow-2xl backdrop-blur-lg z-[9999] pointer-events-auto overflow-hidden">
          <div className="py-1">
          

            {/* 切换助手 */}
            <div className="relative">
              <button
                onClick={handleAssistantMenu}
                className="w-full text-left px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-700/50 transition-all duration-200 flex items-center justify-between group"
              >
                <span className="font-medium">切换助手 ({assistants.length})</span>
                <svg
                  className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 ${
                    showAssistantSubmenu ? 'rotate-180 text-blue-500' : 'text-neutral-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 助手子菜单 */}
              {showAssistantSubmenu && (
                <div className="mt-1 w-full bg-white/95 dark:bg-neutral-700/95 border border-neutral-200/50 dark:border-neutral-600/50 rounded-lg backdrop-blur-md shadow-xl z-[10000]">
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

            {/* 主题切换 */}
            <button
              onClick={() => {
                toggleTheme()
                const themeNames: Record<Theme, string> = {
                  light: '浅色模式',
                  dark: '深色模式',
                  system: '跟随系统'
                }
                // 计算下一个主题名称
                const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
                toast.success(`已切换到${themeNames[nextTheme]}`)
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between"
            >
              <span>主题模式</span>
              <div className="flex items-center space-x-2">
                {/* 太阳图标 (浅色模式) */}
                <svg
                  className={`w-4 h-4 ${appliedTheme === 'light' ? 'text-yellow-500' : 'text-gray-400'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                {/* 月亮图标 (深色模式) */}
                <svg
                  className={`w-4 h-4 ${appliedTheme === 'dark' ? 'text-blue-500' : 'text-gray-400'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                {/* 系统图标 (系统模式) */}
                <svg
                  className={`w-4 h-4 ${theme === 'system' ? 'text-green-500' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </button>

           

            {/* 分割线 */}
            <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />

            {/* 清空缓存 */}
            <button
              onClick={handleClearCache}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
              清空缓存
            </button>

             {/* 分割线 */}
             <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />
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