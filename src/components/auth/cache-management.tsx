/**
 * 缓存管理组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

import { getLocalStorageUsage, formatFileSize } from '@/lib/utils';
import { useBackground } from '@/contexts/background-context';

export function CacheManagement() {
  const { cacheInfo, clearCache, forceRefreshFromServer, isLoading } = useBackground();
  const [storageUsage, setStorageUsage] = useState(getLocalStorageUsage());
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 刷新存储使用情况
  const refreshStorageUsage = () => {
    setStorageUsage(getLocalStorageUsage());
  };

  // 显示消息
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 清理缓存
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      clearCache();
      refreshStorageUsage();
      showMessage('success', '缓存清理成功');
    } catch {
      showMessage('error', '缓存清理失败');
    } finally {
      setIsClearing(false);
    }
  };

  // 清理所有localStorage数据（危险操作）
  const handleClearAllStorage = () => {
    if (confirm('确定要清理所有本地存储数据吗？这将删除所有应用数据，包括登录状态等。')) {
      try {
        localStorage.clear();
        refreshStorageUsage();
        showMessage('success', '所有本地存储数据已清理');
      } catch {
        showMessage('error', '清理失败');
      }
    }
  };

  useEffect(() => {
    refreshStorageUsage();
  }, [cacheInfo]);

  return (
    <Card className="ui-surface">
      <CardHeader className="border-b ui-border">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Database className="h-5 w-5" />
          缓存管理
        </CardTitle>
        <CardDescription className="text-gray-800">
          管理本地存储缓存，优化应用性能
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* 消息提示 */}
        {message && (
          <Alert className="ui-border">
            {message.type === 'error' ? 
              <AlertTriangle className="h-4 w-4 text-red-600" /> : 
              message.type === 'success' ?
              <CheckCircle className="h-4 w-4 text-green-600" /> :
              <Info className="h-4 w-4 text-blue-600" />
            }
            <AlertDescription className={
              message.type === 'error' ? 'text-red-800' : 
              message.type === 'success' ? 'text-green-800' : 'text-blue-800'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 存储使用情况 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">存储使用情况</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStorageUsage}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              刷新
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>已使用: {formatFileSize(storageUsage.used)}</span>
              <span>总容量: {formatFileSize(storageUsage.total)}</span>
            </div>
            <Progress 
              value={storageUsage.percentage} 
              className="h-2"
            />
            <div className="text-xs text-gray-600 text-center">
              {storageUsage.percentage}% 已使用
            </div>
          </div>
        </div>

        {/* 背景图缓存信息 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">背景图缓存</h3>
          
          {cacheInfo.hasCache ? (
            <div className="ui-surface-subtle border ui-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">缓存时间: {cacheInfo.cacheAge}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">数据大小: {cacheInfo.dataSize}</span>
                </div>
                {cacheInfo.compressed && (
                  <>
                    <div className="text-gray-700">
                      已压缩: 是
                    </div>
                    {cacheInfo.compressionRatio && (
                      <div className="text-gray-700">
                        压缩率: {cacheInfo.compressionRatio}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t ui-border">
                <span className={`text-sm ${cacheInfo.isExpired ? 'text-orange-600' : 'text-green-600'}`}>
                  状态: {cacheInfo.isExpired ? '已过期' : '有效'}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={forceRefreshFromServer}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {isLoading ? '同步中...' : '同步服务器'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {isClearing ? '清理中...' : '清理缓存'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="ui-surface-subtle border ui-border rounded-lg p-4 text-center text-gray-600">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">暂无背景图缓存</p>
            </div>
          )}
        </div>

        {/* 缓存策略说明 */}
        <div className="bg-blue-50/20 border border-blue-200/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">缓存策略</h4>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• 背景图数据会自动缓存到本地存储，有效期24小时</li>
            <li>• 用户上传的大图片会自动压缩以节省存储空间</li>
            <li>• 页面刷新时优先使用缓存数据，大幅提升加载速度</li>
            <li>• 有效缓存期内不会请求服务器，避免不必要的网络开销</li>
            <li>• 缓存过期时会自动从服务器更新</li>
            <li>• 当存储空间不足时会自动清理过期缓存</li>
          </ul>
        </div>

        {/* 使用提示 */}
        <div className="bg-green-50/20 border border-green-200/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">使用提示</h4>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• 如果背景图显示异常，可以尝试&ldquo;同步服务器&rdquo;</li>
            <li>• 如果需要立即看到服务器端的更新，点击&ldquo;同步服务器&rdquo;</li>
            <li>• 存储空间不足时，可以先清理缓存再重新加载</li>
            <li>• 清理所有本地数据会删除登录状态，请谨慎操作</li>
          </ul>
        </div>

        {/* 高级操作 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">高级操作</h3>
          <div className="bg-red-50/20 border border-red-200/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">清理所有本地数据</h4>
                <p className="text-xs text-gray-600 mt-1">
                  这将删除所有本地存储数据，包括登录状态、设置等
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAllStorage}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                清理全部
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
