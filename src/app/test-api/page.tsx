'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBackend = async () => {
    setLoading(true);
    try {
      // 测试后端根路径
      const response = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          password: 'test'
        })
      });
      
      const data = await response.text();
      setResult(`状态: ${response.status}\n响应: ${data}`);
    } catch (error) {
      setResult(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirect = async () => {
    setLoading(true);
    try {
      // 使用相对路径进行测试
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? '/api/v1'
        : 'http://localhost:8000/api/v1';

      const response = await fetch(`${baseUrl}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          password: 'test'
        })
      });

      const data = await response.text();
      setResult(`直接访问 - 状态: ${response.status}\n响应: ${data}`);
    } catch (error) {
      setResult(`直接访问错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API连接测试</h1>
      
      <div className="space-y-4">
        <button
          onClick={testBackend}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
        >
          {loading ? '测试中...' : '测试代理API'}
        </button>
        
        <button
          onClick={testDirect}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          {loading ? '测试中...' : '测试直接API'}
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">测试结果:</h3>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-bold">说明:</h3>
        <ul className="list-disc list-inside">
          <li>代理API: 通过Next.js代理访问后端 (/api/v1/...)</li>
          <li>直接API: 直接访问后端服务器 (http://localhost:8000/...)</li>
          <li>如果代理API工作，说明Next.js配置正确</li>
          <li>如果直接API被阻止，可能是浏览器扩展问题</li>
        </ul>
      </div>
    </div>
  );
}
