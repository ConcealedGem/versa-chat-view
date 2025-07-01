/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { ParsedContent } from '../lib/parsers/base-file-parser'
import { markdownComponents } from '../lib/utils/markdown-renderer'
import { cleanMarkdown } from '../lib/utils/markdown-utils'

// 通用渲染器属性
interface RendererProps {
  parsedContent: ParsedContent
  currentPage: number
  onPageChange: (page: number) => void
}

// 智能混合内容渲染函数
const renderMixedContent = (content: string) => {
  if (!content) return null

  // 检测HTML块的模式
  const htmlBlockPatterns = [
    /<html[\s\S]*?<\/html>/gi,           // 完整HTML文档
    /<table[\s\S]*?<\/table>/gi,         // 表格
    /<div[\s\S]*?<\/div>/gi,             // DIV块
    /<p[\s\S]*?<\/p>/gi,                 // 段落（只有当包含其他HTML标签时）
    /<ul[\s\S]*?<\/ul>/gi,               // 无序列表
    /<ol[\s\S]*?<\/ol>/gi,               // 有序列表
    /<blockquote[\s\S]*?<\/blockquote>/gi, // 引用块
    /<pre[\s\S]*?<\/pre>/gi,             // 预格式化文本
    /<form[\s\S]*?<\/form>/gi,           // 表单
    /<section[\s\S]*?<\/section>/gi,     // 章节
    /<article[\s\S]*?<\/article>/gi,     // 文章
    /<aside[\s\S]*?<\/aside>/gi,         // 侧边栏
    /<header[\s\S]*?<\/header>/gi,       // 头部
    /<footer[\s\S]*?<\/footer>/gi,       // 尾部
    /<nav[\s\S]*?<\/nav>/gi,             // 导航
  ]

  // 查找所有HTML块
  const htmlBlocks: Array<{ start: number; end: number; content: string; type: 'html' }> = []
  
  htmlBlockPatterns.forEach(pattern => {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(content)) !== null) {
      htmlBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        type: 'html'
      })
    }
  })

  // 按位置排序并合并重叠的块
  htmlBlocks.sort((a, b) => a.start - b.start)
  const mergedBlocks: Array<{ start: number; end: number; content: string; type: 'html' | 'markdown' }> = []
  
  htmlBlocks.forEach(block => {
    const lastBlock = mergedBlocks[mergedBlocks.length - 1]
    if (lastBlock && lastBlock.end >= block.start) {
      // 合并重叠的块
      lastBlock.end = Math.max(lastBlock.end, block.end)
      lastBlock.content = content.substring(lastBlock.start, lastBlock.end)
    } else {
      mergedBlocks.push(block)
    }
  })

  // 添加Markdown块（HTML块之间的内容）
  const allBlocks: Array<{ start: number; end: number; content: string; type: 'html' | 'markdown' }> = []
  let currentPos = 0

  mergedBlocks.forEach(htmlBlock => {
    // 添加HTML块之前的Markdown内容
    if (currentPos < htmlBlock.start) {
      const markdownContent = content.substring(currentPos, htmlBlock.start).trim()
      if (markdownContent) {
        allBlocks.push({
          start: currentPos,
          end: htmlBlock.start,
          content: markdownContent,
          type: 'markdown'
        })
      }
    }
    
    // 添加HTML块
    allBlocks.push(htmlBlock)
    currentPos = htmlBlock.end
  })

  // 添加最后的Markdown内容
  if (currentPos < content.length) {
    const markdownContent = content.substring(currentPos).trim()
    if (markdownContent) {
      allBlocks.push({
        start: currentPos,
        end: content.length,
        content: markdownContent,
        type: 'markdown'
      })
    }
  }

  // 如果没有检测到HTML块，全部按Markdown处理
  if (allBlocks.length === 0) {
    return (
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {cleanMarkdown(content)}
      </ReactMarkdown>
    )
  }

  // 渲染混合内容
  return (
    <div className="space-y-4">
      {allBlocks.map((block, index) => {
        if (block.type === 'html') {
          return (
            <div key={`html-${index}`} className="html-block">
              <div 
                className="html-preview overflow-auto"
                style={{ fontFamily: 'inherit' }}
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(styleHtmlContent(block.content))
                }} 
              />
            </div>
          )
        } else {
          return (
            <div key={`markdown-${index}`} className="markdown-block">
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize]}
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {cleanMarkdown(block.content)}
              </ReactMarkdown>
            </div>
          )
        }
      })}
    </div>
  )
}

// HTML安全清理函数
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

// 为HTML内容添加样式
const styleHtmlContent = (html: string): string => {
  return html
    .replace(/<table/gi, '<table style="border-collapse: collapse; width: 100%; margin: 8px 0; border: 1px solid #e5e7eb;"')
    .replace(/<td/gi, '<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top;"')
    .replace(/<th/gi, '<th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; background-color: #f9fafb; font-weight: 600; vertical-align: top;"')
    .replace(/<tr/gi, '<tr style="border-bottom: 1px solid #e5e7eb;"')
    .replace(/<div/gi, '<div style="margin: 4px 0;"')
    .replace(/<p(?!\s)/gi, '<p style="margin: 8px 0; line-height: 1.5;"')
    .replace(/<ul/gi, '<ul style="margin: 8px 0; padding-left: 20px;"')
    .replace(/<ol/gi, '<ol style="margin: 8px 0; padding-left: 20px;"')
    .replace(/<li/gi, '<li style="margin: 2px 0;"')
    .replace(/<blockquote/gi, '<blockquote style="margin: 8px 0; padding: 8px 16px; border-left: 4px solid #e5e7eb; background-color: #f9fafb;"')
}

// 文本文件渲染器
export function TextRenderer({ parsedContent, currentPage, onPageChange: _onPageChange }: RendererProps) {
  const content = parsedContent.content as {
    fullText: string
    pages: Array<{ pageNumber: number; text: string }>
    lineCount: number
    charCount: number
  }

  if (!content.pages || content.pages.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>文本文件为空或无法读取内容</p>
      </div>
    )
  }

  const currentPageContent = content.pages.find(p => p.pageNumber === currentPage) || content.pages[0]

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>字符数: {content.charCount}</div>
          <div>行数: {content.lineCount}</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded border font-mono text-sm whitespace-pre-wrap">
        {currentPageContent.text}
      </div>
    </div>
  )
}

// Markdown文件渲染器 - 使用与chat-messages相同的渲染配置
export function MarkdownRenderer({ parsedContent, currentPage: _currentPage, onPageChange: _onPageChange }: RendererProps) {
  const content = parsedContent.content as {
    rawContent: string
    sections: Array<{ level: number; title: string; content: string }>
    headings: Array<{ level: number; text: string; anchor: string }>
    links: Array<{ text: string; url: string }>
    images: Array<{ alt: string; src: string }>
  }

  return (
    <div className="space-y-4">
      {/* 文档结构信息 */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>章节数: {content.sections?.length || 0}</div>
          <div>标题数: {content.headings?.length || 0}</div>
          <div>链接数: {content.links?.length || 0}</div>
        </div>
      </div>

      {/* 目录 */}
      {content.headings && content.headings.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
          <h4 className="font-medium mb-2">目录</h4>
          <ul className="space-y-1 text-sm">
            {content.headings.slice(0, 10).map((heading, index) => (
              <li key={index} style={{ marginLeft: `${(heading.level - 1) * 16}px` }}>
                <span className="text-blue-600 dark:text-blue-400">
                  {'#'.repeat(heading.level)} {heading.text}
                </span>
              </li>
            ))}
            {content.headings.length > 10 && (
              <li className="text-gray-500">... 还有 {content.headings.length - 10} 个标题</li>
            )}
          </ul>
        </div>
      )}

            {/* Markdown渲染 - 智能混合渲染HTML和Markdown */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded border">
        <div className="prose prose-xs dark:prose-invert max-w-none">
          {renderMixedContent(content.rawContent)}
        </div>
      </div>
    </div>
  )
}

// HTML文件渲染器
export function HtmlRenderer({ parsedContent }: RendererProps) {
  const content = parsedContent.content as {
    rawHtml: string
    title: string
    textContent: string
    structure: {
      headings: Array<{ tag: string; text: string; id: string }>
      links: Array<{ text: string; href: string }>
      images: Array<{ src: string; alt: string }>
      tables: number
      forms: number
    }
    styles: string[]
    scripts: string[]
  }

  // 简单的HTML清理函数
  const sanitizeHtml = (html: string): string => {
    // 移除潜在危险的标签和属性
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
  }

  return (
    <div className="space-y-4">
      {/* HTML文档信息 */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>标题: {content.title || '无标题'}</div>
          <div>标签数: {content.structure?.headings?.length || 0}</div>
          <div>链接数: {content.structure?.links?.length || 0}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div>图片数: {content.structure?.images?.length || 0}</div>
          <div>表格数: {content.structure?.tables || 0}</div>
          <div>样式数: {content.styles?.length || 0}</div>
        </div>
      </div>

      {/* HTML结构分析 */}
      {content.structure && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
          <h4 className="font-medium mb-2">HTML结构</h4>
          
          {content.structure.headings && content.structure.headings.length > 0 && (
            <div className="mb-3">
              <h5 className="text-sm font-medium mb-1">标题结构:</h5>
              <ul className="space-y-1 text-sm">
                {content.structure.headings.slice(0, 5).map((heading, index) => (
                  <li key={index}>
                    <span className="text-yellow-600 dark:text-yellow-400 font-mono">
                      &lt;{heading.tag}&gt;
                    </span>{' '}
                    {heading.text}
                  </li>
                ))}
                {content.structure.headings.length > 5 && (
                  <li className="text-gray-500">... 还有 {content.structure.headings.length - 5} 个标题</li>
                )}
              </ul>
            </div>
          )}

          {content.structure.links && content.structure.links.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-1">链接 (前5个):</h5>
              <ul className="space-y-1 text-sm">
                {content.structure.links.slice(0, 5).map((link, index) => (
                  <li key={index} className="truncate">
                    <span className="text-blue-600 dark:text-blue-400">{link.text}</span>{' '}
                    <span className="text-gray-500">→ {link.href}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* HTML预览 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">HTML预览</h4>
          <span className="text-xs text-gray-500">安全渲染模式</span>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded border overflow-auto max-h-96">
          <div 
            className="html-preview"
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHtml(content.rawHtml) 
            }} 
          />
        </div>
      </div>

      {/* HTML源码预览 */}
      <details className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
        <summary className="cursor-pointer font-medium mb-2">查看HTML源码</summary>
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-48">
          <code>{content.rawHtml}</code>
        </pre>
      </details>
    </div>
  )
}

// PDF渲染器 - 支持扫描件检测和提示
export function PdfRenderer({ parsedContent, currentPage, onPageChange }: RendererProps) {
  const content = parsedContent.content as {
    pages: Array<{ 
      pageNumber: number; 
      text: string; 
      hasText?: boolean; 
      error?: boolean;
      isScanned?: boolean;
      itemCount?: number;
      extractedItems?: number;
    }>
    documentInfo?: {
      numPages: number;
      isScanned?: boolean;
      scannedPages?: number;
      textPagesCount?: number;
    }
  }

  if (!content.pages || content.pages.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>PDF文件无法解析或为空</p>
      </div>
    )
  }

  const currentPageContent = content.pages.find(p => p.pageNumber === currentPage) || content.pages[0]
  const isScannedDoc = content.documentInfo?.isScanned
  const scannedPages = content.documentInfo?.scannedPages || 0
  const textPages = content.documentInfo?.textPagesCount || 0

  return (
    <div className="space-y-4">
      {/* PDF文档信息 */}
      {content.documentInfo && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>总页数: {content.documentInfo.numPages}</div>
            <div>文本页面: {textPages}</div>
            <div>扫描页面: {scannedPages}</div>
          </div>
          {isScannedDoc && (
            <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-800 dark:text-yellow-200">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">此PDF包含扫描内容</span>
              </div>
              <div className="text-xs mt-1">
                部分或全部页面为扫描图像，文本内容有限
              </div>
            </div>
          )}
        </div>
      )}

      {/* 当前页面内容 */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded border">
        <div className={`whitespace-pre-wrap text-sm ${currentPageContent.error ? 'text-red-600' : ''}`}>
          {currentPageContent.text}
        </div>
        
        {/* 页面调试信息 (开发模式) */}
        {process.env.NODE_ENV === 'development' && currentPageContent.itemCount !== undefined && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer">调试信息</summary>
            <div className="mt-2 space-y-1">
              <div>PDF项目数: {currentPageContent.itemCount}</div>
              <div>提取文本项: {currentPageContent.extractedItems}</div>
              <div>包含文本: {currentPageContent.hasText ? '是' : '否'}</div>
              <div>疑似扫描: {currentPageContent.isScanned ? '是' : '否'}</div>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Excel渲染器 - 支持限制行数显示
export function ExcelRenderer({ parsedContent }: RendererProps) {
  const content = parsedContent.content as {
    sheets: Array<{
      name: string
      data: (string | number)[][]
      rowCount: number
      displayedRowCount?: number
      colCount: number
      isLimited?: boolean
    }>
    activeSheet?: number
  }

  if (!content.sheets || content.sheets.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>Excel文件无数据或解析失败</p>
      </div>
    )
  }

  const currentSheet = content.sheets[content.activeSheet || 0]

  return (
    <div className="space-y-3">
      {/* 工作表信息 */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>总行数: {currentSheet.rowCount}</div>
          <div>显示行数: {currentSheet.displayedRowCount || currentSheet.data.length}</div>
          <div>列数: {currentSheet.colCount}</div>
        </div>
        {currentSheet.isLimited && (
                     <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-800 dark:text-blue-200">
             <div className="flex items-center gap-2">
               <span>ℹ️</span>
               <span className="font-medium">为提高性能，仅显示前50行数据</span>
             </div>
             <div className="text-xs mt-1">
               完整数据共{currentSheet.rowCount}行，如需查看全部内容请下载原文件
             </div>
           </div>
        )}
      </div>

      {/* 工作表标签 */}
      {content.sheets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {content.sheets.map((sheet, index) => (
            <button
              key={index}
              className={`px-3 py-1 text-sm rounded ${
                index === (content.activeSheet || 0)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      
      {/* 数据表格 */}
      <div className="overflow-auto max-h-96 border rounded">
        <table className="min-w-full text-xs">
          <tbody>
            {currentSheet.data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''}>
                {row.slice(0, 10).map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 dark:border-gray-600 px-2 py-1 min-w-[80px]">
                    {String(cell || '')}
                  </td>
                ))}
                {row.length > 10 && (
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-500">
                    ...还有{row.length - 10}列
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Word渲染器 (保持现有逻辑)
export function WordRenderer({ parsedContent, currentPage, onPageChange }: RendererProps) {
  const content = parsedContent.content as {
    htmlContent: string
    plainText: string
    pages?: Array<{ pageNumber: number; content: string; htmlContent?: string }>
    wordCount?: number
    paragraphCount?: number
  }

  const hasPages = content.pages && content.pages.length > 0
  const currentPageContent = hasPages 
    ? content.pages!.find(p => p.pageNumber === currentPage) || content.pages![0]
    : null

  return (
    <div className="space-y-4">
      {content.wordCount !== undefined && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>字数: {content.wordCount}</div>
            <div>段落数: {content.paragraphCount || 0}</div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-900 p-4 rounded border prose dark:prose-invert max-w-none">
        <div 
          dangerouslySetInnerHTML={{ 
            __html: hasPages && currentPageContent?.htmlContent 
              ? currentPageContent.htmlContent 
              : content.htmlContent 
          }} 
        />
      </div>
    </div>
  )
} 