/**
 * 背景透明度上下文
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';

interface BackgroundContextType {
  backgroundImage: string | null;
  backgroundOpacity: number;
  uiOpacity: number; // UI组件的透明度，与背景图透明度相反
  isLoading: boolean;
  refreshBackground: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);

  // 计算UI组件的透明度（与背景图透明度相反的关系）
  const uiOpacity = Math.max(0.85, 1 - backgroundOpacity * 0.5);

  // 加载用户背景图设置
  const loadSettings = async () => {
    if (!isAuthenticated) {
      setBackgroundImage(null);
      setBackgroundOpacity(0.1);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.backgroundImage.get();
      setBackgroundImage(response.data.background_image);
      setBackgroundOpacity(response.data.background_opacity);
      console.log('背景设置加载:', response.data);
    } catch (error) {
      console.error('加载背景图设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBackground = () => {
    loadSettings();
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