// 通用文件解析结果接口
export interface ParsedContent {
  type: string
  fileName: string
  totalPages: number
  content: unknown
  metadata?: Record<string, unknown>
}

// 解析选项接口
export interface ParseOptions {
  maxPages?: number
  encoding?: string
  preview?: boolean
}

// 抽象文件解析器基类
export abstract class BaseFileParser {
  abstract readonly supportedTypes: string[]
  abstract readonly mimeTypes?: string[]
  
  // 检查是否支持该文件类型
  canParse(fileName: string, mimeType?: string): boolean {
    const extension = this.getFileExtension(fileName)
    const supportsExtension = this.supportedTypes.includes(extension)
    const supportsMimeType = !mimeType || !this.mimeTypes || 
                            this.mimeTypes.some(type => mimeType.includes(type))
    
    return supportsExtension && supportsMimeType
  }

  // 抽象解析方法
  abstract parse(file: File, options?: ParseOptions): Promise<ParsedContent>

  // 工具方法：获取文件扩展名
  protected getFileExtension(fileName: string): string {
    return fileName.toLowerCase().split('.').pop() || ''
  }

  // 工具方法：读取文件为文本
  protected readAsText(file: File, encoding = 'utf-8'): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file, encoding)
    })
  }

  // 工具方法：读取文件为ArrayBuffer
  protected readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  // 工具方法：获取文件基本信息
  protected getFileInfo(file: File) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      extension: this.getFileExtension(file.name)
    }
  }
} 