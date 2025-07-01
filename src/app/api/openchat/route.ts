import OpenAI from 'openai'

// 定义扩展的Delta类型
interface ExtendedDelta {
  content?: string
  reasoning?: string
}

// 创建OpenAI客户端（可以用于OpenRouter，因为它兼容OpenAI接口）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_API_BASE || ''
})

export const runtime = 'edge'

// 辅助函数：保留换行符，将原始的换行转换为\n表示
function preserveNewlines(text: string): string {
  return text.replace(/\n/g, '\\n')
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // 调用OpenRouter API
    const response = await openai.chat.completions.create({
      model: process.env.MODEL || 'qwen/qwq-32b:free',
      messages,
      temperature: 0.7,
      stream: true
    })

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let reasoning = ''

        // 处理响应流
        for await (const chunk of response) {
          // 使用类型断言处理扩展的Delta类型
          const delta = chunk.choices[0]?.delta as unknown as ExtendedDelta
          const reasoningChunk = delta?.reasoning || ''
          const contentChunk = delta?.content || ''

          // 累加思考过程，处理换行符
          if (reasoningChunk) {
            // 将原始换行转换为\n，前端会将其转换回换行符
            reasoning += preserveNewlines(reasoningChunk)

            // 当有新的思考过程时，将其发送到前端
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'reasoning',
                  content: reasoning
                })}\n\n`
              )
            )
          }

          // 发送回复内容（不需要累加，直接发送片段）
          if (contentChunk) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'content',
                  content: contentChunk
                })}\n\n`
              )
            )
          }
        }

        controller.close()
      }
    })

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return new Response(JSON.stringify({ error: '处理聊天请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

