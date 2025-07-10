#!/bin/bash

# 前端缓存清理脚本
# 清理所有可能的缓存文件并更新版本号

set -e

echo "🧹 开始清理前端缓存..."

# 0. 更新版本号时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 读取当前版本号，提取基础版本部分（去掉时间戳）
if [ -f ".version" ]; then
    CURRENT_VERSION=$(cat .version)
    # 提取基础版本号(去掉_后面的时间戳部分)
    BASE_VERSION=$(echo $CURRENT_VERSION | sed 's/_[0-9]*_[0-9]*$//')
else
    BASE_VERSION="1.0.0"
fi

NEW_VERSION="${BASE_VERSION}_${TIMESTAMP}"
echo $NEW_VERSION > .version
echo "✅ 版本号已更新为: $NEW_VERSION (基础版本: $BASE_VERSION)"

# 1. 清理Next.js构建缓存
echo "清理Next.js构建缓存..."
rm -rf .next
rm -rf .next-cache
rm -rf out
echo "✅ Next.js构建缓存已清理"

# 2. 清理npm缓存
echo "清理npm缓存..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
echo "✅ npm缓存已清理"

# 3. 清理临时文件
echo "清理临时文件..."
rm -rf .tmp
rm -rf .cache
rm -rf .turbo
echo "✅ 临时文件已清理"

# 4. 清理环境文件备份
echo "清理环境文件备份..."
rm -f .env.local.bak
rm -f .env.backup
echo "✅ 环境文件备份已清理"

# 5. 重新安装依赖
echo "重新安装依赖..."
npm install --legacy-peer-deps
echo "✅ 依赖已重新安装"

# 6. 强制重新构建
echo "强制重新构建..."
npm run build
echo "✅ 构建完成"

echo "🎉 前端缓存清理完成！"
echo "📋 版本信息: $NEW_VERSION"
echo "💡 建议现在重新部署到Replit"
echo "🔍 部署后访问 /version 页面验证版本更新"