'use client';

import { useEffect, useState } from 'react';

interface EnvData {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
}

export default function DebugPage() {
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // 检查环境变量
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      // 其他客户端可见的环境变量
    };
    setEnvData(env);

    // 测试API路由
    testApiRoute();
  }, []);

  const testApiRoute = async () => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          password: 'test'
        })
      });
      
      setTestResult(`API测试结果: ${response.status} ${response.statusText}`);
    } catch (error) {
      setTestResult(`API测试错误: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">环境变量和API配置调试</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">当前环境变量</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(envData, null, 2)}
        </pre>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">当前URL信息</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify({
            hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
            origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
            protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
          }, null, 2)}
        </pre>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API路由测试</h2>
        <p className="mb-2">测试路径: /api/v1/auth/login</p>
        <p className="bg-gray-100 p-4 rounded-lg">{testResult}</p>
        <button 
          onClick={testApiRoute}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重新测试API路由
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">预期配置</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>NEXT_PUBLIC_API_URL 应该指向后端服务器</li>
          <li>API请求应该通过 /api/v1/* 路由</li>
          <li>Next.js rewrite应该将请求代理到后端</li>
        </ul>
      </div>
    </div>
  );
}