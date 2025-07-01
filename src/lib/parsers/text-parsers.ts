import { BaseFileParser, type ParsedContent, type ParseOptions } from './base-file-parser'

// 纯文本解析器
export class TextParser extends BaseFileParser {
  readonly supportedTypes = ['txt']
  readonly mimeTypes = ['text/plain']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const content = await this.readAsText(file, options?.encoding)
    const fileInfo = this.getFileInfo(file)
    
    // 简单分页：每1000字符为一页
    const pageSize = 1000
    const pages = []
    for (let i = 0; i < content.length; i += pageSize) {
      pages.push({
        pageNumber: Math.floor(i / pageSize) + 1,
        text: content.slice(i, i + pageSize)
      })
    }

    return {
      type: 'text',
      fileName: fileInfo.name,
      totalPages: Math.max(1, pages.length),
      content: {
        fullText: content,
        pages: options?.maxPages ? pages.slice(0, options.maxPages) : pages,
        lineCount: content.split('\n').length,
        charCount: content.length
      },
      metadata: {
        encoding: options?.encoding || 'utf-8',
        size: fileInfo.size
      }
    }
  }
}

// Markdown解析器
export class MarkdownParser extends BaseFileParser {
  readonly supportedTypes = ['md', 'markdown']
  readonly mimeTypes = ['text/markdown', 'text/x-markdown']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const content = await this.readAsText(file, options?.encoding)
    const fileInfo = this.getFileInfo(file)
    
    // 解析markdown结构
    const sections = this.parseMarkdownSections(content)
    
    return {
      type: 'markdown',
      fileName: fileInfo.name,
      totalPages: 1, // markdown通常作为单页显示
      content: {
        rawContent: content,
        sections,
        headings: this.extractHeadings(content),
        links: this.extractLinks(content),
        images: this.extractImages(content)
      },
      metadata: {
        encoding: options?.encoding || 'utf-8',
        size: fileInfo.size,
        sectionCount: sections.length
      }
    }
  }

  private parseMarkdownSections(content: string) {
    const lines = content.split('\n')
    const sections = []
    let currentSection = { level: 0, title: '', content: '', startLine: 0 }
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
      if (headingMatch) {
        if (currentSection.title) {
          sections.push({ ...currentSection })
        }
        currentSection = {
          level: headingMatch[1].length,
          title: headingMatch[2],
          content: '',
          startLine: index + 1
        }
      } else {
        currentSection.content += line + '\n'
      }
    })
    
    if (currentSection.title) {
      sections.push(currentSection)
    }
    
    return sections
  }

  private extractHeadings(content: string) {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const headings = []
    let match
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2],
        anchor: match[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      })
    }
    
    return headings
  }

  private extractLinks(content: string) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const links = []
    let match
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2]
      })
    }
    
    return links
  }

  private extractImages(content: string) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const images = []
    let match
    
    while ((match = imageRegex.exec(content)) !== null) {
      images.push({
        alt: match[1],
        src: match[2]
      })
    }
    
    return images
  }
}

// HTML解析器
export class HtmlParser extends BaseFileParser {
  readonly supportedTypes = ['html', 'htm']
  readonly mimeTypes = ['text/html']

  async parse(file: File, options?: ParseOptions): Promise<ParsedContent> {
    const content = await this.readAsText(file, options?.encoding)
    const fileInfo = this.getFileInfo(file)
    
    // 创建临时DOM来解析HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    
    return {
      type: 'html',
      fileName: fileInfo.name,
      totalPages: 1,
      content: {
        rawHtml: content,
        title: doc.title || '无标题',
        textContent: doc.body?.textContent || '',
        structure: this.analyzeHtmlStructure(doc),
        styles: this.extractStyles(content),
        scripts: this.extractScripts(content)
      },
      metadata: {
        encoding: options?.encoding || 'utf-8',
        size: fileInfo.size,
        hasStyles: content.includes('<style>') || content.includes('.css'),
        hasScripts: content.includes('<script>')
      }
    }
  }

  private analyzeHtmlStructure(doc: Document) {
    const structure = {
      headings: Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
        tag: h.tagName.toLowerCase(),
        text: h.textContent?.trim() || '',
        id: h.id || ''
      })),
      links: Array.from(doc.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent?.trim() || '',
        href: a.getAttribute('href') || ''
      })),
      images: Array.from(doc.querySelectorAll('img')).map(img => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || ''
      })),
      tables: doc.querySelectorAll('table').length,
      forms: doc.querySelectorAll('form').length
    }
    
    return structure
  }

  private extractStyles(content: string) {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    const styles = []
    let match
    
    while ((match = styleRegex.exec(content)) !== null) {
      styles.push(match[1])
    }
    
    return styles
  }

  private extractScripts(content: string) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
    const scripts = []
    let match
    
    while ((match = scriptRegex.exec(content)) !== null) {
      if (match[1].trim()) {
        scripts.push(match[1])
      }
    }
    
    return scripts
  }
} 