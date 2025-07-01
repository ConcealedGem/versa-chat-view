import type { ParsedContent } from '../parsers/base-file-parser'
import { parseFile, parserRegistry } from '../parsers/parser-factory'

// 向后兼容的类型别名
export type SupportedFileType = string
export type FileParseResult = ParsedContent

// 保持原有接口以便兼容现有代码
export interface ParsedFileContent {
  type: 'pdf' | 'excel' | 'word' | 'text' | 'markdown' | 'html'
  fileName: string
  totalPages: number
  content: unknown
}

export interface ParsedPDFContent extends ParsedFileContent {
  type: 'pdf'
  content: {
    pages: Array<{
      pageNumber: number
      text: string
      imageUrl?: string
    }>
  }
}

export interface ParsedExcelContent extends ParsedFileContent {
  type: 'excel'
  content: {
    sheets: Array<{
      name: string
      data: (string | number)[][]
      rowCount: number
      colCount: number
    }>
  }
}

export interface ParsedWordContent extends ParsedFileContent {
  type: 'word'
  content: {
    htmlContent: string
    plainText: string
  }
}

// 新增的文本类型
export interface ParsedTextContent extends ParsedFileContent {
  type: 'text'
  content: {
    fullText: string
    pages: Array<{ pageNumber: number; text: string }>
    lineCount: number
    charCount: number
  }
}

export interface ParsedMarkdownContent extends ParsedFileContent {
  type: 'markdown'
  content: {
    rawContent: string
    sections: Array<{ level: number; title: string; content: string }>
    headings: Array<{ level: number; text: string; anchor: string }>
  }
}

export interface ParsedHtmlContent extends ParsedFileContent {
  type: 'html'
  content: {
    rawHtml: string
    title: string
    textContent: string
    structure: {
      headings: Array<{ tag: string; text: string; id: string }>
      links: Array<{ text: string; href: string }>
      images: Array<{ src: string; alt: string }>
    }
  }
}

// 文件解析服务类 - 重构为使用新架构的适配器
export class FileParserService {
  private static instance: FileParserService
  private parseCache = new Map<string, ParsedContent>()

  private constructor() {}

  static getInstance(): FileParserService {
    if (!FileParserService.instance) {
      FileParserService.instance = new FileParserService()
    }
    return FileParserService.instance
  }

  // 获取所有支持的文件类型
  static getSupportedTypes(): string[] {
    return parserRegistry.getSupportedTypes()
  }

  // 检查文件类型是否支持
  isFileSupported(fileName: string, mimeType?: string): boolean {
    return parserRegistry.isSupported(fileName, mimeType)
  }

  // 获取文件类型
  getFileType(fileName: string): string | null {
    const extension = fileName.toLowerCase().split('.').pop()
    return parserRegistry.isSupported(fileName) ? extension || null : null
  }

  // 解析文件 - 使用新的解析器架构
  async parseFile(file: File, options?: { maxPages?: number; encoding?: string }): Promise<ParsedContent> {
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
    
    // 检查缓存
    if (this.parseCache.has(cacheKey)) {
      console.log('从缓存返回文件解析结果:', file.name)
      return this.parseCache.get(cacheKey)!
    }

    if (!this.isFileSupported(file.name, file.type)) {
      throw new Error(`不支持的文件类型: ${file.name}`)
    }

    console.log('开始解析文件:', file.name)
    
    try {
      const result = await parseFile(file, options)
      
      // 缓存结果
      this.parseCache.set(cacheKey, result)
      console.log('文件解析完成:', file.name, '类型:', result.type)
      return result
    } catch (error) {
      console.error('文件解析失败:', error)
      throw error
    }
  }

  // 保持向后兼容的方法
  async parseExcel(file: File): Promise<ParsedExcelContent> {
    const result = await this.parseFile(file)
    return result as ParsedExcelContent
  }

  async parseWord(file: File): Promise<ParsedWordContent> {
    const result = await this.parseFile(file)
    return result as ParsedWordContent
  }

  async parsePDF(file: File): Promise<ParsedPDFContent> {
    const result = await this.parseFile(file)
    return result as ParsedPDFContent
  }

  // 新增的解析方法
  async parseText(file: File): Promise<ParsedTextContent> {
    const result = await this.parseFile(file)
    return result as ParsedTextContent
  }

  async parseMarkdown(file: File): Promise<ParsedMarkdownContent> {
    const result = await this.parseFile(file)
    return result as ParsedMarkdownContent
  }

  async parseHtml(file: File): Promise<ParsedHtmlContent> {
    const result = await this.parseFile(file)
    return result as ParsedHtmlContent
  }

  // 根据文件类型选择解析方法
  async parseByType(file: File): Promise<ParsedFileContent> {
    return this.parseFile(file) as Promise<ParsedFileContent>
  }

  // 清除缓存
  clearCache() {
    this.parseCache.clear()
    console.log('文件解析缓存已清除')
  }

  // 获取缓存信息
  getCacheInfo() {
    return {
      size: this.parseCache.size,
      keys: Array.from(this.parseCache.keys())
    }
  }

  // 获取支持的文件类型分类
  getSupportedTypesByCategory() {
    return parserRegistry.getSupportedTypesByCategory()
  }

  // 获取支持的MIME类型
  getSupportedMimeTypes(): string[] {
    return parserRegistry.getSupportedMimeTypes()
  }
}

// 导出单例实例
export const fileParserService = FileParserService.getInstance()

// 导出支持的文件类型
export const SUPPORTED_FILE_TYPES = FileParserService.getSupportedTypes() 