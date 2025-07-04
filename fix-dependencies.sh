#!/bin/bash

# 修复依赖问题脚本
echo "🔧 修复Tailwind CSS依赖问题..."

# 清理现有依赖
echo "🧹 清理现有依赖..."
rm -rf node_modules
rm -f package-lock.json

# 重新安装依赖
echo "📦 重新安装所有依赖..."
npm install --legacy-peer-deps

# 验证关键包是否安装
echo "🔍 验证关键包安装..."

if [ -d "node_modules/tailwindcss" ]; then
    echo "✅ tailwindcss 已安装"
else
    echo "❌ tailwindcss 未安装"
    exit 1
fi

if [ -d "node_modules/autoprefixer" ]; then
    echo "✅ autoprefixer 已安装"
else
    echo "❌ autoprefixer 未安装"
    exit 1
fi

if [ -d "node_modules/postcss" ]; then
    echo "✅ postcss 已安装"
else
    echo "❌ postcss 未安装"
    exit 1
fi

echo "🎉 依赖修复完成！现在可以尝试构建项目了"
echo "运行: npm run build"
