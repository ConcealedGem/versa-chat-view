module.exports = {
  // 移除 trailingSlash 和 exportPathMap
  
  // 添加图片优化配置
  images: {
    unoptimized: true
  },
  
  async rewrites() {
    console.log('Rewriting /api/* to http://localhost:8000/api/*')
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*' // Use 127.0.0.1 instead of localhost
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          // SSE 流式传输专用头部
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
          { key: 'Content-Encoding', value: 'none' },
          { key: 'Connection', value: 'keep-alive' },
          // 禁用代理缓存
          { key: 'X-Accel-Buffering', value: 'no' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      }
    ]
  },
  // 添加这个配置来处理客户端路由
  distDir: 'build',
  output: 'export'
  
}