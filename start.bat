@echo off
echo ======================================
echo   PTA Helper Server - 启动脚本
echo ======================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules\" (
    echo [检测] 首次运行，正在安装依赖...
    npm install
    echo.
)

REM 检查环境变量文件
if not exist ".env" (
    echo [警告] 未找到 .env 文件，正在从示例文件创建...
    copy .env.example .env
    echo.
    echo [重要] 请编辑 .env 文件配置你的 AI API 密钥！
    echo.
    notepad .env
    echo.
    echo 配置完成后按任意键继续...
    pause >nul
)

REM 检查是否配置了API密钥
findstr /C:"your-api-key-here" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo [错误] 请先在 .env 文件中配置 AI_API_KEY！
    echo.
    notepad .env
    echo.
    echo 配置完成后按任意键继续...
    pause >nul
)

echo [启动] 正在启动 PTA Helper Server...
echo.
node server.js

pause
