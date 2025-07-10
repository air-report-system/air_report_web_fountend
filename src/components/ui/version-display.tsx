'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface VersionInfo {
  frontend: string;
  backend: string;
  loading: boolean;
  error?: string;
}

export function VersionDisplay({ className = "" }: { className?: string }) {
  const [versions, setVersions] = useState<VersionInfo>({
    frontend: '加载中...',
    backend: '加载中...',
    loading: true
  });

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        // 获取前端版本 (从API路由)
        const frontendResponse = await fetch('/api/version');
        const frontendData = await frontendResponse.json();
        
        // 获取后端版本
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const backendResponse = await fetch(`${backendUrl.replace('/api/v1', '')}/api/v1/version/`);
        const backendData = await backendResponse.json();
        
        setVersions({
          frontend: frontendData.version || '未知',
          backend: backendData.version || '未知',
          loading: false
        });
      } catch (error) {
        console.error('获取版本信息失败:', error);
        setVersions({
          frontend: '获取失败',
          backend: '获取失败',
          loading: false,
          error: '网络错误'
        });
      }
    };

    fetchVersions();
  }, []);

  if (versions.loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        版本信息加载中...
      </div>
    );
  }

  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium">前端:</span>
        <span className="font-mono text-blue-600">{versions.frontend}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">后端:</span>
        <span className="font-mono text-green-600">{versions.backend}</span>
      </div>
      {versions.error && (
        <div className="text-red-500 text-xs mt-1">{versions.error}</div>
      )}
    </div>
  );
}

export function VersionDisplayInline({ className = "" }: { className?: string }) {
  const [versions, setVersions] = useState<VersionInfo>({
    frontend: '...',
    backend: '...',
    loading: true
  });

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        // 获取前端版本
        const frontendResponse = await fetch('/api/version');
        const frontendData = await frontendResponse.json();
        
        // 获取后端版本
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const backendResponse = await fetch(`${backendUrl.replace('/api/v1', '')}/api/v1/version/`);
        const backendData = await backendResponse.json();
        
        setVersions({
          frontend: frontendData.version || '未知',
          backend: backendData.version || '未知',
          loading: false
        });
      } catch (error) {
        console.error('获取版本信息失败:', error);
        setVersions({
          frontend: '错误',
          backend: '错误',
          loading: false,
          error: '网络错误'
        });
      }
    };

    fetchVersions();
  }, []);

  return (
    <div className={`relative group text-sm text-gray-500 ${className}`}>
      {/* 默认显示 */}
      <div className="cursor-pointer hover:text-gray-700 transition-colors">
        版本信息
      </div>
      
      {/* 悬停时显示的详细信息 */}
      <div className="absolute top-full right-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[280px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">前端版本:</span>
            <span className="font-mono text-blue-600">{versions.frontend}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">后端版本:</span>
            <span className="font-mono text-green-600">{versions.backend}</span>
          </div>
          {versions.error && (
            <div className="text-red-500 text-xs mt-1">{versions.error}</div>
          )}
          <div className="border-t pt-2">
            <a
              href="/version"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              查看详细版本信息 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}