import { BaseFileParser } from './base-file-parser'
import { ExcelParser, PdfParser, WordParser } from './office-parsers'
import { HtmlParser, MarkdownParser, TextParser } from './text-parsers'

// 解析器注册表
export class ParserRegistry {
  private static instance: ParserRegistry
  private parsers: BaseFileParser[] = []

  private constructor() {
    this.registerDefaultParsers()
  }

  static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry()
    }
    return ParserRegistry.instance
  }

  // 注册默认解析器
  private registerDefaultParsers() {
    // 文本类解析器
    this.register(new TextParser())
    this.register(new MarkdownParser()) 
    this.register(new HtmlParser())
    
    // Office文档解析器
    this.register(new ExcelParser())
    this.register(new WordParser())
    this.register(new PdfParser())
  }

  // 注册新的解析器
  register(parser: BaseFileParser) {
    this.parsers.push(parser)
  }

  // 获取适合的解析器
  getParser(fileName: string, mimeType?: string): BaseFileParser | null {
    return this.parsers.find(parser => parser.canParse(fileName, mimeType)) || null
  }

  // 获取所有支持的文件类型
  getSupportedTypes(): string[] {
    const types = new Set<string>()
    this.parsers.forEach(parser => {
      parser.supportedTypes.forEach(type => types.add(type))
    })
    return Array.from(types)
  }

  // 检查文件是否被支持
  isSupported(fileName: string, mimeType?: string): boolean {
    return this.getParser(fileName, mimeType) !== null
  }

  // 获取支持的MIME类型
  getSupportedMimeTypes(): string[] {
    const mimeTypes = new Set<string>()
    this.parsers.forEach(parser => {
      parser.mimeTypes?.forEach(type => mimeTypes.add(type))
    })
    return Array.from(mimeTypes)
  }

  // 按类别获取支持的文件类型
  getSupportedTypesByCategory() {
    return {
      text: ['txt'],
      markdown: ['md', 'markdown'],
      html: ['html', 'htm'],
      excel: ['xlsx', 'xls', 'csv'],
      word: ['docx', 'doc'],
      pdf: ['pdf']
    }
  }
}

// 导出单例实例
export const parserRegistry = ParserRegistry.getInstance()

// 便捷的解析函数
export async function parseFile(file: File, options?: { maxPages?: number; encoding?: string }) {
  const parser = parserRegistry.getParser(file.name, file.type)
  
  if (!parser) {
    throw new Error(`不支持的文件类型: ${file.name}`)
  }

  return await parser.parse(file, options)
} 