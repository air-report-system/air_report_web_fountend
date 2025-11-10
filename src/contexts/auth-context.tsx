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
    try {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // 从 localStorage 获取缓存的用户信息
      const cachedUser = localStorage.getItem('user_info');
      if (cachedUser) {
        try {
          const userData = JSON.parse(cachedUser);
          setUser(userData);
        } catch (e) {
          console.error('解析缓存用户信息失败:', e);
          // 如果解析失败,清除无效的缓存
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          setUser(null);
        }
      } else {
        // 如果没有缓存的用户信息但有 token,说明数据不一致,清除 token
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (error: any) {
      console.error('检查认证状态失败:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
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

      // 保存用户信息到 localStorage
      if (response.data.user) {
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
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
      localStorage.removeItem('user_info');
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
