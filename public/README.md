# interactive-ui

纯净的交互式对话窗口，支持流式、markdown格式的聊天界面,动态展示对话相关的页面内容呈现。这是一个基于Next.js构建的现代化聊天应用，提供流畅的用户体验和丰富的功能。

## 项目简介

chat-ui 是一个轻量级的聊天界面，专为提供流畅的对话体验而设计。它具有以下特点：

- 🚀 **流式响应** - 实时显示AI回复，无需等待完整响应
- 📝 **Markdown支持** - 完整支持Markdown格式，包括代码块、表格等
- 🧠 **思考过程可视化** - 可选择显示AI的思考过程
- 🌙 **深色模式** - 支持明暗主题切换
- 🔄 **消息重新生成** - 支持重新生成AI回复
- 🔒 **用户认证** - 内置简单的登录系统

## 技术栈

- **前端框架**: Next.js 15.x (使用App Router)
- **UI组件**: React 19.x, TailwindCSS 4.x
- **Markdown渲染**: React-Markdown
- **API集成**: OpenAI兼容接口，支持OpenRouter
- **流式处理**: 使用Web Streams API处理流式响应