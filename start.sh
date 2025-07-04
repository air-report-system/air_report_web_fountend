#!/bin/bash

# 室内空气检测系统前端启动脚本
# 用于Replit部署

echo "🚀 启动室内空气检测系统前端..."

# 设置环境变量
export NODE_ENV=production
export PORT=3000

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node --version
npm --version

# 检查是否需要安装依赖
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo "📦 安装项目依赖..."
    npm install --legacy-peer-deps
else
    echo "📦 依赖已存在，跳过安装"
fi

# 检查是否需要构建
if [ ! -d ".next" ] || [ "package.json" -nt ".next" ]; then
    echo "🔨 构建Next.js项目..."
    npm run build

    # 检查构建结果
    if [ $? -eq 0 ]; then
        echo "✅ 构建成功！"
    else
        echo "❌ 构建失败！"
        exit 1
    fi
else
    echo "🔨 构建文件已存在且是最新的，跳过构建"
fi

# 启动应用
echo "🌟 启动应用服务器..."
echo "📍 应用将在端口 $PORT 上运行"
echo "🔗 前端地址: https://$REPL_SLUG.$REPL_OWNER.replit.app"

# 检查后端连接
if [ ! -z "$BACKEND_URL" ]; then
    echo "🔌 检查后端连接: $BACKEND_URL"
    curl -f "$BACKEND_URL/api/v1/health/" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ 后端连接正常"
    else
        echo "⚠️  后端连接失败，请检查BACKEND_URL环境变量"
    fi
else
    echo "⚠️  未设置BACKEND_URL环境变量"
fi

# 启动Next.js服务器
exec npm run start
