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
  // 采用 VSCode 风格：背景越明显（opacity 越大），UI 底色越透明
  // 再更透明一档：让 UI 退得更干净，减少“白层”存在感
  const uiOpacity = Math.min(0.95, Math.max(0.04, 1 - backgroundOpacity * 1.1));

  // 将透明度映射到 CSS 变量，供 UI 组件统一读取（只改变“底色/边框”，不影响文字透明度）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

    const surfaceAlpha = clamp01(uiOpacity);

    // 容器底色：跟随 uiOpacity
    root.style.setProperty('--ui-surface-alpha', String(surfaceAlpha));

    // 表单控件底色：略比容器更实一点，保证可读性/可点击区域清晰
    root.style.setProperty('--ui-input-alpha', String(clamp01(surfaceAlpha + 0.06)));

    // 边框/分割线：始终偏淡，避免“白边/白底”感过强
    root.style.setProperty('--ui-border-alpha', String(clamp01(Math.max(0.08, Math.min(0.25, surfaceAlpha * 0.25)))));

    // 页面底色：如果启用了背景图，则让 body 背景基本透明，避免“背景图与卡片之间多一层白色”
    root.style.setProperty('--ui-page-alpha', backgroundImage ? '0' : '1');
  }, [uiOpacity, backgroundImage]);

  // 背景图亮度分析：当背景透明度较高时（>=50%）自动切换 light/dark 前景色，提升对比度
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const THRESHOLD_OPACITY = 0.5;
    if (!backgroundImage || backgroundOpacity < THRESHOLD_OPACITY) {
      root.removeAttribute('data-ui-auto-theme');
      return;
    }

    let cancelled = false;

    const analyze = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('背景图加载失败，无法分析亮度'));
          img.src = backgroundImage;
        });

        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // 将背景图透明度视为与白色背景混合（更符合“半透明背景图看不清”的实际感受）
        const bgA = Math.max(0, Math.min(1, backgroundOpacity));

        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = (data[i + 3] / 255) * bgA;

          // blend with white
          const br = 255 * (1 - a) + r * a;
          const bg = 255 * (1 - a) + g * a;
          const bb = 255 * (1 - a) + b * a;

          // relative luminance (0~255)
          const lum = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
          sum += lum;
          count += 1;
        }

        const avgLum = sum / Math.max(1, count);
        const theme: 'dark' | 'light' = avgLum < 140 ? 'dark' : 'light';

        if (!cancelled) {
          root.setAttribute('data-ui-auto-theme', theme);
        }
      } catch {
        // 分析失败时不强制切换，避免误判
        if (!cancelled) {
          root.removeAttribute('data-ui-auto-theme');
        }
      }
    };

    analyze();

    return () => {
      cancelled = true;
    };
  }, [backgroundImage, backgroundOpacity]);

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