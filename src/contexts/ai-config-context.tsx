"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from './auth-context';

// --- 类型定义 ---

export interface AiConfig {
  id: number;
  name: string;
  description?: string;
  provider: 'gemini' | 'openai' | string;
  api_format: 'gemini' | 'openai' | string;
  api_base_url: string;
  model_name: string;
  api_key?: string; // 注意：API密钥在创建和更新时发送，但通常不在列表请求中返回
  timeout_seconds: number;
  max_retries: number;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  last_used_at?: string;
  last_test_at?: string;
  last_test_result?: any;
  extra_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AiSystemStatus {
  current_service: {
    name: string;
    provider: string;
    is_active: boolean;
  } | null;
  available_services: any[];
  total_services: number;
  active_services: number;
}

export interface TestResult {
  success: boolean;
  http_status: number;
  message: string;
  response_time_ms?: number | null;
  sample_output?: string;
  error_message?: string;
}

interface AiConfigContextType {
  configs: AiConfig[];
  status: AiSystemStatus | null;
  loading: boolean;
  error: Error | null;
  pagination: {
    page: number;
    totalPages: number;
    totalConfigs: number;
  };
  fetchConfigs: (page?: number) => Promise<void>;
  addConfig: (config: Omit<AiConfig, 'id' | 'created_at' | 'updated_at' | 'is_default' | 'success_count' | 'failure_count' | 'success_rate' | 'last_used_at' | 'last_test_at' | 'last_test_result'>) => Promise<AiConfig | undefined>;
  updateConfig: (id: number, config: Partial<AiConfig>) => Promise<AiConfig | undefined>;
  deleteConfig: (id: number) => Promise<void>;
  testConfig: (id: number) => Promise<TestResult | undefined>;
  activateConfig: (id: number) => Promise<void>;
  deactivateConfig: (id: number) => Promise<void>;
  setDefaultConfig: (id: number) => Promise<void>;
  fetchSystemStatus: () => Promise<void>;
}

// --- Context 创建 ---

const AiConfigContext = createContext<AiConfigContextType | undefined>(undefined);

// --- Provider 组件 ---

export const AiConfigProvider = ({ children }: { children: ReactNode }) => {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [status, setStatus] = useState<AiSystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalConfigs: 0 });
  const { isAuthenticated } = useAuth();

  const handleApiCall = async <T,>(apiCall: () => Promise<T>): Promise<T | undefined> => {
    if (!isAuthenticated) {
        setError(new Error("用户未认证，无法执行操作。"));
        setLoading(false);
        return;
    }
    setError(null);
    try {
        return await apiCall();
    } catch (err: any) {
        console.error("AI Config API Error:", err);
        if (err.response) {
            // 打印出后端返回的详细错误信息
            console.error("Backend Response Error Data:", err.response.data);
            console.error("Backend Response Error Status:", err.response.status);
            console.error("Backend Response Error Headers:", err.response.headers);
        }
        setError(err);
    }
  };

  const fetchConfigs = useCallback(async (page = 1) => {
    setLoading(true);
    const response = await handleApiCall(() => api.get('ai-config/configs', { params: { page } }));
    if (response && response.data) {
      setConfigs(response.data.results);
      const { count } = response.data;
      const pageSize = response.data.results.length || 10; // 假设每页10条
      setPagination({
        page: page,
        totalConfigs: count,
        totalPages: Math.ceil(count / pageSize),
      });
    }
    setLoading(false);
  }, [isAuthenticated]);

  const fetchSystemStatus = useCallback(async () => {
    const response = await handleApiCall(() => api.get('ai-config/configs/status'));
    if (response) {
        setStatus(response.data.data);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfigs();
      fetchSystemStatus();
    } else {
      setConfigs([]);
      setStatus(null);
      setLoading(false);
    }
  }, [isAuthenticated, fetchConfigs, fetchSystemStatus]);

  const addConfig = async (config: Omit<AiConfig, 'id' | 'created_at' | 'updated_at' | 'is_default' | 'success_count' | 'failure_count' | 'success_rate' | 'last_used_at' | 'last_test_at' | 'last_test_result'>) => {
    const response = await handleApiCall(() => api.post('ai-config/configs', config));
    if (response) {
        await fetchConfigs(); // 重新获取列表
        await fetchSystemStatus();
        return response.data;
    }
  };

  const updateConfig = async (id: number, config: Partial<AiConfig>) => {
    const response = await handleApiCall(() => api.patch(`ai-config/configs/${id}`, config));
     if (response) {
        await fetchConfigs();
        await fetchSystemStatus();
        return response.data;
    }
  };

  const deleteConfig = async (id: number) => {
    await handleApiCall(() => api.delete(`ai-config/configs/${id}`));
    await fetchConfigs();
    await fetchSystemStatus();
  };
  
  const testConfig = async (id: number) => {
    if (!isAuthenticated) {
      return {
        success: false,
        http_status: 401,
        message: '用户未认证，无法执行测试',
        error_message: 'unauthenticated',
      };
    }
    // 测试是“可失败”的操作：不要把失败写进全局 error，避免整个页面显示“加载失败”
    try {
      const resp = await api.post(`ai-config/configs/${id}/test`);
      const data = resp?.data || {};
      return {
        success: Boolean(data.success),
        http_status: Number(data.http_status ?? 200),
        message: String(data.message ?? '测试成功'),
        response_time_ms: data.response_time_ms ?? null,
        sample_output: data.sample_output ? String(data.sample_output) : undefined,
      };
    } catch (err: any) {
      const status = err?.response?.status ?? 0;
      const data = err?.response?.data || {};
      return {
        success: false,
        http_status: status,
        message: String(data.message ?? '测试失败'),
        response_time_ms: data.response_time_ms ?? null,
        error_message: String(data.error_message ?? data.detail ?? err?.message ?? 'unknown error'),
      };
    }
  };

  const activateConfig = async (id: number) => {
    await handleApiCall(() => api.post(`ai-config/configs/${id}/activate`));
    await fetchConfigs();
    await fetchSystemStatus();
  };

  const deactivateConfig = async (id: number) => {
    await handleApiCall(() => api.post(`ai-config/configs/${id}/deactivate`));
    await fetchConfigs();
    await fetchSystemStatus();
  };
  
  const setDefaultConfig = async (id: number) => {
    await handleApiCall(() => api.post(`ai-config/configs/${id}/set_default`));
    await fetchConfigs();
    await fetchSystemStatus();
  };

  const value = {
    configs,
    status,
    loading,
    error,
    pagination,
    fetchConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    activateConfig,
    deactivateConfig,
    setDefaultConfig,
    fetchSystemStatus,
  };

  return (
    <AiConfigContext.Provider value={value}>
      {children}
    </AiConfigContext.Provider>
  );
};

// --- 自定义 Hook ---

export const useAiConfig = () => {
  const context = useContext(AiConfigContext);
  if (context === undefined) {
    throw new Error('useAiConfig must be used within an AiConfigProvider');
  }
  return context;
};