# 🎓 PTA 学习助手 - 完整使用指南

## 📦 项目组成

本项目包含两个部分：
1. **前端脚本**: `pta/index.js` - 浏览器插件脚本
2. **后端服务**: `pta-server/` - Node.js API服务

## 🚀 完整部署步骤

### 第一步：准备AI API服务

选择以下任一选项：

#### 选项A：使用OpenAI（需要国外手机号）
- 注册OpenAI账号
- 获取API密钥
- 设置 `.env` 中的 `AI_API_KEY`

#### 选项B：使用国内API服务（推荐）

**硅基流动**（新用户免费）
```bash
# 注册地址: https://siliconflow.cn/
# 获取API密钥后配置：
AI_API_KEY=sk-your-siliconflow-key
AI_API_URL=https://api.siliconflow.cn/v1/chat/completions
AI_MODEL=Qwen/Qwen2.5-7B-Instruct
```

**智谱AI**（新用户免费）
```bash
# 注册地址: https://open.bigmodel.cn/
# 获取API密钥后配置：
AI_API_KEY=your-zhipu-key
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_MODEL=glm-4-flash
```

### 第二步：配置后端服务

```bash
# 1. 进入服务目录
cd pta-server

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置你的AI API密钥

# 4. 设置安全密钥
# 在 .env 中设置 API_SECRET_KEY=your-secure-key

# 5. 启动服务
npm start
```

### 第三步：配置前端脚本

1. **安装油猴插件**
   - Chrome/Edge: 安装Tampermonkey扩展
   - Firefox: 安装Greasemonkey扩展

2. **添加脚本**
   - 打开油猴插件管理面板
   - 创建新脚本
   - 复制 `pta/index.js` 的内容
   - 保存脚本

3. **配置插件**
   - 访问PTA网站: https://pintia.cn/
   - 点击页面右上角的"PTA学习助手"面板
   - 进入"设置"标签
   - 配置如下：
     - **API地址**: `http://localhost:3000`
     - **API Key**: 与后端服务的 `API_SECRET_KEY` 一致

### 第四步：开始使用

1. 在PTA网站打开题目页面
2. 点击"开始答题"按钮
3. 脚本会自动识别题型并调用AI解答
4. 答案会自动填入相应位置

## 🔧 配置示例

### .env 文件配置示例

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# AI API 配置 (使用硅基流动)
AI_API_KEY=sk-your-siliconflow-api-key
AI_API_URL=https://api.siliconflow.cn/v1/chat/completions
AI_MODEL=Qwen/Qwen2.5-7B-Instruct

# 安全配置
API_SECRET_KEY=my-secure-secret-key-12345
MAX_REQUESTS_PER_MINUTE=10
```

### 前端插件配置

在PTA助手的设置界面中：
- API地址: `http://localhost:3000`
- API Key: `my-secure-secret-key-12345`（与后端一致）

## 📋 支持的题型

- ✅ 判断题
- ✅ 单选题
- ✅ 多选题
- ✅ 填空题
- ✅ 程序填空题
- ✅ 函数题
- ✅ 编程题

## 🎯 使用技巧

### 1. 提高准确率
- 开启"思考模式"：虽然速度较慢，但准确率更高
- 选择适合的编程语言：根据题目要求配置

### 2. 加快处理速度
- 关闭"思考模式"
- 使用更快的AI模型（如gpt-3.5-turbo）

### 3. 自动化流程
- 开启"完成后自动切换下一题型"
- 开启"提交前自动清除代码注释"

## ⚠️ 注意事项

### 使用限制
1. 本工具仅供学习使用
2. 不能保证100%正确率
3. 请遵守各平台的使用条款

### 常见问题

**Q: AI响应很慢怎么办？**
A: 可以尝试更换更快的模型，或关闭"思考模式"

**Q: 如何提高准确率？**
A: 开启"思考模式"，使用更强的AI模型

**Q: 可以同时处理多道题吗？**
A: 建议一道一道处理，避免API调用过于频繁

**Q: 支持哪些编程语言？**
A: C、C++、Java、Python

## 🔒 安全建议

1. 不要将 `.env` 文件分享给他人
2. 使用强密钥作为 `API_SECRET_KEY`
3. 定期更换API密钥
4. 在生产环境中使用HTTPS

## 📞 获取帮助

### 测试连接
```bash
# 测试后端服务
cd pta-server
npm test
```

### 查看日志
- 后端日志：在运行 `npm start` 的控制台查看
- 前端日志：在PTA助手的"主页"标签查看

### 常见错误处理

**错误：API密钥验证失败**
- 检查前端API Key是否与后端 `API_SECRET_KEY` 一致

**错误：AI服务调用失败**
- 检查 `.env` 中的 `AI_API_KEY` 是否正确
- 检查网络连接
- 查看后端日志获取详细错误信息

**错误：请求过于频繁**
- 调整 `.env` 中的 `MAX_REQUESTS_PER_MINUTE` 参数
- 或在前端设置更长的处理间隔

## 🚀 高级配置

### 使用反向代理（推荐生产环境）

```nginx
location /pta-api/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 使用PM2管理进程

```bash
npm install -g pm2
pm2 start server.js --name pta-server
pm2 startup
pm2 save
```

### Docker部署（可选）

创建 `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 相关文档

- `pta-server/README.md`: 后端服务详细文档
- `pta-server/SETUP_GUIDE.md`: 快速配置指南
- `pta/index.js`: 前端脚本源码

---

祝你学习愉快！🎉
