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

  // 输出配置
  output: 'standalone',

  // 图片优化配置
  images: {
    unoptimized: true,
  },

  // 开发环境跨域配置
  allowedDevOrigins: [
    '192.168.185.21',
    '192.168.0.0/16',  // 允许整个 192.168.x.x 网段
    '10.0.0.0/8',      // 允许 10.x.x.x 网段
    '172.16.0.0/12',   // 允许 172.16.x.x - 172.31.x.x 网段
  ],
};

export default nextConfig;
