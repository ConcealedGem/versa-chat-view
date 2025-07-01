'use client'

import { Message } from '@/lib/hooks/use-chat'
import { CollapsibleContent, markdownComponents, renderHTMLTable } from '@/lib/utils/markdown-renderer'
import { cleanMarkdown, preprocessReasoning } from '@/lib/utils/markdown-utils'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

export function ChatMessages({
  messages,
  data: _data, // eslint-disable-line @typescript-eslint/no-unused-vars
  onQuerySelect: _onQuerySelect, // eslint-disable-line @typescript-eslint/no-unused-vars
  isLoading,
  chatId: _chatId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRegenerate
}: {
  messages: Message[]
  data?: unknown
  onQuerySelect: (query: string) => void
  isLoading: boolean
  chatId: string
  onRegenerate?: () => void
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showReasoning, setShowReasoning] = useState(true)
  const [showReferences, setShowReferences] = useState(true)
  const [tooltipMessage, setTooltipMessage] = useState('')
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [welcomeTitle, setWelcomeTitle] = useState('欢迎使用聊天应用')
  const [welcomeMessage, setWelcomeMessage] = useState('开始一个新的对话，发送消息开始聊天吧。')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 从API获取欢迎消息配置和应用配置
  useEffect(() => {
    // 显示推理过程
    const showProcess = process.env.NEXT_PUBLIC_SHOW_PROCESS === 'true'
    // 显示参考来源
    const showReferences = process.env.NEXT_PUBLIC_SHOW_REFERENCES === 'true'
    console.log('SHOW_PROCESS:', showProcess)
    // 欢迎消息配置
    const welcomeTitle = process.env.NEXT_PUBLIC_WELCOME_TITLE || '欢迎使用聊天应用'
    // 显示话题说明
    const welcomeMessage = process.env.NEXT_PUBLIC_WELCOME_MESSAGE || '开始一个新的对话，发送消息开始聊天吧。'


    if (localStorage.getItem('showProcess') === null) {
      setShowReasoning(showProcess)
    }
    setShowReferences(showReferences)
    setWelcomeTitle(welcomeTitle)
    setWelcomeMessage(welcomeMessage)

    
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 保存用户的显示设置到localStorage
  const toggleShowReasoning = () => {
    const newValue = !showReasoning;
    setShowReasoning(newValue);
    // 保存用户设置到localStorage
    localStorage.setItem('showProcess', JSON.stringify(newValue));
  }

  // 从localStorage读取用户设置
  useEffect(() => {
    const savedSetting = localStorage.getItem('showProcess');
    if (savedSetting !== null) {
      setShowReasoning(JSON.parse(savedSetting));
    }
  }, []);

  // 处理图片点击放大
  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl)
  }

  // 关闭图片预览
  const closeImagePreview = () => {
    setPreviewImage(null)
  }

  return (
    <div className="relative px-4">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleShowReasoning}
          className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors duration-200 flex items-center justify-center shadow-md"
          title={showReasoning ? '隐藏思考过程' : '显示思考过程'}
          aria-label="切换显示思考过程"
        >
          {showReasoning ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{welcomeTitle}</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {welcomeMessage}
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const isUser = message.role === 'user'
            
            // 安全地获取字符串内容用于表格检测
            const messageContentString = typeof message.content === 'string' 
              ? message.content 
              : message.content.map(part => part.type === 'text' ? part.text || '' : '').join(' ')
            
            // 检测是否包含表格，用于决定是否使用自定义表格渲染
            const hasTable =
              !isUser &&
              messageContentString &&
              // 标准表格检测
              ((messageContentString.includes('|') &&
                (messageContentString.match(/\n/g) || []).length > 2) ||
                // ASCII表格检测
                (messageContentString.includes('+-') &&
                  messageContentString.includes('-+')) ||
                // 大量分隔线检测
                ((messageContentString.match(/\-{3,}/g) || []).length > 4 &&
                  messageContentString.includes('|')))

            // 检测内容是否包含Markdown标记 - 用于未来功能扩展
            const _hasMarkdownFormatting = // eslint-disable-line @typescript-eslint/no-unused-vars
              !isUser &&
              messageContentString &&
              (messageContentString.includes('**') || // 粗体
                messageContentString.includes('# ') || // 标题
                messageContentString.includes('- ') || // 列表
                messageContentString.includes('1. ') || // 有序列表
                messageContentString.includes('> ') || // 引用
                (messageContentString.includes('[') &&
                  messageContentString.includes(']('))) // 链接

            // 预处理表格内容
            const tableContent = hasTable ? cleanMarkdown(messageContentString) : ''
            // 尝试直接渲染HTML表格
            const htmlTable = hasTable ? renderHTMLTable(tableContent) : null

            return (
              <div key={index} className="mb-4">
                {/* 用户消息 */}
                {isUser && (
                  <div className="flex justify-end">
                    <div className="rounded-lg px-4 py-2 max-w-[90%] bg-blue-500 text-white text-sm">
                      {typeof message.content === 'string' ? (
                        <div>{message.content}</div>
                      ) : (
                        <div className="space-y-2">
                          {message.content.map((part, partIndex) => (
                            <div key={partIndex}>
                              {part.type === 'text' && part.text && (
                                <div>{part.text}</div>
                              )}
                              {part.type === 'image_url' && part.image_url && (
                                <img 
                                  src={part.image_url.url} 
                                  alt="上传的图片"
                                  className="max-w-xs max-h-48 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => handleImageClick(part.image_url?.url || '')}
                                />
                              )}
                              {part.type === 'file' && part.file && (
                                <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 rounded p-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                  </svg>
                                  <span className="text-sm">{part.file.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI助手消息 */}
                {!isUser && (
                  <div className="space-y-2">
                    {/* 思考过程 */}
                    {showReasoning && message.reasoning && (
                      <div className="flex justify-start relative ml-10">
                        {/* 添加机器人图标到思考过程框 */}
                        <div className="absolute -left-10 -top-2 w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border-2 border-yellow-200 dark:border-yellow-700 shadow-sm">
                          <Image
                            src="/robot-logo.png"
                            alt="AI思考"
                            width={32}
                            height={32}
                            className="object-cover opacity-70"
                          />
                        </div>
                        <div className="rounded-lg px-4 py-2 w-full max-w-[90%] bg-white dark:bg-zinc-800 text-[#8b8b8b] dark:text-zinc-400 text-xs font-mono border border-gray-200 dark:border-zinc-700 shadow-sm">
                          <div className="prose prose-sm w-full dark:prose-invert max-w-none">
                            <CollapsibleContent
                              content={preprocessReasoning(message.reasoning)}
                              maxChars={500}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 响应内容 - 如果有表格，使用自定义表格渲染 */}
                    <div className="flex justify-start relative ml-10">
                      {/* 添加机器人图标 */}
                      <div className="absolute -left-10 -top-2 w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 shadow-sm">
                        <Image
                          src="/robot-logo.png"
                          alt="AI助手"
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      </div>
                      <div className={`rounded-lg px-4 py-2 max-w-[90%] relative text-xs border shadow-sm ${
                        message.isError 
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                          : 'bg-white dark:bg-zinc-800 text-black dark:text-zinc-200 border-gray-200 dark:border-zinc-700'
                      }`}>
                        <div className="prose prose-xs dark:prose-invert max-w-none">
                          {htmlTable ? (
                            htmlTable
                          ) : messageContentString ? (
                            <ReactMarkdown
                              rehypePlugins={[rehypeSanitize]}
                              components={markdownComponents}
                            >
                              {cleanMarkdown(messageContentString)}
                            </ReactMarkdown>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400 italic">
                              {message.isError ? '' : ''}
                            </div>
                          )}
                        </div>

                        {/* 功能按钮区域 - 仅在消息已完成加载时显示（包括空内容、错误消息等） */}
                        {message.role === 'assistant' &&
                          !isLoading &&
                          index === messages.length - 1 && (
                            <div className="absolute bottom-[-30px] left-0 flex space-x-2">
                              {/* 复制按钮 */}
                              <button
                                onClick={() => {
                                  const contentToCopy = messageContentString || '(空回复)'
                                  navigator.clipboard
                                    .writeText(contentToCopy)
                                    .then(() => {
                                      setTooltipMessage('已复制到剪贴板')
                                      setTooltipVisible(true)
                                      setTimeout(
                                        () => setTooltipVisible(false),
                                        2000
                                      )
                                    })
                                    .catch(() => {
                                      setTooltipMessage('复制失败')
                                      setTooltipVisible(true)
                                      setTimeout(
                                        () => setTooltipVisible(false),
                                        2000
                                      )
                                    })
                                }}
                                className="p-1 bg-gray-100 dark:bg-zinc-800 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                aria-label="复制回复内容"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                  ></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>

                              {/* 重新生成按钮 */}
                              <button
                                onClick={onRegenerate}
                                className="p-1 bg-gray-100 dark:bg-zinc-800 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                aria-label="重新生成回复"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 2v6h6"></path>
                                  <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
                                </svg>
                              </button>

                              {/* 工具提示 */}
                              {tooltipVisible && (
                                <div className="absolute left-0 bottom-8 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                                  {tooltipMessage}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                    
                    {/* 参考文件源区域 - 显示在消息底部 */}
                    { showReferences && message.sources && message.sources.length > 0 && (
                      <div className={`${index === messages.length - 1 ? 'mt-8' : 'mt-2'} rounded-md py-2 mb-12 ml-10`}>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Reference reasoning source：</p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, sourceIndex) => (
                            <a
                              key={sourceIndex}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-white dark:bg-zinc-700 px-2 py-1 rounded-md text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-zinc-600 transition-colors flex items-center gap-1 border border-gray-200 dark:border-zinc-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              {source.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                )
                }
              </div>
            )
          })}

          {/* 加载指示器 */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="rounded-lg px-4 py-2 max-w-[90%] bg-gray-200 dark:bg-zinc-700 dark:text-zinc-200">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-75"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeImagePreview}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={previewImage}
              alt="预览图片"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-all"
              aria-label="关闭预览"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
