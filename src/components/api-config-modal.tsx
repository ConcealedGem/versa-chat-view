'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
    DEFAULT_API_CONFIG,
    getApiConfig,
    setApiConfig,
    validateApiConfig,
    type ApiConfig
} from '../lib/utils/api-config'

interface ApiConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiConfigModal({ isOpen, onClose }: ApiConfigModalProps) {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG)
  const [originalConfig, setOriginalConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG)
  const [isLoading, setIsLoading] = useState(false)

  // 加载当前配置
  useEffect(() => {
    if (isOpen) {
      const currentConfig = getApiConfig()
      setConfig(currentConfig)
      setOriginalConfig(currentConfig)
    }
  }, [isOpen])

  // 保存配置
  const handleSave = async () => {
    if (!validateApiConfig(config)) {
      toast.error('请输入有效的API配置')
      return
    }

    setIsLoading(true)
    
    try {
      setApiConfig(config)
      toast.success('API配置已保存')
      onClose()
    } catch (error) {
      console.error('保存API配置失败:', error)
      toast.error('保存配置失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 重置为默认配置
  const handleReset = () => {
    setConfig(DEFAULT_API_CONFIG)
  }

  // 取消更改
  const handleCancel = () => {
    setConfig(originalConfig)
    onClose()
  }

  // 测试连接
  const handleTestConnection = async () => {
    if (!validateApiConfig(config)) {
      toast.error('请输入有效的API配置')
      return
    }

    setIsLoading(true)
    
    try {
      const testUrl = config.baseUrl + '/api/health' // 假设有健康检查端点
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        toast.success('连接测试成功')
      } else {
        toast.warning(`连接测试返回: ${response.status}`)
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      toast.error('连接测试失败，请检查配置')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4" 
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        // 点击背景关闭模态框
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ 
          width: '100%',
          maxWidth: '28rem',  // 对应 max-w-md
          minWidth: '20rem'   // 确保最小宽度
        }}
      >
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              API 配置
            </h2>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 配置表单 */}
          <div className="space-y-4">
            {/* 基础URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                基础URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value.trim() })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ width: '100%', minWidth: '250px' }}
                placeholder="http://localhost:8000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                API服务器的基础地址
              </p>
            </div>

            {/* React端点 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                React API 端点
              </label>
              <input
                type="text"
                value={config.reactEndpoint}
                onChange={(e) => setConfig({ ...config, reactEndpoint: e.target.value.trim() })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ width: '100%', minWidth: '250px' }}
                placeholder="/api/agent/react"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                聊天消息处理的API端点路径
              </p>
            </div>

            {/* 预览完整URL */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">完整URL预览:</p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                {config.baseUrl}{config.reactEndpoint}
              </p>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>
            
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              重置默认
            </button>
            
            <div className="flex-1"></div>
            
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // 使用portal渲染到body
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
