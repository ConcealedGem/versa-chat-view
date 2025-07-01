# 文件预览功能说明

## 功能概述

本次更新为聊天界面新增了文件预览功能，支持在右侧Canvas区域预览上传的PDF、Excel、Word文件。

## 支持的文件类型

### PDF文件 (.pdf)
- 支持多页预览
- 默认显示第一页
- 提供翻页控件（上一页/下一页）
- 模拟渲染（实际应用中可集成PDF.js库）

### Excel文件 (.xlsx, .xls)
- 支持工作表预览
- 以表格形式显示数据
- 显示工作表名称
- 支持响应式布局

### Word文档 (.docx, .doc)
- 转换为HTML格式预览
- 保持基本文档格式
- 支持文本样式和列表
- 支持多页文档翻页

## 功能特点

1. **自动预览**: 上传支持的文件类型时，自动在右侧Canvas区域显示预览
2. **翻页功能**: 对于多页文档，提供翻页控件
3. **缓存机制**: 文件预览结果会被缓存，避免重复解析
4. **响应式设计**: 预览界面适配深色模式和浅色模式
5. **错误处理**: 对不支持的文件类型给出友好提示

## 架构设计

### 核心模块

1. **FilePreviewService** (`src/lib/services/file-preview-service.ts`)
   - 文件类型检测
   - 文件解析和渲染
   - 缓存管理

2. **FilePreviewViewer** (`src/components/file-preview-viewer.tsx`)
   - 文件预览UI组件
   - 翻页控件
   - 加载状态处理

3. **CanvasService扩展** (`src/lib/services/canvas-service.ts`)
   - 新增`addFilePreview`方法
   - 扩展`CanvasData`接口支持文件预览类型

### 集成点

- **ChatPanel**: 在文件上传成功后自动检测并添加预览
- **CanvasViewer**: 渲染文件预览组件
- **StreamHelpers**: 支持来自SSE的文件预览消息

## 使用方式

### 测试功能
1. 启动开发服务器：`npm run dev`
2. 打开聊天界面
3. 点击右侧Canvas区域的测试按钮：
   - "测试 PDF 预览" - 模拟PDF文件预览
   - "测试 Excel 预览" - 模拟Excel文件预览
   - "测试 Word 预览" - 模拟Word文件预览

### 实际使用
1. 在聊天输入框中上传PDF、Excel或Word文件
2. 文件上传成功后，右侧Canvas区域会自动显示预览
3. 对于多页文档，使用底部的翻页控件浏览不同页面

## 扩展说明

### 真实文件解析
当前实现使用模拟数据进行演示。在生产环境中，可以：

1. **PDF**: 集成PDF.js库进行真实的PDF渲染
2. **Excel**: 集成SheetJS库解析Excel文件
3. **Word**: 集成mammoth.js库转换Word文档为HTML

### 性能优化
- 大文件分页加载
- 图片懒加载
- 预览缓存策略
- 后台文件处理队列

## 代码结构

```
src/
├── lib/
│   └── services/
│       ├── canvas-service.ts          # 扩展支持文件预览
│       └── file-preview-service.ts    # 新增文件预览服务
└── components/
    ├── file-preview-viewer.tsx        # 新增文件预览组件
    ├── canvas-viewer.tsx              # 集成文件预览
    └── chat-panel.tsx                 # 集成自动预览触发
```

## 注意事项

1. 文件大小限制：当前限制为2MB
2. 文件类型检测：基于文件扩展名
3. 模拟数据：当前使用模拟数据，需要集成真实解析库
4. 性能考虑：大文件可能影响页面性能

这个功能为用户提供了更好的文件交互体验，让用户可以在聊天过程中直接预览上传的文档内容。 