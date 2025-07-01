'use client'

import { useEffect, useState } from 'react'
import type { ParsedContent } from '../lib/parsers/base-file-parser'
import { canvasService, type CanvasData } from '../lib/services/canvas-service'
import { filePreviewService, type FilePreviewData } from '../lib/services/file-preview-service'
import {
    ExcelRenderer,
    HtmlRenderer,
    MarkdownRenderer,
    PdfRenderer,
    TextRenderer,
    WordRenderer
} from './file-preview-renderers'

interface FilePreviewViewerProps {
  canvasData: CanvasData
  onError?: (error: string) => void
}

export function FilePreviewViewer({ canvasData, onError }: FilePreviewViewerProps) {
  const [previewData, setPreviewData] = useState<FilePreviewData | ParsedContent | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // 删除canvas项
  const handleRemoveCanvas = () => {
    canvasService.removeCanvas(canvasData.id)
  }

  // 切换canvas项的展开/收缩状态
  const handleToggleCanvas = () => {
    canvasService.toggleCanvas(canvasData.id)
  }

  // 加载文件预览数据
  useEffect(() => {
    const loadPreview = async () => {
      if (!canvasData.fileName || !canvasData.source) {
        onError?.('文件信息不完整')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // 检查是否是本地解析的文件
        if (canvasData.source.startsWith('local-file://')) {
          const cacheKey = canvasData.source
          const cachedData = filePreviewService.getCache(cacheKey)
          if (cachedData) {
            console.log('使用本地解析的文件内容:', cachedData)
            setPreviewData(cachedData)
            setCurrentPage(canvasData.currentPage || 1)
            setIsLoading(false)
            return
          }
        }

        // 回退到模拟数据
        const data = await filePreviewService.previewFile(canvasData.fileName, canvasData.source)
        if (data) {
          setPreviewData(data)
          setCurrentPage(canvasData.currentPage || 1)
        } else {
          onError?.('不支持的文件类型')
        }
      } catch (error) {
        console.error('加载文件预览失败:', error)
        onError?.('加载文件预览失败')
      } finally {
        setIsLoading(false)
      }
    }

    loadPreview()
  }, [canvasData.fileName, canvasData.source, canvasData.currentPage, onError])

  // 翻页功能
  const handlePageChange = (page: number) => {
    if (previewData && page >= 1 && page <= previewData.totalPages) {
      setCurrentPage(page)
    }
  }

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">解析文件内容中...</span>
      </div>
    )
  }

  // 渲染错误状态
  if (!previewData) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <p>无法预览此文件</p>
        <p className="text-sm mt-1">文件: {canvasData.fileName}</p>
      </div>
    )
  }

  // 使用新的渲染器架构
  const renderFileContent = () => {
    // 判断是否是新架构的解析结果
    if ('type' in previewData && typeof previewData.type === 'string') {
      const parsedContent = previewData as ParsedContent
      
      console.log('使用新渲染器架构，文件类型:', parsedContent.type)
      
      switch (parsedContent.type) {
        case 'text':
          return <TextRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        case 'markdown':
          return <MarkdownRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        case 'html':
          return <HtmlRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        case 'pdf':
          return <PdfRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        case 'excel':
          return <ExcelRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        case 'word':
          return <WordRenderer parsedContent={parsedContent} currentPage={currentPage} onPageChange={handlePageChange} />
        default:
          return (
            <div className="text-center p-8 text-gray-500">
              <p>不支持的文件类型: {parsedContent.type}</p>
            </div>
          )
      }
    }

    // 回退到模拟数据渲染
    console.log('使用回退渲染器，数据:', previewData)
    return renderFallbackContent()
  }

  // 回退渲染（使用模拟数据）
  const renderFallbackContent = () => {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>使用模拟数据模式</p>
        <p className="text-sm">文件: {canvasData.fileName}</p>
        <p className="text-sm">类型: {canvasData.fileType}</p>
      </div>
    )
  }

  // 渲染分页控件
  const renderPagination = () => {
    if (previewData.totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
        >
          上一页
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          第 {currentPage} 页，共 {previewData.totalPages} 页
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= previewData.totalPages}
          className="px-3 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500"
        >
          下一页
        </button>
      </div>
    )
  }

  // 获取文件类型颜色
  const getTypeColor = () => {
    const fileType = canvasData.fileType || 'unknown'
    switch (fileType) {
      case 'pdf': return 'text-red-600 dark:text-red-400'
      case 'excel': return 'text-green-600 dark:text-green-400'
      case 'word': return 'text-blue-600 dark:text-blue-400'
      case 'text': return 'text-gray-600 dark:text-gray-400'
      case 'markdown': return 'text-purple-600 dark:text-purple-400'
      case 'html': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  // 获取背景颜色
  const getBgColor = () => {
    const fileType = canvasData.fileType || 'unknown'
    switch (fileType) {
      case 'pdf': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
      case 'excel': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      case 'word': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
      case 'text': return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
      case 'markdown': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
      case 'html': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
    }
  }

  // 渲染控制按钮
  const renderCanvasControls = () => (
    <div className="flex items-center space-x-1">
      <button
        onClick={handleToggleCanvas}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title={canvasData.collapsed ? "展开" : "收缩"}
      >
        <svg 
          className="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {canvasData.collapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          )}
        </svg>
      </button>
      <button
        onClick={handleRemoveCanvas}
        className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-600 transition-colors"
        title="删除"
      >
        <svg 
          className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )

  return (
    <div className={`canvas-item border rounded-lg p-4 mb-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold ${getTypeColor()}`}>
          {canvasData.fileName} 
          {canvasData.source.startsWith('local-file://') && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
              本地解析
            </span>
          )}
        </h4>
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${getTypeColor()}`}>
            {new Date().toLocaleTimeString()}
          </span>
          {renderCanvasControls()}
        </div>
      </div>
      
      {!canvasData.collapsed && (
        <>
          {renderFileContent()}
          {renderPagination()}
        </>
      )}
    </div>
  )
} 