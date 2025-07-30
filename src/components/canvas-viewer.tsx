 'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { canvasService, type CanvasData } from '../lib/services/canvas-service'
import { FilePreviewViewer } from './file-preview-viewer'

export function CanvasViewer() {
  const [canvasItems, setCanvasItems] = useState<CanvasData[]>([])
  const [hasNewCanvas, setHasNewCanvas] = useState(false)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)
  const [iframeHeights, setIframeHeights] = useState<Record<string, number>>({})
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // 处理新的canvas内容
  const handleNewCanvas = useCallback((canvasData: CanvasData) => {
    console.log('CanvasViewer: Received new canvas data:', canvasData)
    
    // 处理删除信号
    if (canvasData.type === 'remove-signal') {
      setCanvasItems(prev => prev.filter(item => item.id !== canvasData.id))
      return
    }
    
    // 处理更新（包括展开/收缩状态变化）
    setCanvasItems(prev => {
      const existing = prev.find(item => item.id === canvasData.id)
      if (existing) {
        // 更新现有项
        return prev.map(item => item.id === canvasData.id ? canvasData : item)
      } else {
        // 添加新项
        return [...prev, canvasData]
      }
    })
    
    setHasNewCanvas(true)
    setTimeout(() => setHasNewCanvas(false), 3000)
  }, [])

  // 监听canvas事件
  useEffect(() => {
    const existingCanvas = canvasService.getAllCanvas()
    setCanvasItems(existingCanvas)
    canvasService.addListener(handleNewCanvas)
    return () => {
      canvasService.removeListener(handleNewCanvas)
    }
  }, [handleNewCanvas])

  // 自动滚动到底部
  useEffect(() => {
    if (canvasItems.length > 0 && canvasContainerRef.current) {
      // 延迟一点时间确保DOM已更新
      setTimeout(() => {
        if (canvasContainerRef.current) {
          canvasContainerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          })
        }
      }, 100)
    }
  }, [canvasItems.length])

  // 删除canvas项
  const handleRemoveCanvas = (id: string) => {
    canvasService.removeCanvas(id)
  }

  // 切换canvas项的展开/收缩状态
  const handleToggleCanvas = (id: string) => {
    canvasService.toggleCanvas(id)
  }

  // 处理iframe高度自适应
  const handleIframeLoad = (id: string, event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = event.currentTarget
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (iframeDoc) {
        const height = iframeDoc.body.scrollHeight || iframeDoc.documentElement.scrollHeight
        setIframeHeights(prev => ({
          ...prev,
          [id]: Math.min(height + 20, 800) // 最大高度800px，避免过高
        }))
      }
    } catch (error) {
      // 跨域限制时使用默认高度
      console.warn('无法获取iframe内容高度，使用默认高度:', error)
      setIframeHeights(prev => ({
        ...prev,
        [id]: 400
      }))
    }
  }

  // 自定义代码块渲染组件
  const CodeBlock = ({ children, className, ...props }: { children?: React.ReactNode; className?: string }) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    
    // 检测主题（这里简单检测，实际项目中可能需要更复杂的主题检测）
    const isDark = typeof window !== 'undefined' && 
      window.document.documentElement.classList.contains('dark')
    
    return language ? (
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        className="!mt-0 !mb-0 rounded"
        showLineNumbers={true}
        wrapLines={true}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  // 渲染控制按钮
  const renderCanvasControls = (item: CanvasData) => (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => handleToggleCanvas(item.id)}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title={item.collapsed ? "展开" : "收缩"}
      >
        <svg 
          className="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {item.collapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          )}
        </svg>
      </button>
      <button
        onClick={() => handleRemoveCanvas(item.id)}
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

  // 渲染canvas内容
  const renderCanvasItem = (item: CanvasData, index: number) => {
    const key = `canvas-${item.timestamp}-${index}`
    
    if (item.type === 'html') {
      // 检测是否包含script标签
      const hasScript = item.source.includes('<script')
      
      return (
        <div 
          key={key}
          className="canvas-item bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4 min-w-0 w-full"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              HTML - #{index + 1} {hasScript && <span className="text-yellow-600">(交互式)</span>}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-blue-600 dark:text-blue-400">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {renderCanvasControls(item)}
            </div>
          </div>
          {!item.collapsed && (
            <div className="bg-white dark:bg-gray-800 rounded border overflow-x-auto">
              {hasScript ? (
                // 使用iframe渲染包含脚本的HTML，允许JavaScript执行
                <iframe
                  className="w-full border-0 rounded"
                  style={{ 
                    height: `${iframeHeights[item.id] || 400}px`,
                    minHeight: '200px'
                  }}
                  srcDoc={item.source}
                  title={`HTML Canvas ${index + 1}`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  onLoad={(e) => handleIframeLoad(item.id, e)}
                />
              ) : (
                // 使用dangerouslySetInnerHTML渲染静态HTML
                <div 
                  className="canvas-html-content p-2"
                  dangerouslySetInnerHTML={{ __html: item.source }}
                />
              )}
            </div>
          )}
        </div>
      )
    } else if (item.type === 'markdown') {
      return (
        <div 
          key={key}
          className="canvas-item bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4 min-w-0 w-full"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-green-800 dark:text-green-300">
              Markdown - #{index + 1}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-green-600 dark:text-green-400">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {renderCanvasControls(item)}
            </div>
          </div>
          {!item.collapsed && (
            <div className="bg-white dark:bg-gray-800 rounded border overflow-x-auto">
              <div className="canvas-markdown-content prose dark:prose-invert max-w-none p-2">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock
                  }}
                >
                  {item.source}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )
    } else if (item.type === 'imageshow') {
      return (
        <div 
          key={key}
          className="canvas-item bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4 min-w-0 w-full"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
              Image - #{index + 1}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-yellow-600 dark:text-yellow-400">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {renderCanvasControls(item)}
            </div>
          </div>
          {!item.collapsed && (
            <div className="bg-white dark:bg-gray-800 rounded border overflow-x-auto">
              <div 
                className="canvas-image-content p-2 flex justify-center cursor-pointer" 
                onClick={() => setZoomedImageUrl(item.source)}
              >
                <img src={item.source} alt={`Image ${index + 1}`} className="max-h-96 object-contain" />
              </div>
            </div>
          )}
        </div>
      )
    } else if (item.type === 'file-preview') {
      return (
        <FilePreviewViewer 
          key={key}
          canvasData={item}
          onError={(error: string) => {
            console.error('文件预览错误:', error)
          }}
        />
      )
    }
    
    return null
  }

  if (canvasItems.length === 0 && !zoomedImageUrl) {
    return (
      <div className="space-y-6">
        <div className="test-controls bg-gray-100 dark:bg-gray-800 p-4 rounded-lg hidden">
          <h4 className="text-xs font-medium mb-2">Canvas 测试控制</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                canvasService.addCanvas('html', '<div style="color: red; padding: 10px; border: 1px solid red;"><h2>测试 HTML Canvas</h2><p>这是一个测试HTML内容，时间: ' + new Date().toLocaleString() + '</p></div>')
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              测试 HTML Canvas
            </button>
            <button
              onClick={() => {
                canvasService.addCanvas('markdown', '# 测试 Markdown Canvas\n\n这是一个**测试Markdown内容**，时间: ' + new Date().toLocaleString() + '\n\n- 列表项 1\n- 列表项 2\n- 列表项 3\n\n```javascript\nconsole.log("Hello, Canvas!");\n```\n\n```bash\necho "This is a bash code block"\nls -la\n```\n\n```json\n{\n  "name": "example",\n  "value": 123\n}\n```')
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              测试 Markdown Canvas
            </button>
            <button
              onClick={() => {
                canvasService.addCanvas('imageshow', 'https://via.placeholder.com/300x200.png?text=Simulated+ImageShow')
              }}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
            >
              模拟 SSE ImageShow
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('sample.pdf', '/sample-files/sample.pdf', 'pdf', 2)
              }}
              className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
            >
              测试 PDF 预览
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('data.xlsx', '/sample-files/data.xlsx', 'excel', 1)
              }}
              className="px-3 py-1 bg-teal-500 text-white rounded text-xs hover:bg-teal-600"
            >
              测试 Excel 预览
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('document.docx', '/sample-files/document.docx', 'word', 1)
              }}
              className="px-3 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
            >
              测试 Word 预览
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('readme.md', '/sample-files/readme.md', 'markdown', 1)
              }}
              className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
            >
              测试 Markdown 预览
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('sample.txt', '/sample-files/sample.txt', 'text', 2)
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
            >
              测试 Text 预览
            </button>
            <button
              onClick={() => {
                canvasService.addFilePreview('index.html', '/sample-files/index.html', 'html', 1)
              }}
              className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
            >
              测试 HTML 预览
            </button>
            <button
              onClick={() => {
                canvasService.clearCanvas()
                setCanvasItems([])
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              清空 Canvas
            </button>
          </div>
        </div>

        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>暂无Canvas内容</p>
          <p className="text-xs">当对话中收到canvas消息时，内容将显示在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="test-controls bg-gray-100 dark:bg-gray-800 p-4 rounded-lg hidden" >
        <h4 className="text-xs font-medium mb-2">Canvas 测试控制</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              canvasService.addCanvas('html', '<div style="color: red; padding: 10px; border: 1px solid red;"><h2>测试 HTML Canvas</h2><p>这是一个测试HTML内容，时间: ' + new Date().toLocaleString() + '</p></div>')
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            测试 HTML Canvas
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('sample.pdf', '/sample-files/sample.pdf', 'pdf', 2)
            }}
            className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
          >
            测试 PDF 预览
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('data.xlsx', '/sample-files/data.xlsx', 'excel', 1)
            }}
            className="px-3 py-1 bg-teal-500 text-white rounded text-xs hover:bg-teal-600"
          >
            测试 Excel 预览
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('document.docx', '/sample-files/document.docx', 'word', 1)
            }}
            className="px-3 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
          >
            测试 Word 预览
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('readme.md', '/sample-files/readme.md', 'markdown', 1)
            }}
            className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
          >
            测试 Markdown 预览
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('sample.txt', '/sample-files/sample.txt', 'text', 2)
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
          >
            测试 Text 预览
          </button>
          <button
            onClick={() => {
              canvasService.addFilePreview('index.html', '/sample-files/index.html', 'html', 1)
            }}
            className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
          >
            测试 HTML 预览
          </button>
          <button
            onClick={() => {
              canvasService.clearCanvas()
              setCanvasItems([])
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            清空 Canvas
          </button>
        </div>
      </div>

      {canvasItems.length > 0 && (
        <div className="canvas-container" ref={canvasContainerRef}>
          <h3 className="text-base font-medium mb-4 flex items-center">
            {/* Canvas 内容 ({canvasItems.length}) */}
            {hasNewCanvas && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 animate-pulse">
                新内容
              </span>
            )}
          </h3>
          <div>
            {canvasItems.map(renderCanvasItem)}
          </div>
        </div>
      )}

      {zoomedImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div 
            className="relative bg-white dark:bg-gray-900 p-2 rounded-lg shadow-xl max-w-full max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={zoomedImageUrl || ''} 
              alt="Zoomed Image" 
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
            <button 
              onClick={() => setZoomedImageUrl(null)} 
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-800 text-white rounded-full p-1 text-[10px]"
              aria-label="Close zoomed image"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {canvasItems.length === 0 && !zoomedImageUrl && (
         <div className="text-center text-gray-500 dark:text-gray-400">
          <p>暂无Canvas内容</p>
          <p className="text-xs">当对话中收到canvas消息时，内容将显示在这里</p>
        </div>
      )}
    </div>
  )
} 