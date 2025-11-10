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

      // 从 localStorage 获取缓存的用户信息（用于快速渲染）
      const cachedUser = localStorage.getItem('user_info');
      if (cachedUser) {
        try {
          const userData = JSON.parse(cachedUser);
          setUser(userData);
          setIsLoading(false); // 立即完成加载状态
          
          // 在后台静默刷新用户信息以确保数据一致性
          authApi.getProfile()
            .then(response => {
              const freshUser = response.data;
              // 合并数据：保留缓存中存在但新数据中缺失的字段（如 first_name）
              const mergedUser = { ...userData, ...freshUser };
              // 更新缓存和状态
              localStorage.setItem('user_info', JSON.stringify(mergedUser));
              setUser(mergedUser);
            })
            .catch(error => {
              console.error('后台刷新用户信息失败:', error);
              // 如果是认证失败，清除本地状态
              if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_info');
                setUser(null);
              }
              // 其他错误（如网络问题）时，继续使用缓存数据
            });
        } catch (e) {
          console.error('解析缓存用户信息失败:', e);
          // 如果解析失败,清除无效的缓存并尝试从服务器获取
          localStorage.removeItem('user_info');
          // 直接从服务器获取用户信息
          try {
            const response = await authApi.getProfile();
            const freshUser = response.data;
            localStorage.setItem('user_info', JSON.stringify(freshUser));
            setUser(freshUser);
          } catch (apiError: any) {
            console.error('从服务器获取用户信息失败:', apiError);
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        }
      } else {
        // 如果没有缓存的用户信息但有 token,从服务器获取
        try {
          const response = await authApi.getProfile();
          const freshUser = response.data;
          localStorage.setItem('user_info', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (apiError: any) {
          console.error('从服务器获取用户信息失败:', apiError);
          localStorage.removeItem('auth_token');
          setUser(null);
        }
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
