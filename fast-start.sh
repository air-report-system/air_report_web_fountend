#!/bin/bash

# 室内空气检测数据处理系统 - 快速启动脚本
# 使用Next.js标准模式启动服务器

set -e

echo "=== 室内空气检测数据处理系统 - 快速启动 ==="
echo "开始时间: $(date)"

# 设置环境变量
export NODE_ENV=production
export HOSTNAME=0.0.0.0
export PORT=3000

# 确保构建目录存在
if [ ! -d ".next" ]; then
    echo "❌ 错误：.next目录不存在，请先运行构建命令"
    exit 1
fi

# 启动服务器
echo "🚀 启动Next.js服务器..."
echo "端口: $PORT"
echo "主机: $HOSTNAME"
echo "环境: $NODE_ENV"

# 使用next start启动服务器
HOSTNAME=$HOSTNAME PORT=$PORT npm run start