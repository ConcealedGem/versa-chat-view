# 扩展文件预览支持 (Extended File Support)

## 概述

基于第一性原理重新设计了文件解析架构，现已支持**6种文件类型**的实时预览：

### 支持的文件类型
- **PDF** (.pdf) - 文本内容提取，支持多页浏览
- **Excel** (.xlsx, .xls, .csv) - 电子表格数据展示，支持多工作表
- **Word** (.docx, .doc) - 富文本文档，保留格式
- **文本** (.txt) - 纯文本文件，支持分页显示
- **Markdown** (.md, .markdown) - 支持目录解析和富文本渲染
- **HTML** (.html, .htm) - 结构分析和安全预览

## 架构特点

### 1. 抽象化设计
- **BaseFileParser**: 抽象基类，定义通用解析接口
- **ParsedContent**: 统一的解析结果格式
- **ParserRegistry**: 解析器注册表，支持动态扩展

### 2. 模块化解析器
- **TextParser**: 纯文本解析
- **MarkdownParser**: Markdown结构解析
- **HtmlParser**: HTML文档分析
- **ExcelParser**: Excel工作簿解析
- **WordParser**: Word文档转换
- **PdfParser**: PDF文本提取

### 3. 专用渲染器
每种文件类型都有专门的渲染组件：
- `TextRenderer` - 文本文件显示
- `MarkdownRenderer` - Markdown渲染（含目录）
- `HtmlRenderer` - HTML安全预览
- `PdfRenderer` - PDF页面显示
- `ExcelRenderer` - 电子表格展示
- `WordRenderer` - Word文档渲染

## 核心功能

### 实时文件解析
- ✅ **前端解析** - 无需后端支持
- ✅ **缓存机制** - 避免重复解析
- ✅ **错误处理** - 优雅降级
- ✅ **性能优化** - 按需加载

### 智能预览
- ✅ **分页支持** - 大文件分页显示
- ✅ **结构分析** - 提取文档结构信息
- ✅ **格式保留** - 尽可能保持原始格式
- ✅ **安全渲染** - 防止XSS攻击

### 用户体验
- ✅ **拖拽上传** - 支持拖拽文件上传
- ✅ **即时预览** - 上传后立即显示预览
- ✅ **本地标识** - 区分本地解析和服务器文件
- ✅ **错误提示** - 清晰的错误信息

## 技术实现

### 解析器工厂模式
```typescript
// 统一解析入口
const parser = parserRegistry.getParser(fileName, mimeType)
const result = await parser.parse(file, options)
```

### 向后兼容
- 保持原有API接口
- 支持旧版本模拟数据
- 渐进式升级策略

### 扩展性设计
添加新文件类型只需：
1. 继承 `BaseFileParser`
2. 实现 `parse` 方法
3. 注册到 `ParserRegistry`
4. 创建对应渲染器

## 使用方式

### 1. 文件上传
直接上传支持的文件类型，系统会自动：
- 检测文件类型
- 解析文件内容
- 生成Canvas预览
- 缓存解析结果

### 2. 测试预览
在Canvas面板中点击对应的测试按钮：
- **测试 Text 预览** - 展示文本文件解析
- **测试 Markdown 预览** - 展示Markdown渲染
- **测试 HTML 预览** - 展示HTML结构分析

### 3. 分页浏览
支持分页的文件类型会显示分页控件：
- 上一页/下一页按钮
- 页码显示
- 键盘快捷键支持

## 性能优化

### 解析限制
- **PDF**: 最多解析前5页（浏览器限制）
- **文本**: 每1000字符分一页
- **Word**: 每3个段落分一页
- **文件大小**: 限制2MB以内

### 缓存策略
- 基于文件名+大小+修改时间的缓存Key
- 内存缓存解析结果
- 避免重复解析同一文件

## 技术栈

### 解析库
- **PDF.js** - PDF文件解析
- **SheetJS** - Excel文件处理
- **Mammoth.js** - Word文档转换
- **DOMParser** - HTML解析

### UI组件
- **React Markdown** - Markdown渲染
- **Tailwind CSS** - 样式系统
- **暗色模式** - 完整的暗色主题支持

## 文件结构

```
src/
├── lib/
│   ├── parsers/
│   │   ├── base-file-parser.ts      # 抽象基类
│   │   ├── text-parsers.ts          # 文本类解析器
│   │   ├── office-parsers.ts        # Office文档解析器
│   │   └── parser-factory.ts        # 解析器工厂
│   └── services/
│       ├── canvas-service.ts         # Canvas服务
│       ├── file-parser-service.ts    # 文件解析服务
│       └── file-preview-service.ts   # 预览服务
└── components/
    ├── file-preview-renderers.tsx    # 文件渲染器
    ├── file-preview-viewer.tsx       # 预览查看器
    ├── canvas-viewer.tsx             # Canvas查看器
    └── chat-panel.tsx               # 聊天面板
```

## 未来扩展

### 计划支持的文件类型
- **图片** (jpg, png, gif) - 图片预览
- **音频** (mp3, wav) - 音频播放器
- **视频** (mp4, webm) - 视频预览
- **代码** (js, py, java) - 语法高亮
- **压缩包** (zip, rar) - 文件列表

### 功能增强
- 全文搜索支持
- 文档注释功能
- 协作编辑能力
- 版本历史记录

---

这个扩展的文件预览系统展示了基于第一性原理的设计思想：**简单、可扩展、高性能**。通过抽象化的架构设计，我们不仅支持了更多文件类型，还为未来的扩展打下了坚实的基础。 