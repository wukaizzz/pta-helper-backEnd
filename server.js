require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 日志中间件
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'PTA Helper Server is running' });
});

// 获取配置信息
app.get('/config', (req, res) => {
    res.json({
        model: process.env.AI_MODEL,
        apiUrl: process.env.AI_API_URL?.replace(/\/chat\/completions.*/, '/chat/completions'),
        maxRequests: process.env.MAX_REQUESTS_PER_MINUTE || 10
    });
});

// 简单的内存限流器
const requestLog = new Map();
function checkRateLimit(apiKey) {
    const now = Date.now();
    const minuteAgo = now - 60000;

    // 清理旧记录
    for (const [key, timestamps] of requestLog.entries()) {
        const recent = timestamps.filter(t => t > minuteAgo);
        if (recent.length === 0) {
            requestLog.delete(key);
        } else {
            requestLog.set(key, recent);
        }
    }

    // 检查当前请求频率
    const timestamps = requestLog.get(apiKey) || [];
    if (timestamps.length >= parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10')) {
        return false;
    }

    // 记录本次请求
    requestLog.set(apiKey, [...timestamps, now]);
    return true;
}

// 主解题接口
app.post('/solve', async (req, res) => {
    try {
        const { systemPrompt, question, username, apiKey, deviceId } = req.body;

        // 验证请求
        if (!question || !systemPrompt) {
            return res.status(400).json({
                error: '缺少必要参数: question 或 systemPrompt'
            });
        }

        // 验证客户端API密钥
        if (apiKey !== process.env.API_SECRET_KEY) {
            return res.status(401).json({
                error: 'API密钥验证失败，请检查配置'
            });
        }

        // 检查请求频率限制
        if (!checkRateLimit(deviceId || 'default')) {
            return res.status(429).json({
                error: '请求过于频繁，请稍后再试'
            });
        }

        console.log(`[${username || 'Anonymous'}] 请求AI解答...`);

        // 调用AI API
        const aiResponse = await callAIAPI(systemPrompt, question);

        if (aiResponse.error) {
            console.error('AI API Error:', aiResponse.error);
            return res.status(500).json({
                error: `AI服务错误: ${aiResponse.error}`
            });
        }

        console.log(`[${username || 'Anonymous'}] AI响应成功`);

        // 返回符合前端脚本期望的格式
        res.json({
            choices: [{
                message: {
                    content: aiResponse.content
                }
            }],
            usage: aiResponse.usage
        });

    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({
            error: '服务器内部错误，请稍后重试'
        });
    }
});

// 调用AI API的函数
async function callAIAPI(systemPrompt, userMessage) {
    try {
        const apiURL = process.env.AI_API_URL;
        const apiKey = process.env.AI_API_KEY;
        const model = process.env.AI_MODEL;

        if (!apiKey) {
            throw new Error('未配置 AI_API_KEY');
        }

        const response = await axios.post(apiURL, {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3,  // 降低温度以获得更确定的回答
            max_tokens: 500,   // 减少最大tokens以避免重复
            top_p: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2分钟超时
        });

        return {
            content: response.data.choices[0].message.content,
            usage: response.data.usage
        };

    } catch (error) {
        if (error.response) {
            console.error('API Response Error:', error.response.data);
            return {
                error: `API返回错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`
            };
        } else if (error.request) {
            return { error: 'API服务无响应，请检查网络和API地址' };
        } else {
            return { error: error.message };
        }
    }
}

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           PTA Helper Server Started Successfully!            ║
╠══════════════════════════════════════════════════════════════╣
║  Server URL:      http://localhost:${PORT}                       ║
║  Health Check:    http://localhost:${PORT}/health                 ║
║  Config Info:     http://localhost:${PORT}/config                 ║
║  Solve Endpoint:  http://localhost:${PORT}/solve                  ║
╠══════════════════════════════════════════════════════════════╣
║  AI Model:        ${process.env.AI_MODEL || 'Not configured'}               ║
║  Rate Limit:      ${process.env.MAX_REQUESTS_PER_MINUTE || 10} req/min                             ║
╚══════════════════════════════════════════════════════════════╝
    `);

    if (!process.env.AI_API_KEY) {
        console.warn('⚠️  WARNING: AI_API_KEY not configured! Please set it in .env file');
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
