// 添加静态导出配置
export const dynamic = "force-static";

// 模拟从后端获取，用于获取用户信息
export async function GET() {
  try {
    // 从环境变量中获取欢迎消息配置
    // 返回JSON响应
    return Response.json({
      "username": "long",
      "email": "alex@example.com",
      "id": 2,
      "is_active": true,
      "is_admin": true,
      "created_at": "2025-03-25T09:56:26.071880",
      "updated_at": null
  })
  } catch (error) {
    // 如果发生错误，返回500错误
    console.error(error)
    return new Response(JSON.stringify({ error: '获取用户信息失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}