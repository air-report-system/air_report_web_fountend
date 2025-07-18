/**
 * 背景透明度上下文
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import { backgroundStorage, BackgroundData } from '@/lib/background-storage';

interface BackgroundContextType {
  backgroundImage: string | null;
  backgroundOpacity: number;
  uiOpacity: number; // UI组件的透明度，与背景图透明度相反
  isLoading: boolean;
  refreshBackground: () => void;
  forceRefreshFromServer: () => void; // 强制从服务器刷新
  clearCache: () => void; // 清理本地缓存
  cacheInfo: {
    hasCache: boolean;
    cacheAge: string;
    isExpired: boolean;
    dataSize: string;
    compressed?: boolean;
    compressionRatio?: string;
  };
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(backgroundStorage.getCacheInfo());

  // 计算UI组件的透明度（与背景图透明度相反的关系）
  const uiOpacity = Math.max(0.85, 1 - backgroundOpacity * 0.5);

  // 加载用户背景图设置
  const loadSettings = async () => {
    if (!isAuthenticated) {
      setBackgroundImage(null);
      setBackgroundOpacity(0.1);
      setCacheInfo(backgroundStorage.getCacheInfo());
      return;
    }

    console.log('开始加载背景设置...');

    // 优先策略：立即使用缓存数据，即使过期也先使用
    const cachedData = backgroundStorage.getBackgroundData();
    if (cachedData) {
      console.log('立即使用缓存数据，无需等待服务器响应');
      setBackgroundImage(cachedData.background_image);
      setBackgroundOpacity(cachedData.background_opacity);
      setCacheInfo(backgroundStorage.getCacheInfo());
      
      // 如果缓存仍然有效，跳过服务器同步
      if (!backgroundStorage.isCacheExpired()) {
        console.log('缓存仍然有效，跳过服务器同步');
        return;
      }
    }

    // 在后台同步服务器数据（不阻塞UI）
    backgroundSyncFromServer();
  };

  // 后台同步服务器数据
  const backgroundSyncFromServer = async () => {
    try {
      console.log('后台同步服务器数据...');
      const response = await authApi.backgroundImage.get();
      
      // 只有在数据真正不同时才更新UI
      if (response.data.background_image !== backgroundImage ||
          response.data.background_opacity !== backgroundOpacity) {
        console.log('检测到服务器数据变化，更新UI');
        setBackgroundImage(response.data.background_image);
        setBackgroundOpacity(response.data.background_opacity);
      }

      // 保存到localStorage，跳过压缩（服务器数据通常已经处理过）
      await backgroundStorage.saveBackgroundData(response.data, { skipCompression: true });
      setCacheInfo(backgroundStorage.getCacheInfo());
      console.log('后台同步完成');
    } catch (error) {
      console.error('后台同步失败:', error);
      // 同步失败不影响用户体验，继续使用缓存数据
    }
  };

  const refreshBackground = () => {
    loadSettings();
  };

  // 强制从服务器刷新，忽略缓存
  const forceRefreshFromServer = async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('强制从服务器刷新背景设置');
      const response = await authApi.backgroundImage.get();
      setBackgroundImage(response.data.background_image);
      setBackgroundOpacity(response.data.background_opacity);

      // 保存到localStorage，跳过压缩（服务器数据通常已经处理过）
      await backgroundStorage.saveBackgroundData(response.data, { skipCompression: true });
      setCacheInfo(backgroundStorage.getCacheInfo());
      console.log('服务器数据已更新并保存到缓存');
    } catch (error) {
      console.error('从服务器刷新背景设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    backgroundStorage.clearCache();
    setCacheInfo(backgroundStorage.getCacheInfo());
    console.log('背景图缓存已清理');
  };

  useEffect(() => {
    // 立即加载缓存数据，不等待认证
    loadCachedDataImmediately();
    
    // 如果已认证，则进行完整的设置加载
    if (isAuthenticated) {
      loadSettings();
    }

    // 监听背景图更新事件
    const handleBackgroundUpdate = () => {
      loadSettings();
    };

    window.addEventListener('backgroundSettingsUpdate', handleBackgroundUpdate);

    return () => {
      window.removeEventListener('backgroundSettingsUpdate', handleBackgroundUpdate);
    };
  }, [isAuthenticated]);

  // 立即加载缓存数据（不依赖认证状态）
  const loadCachedDataImmediately = () => {
    console.log('立即加载缓存数据，不等待认证...');
    const cachedData = backgroundStorage.getBackgroundData();
    if (cachedData) {
      console.log('找到缓存数据，立即使用');
      setBackgroundImage(cachedData.background_image);
      setBackgroundOpacity(cachedData.background_opacity);
      setCacheInfo(backgroundStorage.getCacheInfo());
    } else {
      console.log('没有找到缓存数据');
    }
  };

  const value: BackgroundContextType = {
    backgroundImage,
    backgroundOpacity,
    uiOpacity,
    isLoading,
    refreshBackground,
    forceRefreshFromServer,
    clearCache,
    cacheInfo,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
} 