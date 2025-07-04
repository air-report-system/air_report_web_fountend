#!/usr/bin/env node

/**
 * 健康检查脚本
 * 用于检查前端和后端服务的连接状态
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 配置
const config = {
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    timeout: 5000
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:8000',
    timeout: 10000
  }
};

/**
 * 发送HTTP请求
 */
function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'Health-Check/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 检查前端服务
 */
async function checkFrontend() {
  console.log('🔍 检查前端服务...');
  try {
    const response = await makeRequest(config.frontend.url, config.frontend.timeout);
    if (response.status === 200) {
      console.log('✅ 前端服务正常');
      return true;
    } else {
      console.log(`⚠️  前端服务响应异常: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 前端服务连接失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查后端服务
 */
async function checkBackend() {
  console.log('🔍 检查后端服务...');
  try {
    const healthUrl = `${config.backend.url}/api/v1/health/`;
    const response = await makeRequest(healthUrl, config.backend.timeout);
    
    if (response.status === 200) {
      console.log('✅ 后端服务正常');
      try {
        const data = JSON.parse(response.data);
        console.log(`📊 后端状态: ${data.status || 'unknown'}`);
        if (data.database) {
          console.log(`💾 数据库状态: ${data.database}`);
        }
      } catch (e) {
        console.log('📊 后端响应格式异常');
      }
      return true;
    } else {
      console.log(`⚠️  后端服务响应异常: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 后端服务连接失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查前后端通信
 */
async function checkCommunication() {
  console.log('🔍 检查前后端通信...');
  try {
    // 通过前端代理访问后端API
    const proxyUrl = `${config.frontend.url}/api/v1/health/`;
    const response = await makeRequest(proxyUrl, config.backend.timeout);
    
    if (response.status === 200) {
      console.log('✅ 前后端通信正常');
      return true;
    } else {
      console.log(`⚠️  前后端通信异常: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 前后端通信失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🏥 开始健康检查...');
  console.log(`📍 前端地址: ${config.frontend.url}`);
  console.log(`📍 后端地址: ${config.backend.url}`);
  console.log('');

  const results = {
    frontend: await checkFrontend(),
    backend: await checkBackend(),
    communication: false
  };

  // 只有前后端都正常时才检查通信
  if (results.frontend && results.backend) {
    results.communication = await checkCommunication();
  }

  console.log('');
  console.log('📋 检查结果汇总:');
  console.log(`   前端服务: ${results.frontend ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   后端服务: ${results.backend ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   前后端通信: ${results.communication ? '✅ 正常' : '❌ 异常'}`);

  const allHealthy = results.frontend && results.backend && results.communication;
  console.log('');
  console.log(`🎯 总体状态: ${allHealthy ? '✅ 系统正常' : '❌ 系统异常'}`);

  // 返回适当的退出码
  process.exit(allHealthy ? 0 : 1);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行健康检查
if (require.main === module) {
  main();
}

module.exports = {
  checkFrontend,
  checkBackend,
  checkCommunication
};
