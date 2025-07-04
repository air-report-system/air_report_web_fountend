/**
 * React Query配置
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟
      retry: (failureCount, error: any) => {
        // 对于4xx错误不重试
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query Keys
export const queryKeys = {
  // OCR相关
  ocr: {
    all: ['ocr'] as const,
    results: () => [...queryKeys.ocr.all, 'results'] as const,
    result: (id: number) => [...queryKeys.ocr.results(), id] as const,
  },
  
  // 报告相关
  reports: {
    all: ['reports'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.reports.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.reports.all, 'detail', id] as const,
  },
  
  // 批量处理相关
  batch: {
    all: ['batch'] as const,
    jobs: () => [...queryKeys.batch.all, 'jobs'] as const,
    job: (id: number) => [...queryKeys.batch.jobs(), id] as const,
    progress: (id: number) => [...queryKeys.batch.job(id), 'progress'] as const,
  },
  
  // 文件相关
  files: {
    all: ['files'] as const,
    list: () => [...queryKeys.files.all, 'list'] as const,
  },
} as const;
