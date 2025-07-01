export interface FilePreviewData {
  type: 'pdf' | 'excel' | 'word'
  fileName: string
  fileUrl: string
  totalPages: number
  content: unknown // 解析后的内容
}

export interface PDFPreviewData extends FilePreviewData {
  type: 'pdf'
  content: {
    pages: Array<{
      pageNumber: number
      imageUrl: string
      width: number
      height: number
    }>
  }
}

export interface ExcelPreviewData extends FilePreviewData {
  type: 'excel'
  content: {
    sheets: Array<{
      name: string
      data: string[][] // 表格数据
      pageCount: number
    }>
  }
}

export interface WordPreviewData extends FilePreviewData {
  type: 'word'
  content: {
    pages: Array<{
      pageNumber: number
      htmlContent: string
    }>
  }
}

export class FilePreviewService {
  private static instance: FilePreviewService
  private cache = new Map<string, FilePreviewData>()

  private constructor() {}

  static getInstance(): FilePreviewService {
    if (!FilePreviewService.instance) {
      FilePreviewService.instance = new FilePreviewService()
    }
    return FilePreviewService.instance
  }

  // 新增：设置缓存方法
  setCache(key: string, data: FilePreviewData) {
    this.cache.set(key, data)
  }

  // 新增：获取缓存方法
  getCache(key: string) {
    return this.cache.get(key)
  }

  // 检测文件类型
  detectFileType(fileName: string): 'pdf' | 'excel' | 'word' | null {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return 'pdf'
      case 'xlsx':
      case 'xls':
        return 'excel'
      case 'docx':
      case 'doc':
        return 'word'
      default:
        return null
    }
  }

  // 预览文件
  async previewFile(fileName: string, fileUrl: string): Promise<FilePreviewData | null> {
    const cacheKey = `${fileName}_${fileUrl}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const fileType = this.detectFileType(fileName)
    if (!fileType) {
      console.log('Unsupported file type:', fileName)
      return null
    }

    try {
      let previewData: FilePreviewData
      
      switch (fileType) {
        case 'pdf':
          previewData = await this.previewPDF(fileName, fileUrl)
          break
        case 'excel':
          previewData = await this.previewExcel(fileName, fileUrl)
          break
        case 'word':
          previewData = await this.previewWord(fileName, fileUrl)
          break
        default:
          return null
      }

      this.cache.set(cacheKey, previewData)
      return previewData
    } catch (error) {
      console.error('Error previewing file:', error)
      return null
    }
  }

  // 预览PDF文件
  private async previewPDF(fileName: string, fileUrl: string): Promise<PDFPreviewData> {
    // 这里使用模拟数据，实际应用中需要集成PDF.js
    // TODO: 集成真实的PDF解析库
    const simulatedPages = [
      {
        pageNumber: 1,
        imageUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <text x="50%" y="40%" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
              PDF预览 - 第1页
            </text>
            <text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
              文件: ${fileName}
            </text>
          </svg>
        `),
        width: 400,
        height: 300
      },
      {
        pageNumber: 2,
        imageUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <text x="50%" y="40%" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
              PDF预览 - 第2页
            </text>
            <text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
              文件: ${fileName}
            </text>
          </svg>
        `),
        width: 400,
        height: 300
      }
    ]

    return {
      type: 'pdf',
      fileName,
      fileUrl,
      totalPages: simulatedPages.length,
      content: { pages: simulatedPages }
    }
  }

  // 预览Excel文件
  private async previewExcel(fileName: string, fileUrl: string): Promise<ExcelPreviewData> {
    // 模拟Excel数据
    const simulatedSheets = [
      {
        name: 'Sheet1',
        data: [
          ['姓名', '年龄', '部门', '薪资'],
          ['张三', '25', '技术部', '8000'],
          ['李四', '30', '市场部', '7500'],
          ['王五', '28', '人事部', '6500'],
          ['赵六', '32', '财务部', '9000']
        ],
        pageCount: 1
      }
    ]

    return {
      type: 'excel',
      fileName,
      fileUrl,
      totalPages: 1,
      content: { sheets: simulatedSheets }
    }
  }

  // 预览Word文件
  private async previewWord(fileName: string, fileUrl: string): Promise<WordPreviewData> {
    // 模拟Word内容
    const simulatedPages = [
      {
        pageNumber: 1,
        htmlContent: `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px;">文档标题</h1>
            <p style="line-height: 1.6; margin: 15px 0;">这是一个Word文档的预览内容。</p>
            <p style="line-height: 1.6; margin: 15px 0;"><strong>文件名:</strong> ${fileName}</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>列表项目 1</li>
              <li>列表项目 2</li>
              <li>列表项目 3</li>
            </ul>
            <p style="line-height: 1.6; margin: 15px 0; color: #666;">这是第一页的内容示例。</p>
          </div>
        `
      }
    ]

    return {
      type: 'word',
      fileName,
      fileUrl,
      totalPages: simulatedPages.length,
      content: { pages: simulatedPages }
    }
  }

  // 清空缓存
  clearCache() {
    this.cache.clear()
  }
}

// 导出单例实例
export const filePreviewService = FilePreviewService.getInstance() 