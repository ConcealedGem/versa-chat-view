/**
 * Markdown渲染工具
 * 提供自定义的表格渲染和组件配置
 */

import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * 代码块组件，支持语法高亮和复制功能
 */
const CodeBlock: React.FC<{
  children: string;
  className?: string;
  inline?: boolean;
}> = ({ children, className, inline }) => {
  const [copied, setCopied] = useState(false);
  
  // 提取语言类型
  const language = className?.replace('language-', '') || '';
  
  // 复制代码功能
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 内联代码样式
  if (inline) {
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded px-1.5 py-0.5 text-sm font-mono">
        {children}
      </code>
    );
  }

  // 代码块样式
  return (
    <div className="relative group my-4">
      {/* 代码块头部 */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-t-lg border-b dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {language || '代码'}
        </span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
          title="复制代码"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              复制
            </>
          )}
        </button>
      </div>
      
      {/* 代码内容 */}
      <pre className="bg-gray-900 text-green-400 p-4 rounded-b-lg overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  );
};

/**
 * Markdown组件配置
 */
export const markdownComponents: Components = {
  pre: ({ children }) => {
    // 检查是否包含代码块
    const codeElement = React.Children.toArray(children).find(
      (child): child is React.ReactElement<{ className?: string; children?: React.ReactNode }> => 
        React.isValidElement(child) && child.type === 'code'
    );
    
    if (codeElement && codeElement.props) {
      return (
        <CodeBlock 
          className={codeElement.props.className}
          inline={false}
        >
          {String(codeElement.props.children || '')}
        </CodeBlock>
      );
    }
    
    return <div className="overflow-auto my-2">{children}</div>;
  },
  code: ({ children, className }) => {
    // 使用className来判断是否为内联代码
    const isInline = !className?.startsWith('language-');
    
    return (
      <CodeBlock className={className} inline={isInline}>
        {String(children)}
      </CodeBlock>
    );
  },
  p: ({ children }) => <p className="mb-2">{children}</p>,
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-bold mb-2">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-bold mb-1">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-bold mb-1">{children}</h6>
  ),
  ul: ({ children }) => (
    <ul className="list-disc ml-5 mb-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal ml-5 mb-4 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-bold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-800 dark:text-gray-200">{children}</em>
  ),
  hr: () => (
    <hr className="my-6 border-gray-200 dark:border-gray-700" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-1 underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 italic my-4 rounded-r">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-800">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-gray-100">
      {children}
    </td>
  )
}

/**
 * 可折叠内容组件 - 用于处理长文本，支持分段显示与折叠
 * 现在正确地将所有内容作为一个整体进行渲染
 */
export const CollapsibleContent: React.FC<{
  content: string;
  maxChars?: number;
  className?: string;
}> = ({ content, maxChars = 500, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 如果内容较短或已展开，显示完整内容
  if (!content) return null;
  
  const shouldCollapse = content.length > maxChars && !isExpanded;
  
  return (
    <div className={className}>
      {shouldCollapse ? (
        // 显示部分内容并添加"显示更多"按钮
        <div>
          <ReactMarkdown 
            rehypePlugins={[rehypeSanitize]} 
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content.substring(0, maxChars)}
          </ReactMarkdown>
          <div className="relative py-4">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-zinc-800 opacity-70"></div>
            <button 
              onClick={() => setIsExpanded(true)} 
              className="relative z-10 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Show more ({(content.length - maxChars).toLocaleString()} characters folded)
            </button>
          </div>
        </div>
      ) : (
        // 显示完整内容
        <ReactMarkdown 
          rehypePlugins={[rehypeSanitize]} 
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
};

/**
 * 直接渲染HTML表格
 */
export const renderHTMLTable = (tableContent: string) => {
  // 如果检测到包含表格标记的内容，直接使用HTML渲染
  if (tableContent.includes('|') && tableContent.includes('\n')) {
    try {
      // 从原始内容中提取表格和非表格部分，并按顺序保存
      const contentSegments = []

      let currentText = ''
      let currentTable = ''
      let inTable = false

      const lines = tableContent.trim().split('\n')

      // 遍历每一行，识别表格部分和文本部分
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // 检测表格的开始（包含|且不是markdown列表）
        if (!inTable && line.includes('|') && !line.match(/^\s*-\s+/)) {
          // 如果之前有文本内容，添加到段落
          if (currentText.trim()) {
            contentSegments.push({
              type: 'text',
              content: currentText.trim()
            })
            currentText = ''
          }

          inTable = true
          currentTable = line + '\n'
        }
        // 检测表格的结束
        else if (
          inTable &&
          (!line.includes('|') || line === '' || line.match(/^\s*#/))
        ) {
          // 添加表格段落
          if (currentTable.trim()) {
            contentSegments.push({
              type: 'table',
              content: currentTable.trim()
            })
            currentTable = ''
          }

          inTable = false
          currentText = line ? line + '\n' : '\n'
        }
        // 继续收集当前区块内容
        else {
          if (inTable) {
            currentTable += line + '\n'
          } else {
            currentText += line + '\n'
          }
        }
      }

      // 处理最后的内容
      if (inTable && currentTable.trim()) {
        contentSegments.push({
          type: 'table',
          content: currentTable.trim()
        })
      } else if (currentText.trim()) {
        contentSegments.push({
          type: 'text',
          content: currentText.trim()
        })
      }

      // 如果没有检测到任何内容，返回null
      if (contentSegments.length === 0) {
        return null
      }

      // 渲染所有内容段落，按照原始顺序
      const elements = contentSegments.map((segment, idx) => {
        if (segment.type === 'text') {
          // 渲染文本内容
          return (
            <div key={`text-${idx}`}>
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize]}
                components={markdownComponents}
              >
                {segment.content}
              </ReactMarkdown>
            </div>
          )
        } else if (segment.type === 'table') {
          // 渲染表格内容
          try {
            const tableLines = segment.content.trim().split('\n')

            // 确保表格有标题行和分隔行
            if (tableLines.length < 2) {
              return (
                <div key={`text-table-fallback-${idx}`}>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {segment.content}
                  </ReactMarkdown>
                </div>
              )
            }

            // 表头行
            const headerLine = tableLines[0]
            const headers = headerLine
              .split('|')
              .filter(cell => cell.trim() !== '')
              .map(cell => cell.trim().replace(/^\*\*(.*)\*\*$/, '$1')) // 处理粗体标记

            // 检查是否有分隔行
            let dataStartIndex = 1
            if (tableLines[1] && tableLines[1].includes('-')) {
              dataStartIndex = 2
            } else {
              // 添加分隔行以确保Markdown表格格式正确
              const separator =
                '|' + Array(headers.length).fill('---|').join('') + '|'
              tableLines.splice(1, 0, separator)
              dataStartIndex = 2
            }

            // 数据行
            const rows = tableLines.slice(dataStartIndex).map(line => {
              const cells = line
                .split('|')
                .filter(cell => cell.trim() !== '')
                .map(cell => {
                  // 处理单元格中的Markdown标记
                  return cell
                    .trim()
                    .replace(/^\*\*(.*)\*\*$/, '$1') // 移除粗体标记用于渲染
                    .replace(/^\*(.*)\*$/, '$1') // 移除斜体标记用于渲染
                })
              return cells
            })

            return (
              <div key={`table-${idx}`} className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 table-auto border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      {headers.map((header, headerIdx) => (
                        <th
                          key={headerIdx}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {row.map((cell, cellIdx) => {
                          // 判断是否为表头单元格（第一列或包含特定格式的单元格）
                          const isHeaderCell =
                            cellIdx === 0 ||
                            cell.startsWith('**') ||
                            cell.match(/^[A-Z\s]+$/)

                          return (
                            <td
                              key={cellIdx}
                              className={`px-3 py-2 whitespace-normal text-sm border-b dark:border-gray-700 ${
                                isHeaderCell ? 'font-medium' : ''
                              }`}
                            >
                              {/* 处理单元格中可能的简单Markdown */}
                              <ReactMarkdown
                                rehypePlugins={[rehypeSanitize]}
                                components={simpleCellComponents}
                              >
                                {cell}
                              </ReactMarkdown>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          } catch {
            // 如果表格处理失败，添加原始文本
            return (
              <div key={`fallback-${idx}`}>
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {segment.content}
                </ReactMarkdown>
              </div>
            )
          }
        }

        return null
      })

      // 直接返回所有元素，包括表格和表格之间的文本
      return <>{elements}</>
    } catch (error) {
      console.error('Error rendering HTML table:', error)
      // 如果渲染失败，回退到普通Markdown渲染
      return (
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {tableContent}
        </ReactMarkdown>
      )
    }
  }
  return null
}

// 表格单元格内的简单组件
const simpleCellComponents: Components = {
  p: ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>
}

