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

    // 首先尝试从localStorage读取缓存数据
    const cachedData = backgroundStorage.getBackgroundData();
    if (cachedData && !backgroundStorage.isCacheExpired()) {
      console.log('从localStorage加载背景设置:', cachedData);
      setBackgroundImage(cachedData.background_image);
      setBackgroundOpacity(cachedData.background_opacity);
      setCacheInfo(backgroundStorage.getCacheInfo());

      // 有效缓存直接返回，不进行后台同步
      // 这样可以避免不必要的网络请求和图片处理
      console.log('使用有效缓存，跳过服务器同步');
      return;
    }

    // 如果没有缓存或缓存过期，从服务器加载
    console.log('缓存无效或过期，从服务器加载数据');
    setIsLoading(true);
    try {
      const response = await authApi.backgroundImage.get();
      setBackgroundImage(response.data.background_image);
      setBackgroundOpacity(response.data.background_opacity);
      console.log('从服务器加载背景设置完成');

      // 保存到localStorage，跳过压缩（服务器数据通常已经处理过）
      await backgroundStorage.saveBackgroundData(response.data, { skipCompression: true });
      setCacheInfo(backgroundStorage.getCacheInfo());
    } catch (error) {
      console.error('加载背景图设置失败:', error);
      // 如果服务器请求失败，尝试使用过期的缓存数据
      if (cachedData) {
        console.log('服务器请求失败，使用过期的缓存数据');
        setBackgroundImage(cachedData.background_image);
        setBackgroundOpacity(cachedData.background_opacity);
      }
    } finally {
      setIsLoading(false);
      setCacheInfo(backgroundStorage.getCacheInfo());
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
    loadSettings();

    // 监听背景图更新事件
    const handleBackgroundUpdate = () => {
      loadSettings();
    };

    window.addEventListener('backgroundSettingsUpdate', handleBackgroundUpdate);

    return () => {
      window.removeEventListener('backgroundSettingsUpdate', handleBackgroundUpdate);
    };
  }, [isAuthenticated]);

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