# PTA Helper Server

PTA学习助手的后端服务，支持多种AI API提供商。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置你的AI API：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# AI API 配置
AI_API_KEY=your-api-key-here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-3.5-turbo

# 安全配置
API_SECRET_KEY=your-secret-key-for-client-validation
MAX_REQUESTS_PER_MINUTE=10
```

### 3. 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务将在 `http://localhost:3000` 启动。

## 🔧 支持的AI服务

### OpenAI
```env
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-3.5-turbo
```

### Azure OpenAI
```env
AI_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15
AI_API_KEY=your-azure-key
AI_MODEL=gpt-35-turbo
```

### 国内API服务（如文心一言、通义千问等）
```env
AI_API_URL=https://api.your-service.com/v1/chat/completions
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
```

### Claude（通过代理）
```env
AI_API_URL=https://your-anthropic-proxy.com/v1/chat/completions
AI_API_KEY=your-claude-key
AI_MODEL=claude-3-sonnet
```

## 📡 API接口

### POST /solve
主要的解题接口

**请求体：**
```json
{
  "systemPrompt": "你是一个答题助手...",
  "question": "题目内容",
  "username": "用户名",
  "apiKey": "客户端验证密钥",
  "deviceId": "设备ID"
}
```

**响应：**
```json
{
  "choices": [
    {
      "message": {
        "content": "AI生成的答案"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

### GET /health
健康检查接口

### GET /config
获取服务器配置信息

## 🔐 安全配置

1. **API_SECRET_KEY**: 用于验证客户端请求，请设置一个强密钥
2. **MAX_REQUESTS_PER_MINUTE**: 限制每个设备的请求频率，防止滥用

## 🛠️ 配置前端脚本

在PTA助手的设置中：

1. **API地址**: `http://localhost:3000`
2. **API Key**: 与服务器的 `API_SECRET_KEY` 保持一致

## 📝 日志

服务器会记录所有请求：
```
[14:30:25] POST /solve
[user123] 请求AI解答...
[user123] AI响应成功
```

## 🚨 故障排除

### AI API 调用失败
- 检查 `AI_API_KEY` 是否正确
- 检查 `AI_API_URL` 是否可访问
- 检查网络连接
- 查看服务器日志获取详细错误信息

### 客户端连接失败
- 确保服务器正在运行
- 检查防火墙设置
- 确认API地址配置正确
- 验证API Secret Key是否匹配

### 请求频率限制
- 调整 `MAX_REQUESTS_PER_MINUTE` 参数
- 或在客户端设置更长的请求间隔

## 📊 性能优化

- 启用请求缓存（可自行实现）
- 使用更快的AI模型（如 gpt-3.5-turbo）
- 增加超时时间限制
- 使用连接池管理HTTP请求

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## ⚠️ 免责声明

本项目仅供学习和研究目的使用。使用本工具所产生的任何后果由用户自行承担。

## 📄 许可证

MIT License
