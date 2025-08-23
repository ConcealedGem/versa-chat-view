'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

// 工具接口类型定义
interface ToolField {
  name: string
  type: string
  description: string
}

interface Tool {
  name: string
  description: string
  'input-fields': ToolField[]
  'output-fields': ToolField[]
  'system-id'?: string
  version?: string
  endpoint?: {
    'call-topic': string
    'response-topic': string
  }
  status?: 'active' | 'inactive' | 'error' // 工具状态
}

interface ToolsResponse {
  tools: Tool[]
  'total-count': number
}

interface ToolsPanelProps {
  onStatusUpdate?: (toolName: string, status: string) => void
  currentAssistant?: { id: string; name: string; description: string }
  onRefreshTools?: () => void
}

export function ToolsPanel({ onStatusUpdate, currentAssistant, onRefreshTools }: ToolsPanelProps) {
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 加载工具列表的函数
  const loadTools = useCallback(async () => {
    console.log('ToolsPanel: loadTools 开始执行');
    setIsLoading(true)
    try {
      const response = await fetch('/api/agent/tools')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: ToolsResponse = await response.json()
      
      // 过滤掉不需要展示的工具
      const filteredTools = data.tools.filter(tool => 
        tool.name !== 'finish' && tool.name !== 'list-tools'
      )
      
      setTools(filteredTools)
      console.log('ToolsPanel: 工具列表已加载:', filteredTools.length, '个工具')
      toast.success(`工具列表已刷新，共 ${filteredTools.length} 个工具`)
    } catch (error) {
      console.error('加载工具列表失败:', error)
      toast.error('加载工具列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 删除工具的函数
  const deleteTool = useCallback(async (toolName: string) => {
    try {
      const response = await fetch(`/api/agent/tools/${toolName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`工具 ${toolName} 已成功注销`)
        // 成功后刷新工具列表
        loadTools()
      } else {
        toast.error(result.message || `注销工具 ${toolName} 失败`)
      }
    } catch (error) {
      console.error('删除工具失败:', error)
      toast.error(`注销工具 ${toolName} 失败`)
    }
  }, [loadTools])

  // 更新工具状态
  const updateToolStatus = useCallback((toolName: string, status: 'active' | 'inactive' | 'error') => {
    setTools(prevTools => 
      prevTools.map(tool => 
        tool.name === toolName ? { ...tool, status } : tool
      )
    )
    onStatusUpdate?.(toolName, status)
    
    // 如果是error状态，5秒后自动恢复到默认状态
    if (status === 'error') {
      setTimeout(() => {
        setTools(prevTools => 
          prevTools.map(tool => 
            tool.name === toolName ? { ...tool, status: undefined } : tool
          )
        )
      }, 5000)
    }
  }, [onStatusUpdate])

  // 根据status消息更新工具状态的接口
  const handleStatusMessage = useCallback((message: { type: string; toolName?: string; status?: 'active' | 'inactive' | 'error' }) => {
    if (message.type === 'status' && message.toolName && message.status) {
      updateToolStatus(message.toolName, message.status)
    }
  }, [updateToolStatus])

  // 页面初始化时加载工具列表
  useEffect(() => {
    loadTools()
  }, [loadTools])

  // 监听刷新工具列表事件
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('ToolsPanel: 收到刷新事件，开始刷新工具列表');
      loadTools();
      onRefreshTools?.();
    };

    window.addEventListener('refreshTools', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshTools', handleRefreshEvent);
    };
  }, [loadTools, onRefreshTools])

  // 暴露handleStatusMessage到组件外部
  useEffect(() => {
    // 将状态更新函数暴露到window对象，供外部调用
    const windowWithFunctions = window as Window & { 
      updateToolStatus?: (message: { type: string; toolName?: string; status?: 'active' | 'inactive' | 'error' }) => void
    }
    
    windowWithFunctions.updateToolStatus = handleStatusMessage
    
    return () => {
      delete windowWithFunctions.updateToolStatus
    }
  }, [handleStatusMessage])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'inactive': return 'text-gray-500'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return '🟢'
      case 'inactive': return '⚪'
      case 'error': return '🔴'
      default: return '🔵'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm relative z-0">
      {/* 工具面板头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={isCollapsed ? "展开工具面板" : "收缩工具面板"}
          >
            <svg 
              className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform"
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300" style={{ color: 'rgb(188, 195, 207)' }}>
            🛠️ {currentAssistant?.name || '通用助手'} ({tools.length} Ability Agent)
          </h3>
        </div>
        <button 
          onClick={() => {
            console.log('ToolsPanel: 手动点击刷新按钮');
            loadTools()
            onRefreshTools?.()
          }}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-xs px-3 py-1 rounded transition-colors disabled:cursor-not-allowed"
          title="刷新工具列表"
        >
          {isLoading ? '🔄 加载中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 工具列表内容 */}
      {!isCollapsed && (
        <div className="p-3 max-h-96 overflow-y-auto">
          {tools.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              暂无可用工具
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {tools.map((tool) => {
                const shortDescription = tool.description.length > 8 
                  ? tool.description.substring(0, 8) + '...' 
                  : tool.description

                // 根据状态设置不同的样式
                const getCardStyles = () => {
                  const baseStyles = "tool-card rounded-lg p-2 hover:shadow-md transition-all duration-200 relative group"
                  
                  switch (tool.status) {
                    case 'active':
                      return `${baseStyles} bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 border-2 border-green-400 dark:border-green-500 animate-pulse shadow-md shadow-green-200 dark:shadow-green-900/50`
                    case 'inactive':
                      return `${baseStyles} bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600`
                    case 'error':
                      return `${baseStyles} bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 border-2 border-red-400 dark:border-red-600 shadow-md shadow-red-200 dark:shadow-red-900/50`
                    default:
                      return `${baseStyles} bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 border border-blue-200 dark:border-blue-600`
                  }
                }

                return (
                  <div 
                    key={tool.name}
                    className={getCardStyles()}
                  >
                    {/* 状态指示器 */}
                    <div className="absolute top-1 left-1 flex items-center space-x-1">
                      <span className="text-xs">{getStatusIcon(tool.status)}</span>
                    </div>

                    {/* 删除按钮 */}
                    <button 
                      onClick={() => deleteTool(tool.name)}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                      title={`注销工具 ${tool.name}`}
                    >
                      ×
                    </button>

                    {/* 工具信息 */}
                    <div className="mt-4">
                      <div className="font-medium text-xs text-gray-800 dark:text-gray-200 mb-1 pr-5">
                        {tool.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {shortDescription}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-500">
                          {tool['input-fields']?.length || 0}参数
                        </span>
                        <span className={`font-medium text-xs ${getStatusColor(tool.status)}`}>
                          {tool.status || 'ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 