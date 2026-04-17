# 📁 PTA Helper Server 项目结构

```
pta-server/
├── server.js           # 主服务器文件
├── test-api.js         # API测试脚本
├── package.json        # 项目配置和依赖
├── .env.example        # 环境变量示例
├── .env                # 环境变量配置（需自行创建）
├── .gitignore         # Git忽略文件
├── start.bat          # Windows启动脚本
├── start.sh           # Linux/Mac启动脚本
├── README.md          # 详细文档
├── SETUP_GUIDE.md     # 快速配置指南
└── node_modules/      # 依赖包（安装后生成）
```

## 🚀 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置你的AI API密钥
   ```

3. **启动服务**
   ```bash
   npm start
   ```

4. **测试连接**
   ```bash
   npm test
   ```

## 📝 主要文件说明

### server.js
- Express服务器主文件
- 处理API请求和AI调用
- 实现频率限制和错误处理

### test-api.js
- API测试脚本
- 验证服务器功能
- 测试AI API连接

### .env
- 环境变量配置文件
- 包含AI API密钥和服务器配置
- **重要：不要将此文件提交到版本控制**

### 启动脚本
- `start.bat`: Windows一键启动
- `start.sh`: Linux/Mac一键启动
- 自动检测依赖和配置

## 🔧 配置要点

### 必须配置的环境变量：
- `AI_API_KEY`: 你的AI服务API密钥
- `API_SECRET_KEY`: 客户端验证密钥

### 可选配置：
- `PORT`: 服务器端口（默认3000）
- `AI_MODEL`: 使用的AI模型
- `MAX_REQUESTS_PER_MINUTE`: 请求频率限制

## 📡 服务端点

- `GET /health` - 健康检查
- `GET /config` - 获取配置信息
- `POST /solve` - 主要的解题接口

## 🛠️ 开发说明

- 使用 `npm run dev` 启动开发模式（自动重启）
- 使用 `npm test` 测试API连接
- 修改代码后，服务器会自动重启（开发模式）

## 📚 文档

- `README.md`: 完整的API文档和配置说明
- `SETUP_GUIDE.md`: 快速配置指南
- `PROJECT_STRUCTURE.md`: 本文件，项目结构说明
