import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { BaseFileParser, type ParsedContent, type ParseOptions } from './base-file-parser'

// Excel解析器
export class ExcelParser extends BaseFileParser {
  readonly supportedTypes = ['xlsx', 'xls', 'csv']
  readonly mimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const arrayBuffer = await this.readAsArrayBuffer(file)
    const fileInfo = this.getFileInfo(file)
    
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
    
    const maxSheets = options?.maxPages || 10
    const sheets = workbook.SheetNames.slice(0, maxSheets).map(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][]
      
      // 限制只解析前20行
      const limitedData = jsonData.length > 50 ? jsonData.slice(0, 50) : jsonData
      
      return {
        name: sheetName,
        data: limitedData.length > 0 ? limitedData : [['暂无数据']],
        rowCount: jsonData.length, // 保持原始行数用于显示
        displayedRowCount: limitedData.length, // 实际显示的行数
        colCount: limitedData[0]?.length || 0,
        range: worksheet['!ref'] || 'A1',
        isLimited: jsonData.length > 50 // 标记是否被限制
      }
    })

    return {
      type: 'excel',
      fileName: fileInfo.name,
      totalPages: 1,
      content: {
        sheets,
        activeSheet: 0,
        workbookInfo: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames
        }
      },
      metadata: {
        size: fileInfo.size,
        sheetCount: workbook.SheetNames.length,
        lastModified: fileInfo.lastModified
      }
    }
  }
}

// Word解析器
export class WordParser extends BaseFileParser {
  readonly supportedTypes = ['docx', 'doc']
  readonly mimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const arrayBuffer = await this.readAsArrayBuffer(file)
    const fileInfo = this.getFileInfo(file)
    
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
    const textResult = await mammoth.extractRawText({ arrayBuffer })
    
    // 简单的段落分页
    const paragraphs = textResult.value.split('\n\n').filter(p => p.trim())
    const pageSize = 3 // 每页3个段落
    const pages = []
    
    for (let i = 0; i < paragraphs.length; i += pageSize) {
      const pageContent = paragraphs.slice(i, i + pageSize).join('\n\n')
      pages.push({
        pageNumber: Math.floor(i / pageSize) + 1,
        content: pageContent,
        htmlContent: this.extractPageHtml(htmlResult.value, i, pageSize)
      })
    }

    return {
      type: 'word',
      fileName: fileInfo.name,
      totalPages: Math.max(1, pages.length),
      content: {
        htmlContent: htmlResult.value,
        plainText: textResult.value,
        pages: options?.maxPages ? pages.slice(0, options.maxPages) : pages,
        wordCount: textResult.value.split(/\s+/).length,
        paragraphCount: paragraphs.length
      },
      metadata: {
        size: fileInfo.size,
        wordCount: textResult.value.split(/\s+/).length,
        messages: htmlResult.messages || []
      }
    }
  }

  private extractPageHtml(fullHtml: string, startIndex: number, pageSize: number): string {
    // 简化的HTML分页逻辑
    const paragraphRegex = /<p[^>]*>.*?<\/p>/g
    const paragraphs = []
    let match
    while ((match = paragraphRegex.exec(fullHtml)) !== null) {
      paragraphs.push(match[0])
    }
    const pageParagraphs = paragraphs.slice(startIndex, startIndex + pageSize)
    return pageParagraphs.join('')
  }
}

// PDF解析器
export class PdfParser extends BaseFileParser {
  readonly supportedTypes = ['pdf']
  readonly mimeTypes = ['application/pdf']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const fileInfo = this.getFileInfo(file)
    
    try {
      const pdfjsLib = await import('pdfjs-dist')
      
      if (typeof window !== 'undefined') {
        // 使用jsDelivr CDN，支持CORS
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      }

      const arrayBuffer = await this.readAsArrayBuffer(file)
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
      
      const maxPages = options?.maxPages || 5
      const pages = []
      
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, maxPages); pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // 改进的文本提取逻辑
        const textItems: string[] = []
        textContent.items.forEach((item) => {
          // 检查item的结构
          if (typeof item === 'object' && item !== null) {
            // 尝试多种可能的文本字段
            const itemObj = item as Record<string, unknown>
            const text = itemObj.str || itemObj.text || itemObj.content || ''
            if (text && typeof text === 'string' && text.trim()) {
              textItems.push(text.trim())
            }
          }
        })
        
        const text = textItems.join(' ').trim()

        // 为扫描件提供友好提示
        let displayText = text
        if (text.length === 0 && textContent.items.length === 0) {
          displayText = `📄 第${pageNum}页（扫描件）

这是一个图像扫描的PDF页面，无法提取文本内容。

可能的原因：
• 页面是扫描的图片格式
• 页面没有可选择的文本
• 页面是纯图像内容

如需查看内容，建议：
• 使用专门的PDF阅读器查看
• 使用OCR工具提取图像中的文字
• 或者获取原文档的文本版本`
        } else if (text.length === 0) {
          displayText = `📄 第${pageNum}页

本页面没有检测到文本内容，可能是：
• 空白页面
• 纯图像页面
• 特殊格式页面`
        }

        pages.push({
          pageNumber: pageNum,
          text: displayText,
          hasText: text.length > 0,
          itemCount: textContent.items.length, // 添加调试信息
          extractedItems: textItems.length,
          isScanned: textContent.items.length === 0 && text.length === 0
        })
      }

      // 检测是否为扫描件
      const scannedPages = pages.filter(page => page.isScanned).length
      const isFullyScanned = scannedPages === pages.length && pages.length > 0

      return {
        type: 'pdf',
        fileName: fileInfo.name,
        totalPages: pdf.numPages,
        content: {
          pages,
          documentInfo: {
            numPages: pdf.numPages,
            fingerprint: pdf.fingerprints?.[0] || '',
            loadTime: Date.now(),
            isScanned: isFullyScanned,
            scannedPages,
            textPagesCount: pages.length - scannedPages
          }
        },
        metadata: {
          size: fileInfo.size,
          numPages: pdf.numPages,
          pagesLoaded: pages.length,
          isScanned: isFullyScanned,
          hasTextContent: pages.some(page => page.hasText)
        }
      }
    } catch (error) {
      console.error('PDF解析失败:', error)
      // 返回错误信息作为内容
      return {
        type: 'pdf',
        fileName: fileInfo.name,
        totalPages: 1,
        content: {
          pages: [{
            pageNumber: 1,
            text: `PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}\n\n文件信息:\n- 文件名: ${fileInfo.name}\n- 大小: ${(fileInfo.size / 1024).toFixed(2)} KB`,
            hasText: true,
            error: true
          }]
        },
        metadata: {
          size: fileInfo.size,
          error: error instanceof Error ? error.message : '解析失败'
        }
      }
    }
  }
} 