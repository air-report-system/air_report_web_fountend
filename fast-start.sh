#!/bin/bash

# 快速启动脚本 - 部署专用
echo "⚡ 快速启动 Next.js 应用..."

# 设置环境变量
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

# 检查standalone服务器文件
if [ ! -f ".next/standalone/server.js" ]; then
    echo "❌ standalone服务器文件不存在"
    exit 1
fi

echo "✅ 服务器文件检查通过"
echo "🚀 启动服务器..."
echo "📍 应用地址: http://$HOSTNAME:$PORT"

# 直接启动服务器，不做额外检查
exec node .next/standalone/server.js