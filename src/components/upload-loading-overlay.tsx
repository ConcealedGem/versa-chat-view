'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface UploadLoadingOverlayProps {
  isVisible: boolean
  fileName?: string
  fileSize?: number
  uploadType?: 'image' | 'file'
  onCancel?: () => void
}

export function UploadLoadingOverlay({ 
  isVisible, 
  fileName, 
  fileSize, 
  uploadType = 'file',
  onCancel 
}: UploadLoadingOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // 模拟上传进度（实际使用中可以接收真实进度）
  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
      setProgress(prev => {
        if (prev >= 95) return prev
        // 根据文件大小调整进度速度
        const increment = fileSize && fileSize > 10 * 1024 * 1024 ? 2 : 5
        return prev + increment
      })
    }, 200)

    return () => clearInterval(interval)
  }, [isVisible, fileSize])

  if (!isVisible) return null

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  }

  const modalContent = (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '2rem',
          width: '100%',
          maxWidth: '28rem',
          minWidth: '20rem'
        }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            {uploadType === 'image' ? (
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {uploadType === 'image' ? '上传图片中...' : '上传文件中...'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            请稍候，正在处理您的文件
          </p>
        </div>

        {/* 文件信息 */}
        {fileName && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {uploadType === 'image' ? (
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {fileName}
                </p>
                {fileSize && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(fileSize)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>上传进度</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>已用时间: {formatTime(elapsed)}</span>
            <span>
              {progress < 95 ? '处理中...' : '即将完成...'}
            </span>
          </div>
        </div>

        {/* Loading 动画 */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-600 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
            正在上传和处理文件...
          </span>
        </div>

        {/* 取消按钮 */}
        {onCancel && (
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消上传
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // 使用portal渲染到body
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
} 