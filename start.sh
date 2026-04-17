#!/bin/bash

echo "======================================"
echo "  PTA Helper Server - 启动脚本"
echo "======================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "[检测] 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "[警告] 未找到 .env 文件，正在从示例文件创建..."
    cp .env.example .env
    echo ""
    echo "[重要] 请编辑 .env 文件配置你的 AI API 密钥！"
    echo ""

    if command -v nano &> /dev/null; then
        nano .env
    elif command -v vi &> /dev/null; then
        vi .env
    else
        echo "请使用你喜欢的编辑器编辑 .env 文件"
        exit 1
    fi

    echo ""
    echo "配置完成后按回车继续..."
    read
fi

# 检查是否配置了API密钥
if grep -q "your-api-key-here" .env; then
    echo "[错误] 请先在 .env 文件中配置 AI_API_KEY！"
    echo ""

    if command -v nano &> /dev/null; then
        nano .env
    elif command -v vi &> /dev/null; then
        vi .env
    fi

    echo ""
    echo "配置完成后按回车继续..."
    read
fi

echo "[启动] 正在启动 PTA Helper Server..."
echo ""
node server.js
