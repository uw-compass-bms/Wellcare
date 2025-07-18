// 简单的API测试脚本
const fetch = require('node-fetch');

async function testAPI() {
  const baseUrl = 'http://localhost:3001'; // 或者你的开发服务器端口
  
  try {
    // 测试文件API
    console.log('Testing files API...');
    const filesRes = await fetch(`${baseUrl}/api/signature/files?taskId=847504f1-cd98-4e41-ab9a-def29c62ab84`);
    console.log('Files status:', filesRes.status);
    const filesData = await filesRes.text();
    console.log('Files response:', filesData);
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();