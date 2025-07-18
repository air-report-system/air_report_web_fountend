/**
 * 认证上下文 - 管理用户登录状态
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 检查认证状态
  const checkAuth = async () => {
    const AUTH_TIMEOUT = 5000; // 5秒超时
    
    try {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('没有找到认证token，跳过认证检查');
        setIsLoading(false);
        return;
      }

      console.log('开始检查认证状态...');
      const startTime = performance.now();

      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('AUTH_TIMEOUT'));
        }, AUTH_TIMEOUT);
      });

      try {
        // 使用Promise.race实现超时
        const response = await Promise.race([
          authApi.getProfile(),
          timeoutPromise
        ]) as any;
        
        const endTime = performance.now();
        console.log(`认证检查成功，耗时: ${(endTime - startTime).toFixed(2)}ms`);
        
        setUser(response.data);
      } catch (error: any) {
        if (error.message === 'AUTH_TIMEOUT') {
          console.warn('认证检查超时，允许用户继续使用应用');
          // 超时不清除token，让用户可以重试
        } else {
          console.error('检查认证状态失败:', error);
          // 只有在真正的错误时才清除token
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('auth_token');
          }
        }
        setUser(null);
      }
    } catch (error) {
      console.error('认证检查过程中发生错误:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 用户登录
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({ username, password });

      // 保存Token到localStorage
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      setUser(response.data.user);
      return { success: true };
    } catch (error: any) {
      console.error('登录失败:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '登录失败';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // 用户登出
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
