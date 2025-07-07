#!/bin/bash

# Replit部署脚本 - 确保应用正确启动
echo "🚀 开始部署Next.js应用..."

# 设置环境变量
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

# 输出环境信息
echo "🌐 环境信息:"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - HOSTNAME: $HOSTNAME"
echo "  - Node.js版本: $(node --version)"

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
rm -rf .next

# 安装依赖
echo "📦 安装依赖..."
npm install --legacy-peer-deps --production=false

# 构建应用
echo "🔨 构建应用..."
npm run build

# 检查构建结果
if [ ! -d ".next" ]; then
    echo "❌ 构建失败：.next目录不存在"
    exit 1
fi

if [ ! -f ".next/standalone/server.js" ]; then
    echo "❌ standalone服务器文件不存在"
    exit 1
fi

echo "✅ 构建成功"

# 启动应用并确保端口正确绑定
echo "🌟 启动应用服务器..."
echo "📍 应用将在 http://$HOSTNAME:$PORT 上运行"

# 使用exec确保进程正确替换，使用standalone模式
exec npm run start