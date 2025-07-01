// 添加静态导出配置
export const dynamic = "force-static";

// 模拟从后端获取配置
export async function GET() {
  try {
    // 从环境变量中获取配置
    const showProcess = process.env.SHOW_PROCESS === 'true'
    const showReferences = process.env.SHOW_REFERENCES === 'true'

    // 返回JSON响应
    return Response.json({
      showProcess,
      showReferences
    })
  } catch (error) {
    // 如果发生错误，返回500错误
    console.error(error)
    return new Response(JSON.stringify({ error: '获取配置信息失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}