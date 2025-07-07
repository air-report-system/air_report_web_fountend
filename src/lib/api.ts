/**
 * API客户端 - 与Django后端通信
 */
import axios from 'axios';

// 获取API基础URL的函数
export function getApiBaseUrl(): string {
  // 在生产环境中，使用相对路径
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api/v1';
  }
  // 在开发环境中，使用环境变量或默认localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
}

// 创建axios实例
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000, // 增加到2分钟，因为AI处理可能需要更长时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加Token认证
api.interceptors.request.use(
  (config) => {
    // 检查是否在客户端环境
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 检查是否在客户端环境
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        // Token过期，清除本地存储并重定向到登录页
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API接口类型定义
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  date_joined: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token?: string;
}

export interface ContactInfo {
  id: number;
  contact_name: string;
  full_phone: string;
  address: string;
  match_type: string;
  similarity_score: number;
  match_source: string;
}

export interface OCRResult {
  id: number;
  file: {
    id: number;
    original_name: string;
    file_url: string;
  };
  phone: string;
  date: string;
  temperature: string;
  humidity: string;
  check_type: 'initial' | 'recheck' | string;
  points_data: Record<string, number>;
  confidence_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  contact_info?: ContactInfo;
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  report_type: 'detection' | 'monthly';
  form_data: Record<string, any>;
  template_data: Record<string, any>;
  docx_file?: string;
  pdf_file?: string;
  is_generated: boolean;
  created_at: string;
  ocr_result?: OCRResult;
  error_message?: string;
}

export interface BatchFileItem {
  id: number;
  file: number; // 文件ID
  filename: string; // 文件名
  file_path: string; // 文件URL路径
  file_size: number; // 文件大小
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  processing_order: number;
  error_message?: string;
  processing_time_seconds?: number;
  ocr_result?: OCRResult;
  created_at: string;
  updated_at: string;
}

export interface BatchJob {
  id: number;
  name: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_files: number;
  processed_files: number;
  failed_files: number;
  progress_percentage: number;
  processing_duration?: number;
  settings: {
    use_multi_ocr?: boolean;
    ocr_count?: number;
    auto_start?: boolean;
  };
  file_items: BatchFileItem[];
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
}

// OCR相关API
export const ocrApi = {
  // 上传图片并开始OCR处理
  uploadAndProcess: (file: File, useMultiOcr = false, ocrCount = 3) => {
    const formData = new FormData();
    formData.append('image', file);  // 修复：使用正确的字段名 'image' 而不是 'file'
    formData.append('use_multi_ocr', useMultiOcr.toString());
    formData.append('ocr_count', ocrCount.toString());

    return api.post('/ocr/upload-and-process/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取OCR结果
  getResult: (id: number) => api.get<OCRResult>(`/ocr/results/${id}/`),

  // 获取OCR结果列表
  getResults: (params?: { page?: number; page_size?: number }) => 
    api.get('/ocr/results/', { params }),

  // 重新处理OCR
  reprocess: (id: number, useMultiOcr = false, ocrCount = 3) => 
    api.post(`/ocr/results/${id}/reprocess/`, {
      use_multi_ocr: useMultiOcr,
      ocr_count: ocrCount,
    }),

  // OCR测试
  test: (file: File, useMultiOcr = false, ocrCount = 3) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('use_multi_ocr', useMultiOcr.toString());
    formData.append('ocr_count', ocrCount.toString());
    
    return api.post('/ocr/test/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 报告相关API
export const reportApi = {
  // 创建报告
  create: (data: {
    ocr_result: number;
    report_type: string;
    title: string;
    form_data: Record<string, any>;
    template_data?: Record<string, any>;
  }) => api.post('/reports/', data),

  // 获取报告列表
  getList: (params?: {
    page?: number;
    page_size?: number;
    report_type?: string;
    is_generated?: boolean;
    search?: string;
    created_after?: string;
    created_before?: string;
  }) => api.get('/reports/', { params }),

  // 获取报告详情
  get: (id: number) => api.get<Report>(`/reports/${id}/`),

  // 生成报告（增加超时时间）
  generate: (id: number, forceRegenerate = false, templateId?: number) =>
    api.post(`/reports/${id}/generate/`, {
      force_regenerate: forceRegenerate,
      template_id: templateId,
    }, {
      timeout: 120000, // 2分钟超时，因为报告生成可能需要较长时间
    }),

  // 下载Word文件
  downloadDocx: (id: number) => 
    api.get(`/reports/${id}/download_docx/`, { responseType: 'blob' }),

  // 下载PDF文件
  downloadPdf: (id: number) => 
    api.get(`/reports/${id}/download_pdf/`, { responseType: 'blob' }),

  // 生成微信模板
  generateWechatTemplate: (id: number, templateType = 'standard') => 
    api.post(`/reports/${id}/generate_wechat_template/`, {
      template_type: templateType,
    }),
};

// 批量处理相关API
export const batchApi = {
  // 创建批量任务（基于已上传的文件ID）
  createJob: (data: {
    name: string;
    file_ids: number[];
    use_multi_ocr?: boolean;
    ocr_count?: number;
    auto_start?: boolean;
  }) => api.post('/batch/jobs/', data),

  // 批量上传文件并创建任务
  uploadAndCreateJob: (files: File[], options: {
    batch_name: string;
    use_multi_ocr?: boolean;
    ocr_count?: number;
    auto_start?: boolean;
  }) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('batch_name', options.batch_name);
    formData.append('use_multi_ocr', (options.use_multi_ocr || false).toString());
    formData.append('ocr_count', (options.ocr_count || 3).toString());
    formData.append('auto_start', (options.auto_start || true).toString());

    return api.post('/batch/create/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取批量任务列表
  getJobs: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
  }) => api.get('/batch/jobs/', { params }),

  // 获取批量任务详情
  getJob: (id: number) => api.get<BatchJob>(`/batch/jobs/${id}/`),

  // 启动批量任务
  startJob: (id: number) => api.post(`/batch/jobs/${id}/start/`),

  // 取消批量任务
  cancelJob: (id: number) => api.post(`/batch/jobs/${id}/cancel/`),

  // 重试失败的文件项
  retryFailedItems: (jobId: number) => api.post(`/batch/jobs/${jobId}/retry-failed/`),

  // 获取批量任务统计
  getStats: () => api.get('/batch/stats/'),
};

// 月度报表相关API
export const monthlyReportApi = {
  // 上传CSV并生成月度报表
  generate: (file: File, data: {
    output_name?: string;
    uniform_profit_rate?: boolean;
    labor_cost_file?: File;
  }) => {
    const formData = new FormData();
    formData.append('csv_file', file);
    if (data.output_name) formData.append('output_name', data.output_name);
    if (data.uniform_profit_rate !== undefined) {
      formData.append('uniform_profit_rate', data.uniform_profit_rate.toString());
    }
    if (data.labor_cost_file) {
      formData.append('labor_cost_file', data.labor_cost_file);
    }
    
    return api.post('/reports/monthly/generate/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 下载月度报表
  download: (filename: string) => 
    api.get(`/reports/monthly/download/${filename}/`, { responseType: 'blob' }),
};

// 文件上传相关API
export const fileApi = {
  // 上传文件
  upload: (file: File, fileType = 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    
    return api.post('/files/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 批量上传文件
  batchUpload: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    return api.post('/files/batch-upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 点位学习相关API
export const pointLearningApi = {
  // 获取点位学习列表
  getList: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    min_usage?: number;
  }) => api.get('/ocr/point-learning/', { params }),

  // 获取热门点位
  getPopular: (limit = 20) =>
    api.get('/ocr/point-learning/popular/', { params: { limit } }),

  // 获取点位建议
  getSuggestions: (data: {
    existing_points?: string[];
    limit?: number;
  }) => api.post('/ocr/point-learning/suggestions/', data),

  // 更新点位学习数据
  updateLearning: (data: {
    points_data: Record<string, number>;
    check_type?: 'initial' | 'recheck';
  }) => api.post('/ocr/point-learning/update_learning/', data),

  // 获取点位统计
  getStatistics: () => api.get('/ocr/point-learning/statistics/'),
};

// 检测类型推断API
export const checkTypeInferenceApi = {
  // 推断检测类型
  infer: (data: {
    points_data: Record<string, number>;
    threshold?: number;
  }) => api.post('/ocr/infer-check-type/', data),
};

// 点位值记录API
export const pointValueApi = {
  // 获取点位值记录
  getList: (params?: {
    page?: number;
    page_size?: number;
    ocr_result_id?: number;
    point_name?: string;
    check_type?: string;
  }) => api.get('/ocr/point-values/', { params }),

  // 创建点位值记录
  create: (data: {
    ocr_result: number;
    point_name: string;
    value: number;
    check_type: 'initial' | 'recheck';
  }) => api.post('/ocr/point-values/', data),
};

// 数据同步API
export const dataSyncApi = {
  // 从GUI数据同步
  syncFromGui: () => api.post('/ocr/data-sync/'),

  // 导出为GUI格式
  exportToGui: () => api.put('/ocr/data-sync/'),

  // 获取同步状态
  getStatus: () => api.get('/ocr/data-sync/'),
};

// 认证API
export const authApi = {
  // 用户登录
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login/', data),

  // 用户登出
  logout: () => api.post('/auth/logout/'),

  // 获取用户信息
  getProfile: () => api.get<User>('/auth/profile/'),

  // 检查认证状态
  checkAuth: () => api.get('/auth/profile/'),
};

// 订单相关API
export const ordersApi = {
  // 单个订单处理
  process: (orderText: string) => 
    api.post('/orders/process/', { order_text: orderText }),

  // 批量订单处理
  processMultiple: (orderTexts: string) =>
    api.post('/orders/process-multiple/', { order_text: orderTexts }, {
      timeout: 120000, // 2分钟超时，AI处理需要更长时间
    }),

  // 订单提交
  submit: (orderDataList: any[]) =>
    api.post('/orders/submit-multiple/', { order_data_list: orderDataList }),

  // 获取订单记录列表
  getRecords: (params?: { page?: number; page_size?: number }) => 
    api.get('/orders/records/', { params }),

  // 创建订单记录
  createRecord: (data: any) => 
    api.post('/orders/records/', data),

  // 更新订单记录
  updateRecord: (id: number, data: any) => 
    api.put(`/orders/records/${id}/`, data),

  // 删除订单记录
  deleteRecord: (id: number) => 
    api.delete(`/orders/records/${id}/`),
};

export default api;
