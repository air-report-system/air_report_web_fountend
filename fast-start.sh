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

# 复制静态文件到standalone目录
echo "📁 复制静态文件..."
if [ -d ".next/static" ]; then
    cp -r .next/static .next/standalone/.next/
    echo "✅ 静态文件复制完成"
fi

# 复制public文件到standalone目录
if [ -d "public" ]; then
    cp -r public .next/standalone/
    echo "✅ public文件复制完成"
fi

echo "✅ 服务器文件检查通过"
echo "🚀 启动服务器..."
echo "📍 应用地址: http://$HOSTNAME:$PORT"

# 切换到standalone目录并启动服务器
cd .next/standalone
exec node server.js