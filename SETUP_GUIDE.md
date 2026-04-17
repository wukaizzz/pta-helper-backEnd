# 🚀 快速配置指南

## 第一步：安装依赖

```bash
cd pta-server
npm install
```

## 第二步：配置AI API

编辑 `.env` 文件，选择以下任一配置方式：

### 方式1：使用 OpenAI
```env
AI_API_KEY=sk-your-openai-key-here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-3.5-turbo
```

### 方式2：使用国内API服务（推荐）

#### 硅基流动
```env
AI_API_KEY=sk-your-siliconflow-key
AI_API_URL=https://api.siliconflow.cn/v1/chat/completions
AI_MODEL=Qwen/Qwen2.5-7B-Instruct
```

#### 智谱AI
```env
AI_API_KEY=your-zhipu-key
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_MODEL=glm-4-flash
```

#### 通义千问
```env
AI_API_KEY=sk-your-qwen-key
AI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_MODEL=qwen-turbo
```

## 第三步：设置安全密钥

在 `.env` 中设置一个强密钥：

```env
API_SECRET_KEY=your-secure-secret-key-here
```

## 第四步：启动服务

### Windows用户：
双击 `start.bat` 或在命令行中运行：
```bash
npm start
```

### Linux/Mac用户：
```bash
chmod +x start.sh
./start.sh
```

## 第五步：配置前端脚本

1. 打开PTA网站
2. 点击PTA助手插件
3. 进入"设置"标签
4. 配置如下：
   - **API地址**: `http://localhost:3000`
   - **API Key**: 与服务器的 `API_SECRET_KEY` 相同

## 常用免费/廉价API选项

### 1. 硅基流动 - 新用户有免费额度
- 注册: https://siliconflow.cn/
- 优点: 支持多种模型，新用户免费
- 模型推荐: Qwen2.5-7B-Instruct

### 2. 智谱AI - 新用户免费额度
- 注册: https://open.bigmodel.cn/
- 优点: 国内服务稳定，有免费额度
- 模型推荐: glm-4-flash (免费)

### 3. 通义千问 - 按量付费
- 注册: https://dashscope.aliyuncs.com/
- 优点: 阿里云服务稳定
- 模型推荐: qwen-turbo (便宜)

## 测试连接

启动服务后，访问以下URL测试：

```bash
# 健康检查
curl http://localhost:3000/health

# 查看配置
curl http://localhost:3000/config
```

## 故障排除

### 问题1：端口被占用
修改 `.env` 中的 `PORT=3000` 为其他端口，如 `PORT=3001`

### 问题2：API调用失败
1. 检查API密钥是否正确
2. 检查网络连接
3. 查看服务器日志

### 问题3：无法连接到服务器
1. 确保服务器正在运行
2. 检查防火墙设置
3. 确认前端配置的API地址正确

## 开发模式

如果你需要频繁修改代码，使用开发模式：

```bash
npm run dev
```

这会启用自动重启功能。

## 生产部署

如需部署到生产环境，建议：

1. 使用 PM2 进行进程管理
2. 配置反向代理 (Nginx)
3. 启用 HTTPS
4. 设置更严格的安全策略

```bash
npm install -g pm2
pm2 start server.js --name pta-server
pm2 startup
pm2 save
```

## 支持

如有问题，请检查：
1. 服务器控制台日志
2. 浏览器开发者工具控制台
3. AI API服务商的文档
