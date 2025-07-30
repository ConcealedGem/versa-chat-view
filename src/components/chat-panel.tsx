'use client'

import { Message } from '@/lib/hooks/use-chat'
import { canvasService } from '@/lib/services/canvas-service'
import { fileParserService } from '@/lib/services/file-parser-service'
import { filePreviewService } from '@/lib/services/file-preview-service'
import { Model } from '@/lib/types/models'
import { useState } from 'react'
import { UploadLoadingOverlay } from './upload-loading-overlay'

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMessages: _setMessages,
  stop,
  query,
  append,
  models,
  sendMessage,
  isFullWidth = false
}: {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  messages: Message[]
  setMessages: (messages: Message[]) => void
  stop: () => void
  query?: string
  append: (message: Message) => void
  models?: Model[]
  sendMessage?: (message: Message) => Promise<void>
  isFullWidth?: boolean
}) {
  const [selectedModel, setSelectedModel] = useState<string>(
    models?.[0]?.id || ''
  )
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    type: 'image' | 'file'
    name: string
    url: string
    size: number
    uploadInfo?: UploadResponse
  }>>([])
  
  // 添加上传状态管理
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<{
    name: string
    size: number
    type: 'image' | 'file'
  } | null>(null)
  const [uploadController, setUploadController] = useState<AbortController | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form && (input.trim() || uploadedFiles.length > 0)) {
        // 触发表单提交事件，这样会执行完整的文件处理逻辑
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
        form.dispatchEvent(submitEvent)
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 限制图片大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图片文件过大，请选择小于2MB的文件')
      return
    }

    // 显示loading状态
    setIsUploading(true)
    setUploadingFile({
      name: file.name,
      size: file.size,
      type: 'image'
    })

    try {
      // 转换为base64
      const base64 = await fileToBase64(file)
      const newFile = {
        type: 'image' as const,
        name: file.name,
        url: base64,
        size: file.size
      }
      
      setUploadedFiles(prev => [...prev, newFile])
    } catch (error) {
      console.error('图片上传失败:', error)
      alert('图片上传失败，请重试')
    } finally {
      // 隐藏loading状态
      setIsUploading(false)
      setUploadingFile(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 限制文件大小 (50MB)  
    if (file.size > 50 * 1024 * 1024) {
      alert('文件过大，请选择小于50MB的文件')
      return
    }

    // 创建AbortController用于取消上传
    const controller = new AbortController()
    setUploadController(controller)

    // 显示loading状态
    setIsUploading(true)
    setUploadingFile({
      name: file.name,
      size: file.size,
      type: 'file'
    })

    try {
      // 检查是否是支持预览的文件类型且文件大小不超过5MB
      const fileSizeLimit = 5 * 1024 * 1024 // 5MB
      
      if (fileParserService.isFileSupported(file.name, file.type)) {
        if (file.size <= fileSizeLimit) {
          // 文件大小在限制内，进行本地解析
          console.log(`开始解析文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          
          try {
            const parsedContent = await fileParserService.parseFile(file)
            if (parsedContent) {
              console.log('文件解析成功:', parsedContent)
              // 直接使用解析结果添加到canvas预览
              canvasService.addFilePreview(
                parsedContent.fileName,
                'local-file://' + file.name, // 使用特殊前缀标识本地文件
                parsedContent.type as 'pdf' | 'excel' | 'word' | 'text' | 'markdown' | 'html',
                parsedContent.totalPages
              )
              
              // 将解析结果缓存到filePreviewService，以便预览组件使用
              const cacheKey = `local-file://${file.name}`
              filePreviewService.setCache(cacheKey, parsedContent as import('@/lib/services/file-preview-service').FilePreviewData)
            }
          } catch (parseError) {
            console.error('文件解析失败:', parseError)
            alert(`文件解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`)
            // 解析失败时仍然继续上传到服务器
          }
        } else {
          // 文件过大，跳过本地解析
          console.log(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB > 5MB)，跳过本地解析，直接上传`)
          
          // 显示一个简单的提示信息
          canvasService.addCanvas('html', `
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 8px 0;">
              <div style="display: flex; align-items: center; gap: 8px; color: #92400e; font-weight: 600; margin-bottom: 8px;">
                <span style="font-size: 18px;">⚠️</span>
                <span>大文件上传</span>
              </div>
              <div style="color: #92400e; font-size: 14px; line-height: 1.5;">
                文件 <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)}MB) 超过5MB，已跳过本地预览。<br>
                文件将直接上传到服务器用于聊天对话。
              </div>
            </div>
          `)
        }
      }

      // 无论是否支持预览，都上传到服务器用于聊天
      const uploadResult = await uploadFileToServer(file, controller.signal)
      const newFile = {
        type: 'file' as const,
        name: uploadResult['file-name'] || file.name,
        url: uploadResult['file-path'] || '',
        size: file.size,
        uploadInfo: uploadResult
      }
      
      setUploadedFiles(prev => [...prev, newFile])

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('文件上传已取消')
      } else {
        console.error('文件上传失败:', error)
        alert(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    } finally {
      // 隐藏loading状态
      setIsUploading(false)
      setUploadingFile(null)
      setUploadController(null)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // 文件上传响应接口
  interface UploadResponse {
    'file-name': string
    'file-path': string
    'file-size-kb'?: number
    'original-name'?: string
    'public-url'?: string
    'is-large-table'?: boolean
    'display-name'?: string
    'user_id'?: string
    'file-size-bytes'?: number
    'message'?: string
  }

  // 上传文件到服务器
  const uploadFileToServer = async (file: File, signal?: AbortSignal): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // 获取认证token
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未找到认证token，请先登录')
    }
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal // 添加signal用于取消请求
      })
      
      console.log('Upload response status:', response.status)
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload error response:', errorText)
        throw new Error(`上传失败: ${response.status} ${response.statusText}`)
      }
      
      // 获取响应文本
      const responseText = await response.text()
      console.log('Upload response text:', responseText)
      
      // 尝试解析JSON
      let result: UploadResponse
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text that failed to parse:', responseText)
        throw new Error(`服务器返回了无效的JSON格式: ${responseText.substring(0, 100)}...`)
      }
      
      console.log('Upload response parsed:', result)
      
      return result
    } catch (error) {
      console.error('Upload request failed:', error)
      throw error
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 取消上传函数
  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort()
    }
    setIsUploading(false)
    setUploadingFile(null)
    setUploadController(null)
  }

  return (
    <>
      {/* 上传Loading覆盖层 */}
      <UploadLoadingOverlay
        isVisible={isUploading}
        fileName={uploadingFile?.name}
        fileSize={uploadingFile?.size}
        uploadType={uploadingFile?.type}
        onCancel={handleCancelUpload}
      />

      <div className="inset-x-0 bg-white dark:bg-zinc-900 pt-2 pb-3">
        <div className={isFullWidth ? 'w-full' : 'max-w-full mx-auto px-4'}>
          {query && messages.length === 0 && (
            <div className="mb-4">
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                onClick={() => {
                  append({
                    role: 'user',
                    content: query
                  })
                }}
              >
                使用建议的查询: {query}
              </button>
            </div>
          )}

          {/* 上传文件预览 */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">已上传文件:</div>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex items-center space-x-2">
                    {file.type === 'image' ? (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                    )}
                    <span className="text-xs text-gray-700 dark:text-gray-300 max-w-20 truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault()
            if (!input.trim() && uploadedFiles.length === 0) return
            
            // 如果有上传的文件，需要特殊处理
            if (uploadedFiles.length > 0) {
              // 构建OpenAI格式的content
              const contentParts: Array<{
                type: 'text' | 'image_url' | 'file'
                text?: string
                image_url?: { url: string; detail?: 'low' | 'high' | 'auto' }
                file?: { 
                  name: string; 
                  url: string;
                  'file-size-kb'?: number;
                  'original-name'?: string;
                  'public-url'?: string;
                  'is-large-table'?: boolean;
                  'display-name'?: string;
                  'user_id'?: string;
                  'file-size-bytes'?: number;
                  'message'?: string;
                }
              }> = []
              
              // 添加文本内容
              if (input.trim()) {
                contentParts.push({
                  type: 'text',
                  text: input.trim()
                })
              }
              
              // 添加图片内容
              uploadedFiles.forEach(file => {
                if (file.type === 'image') {
                  contentParts.push({
                    type: 'image_url',
                    image_url: {
                      url: file.url,
                      detail: 'auto'
                    }
                  })
                }
                // 对于文件，使用新的文件类型，包含上传返回的所有信息
                else if (file.type === 'file') {
                  const fileContent: { 
                    name: string; 
                    url: string;
                    'file-size-kb'?: number;
                    'original-name'?: string;
                    'public-url'?: string;
                    'is-large-table'?: boolean;
                    'display-name'?: string;
                    'user_id'?: string;
                    'file-size-bytes'?: number;
                    'message'?: string;
                  } = {
                    name: file.name,
                    url: file.url
                  }
                  
                  // 如果有上传信息，添加额外字段
                  if (file.uploadInfo) {
                    fileContent['file-size-kb'] = file.uploadInfo['file-size-kb']
                    fileContent['original-name'] = file.uploadInfo['original-name']
                    fileContent['public-url'] = file.uploadInfo['public-url']
                    fileContent['is-large-table'] = file.uploadInfo['is-large-table']
                    fileContent['display-name'] = file.uploadInfo['display-name']
                    fileContent['user_id'] = file.uploadInfo['user_id']
                    fileContent['file-size-bytes'] = file.uploadInfo['file-size-bytes']
                    fileContent['message'] = file.uploadInfo['message']
                  }
                  
                  contentParts.push({
                    type: 'file',
                    file: fileContent
                  })
                }
              })
              
              console.log('Sending message with files, content parts:', contentParts)
              
              // 使用sendMessage发送包含文件的消息
              if (sendMessage) {
                await sendMessage({
                  role: 'user',
                  content: contentParts
                })
              } else {
                // 回退到append方法
                append({
                  role: 'user',
                  content: contentParts
                })
              }
              
              // 清空输入和文件
              setUploadedFiles([])
              return
            }
            
            // 纯文本消息，使用原有逻辑
            handleSubmit(e)
            setUploadedFiles([])
          }} className="flex items-end space-x-2">
            <div className="flex-grow relative">
              <textarea
                className="w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-zinc-200"
                placeholder="Enter message... (Press Enter to send, Shift + Enter to wrap)"
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                style={{
                  minHeight: '60px',
                  maxHeight: '200px'
                }}
              />
              
              {/* 文件上传按钮 */}
              <div className="absolute right-2 bottom-2 flex space-x-1">
                {/* 图片上传 */}
                <input
                  type="file"
                  accept="image/*"
                  id="image-upload"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="image-upload"
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
                  title="上传图片"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </label>
                
                {/* 文件上传 */}
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="file-upload"
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
                  title="上传文件"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </label>
              </div>
            </div>

            <div>
              {isLoading ? (
                <button
                  onClick={stop}
                  className="inline-flex items-center justify-center rounded-full w-12 h-12 bg-zinc-800 dark:bg-zinc-700 text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors my-3"
                  type="button"
                  aria-label="停止生成"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  className="inline-flex items-center justify-center rounded-full w-12 h-12 bg-zinc-800 dark:bg-zinc-700 text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors my-3"
                  type="submit"
                  disabled={!input.trim() && uploadedFiles.length === 0}
                  aria-label="发送消息"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {models && models.length > 0 && (
            <div className="mt-2">
              <div className="flex space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span>模型:</span>
                <div className="flex space-x-2">
                  {models.map(model => (
                    <button
                      key={model.id}
                      className={`px-2 py-0.5 rounded ${
                        selectedModel === model.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
