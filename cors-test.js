#!/usr/bin/env node

/**
 * CORS和API连接测试脚本
 * 用于验证前后端通信配置
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * 发送HTTP请求
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': 'CORS-Test/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
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

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * 测试后端健康检查
 */
async function testBackendHealth() {
  console.log('🔍 测试后端健康检查...');
  try {
    const url = `${BACKEND_URL}/api/v1/health/`;
    const response = await makeRequest(url);
    
    console.log(`   状态码: ${response.status}`);
    console.log(`   CORS头: ${response.headers['access-control-allow-origin'] || '未设置'}`);
    
    if (response.status === 200) {
      console.log('✅ 后端健康检查通过');
      return true;
    } else {
      console.log('❌ 后端健康检查失败');
      return false;
    }
  } catch (error) {
    console.log(`❌ 后端连接失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试CORS预检请求
 */
async function testCORSPreflight() {
  console.log('🔍 测试CORS预检请求...');
  try {
    const url = `${BACKEND_URL}/api/v1/health/`;
    const response = await makeRequest(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    console.log(`   状态码: ${response.status}`);
    console.log(`   允许的源: ${response.headers['access-control-allow-origin'] || '未设置'}`);
    console.log(`   允许的方法: ${response.headers['access-control-allow-methods'] || '未设置'}`);
    console.log(`   允许的头: ${response.headers['access-control-allow-headers'] || '未设置'}`);
    
    if (response.status === 200 || response.status === 204) {
      console.log('✅ CORS预检请求通过');
      return true;
    } else {
      console.log('❌ CORS预检请求失败');
      return false;
    }
  } catch (error) {
    console.log(`❌ CORS预检请求失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试API端点
 */
async function testAPIEndpoints() {
  console.log('🔍 测试主要API端点...');
  
  const endpoints = [
    '/api/v1/health/',
    '/api/v1/auth/profile/',
    '/api/v1/ocr/results/',
    '/api/v1/reports/',
    '/api/v1/batch/jobs/'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const url = `${BACKEND_URL}${endpoint}`;
      const response = await makeRequest(url, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });
      
      results[endpoint] = {
        status: response.status,
        accessible: response.status < 500
      };
      
      console.log(`   ${endpoint}: ${response.status} ${results[endpoint].accessible ? '✅' : '❌'}`);
    } catch (error) {
      results[endpoint] = {
        status: 'ERROR',
        accessible: false,
        error: error.message
      };
      console.log(`   ${endpoint}: ERROR ❌ (${error.message})`);
    }
  }
  
  return results;
}

/**
 * 测试通过前端代理的API访问
 */
async function testProxyAccess() {
  console.log('🔍 测试前端代理访问...');
  try {
    const url = `${FRONTEND_URL}/api/v1/health/`;
    const response = await makeRequest(url);
    
    console.log(`   状态码: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ 前端代理访问正常');
      return true;
    } else {
      console.log('❌ 前端代理访问失败');
      return false;
    }
  } catch (error) {
    console.log(`❌ 前端代理访问失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 开始CORS和API连接测试...');
  console.log(`📍 后端地址: ${BACKEND_URL}`);
  console.log(`📍 前端地址: ${FRONTEND_URL}`);
  console.log('');

  const results = {
    backendHealth: await testBackendHealth(),
    corsPreflight: await testCORSPreflight(),
    apiEndpoints: await testAPIEndpoints(),
    proxyAccess: await testProxyAccess()
  };

  console.log('');
  console.log('📋 测试结果汇总:');
  console.log(`   后端健康检查: ${results.backendHealth ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   CORS预检请求: ${results.corsPreflight ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   API端点访问: ${Object.values(results.apiEndpoints).some(r => r.accessible) ? '✅ 部分可用' : '❌ 全部失败'}`);
  console.log(`   前端代理访问: ${results.proxyAccess ? '✅ 通过' : '❌ 失败'}`);

  const overallSuccess = results.backendHealth && results.proxyAccess;
  console.log('');
  console.log(`🎯 总体状态: ${overallSuccess ? '✅ 通信正常' : '❌ 通信异常'}`);

  if (!overallSuccess) {
    console.log('');
    console.log('🔧 建议检查项:');
    if (!results.backendHealth) {
      console.log('   - 后端服务是否正在运行');
      console.log('   - BACKEND_URL环境变量是否正确');
    }
    if (!results.corsPreflight) {
      console.log('   - 后端CORS配置是否正确');
      console.log('   - 是否允许前端域名访问');
    }
    if (!results.proxyAccess) {
      console.log('   - Next.js代理配置是否正确');
      console.log('   - 前端服务是否正在运行');
    }
  }

  process.exit(overallSuccess ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('💥 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  testBackendHealth,
  testCORSPreflight,
  testAPIEndpoints,
  testProxyAccess
};
