export interface CanvasData {
  type: 'html' | 'markdown' | 'imageshow' | 'file-preview' | 'remove-signal'
  source: string
  timestamp: number
  fileName?: string
  fileType?: 'pdf' | 'excel' | 'word' | 'text' | 'markdown' | 'html'
  totalPages?: number
  currentPage?: number
  collapsed?: boolean
  id: string
}

export class CanvasService {
  private static instance: CanvasService
  private listeners: Set<(data: CanvasData) => void> = new Set()
  private canvasItems: CanvasData[] = []

  private constructor() {}

  static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService()
    }
    return CanvasService.instance
  }

  // 添加监听器
  addListener(listener: (data: CanvasData) => void) {
    this.listeners.add(listener)
    console.log('Canvas listener added. Total listeners:', this.listeners.size)
  }

  // 移除监听器
  removeListener(listener: (data: CanvasData) => void) {
    this.listeners.delete(listener)
    console.log('Canvas listener removed. Total listeners:', this.listeners.size)
  }

  // 添加新的canvas内容
  addCanvas(canvasType: string, canvasSource: string) {
    // 检查是否是状态消息，如果是则特殊处理
    if (canvasType === 'status') {
      console.log('Processing status message:', canvasSource)
      try {
        const statusData = typeof canvasSource === 'string' ? JSON.parse(canvasSource) : canvasSource
        if (statusData.toolName && statusData.status) {
          // 通知工具面板更新状态
          const windowWithFunctions = window as Window & { 
            updateToolStatus?: (message: { type: string; toolName?: string; status?: 'active' | 'inactive' | 'error' }) => void
          }
          
          if (windowWithFunctions.updateToolStatus) {
            windowWithFunctions.updateToolStatus({
              type: 'status',
              toolName: statusData.toolName,
              status: statusData.status
            })
            console.log('Tool status updated:', statusData)
          }
        }
      } catch (error) {
        console.error('Failed to parse status message:', error)
      }
      // 状态消息不需要添加到canvas列表中
      return
    }

    const canvasData: CanvasData = {
      type: canvasType as 'html' | 'markdown',
      source: canvasSource,
      timestamp: Date.now(),
      id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      collapsed: false
    }
    
    this.canvasItems.push(canvasData)
    console.log('New canvas added:', canvasData)
    
    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(canvasData)
      } catch (error) {
        console.error('Error in canvas listener:', error)
      }
    })
  }

  // 添加文件预览的方法
  addFilePreview(fileName: string, fileUrl: string, fileType: 'pdf' | 'excel' | 'word' | 'text' | 'markdown' | 'html', totalPages: number = 1) {
    const canvasData: CanvasData = {
      type: 'file-preview',
      source: fileUrl,
      fileName,
      fileType,
      totalPages,
      currentPage: 1,
      timestamp: Date.now(),
      id: `file-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      collapsed: false
    }
    
    this.canvasItems.push(canvasData)
    console.log('New file preview added:', canvasData)
    
    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(canvasData)
      } catch (error) {
        console.error('Error in canvas listener:', error)
      }
    })
  }

  // 获取所有canvas内容
  getAllCanvas(): CanvasData[] {
    return [...this.canvasItems]
  }

  // 删除指定canvas项
  removeCanvas(id: string) {
    const index = this.canvasItems.findIndex(item => item.id === id)
    if (index !== -1) {
      this.canvasItems.splice(index, 1)
      console.log('Canvas item removed:', id)
      
      // 通知所有监听器更新
      this.listeners.forEach(listener => {
        try {
          // 发送更新信号，但这里我们需要一个不同的方法来处理删除
          // 由于当前架构，我们创建一个特殊的标记
                     const removeSignal: CanvasData = {
             type: 'remove-signal',
             source: '',
             timestamp: Date.now(),
             id: id,
             collapsed: false
           }
          listener(removeSignal)
        } catch (error) {
          console.error('Error in canvas listener:', error)
        }
      })
    }
  }

  // 切换canvas项的展开/收缩状态
  toggleCanvas(id: string) {
    const item = this.canvasItems.find(item => item.id === id)
    if (item) {
      item.collapsed = !item.collapsed
      console.log('Canvas item toggled:', id, 'collapsed:', item.collapsed)
      
      // 通知所有监听器更新
      this.listeners.forEach(listener => {
        try {
          listener(item)
        } catch (error) {
          console.error('Error in canvas listener:', error)
        }
      })
    }
  }

  // 清空canvas内容
  clearCanvas() {
    this.canvasItems = []
    console.log('Canvas cleared')
  }
}

// 导出单例实例
export const canvasService = CanvasService.getInstance() 