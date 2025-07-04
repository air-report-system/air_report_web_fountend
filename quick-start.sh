#!/bin/bash

# 快速启动脚本 - 智能检测并执行必要步骤
echo "🚀 快速启动 Next.js 应用..."

# 设置环境变量
export NODE_ENV=production
export PORT=3000

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未找到！"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"

# 智能依赖检查
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，安装依赖..."
    npm install
elif [ "package.json" -nt "node_modules" ]; then
    echo "📦 package.json已更新，重新安装依赖..."
    npm install
else
    echo "📦 依赖已是最新"
fi

# 智能构建检查
if [ ! -d ".next" ]; then
    echo "🔨 首次构建..."
    npm run build
elif [ "package.json" -nt ".next" ] || [ "next.config.ts" -nt ".next" ] || [ "tsconfig.json" -nt ".next" ]; then
    echo "🔨 配置已更新，重新构建..."
    npm run build
elif [ "src" -nt ".next" ]; then
    echo "🔨 源码已更新，重新构建..."
    npm run build
else
    echo "🔨 构建文件已是最新"
fi

# 检查后端连接
if [ ! -z "$BACKEND_URL" ]; then
    echo "🔌 检查后端连接..."
    if curl -f --connect-timeout 5 "$BACKEND_URL/api/v1/health/" > /dev/null 2>&1; then
        echo "✅ 后端连接正常"
    else
        echo "⚠️  后端连接失败，但继续启动前端"
    fi
fi

# 启动应用
echo "🌟 启动应用服务器..."
echo "📍 应用地址: http://localhost:$PORT"
echo "🔗 Replit地址: https://$REPL_SLUG.$REPL_OWNER.replit.app"

exec npm run start
