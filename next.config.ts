import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境API代理配置
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/v1/:path*`
          : 'http://localhost:8000/api/v1/:path*',
      },
      // 媒体文件代理配置
      {
        source: '/media/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/media/:path*`
          : 'http://localhost:8000/media/:path*',
      },
    ];
  },

  // 输出配置 - 使用默认模式
  // output: 'standalone',

  // 图片优化配置
  images: {
    unoptimized: true,
    domains: process.env.BACKEND_URL ? [new URL(process.env.BACKEND_URL).hostname] : ['localhost', 'alicee.me'],
  },

  // 开发环境跨域配置
  allowedDevOrigins: [
    '192.168.176.1',
    '192.168.185.21',
    '192.168.0.0/16',  // 允许整个 192.168.x.x 网段
    '10.0.0.0/8',      // 允许 10.x.x.x 网段
    '172.16.0.0/12',   // 允许 172.16.x.x - 172.31.x.x 网段
    '198.18.0.1',      // 允许测试环境IP
    '198.18.0.0/16',   // 允许整个 198.18.x.x 网段
    '*.replit.app',    // 允许Replit域名
    '*.replit.dev',    // 允许Replit开发域名
    'alicee.me',       // 允许alicee.me域名
    '*.alicee.me',     // 允许alicee.me的子域名
  ],

  // Replit特定配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  // 环境变量配置
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    PORT: process.env.PORT,
    HOSTNAME: process.env.HOSTNAME,
  },
};

export default nextConfig;
