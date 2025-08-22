# Versa Chat View - 智能多模态聊天平台

一个基于 Next.js 15 的现代化智能聊天应用，支持多模态交互、流式对话、文件解析和实时画布展示。该项目集成了先进的 AI 对话能力，提供直观的双面板布局和丰富的文件处理功能。

## 🌟 核心特性

### 💬 智能对话系统
- **流式响应**: 支持 Server-Sent Events (SSE) 实时流式对话
- **思考过程展示**: 可视化 AI 推理过程，支持开关控制
- **多轮对话**: 完整的上下文管理和历史记录
- **错误重试**: 网络异常时自动重试机制
- **消息管理**: 支持消息复制、重新生成功能

### 📁 强大的文件处理能力
- **多格式支持**: PDF、Word、Excel、PowerPoint、Markdown、HTML、纯文本
- **智能解析**: 本地解析优先，支持大文件云端处理
- **实时预览**: 文件上传即时预览，支持分页显示
- **拖拽上传**: 简单直观的文件上传体验
- **进度监控**: 实时上传进度显示，支持取消操作

### 🎨 现代化用户界面
- **响应式设计**: 自适应各种屏幕尺寸
- **深色模式**: 支持浅色/深色主题切换，跟随系统偏好
- **双面板布局**: 左侧聊天区域 + 右侧工具/画布区域
- **可调节面板**: 支持拖拽调整面板尺寸（20%-80%）
- **悬浮控制**: 便捷的面板折叠和功能开关

### 🛠️ 工具与扩展
- **工具面板**: 实时显示 AI 助手可用工具状态
- **画布查看器**: 动态渲染 AI 生成的内容（HTML、图表、代码等）
- **助手切换**: 支持多个 AI 助手配置和切换
- **缓存管理**: 智能缓存和清理功能

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **样式**: Tailwind CSS 4.0
- **语言**: TypeScript 5.0
- **图标**: React Icons
- **通知**: Sonner Toast

### 核心依赖
- **AI 集成**: OpenRouter API (支持多种大语言模型)
- **文件解析**: 
  - PDF: PDF.js
  - Office: Mammoth.js (Word) + SheetJS (Excel)
  - Markdown: React Markdown + Remark GFM
- **代码高亮**: React Syntax Highlighter
- **HTTP 客户端**: Axios

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd versa-chat-view
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
创建 `.env.local` 文件：
```env
# OpenRouter API 配置
OPENAI_API_KEY=your_openrouter_api_key
OPENAI_API_BASE=https://openrouter.ai/api/v1
MODEL=qwen/qwq-32b:free

# 功能开关
SHOW_PROCESS=true
SHOW_REFERENCES=true

# 应用配置
NEXT_PUBLIC_WELCOME_TITLE=欢迎使用 Versa Chat
NEXT_PUBLIC_WELCOME_MESSAGE=开始您的智能对话之旅
NEXT_PUBLIC_CONTEXT_SIZE=10
NEXT_PUBLIC_CACHE_HISTORY=true
NEXT_PUBLIC_STREAMING_TYPE=sse
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开浏览器访问 `http://localhost:3000`

### 生产部署

```bash
# 构建应用
npm run build

# 启动生产服务器
npm start
```

## 📖 使用指南

### 基本对话
1. 在左下角输入框中输入消息
2. 按 Enter 发送，Shift+Enter 换行
3. AI 会实时流式回复，可在右上角控制是否显示思考过程

### 文件上传
1. 点击输入框左侧的上传按钮
2. 选择或拖拽文件到上传区域
3. 支持的格式：PDF、Word、Excel、图片、文本等
4. 文件将自动解析并在右侧面板预览

### 面板管理
- **调整大小**: 拖拽中间分割线调整左右面板比例
- **收起右侧**: 点击右上角收起按钮隐藏工具面板
- **主题切换**: 通过右侧菜单切换深色/浅色模式

### 工具监控
右侧工具面板实时显示 AI 助手的工具状态：
- 🟢 绿色：工具运行正常
- 🔴 红色：工具出现错误
- ⚪ 灰色：工具未激活

## 🔧 配置选项

### 环境变量说明

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenRouter API 密钥 | 必填 |
| `OPENAI_API_BASE` | API 基础 URL | https://openrouter.ai/api/v1 |
| `MODEL` | 使用的 AI 模型 | qwen/qwq-32b:free |
| `SHOW_PROCESS` | 是否显示思考过程 | true |
| `SHOW_REFERENCES` | 是否显示参考资料 | true |
| `NEXT_PUBLIC_CONTEXT_SIZE` | 上下文消息数量 | 10 |
| `NEXT_PUBLIC_CACHE_HISTORY` | 是否缓存历史 | true |

### 支持的 AI 模型
项目支持 OpenRouter 平台的所有模型，包括：
- OpenAI GPT 系列
- Anthropic Claude 系列
- Google Gemini 系列
- Meta Llama 系列
- 以及其他开源模型

## 📁 项目结构

```
versa-chat-view/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── globals.css     # 全局样式
│   │   └── page.tsx        # 首页
│   ├── components/         # React 组件
│   │   ├── chat.tsx            # 主聊天组件
│   │   ├── chat-messages.tsx   # 消息显示
│   │   ├── chat-panel.tsx      # 输入面板
│   │   ├── canvas-viewer.tsx   # 画布查看器
│   │   ├── tools-panel.tsx     # 工具面板
│   │   └── file-preview-*.tsx  # 文件预览组件
│   └── lib/                # 工具库
│       ├── hooks/          # React Hooks
│       ├── services/       # 业务服务
│       ├── parsers/        # 文件解析器
│       ├── utils/          # 工具函数
│       └── types/          # 类型定义
├── public/                 # 静态资源
├── docs/                   # 项目文档
└── 配置文件...
```

## 🎯 文件处理能力详解

### 支持的文件格式

| 格式 | 扩展名 | 解析器 | 特性 |
|------|--------|--------|------|
| PDF | .pdf | PDF.js | 文本提取、扫描件检测 |
| Word | .docx, .doc | Mammoth.js | HTML转换、格式保留 |
| Excel | .xlsx, .xls, .csv | SheetJS | 多工作表、数据表格 |
| 文本 | .txt, .md, .html | 原生解析 | 语法高亮、结构分析 |
| 图片 | .jpg, .png, .gif | 原生支持 | 预览、Base64转换 |

### 文件处理流程
1. **格式检测**: 基于 MIME 类型和文件扩展名
2. **本地解析**: 小文件优先本地处理
3. **云端处理**: 大文件上传到服务器解析
4. **内容预览**: 实时显示解析结果
5. **智能分页**: 长文档自动分页显示

## 🔐 安全特性

- **输入验证**: 严格的文件类型和大小检查
- **内容清理**: 自动移除 HTML 中的危险脚本
- **沙箱执行**: iframe 沙箱模式渲染用户内容
- **Token 管理**: 安全的 API 密钥处理
- **XSS 防护**: 内容渲染时的 XSS 攻击防护

## 🚀 性能优化

- **代码分割**: 组件和依赖的懒加载
- **虚拟化**: 大数据集的虚拟滚动
- **缓存策略**: 智能的文件解析结果缓存
- **Stream 处理**: 减少内存占用的流式数据处理
- **CDN 加速**: 静态资源 CDN 分发

## 🔧 开发指南

### 添加新的文件解析器

1. 在 `src/lib/parsers/` 创建新的解析器类
2. 继承 `BaseFileParser` 基类
3. 实现 `parse()` 方法
4. 在 `ParserRegistry` 中注册

```typescript
export class CustomParser extends BaseFileParser {
  async parse(file: File): Promise<ParsedContent> {
    // 解析逻辑
    return {
      type: 'custom',
      fileName: file.name,
      totalPages: 1,
      content: parsedData
    }
  }
}
```

### 添加新的渲染器

1. 在 `file-preview-renderers.tsx` 中添加新组件
2. 在 `FilePreviewViewer` 中注册渲染器
3. 实现对应的 UI 展示逻辑

### API 扩展

1. 在 `src/app/api/` 下创建新的路由文件
2. 使用 Next.js App Router 的约定
3. 支持 GET、POST 等 HTTP 方法

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目的支持：
- [Next.js](https://nextjs.org/) - React 全栈框架
- [React](https://reactjs.org/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF 解析
- [OpenRouter](https://openrouter.ai/) - AI 模型 API 聚合平台

## 📞 联系支持

如果您在使用过程中遇到问题或有功能建议，请：

1. 查看 [文档](docs/) 获取详细说明
2. 搜索 [Issues](../../issues) 查看已知问题
3. 创建新的 [Issue](../../issues/new) 报告问题
4. 加入我们的讨论社区

---

**Versa Chat View** - 让AI对话更加智能、直观、高效！ 🚀