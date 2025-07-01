import { Message } from '../hooks/use-chat'
import { canvasService } from '../services/canvas-service'

/**
 * 处理流式响应数据的类型
 */
export interface StreamData {
  type: 'reasoning' | 'content' | 'source' | 'status' | 'files' | 'canvas'
  content: string | {
    fileName: string
    filePath: string
    [key: string]: unknown
  } | {
    'canvas-type': string
    'canvas-source': string | object
  }
}

/**
 * 处理流式响应的配置选项
 */
export interface ProcessStreamOptions {
  /**
   * 更新消息列表的函数
   */
  setMessages: (updater: (messages: Message[]) => Message[]) => void
  /**
   * 设置推理内容的函数（可选）
   */
  setReasoning?: (reasoning: string) => void
  /**
   * 设置完整内容的函数（可选）
   */
  setCompletedContent?: (content: string) => void
  /**
   * 消息索引，用于更新特定消息（可选，默认为最后一条消息）
   */
  messageIndex?: number
  
}



/**
 * 处理流式响应的辅助函数
 * @param reader 响应流读取器
 * @param options 处理选项
 * @returns 处理完成的Promise
 */
export async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: ProcessStreamOptions
): Promise<void> {
  console.log('processStream started')
  const decoder = new TextDecoder()
  let buffer = ''
  let completedContent = ''
  let reasoningContent = ''
  let done = false

  console.log('Starting stream reading loop...')
  while (!done) {
    console.log('Reading from stream...')
    const { value, done: doneReading } = await reader.read()
    done = doneReading
    console.log('Stream read result:', { hasValue: !!value, done })

    if (value) {
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      console.log('Buffer updated:', buffer.length, 'characters')

      // 处理可能的多行数据 - 使用简单的换行符分割
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个可能不完整的行
      console.log('Processing', lines.length, 'lines')

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine === '') continue
        if (!trimmedLine.startsWith('data:')) continue
        
        try {
          // 提取JSON字符串并解析
          const jsonStr = trimmedLine.substring(5).trim()
          console.log('Parsing JSON:', jsonStr)
          const data = JSON.parse(jsonStr)
          
          // 根据消息类型处理
          switch (data.type) {
            case 'reasoning':
            case 'status':
              if (data.type === 'status') {
                data.content = ' . '
              }
              // 更新推理内容
              // 去除末尾换行符，避免过多换行
              const cleanContent = typeof data.content === 'string' ? data.content.replace(/\n+$/, '') : JSON.stringify(data.content)
              
              // 始终拼接内容，而不是替换
              reasoningContent += cleanContent
              
              options.setReasoning?.(reasoningContent)

              // 更新消息中的reasoning字段
              options.setMessages(currentMessages => {
                const updatedMessages = [...currentMessages]
                const targetIndex = options.messageIndex ?? updatedMessages.length - 1
                const targetMessage = updatedMessages[targetIndex]
                
                if (targetMessage && targetMessage.role === 'assistant') {
                  targetMessage.reasoning = reasoningContent
                }
                return updatedMessages
              })
              break

            case 'content':
              // 累积内容
              completedContent += data.content
              console.log('Processing content:', data.content, 'Total so far:', completedContent)
              options.setCompletedContent?.(completedContent)

              // 更新消息内容
              options.setMessages(currentMessages => {
                console.log('Updating messages, current count:', currentMessages.length)
                const updatedMessages = [...currentMessages]
                const targetIndex = options.messageIndex ?? updatedMessages.length - 1
                const targetMessage = updatedMessages[targetIndex]
                console.log('Target message index:', targetIndex, 'Target message:', targetMessage)
                
                if (targetMessage && targetMessage.role === 'assistant') {
                  targetMessage.content = completedContent
                  console.log('Updated assistant message content:', completedContent)
                } else {
                  console.warn('No assistant message found to update')
                }
                return updatedMessages
              })
              break

            case 'source':
              // 处理参考文件源信息  
              options.setMessages(currentMessages => {
                const updatedMessages = [...currentMessages]
                const targetIndex = options.messageIndex ?? updatedMessages.length - 1
                const targetMessage = updatedMessages[targetIndex]
                
                if (targetMessage && targetMessage.role === 'assistant') {
                  // 初始化sources数组（如果不存在）
                  if (!targetMessage.sources) {
                    targetMessage.sources = []
                  }
                  
                  // 确保content是字符串类型
                  if (typeof data.content !== 'string') {
                    console.error('Expected string content for source type, got object')
                    return updatedMessages
                  }
                  
                  // 解析文件名和URL
                  const content = data.content.trim()
                  
                  // 检查是否是URL行
                  if (content.startsWith('http')) {
                    // 获取最后添加的source
                    const lastSourceIndex = targetMessage.sources.length - 1
                    if (lastSourceIndex >= 0) {
                      // 添加URL到最后一个source
                      targetMessage.sources[lastSourceIndex].url = content
                      
                      // 检查是否已经存在相同文件名但URL为空的source
                      // 这是为了防止重复显示相同的文件
                      const fileName = targetMessage.sources[lastSourceIndex].name
                      const duplicateIndex = targetMessage.sources.findIndex((s, idx) => 
                        idx !== lastSourceIndex && s.name === fileName && !s.url
                      )
                      
                      // 如果找到重复的，则移除它
                      if (duplicateIndex !== -1) {
                        targetMessage.sources.splice(duplicateIndex, 1)
                      }
                    }
                  } else {
                    // 检查是否已经存在相同文件名的source
                    const existingIndex = targetMessage.sources.findIndex(s => s.name === content)
                    
                    // 如果不存在，则添加新的source（只有文件名）
                    if (existingIndex === -1) {
                      targetMessage.sources.push({
                        name: content,
                        url: ''
                      })
                    }
                  }
                }
                return updatedMessages
              })
              break

            case 'files':
              // 处理新格式的文件源信息
              options.setMessages(currentMessages => {
                const updatedMessages = [...currentMessages]
                const targetIndex = options.messageIndex ?? updatedMessages.length - 1
                const targetMessage = updatedMessages[targetIndex]
                
                if (targetMessage && targetMessage.role === 'assistant') {
                  // 初始化sources数组（如果不存在）
                  if (!targetMessage.sources) {
                    targetMessage.sources = []
                  }
                  
                  let contentObj: { fileName: string; filePath: string } | null = null
                  
                  // 处理content可能是字符串或对象的情况
                  if (typeof data.content === 'string') {
                    try {
                      contentObj = JSON.parse(data.content)
                    } catch (e) {
                      console.error('Failed to parse files content as JSON:', data.content, e)
                      return updatedMessages
                    }
                  } else if (typeof data.content === 'object' && data.content !== null) {
                    contentObj = data.content as { fileName: string; filePath: string }
                  }
                  
                  // 从格式中提取文件名和路径
                  if (contentObj && contentObj.fileName) {
                    const { fileName, filePath } = contentObj
                    
                    // 检查是否已经存在相同文件名的source
                    const existingIndex = targetMessage.sources.findIndex(s => s.name === fileName)
                    
                    // 如果不存在，则添加新的source
                    if (existingIndex === -1) {
                      targetMessage.sources.push({
                        name: fileName,
                        url: filePath || '' // 如果filePath为null，使用空字符串
                      })
                    } else {
                      // 如果已存在，则更新路径（如果有的话）
                      if (filePath) {
                        targetMessage.sources[existingIndex].url = filePath
                      }
                    }
                  } else {
                    console.warn('Files: invalid content structure, missing fileName:', data.content)
                  }
                }
                return updatedMessages
              })
              break

            case 'canvas':
              console.log('Processing canvas message:', data)
              // 处理canvas内容
              if (typeof data.content === 'object' && data.content !== null) {
                const contentObj = data.content as { 'canvas-type': string; 'canvas-source': string | object }
                if (contentObj['canvas-type'] && contentObj['canvas-source']) {
                  console.log('Canvas content:', {
                    type: contentObj['canvas-type'],
                    source: contentObj['canvas-source']
                  })
                  
                  // 对于状态消息，canvas-source 是一个对象，需要转换为字符串
                  let canvasSource = contentObj['canvas-source']
                  if (contentObj['canvas-type'] === 'status' && typeof canvasSource === 'object') {
                    canvasSource = JSON.stringify(canvasSource)
                  }
                  
                  // 通过canvas服务传递内容
                  canvasService.addCanvas(contentObj['canvas-type'], canvasSource as string)
                } else {
                  console.warn('Canvas: invalid content structure:', data.content)
                }
              } else {
                console.warn('Canvas: expected object content, got:', typeof data.content)
              }
              break

            case 'imageshow':
              console.log('Processing imageshow message:', data)
              // 处理imageshow内容
              if (typeof data.content === 'string') {
                // 如果 content 是字符串，直接作为图片URL处理
                const imageUrl = data.content.trim().replace(/^`|`$/g, '') // 移除可能存在的反引号
                if (imageUrl) {
                  console.log('ImageShow content (string URL):', imageUrl)
                  canvasService.addCanvas('imageshow', imageUrl)
                } else {
                  console.warn('ImageShow: string content is empty or invalid:', data.content)
                }
              } else if (typeof data.content === 'object' && data.content !== null) {
                // 如果 content 是对象，按原逻辑处理
                const contentObj = data.content as { 'canvas-type': string; 'canvas-source': string } 
                if (contentObj['canvas-type'] && contentObj['canvas-source']) {
                  console.log('ImageShow content (object):', {
                    type: contentObj['canvas-type'], 
                    source: contentObj['canvas-source']
                  })
                  canvasService.addCanvas('imageshow', contentObj['canvas-source'])
                } else {
                  console.warn('ImageShow: invalid object content structure:', data.content)
                }
              } else {
                console.warn('ImageShow: expected string or object content, got:', typeof data.content)
              }
              break

            case 'done':
              console.log('Stream done message received')
              break

            default:
              console.log('Unknown message type:', data.type)
          }
        } catch (e) {
          console.error('解析消息失败:', trimmedLine, e)
        }
      }
    }
  }

  console.log('Stream reading completed. Final content length:', completedContent.length)
  console.log('processStream completed')
}

/**
 * 创建一个空的助手消息
 * @returns 空的助手消息对象
 */
export function createEmptyAssistantMessage(): Message {
  return {
    role: 'assistant',
    content: '',
    reasoning: '',
    sources: []
  }
}