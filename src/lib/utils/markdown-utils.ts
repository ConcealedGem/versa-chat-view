/**
 * Markdown处理工具函数
 * 提供对Markdown内容的清理、优化和渲染支持
 */

/**
 * 清理Markdown内容，提供更好的渲染
 */
export const cleanMarkdown = (text: string): string => {
  if (!text) return ''

  // 第一步：处理HTML标签和Markdown标记
  let cleanedText = text
    .replace(/\*\*\s*\*\*/g, '**') // 处理连续的星号
    .replace(/\*\*\s+<strong>/g, '**') // 处理**后面跟着<strong>的情况
    .replace(/<\/strong>\s+\*\*/g, '**') // 处理</strong>后面跟着**的情况
    .replace(/<\/?strong>/g, '**') // 将<strong>标签替换为markdown **
    .replace(/^\s*#+\s*(.+)/gm, (_, title) => `# ${title}`) // 标准化标题格式
    .replace(/---+/g, '---') // 标准化分隔线
    .replace(/^(\s*[-*+])\s+/gm, '$1 ') // 标准化列表格式

  // 第二步：处理连续重复的单词和符号
  // 使用正则表达式匹配重复的单词和标点
  const repeatedWordPattern = /(\b\w+\b)(\s+\1\b)+/g
  // 修复：不要处理单个括号，只处理真正重复的标点符号（2个或以上）
  const repeatedPunctPattern = /(（{2,}|）{2,}|，{2,}|：{2,}|。{2,}|、{2,}|\s{2,})/g

  cleanedText = cleanedText
    .replace(repeatedWordPattern, '$1') // 处理重复的单词
    .replace(repeatedPunctPattern, (match) => {
      // 对于重复的标点符号，只保留一个
      if (match.includes('（')) return '（'
      if (match.includes('）')) return '）'
      if (match.includes('，')) return '，'
      if (match.includes('：')) return '：'
      if (match.includes('。')) return '。'
      if (match.includes('、')) return '、'
      if (match.includes(' ')) return ' '
      return match
    }) // 处理重复的标点

  // 第三步：处理特殊情况，如重复的中文字符
  cleanedText = cleanedText
    .replace(/([一-龥])\1+/g, '$1') // 处理重复的中文字符
    // 修改这一行，避免错误地处理单词中的连续字母
    .replace(/(\b\w)(\1{2,})/g, '$1$1') // 只处理连续3个及以上相同字母的情况，保留2个

  // 确保换行符能够正确显示
  // 将\n转换为实际的换行，同时确保连续的换行符不会被重复
  cleanedText = cleanedText
    .replace(/\\n/g, '\n') // 替换字符串中的"\n"为实际的换行符
    .replace(/\n{3,}/g, '\n\n') // 限制连续换行不超过两个

  // 修复Markdown表格格式，确保表格能正确渲染
  cleanedText = fixMarkdownTables(cleanedText)

  return cleanedText
}

/**
 * 增强的修复Markdown表格函数
 */
export const fixMarkdownTables = (text: string): string => {
  // 如果文本中不包含表格的可能性特征，则直接返回
  if (!text.includes('|')) return text

  // 检查是否有特别多的分隔线，如果有，可能是ASCII表格，需要特殊处理
  if ((text.match(/\-{3,}/g) || []).length > 5) {
    return convertAsciiTableToMarkdown(text)
  }

  // 提取出可能的表格区域（以|开头的行）
  const lines = text.split('\n')
  let inTable = false
  let tableStartIndex = -1
  const tables = []

  // 第一步：识别表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // 检测表格的开始（包含|）
    if (!inTable && line.includes('|')) {
      inTable = true
      tableStartIndex = i
    }
    // 检测表格的结束（不包含|或空行）
    else if (inTable && (!line.includes('|') || line === '')) {
      inTable = false
      tables.push({ start: tableStartIndex, end: i - 1 })
    }
  }

  // 如果最后一个表格没有结束，则添加到末尾
  if (inTable) {
    tables.push({ start: tableStartIndex, end: lines.length - 1 })
  }

  // 第二步：修复每个表格
  for (const table of tables) {
    const { start, end } = table
    // 确保表格至少有两行
    if (end - start < 1) continue

    // 第三步：准备表格行，移除干扰字符
    for (let i = start; i <= end; i++) {
      if (i >= lines.length) continue

      // 清理行，保留|和内容
      let line = lines[i].trim()

      // 跳过空行和只有分隔符的行
      if (line === '' || /^[\s\-|]*$/.test(line)) {
        continue
      }

      // 确保行以|开始和结束
      if (!line.startsWith('|')) line = '| ' + line
      if (!line.endsWith('|')) line = line + ' |'

      lines[i] = line
    }

    // 第四步：确保有表头分隔行
    // 获取第一行中的列数
    const headerLine = lines[start].trim()
    const columnCount = (headerLine.match(/\|/g) || []).length - 1

    // 检查第二行是否是分隔行
    if (start + 1 <= end) {
      const secondLine = lines[start + 1].trim()
      if (!secondLine.includes('-')) {
        // 添加分隔行
        const separator = '|' + Array(columnCount).fill('---|').join('') + '|'
        lines.splice(start + 1, 0, separator)
        // 调整表格结束索引
        table.end += 1
        // 更新后续表格的索引
        for (let j = tables.indexOf(table) + 1; j < tables.length; j++) {
          tables[j].start += 1
          tables[j].end += 1
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * 将ASCII风格的表格转换为Markdown表格
 */
export const convertAsciiTableToMarkdown = (text: string): string => {
  const lines = text.split('\n')
  const result = []
  let inTable = false
  let headerRow = -1

  // 遍历每一行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 检测表格边界行
    if (line.match(/^[\|\+][\-\=\+]+[\|\+]$/)) {
      // 这是表格的分隔行
      if (!inTable) {
        inTable = true
        headerRow = i + 1
      } else if (headerRow === i - 1) {
        // 如果这是头部分隔行，添加markdown分隔行
        const cellCount =
          (line.match(/\+/g) || []).length - 1 ||
          (line.match(/\|/g) || []).length - 1
        if (cellCount > 0) {
          const markdownSeparator =
            '|' + Array(cellCount).fill(' --- ').join('|') + '|'
          result.push(markdownSeparator)
        }
      }
      continue
    }

    // 处理表格内容行
    if (inTable && line.includes('|')) {
      // 提取单元格内容
      const cells = line.split('|').map(cell => cell.trim())
      // 只保留非空单元格
      const nonEmptyCells = cells.filter(cell => cell !== '')
      if (nonEmptyCells.length > 0) {
        const markdownRow = '|' + nonEmptyCells.join('|') + '|'
        result.push(markdownRow)
      }
      continue
    }

    // 表格结束
    if (
      inTable &&
      !line.includes('|') &&
      !line.match(/^[\|\+][\-\=\+]+[\|\+]$/)
    ) {
      inTable = false
    }

    // 非表格行直接添加
    if (!inTable) {
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * 预处理reasoning内容，保留换行
 */
export const preprocessReasoning = (text: string): string => {
  if (!text) return ''

  // 首先清理Markdown
  const cleaned = cleanMarkdown(text)

  // 确保换行被正确处理
  // 在Markdown中，需要两个换行才能显示为段落分隔
  return cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n\n')
} 