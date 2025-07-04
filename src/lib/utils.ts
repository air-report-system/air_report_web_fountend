/**
 * 工具函数
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并CSS类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化时间
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 计算时间差（相对时间）- 避免SSR hydration mismatch
 */
export function formatRelativeTime(dateString: string): string {
  // 在服务端渲染时直接返回格式化日期，避免时间差异
  if (typeof window === 'undefined') {
    return formatDate(dateString);
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '刚刚';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  } else {
    return formatDate(dateString);
  }
}

/**
 * 计算处理耗时
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.includes('/')) {
      // MIME类型检查
      return file.type === type;
    } else {
      // 扩展名检查
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
  });
}

/**
 * 验证图片文件
 */
export function validateImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validateFileType(file, allowedTypes);
}

/**
 * 验证CSV文件
 */
export function validateCSVFile(file: File): boolean {
  const allowedTypes = ['text/csv', '.csv'];
  return validateFileType(file, allowedTypes);
}

/**
 * 下载文件
 */
export function downloadFile(data: Blob | ArrayBuffer | string, filename: string): void {
  let blob: Blob;

  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data]);
  } else if (typeof data === 'string') {
    blob = new Blob([data], { type: 'text/plain' });
  } else {
    console.error('不支持的数据类型:', typeof data, data);
    throw new Error('不支持的数据类型，无法下载文件');
  }

  console.log('创建下载链接:', filename, 'Blob大小:', blob.size);

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 生成随机ID - 避免SSR hydration mismatch
 */
export function generateId(): string {
  // 在服务端渲染时使用固定前缀，客户端使用随机值
  if (typeof window === 'undefined') {
    // 服务端：使用时间戳 + 计数器
    return `ssr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  // 客户端：使用随机值
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  
  return obj;
}

/**
 * 格式化进度百分比
 */
export function formatProgress(current: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = Math.round((current / total) * 100);
  return `${percentage}%`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 格式化CSV字段 - 正确处理包含特殊字符的字段
 */
export function formatCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // 如果字段包含逗号、引号、换行符或者是JSON字符串，需要用引号包围并转义内部引号
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r') ||
      (stringValue.startsWith('{') && stringValue.endsWith('}'))) {
    // 转义内部的引号（将 " 替换为 ""）
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }

  return stringValue;
}

/**
 * 格式化CSV行数据
 */
export function formatCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(field => formatCsvField(field)).join(',');
}

/**
 * 重新格式化CSV数据 - 修复后端返回的格式问题
 */
export function reformatCsvData(csvData: string): string {
  if (!csvData || !csvData.trim()) {
    return csvData;
  }

  try {
    // 分割成行
    const lines = csvData.trim().split('\n');
    const reformattedLines: string[] = [];

    for (const line of lines) {
      // 修复被错误分割的JSON字段
      const fixedLine = fixBrokenJsonInCsv(line);
      reformattedLines.push(fixedLine);
    }

    return reformattedLines.join('\n');
  } catch (error) {
    console.warn('CSV重新格式化失败，返回原始数据:', error);
    return csvData;
  }
}

/**
 * 修复CSV中被错误分割的JSON字段
 */
function fixBrokenJsonInCsv(csvLine: string): string {
  // 处理特定的JSON分割模式："""{...}""","""...}"""
  return csvLine.replace(/"""\{([^}]*)\}""","""([^}]*)\}"""/g, (match, part1, part2) => {
    try {
      // 清理第二部分中多余的引号
      const cleanPart2 = part2.replace(/"":/g, ':');

      // 重新组合JSON内容，保持简洁格式（不为键名添加引号）
      const jsonContent = `{${part1},${cleanPart2}}`;

      // 返回正确的CSV格式（用双引号包围整个JSON字段）
      return `"${jsonContent}"`;
    } catch (error) {
      // 如果无法修复，返回原始内容
      console.warn('无法修复JSON字段:', match, error);
      return match;
    }
  });
}



/**
 * 检查是否为移动设备
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 格式化错误信息
 */
export function formatError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return '发生未知错误';
}

/**
 * 获取API基础URL - 支持开发和生产环境
 */
export function getApiBaseUrl(): string {
  // 在生产环境中，使用相对路径
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api/v1';
  }
  // 在开发环境中，使用环境变量或默认localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
}
