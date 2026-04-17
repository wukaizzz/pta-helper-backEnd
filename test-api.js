require('dotenv').config();
const axios = require('axios');

async function testAPI() {
    console.log('🧪 测试 PTA Helper Server API 连接...\n');

    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

    try {
        // 测试健康检查
        console.log('1️⃣ 测试健康检查接口...');
        const healthRes = await axios.get(`${baseUrl}/health`);
        console.log('✅ 健康检查:', healthRes.data);
        console.log();

        // 测试配置接口
        console.log('2️⃣ 测试配置接口...');
        const configRes = await axios.get(`${baseUrl}/config`);
        console.log('✅ 服务器配置:', configRes.data);
        console.log();

        // 测试解题接口
        console.log('3️⃣ 测试解题接口...');
        const solveRes = await axios.post(`${baseUrl}/solve`, {
            systemPrompt: '你是一个数学助手。',
            question: '1+1等于几？',
            username: 'test-user',
            apiKey: process.env.API_SECRET_KEY,
            deviceId: 'test-device'
        });

        console.log('✅ AI 响应:', solveRes.data.choices[0].message.content);
        console.log('📊 Token 使用:', solveRes.data.usage);
        console.log();

        console.log('🎉 所有测试通过！服务器运行正常。');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误详情:', error.response.data);
        }
        process.exit(1);
    }
}

// 运行测试
testAPI();
