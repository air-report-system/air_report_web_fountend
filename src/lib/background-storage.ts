/**
 * 背景图本地存储管理器
 */
import { isLocalStorageAvailable, formatFileSize } from './utils';

// 存储键名
const STORAGE_KEYS = {
  BACKGROUND_DATA: 'air_report_background_data',
  BACKGROUND_SETTINGS: 'air_report_background_settings',
  CACHE_TIMESTAMP: 'air_report_background_timestamp',
} as const;

// 缓存配置
const CACHE_CONFIG = {
  // 缓存过期时间（24小时）
  EXPIRE_TIME: 24 * 60 * 60 * 1000,
  // 最大图片大小（2MB，考虑localStorage限制）
  MAX_IMAGE_SIZE: 2 * 1024 * 1024,
  // 压缩质量
  COMPRESS_QUALITY: 0.8,
  // 最大宽度/高度
  MAX_DIMENSION: 1920,
} as const;

// 背景图数据接口
export interface BackgroundData {
  background_image: string | null;
  background_opacity: number;
  timestamp: number;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
}

// 存储状态接口
export interface StorageStatus {
  available: boolean;
  used: number;
  total: number;
  percentage: number;
  hasCache: boolean;
  cacheAge: number;
  isExpired: boolean;
}

/**
 * 背景图本地存储管理器类
 */
export class BackgroundStorageManager {
  private static instance: BackgroundStorageManager;

  private constructor() {}

  public static getInstance(): BackgroundStorageManager {
    if (!BackgroundStorageManager.instance) {
      BackgroundStorageManager.instance = new BackgroundStorageManager();
    }
    return BackgroundStorageManager.instance;
  }

  /**
   * 检查localStorage是否可用
   */
  public isAvailable(): boolean {
    return isLocalStorageAvailable();
  }

  /**
   * 获取存储状态
   */
  public getStorageStatus(): StorageStatus {
    const available = this.isAvailable();
    let used = 0;
    let total = 5 * 1024 * 1024; // 5MB估算
    let percentage = 0;

    if (available) {
      // 计算已使用空间
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      percentage = Math.round((used / total) * 100);
    }

    const hasCache = this.hasValidCache();
    const cacheAge = this.getCacheAge();
    const isExpired = this.isCacheExpired();

    return {
      available,
      used,
      total,
      percentage,
      hasCache,
      cacheAge,
      isExpired,
    };
  }

  /**
   * 压缩图片
   */
  private async compressImage(base64String: string): Promise<{
    compressedData: string;
    originalSize: number;
    compressedSize: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          // 计算新尺寸，保持宽高比
          let { width, height } = img;
          const maxDimension = CACHE_CONFIG.MAX_DIMENSION;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为base64
          const compressedData = canvas.toDataURL('image/jpeg', CACHE_CONFIG.COMPRESS_QUALITY);
          
          const originalSize = base64String.length;
          const compressedSize = compressedData.length;

          resolve({
            compressedData,
            originalSize,
            compressedSize,
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = base64String;
    });
  }

  /**
   * 保存背景图数据到localStorage
   */
  public async saveBackgroundData(data: {
    background_image: string | null;
    background_opacity: number;
  }, options: { skipCompression?: boolean } = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('localStorage不可用，无法保存背景图数据');
      return false;
    }

    try {
      let backgroundData: BackgroundData = {
        background_image: data.background_image,
        background_opacity: data.background_opacity,
        timestamp: Date.now(),
      };

      // 如果有图片数据，根据选项决定是否压缩
      if (data.background_image && !options.skipCompression) {
        const imageSize = data.background_image.length;

        // 如果图片太大，进行压缩
        if (imageSize > CACHE_CONFIG.MAX_IMAGE_SIZE) {
          try {
            console.log(`开始压缩大图片: ${formatFileSize(imageSize)}`);
            const compressed = await this.compressImage(data.background_image);
            backgroundData = {
              ...backgroundData,
              background_image: compressed.compressedData,
              compressed: true,
              originalSize: compressed.originalSize,
              compressedSize: compressed.compressedSize,
            };
            console.log(`图片压缩完成: ${formatFileSize(compressed.originalSize)} -> ${formatFileSize(compressed.compressedSize)}`);
          } catch (error) {
            console.warn('图片压缩失败，使用原图:', error);
          }
        }
      } else if (data.background_image && options.skipCompression) {
        console.log('跳过图片压缩，直接保存');
      }

      // 保存数据
      localStorage.setItem(STORAGE_KEYS.BACKGROUND_DATA, JSON.stringify(backgroundData));
      localStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());

      console.log('背景图数据已保存到localStorage');
      return true;
    } catch (error) {
      console.error('保存背景图数据失败:', error);
      
      // 如果是存储空间不足，尝试清理缓存后重试
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage空间不足，尝试清理缓存');
        this.clearCache();
        return false;
      }
      
      return false;
    }
  }

  /**
   * 从localStorage读取背景图数据
   */
  public getBackgroundData(): BackgroundData | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const dataStr = localStorage.getItem(STORAGE_KEYS.BACKGROUND_DATA);
      if (!dataStr) {
        return null;
      }

      const data: BackgroundData = JSON.parse(dataStr);
      
      // 检查数据是否过期
      if (this.isCacheExpired()) {
        console.log('背景图缓存已过期，清理缓存');
        this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      console.error('读取背景图数据失败:', error);
      // 数据损坏时清理缓存
      this.clearCache();
      return null;
    }
  }

  /**
   * 检查是否有有效缓存
   */
  public hasValidCache(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    const data = localStorage.getItem(STORAGE_KEYS.BACKGROUND_DATA);
    const timestamp = localStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
    
    return !!(data && timestamp && !this.isCacheExpired());
  }

  /**
   * 检查缓存是否过期
   */
  public isCacheExpired(): boolean {
    if (!this.isAvailable()) {
      return true;
    }

    const timestampStr = localStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
    if (!timestampStr) {
      return true;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    
    return (now - timestamp) > CACHE_CONFIG.EXPIRE_TIME;
  }

  /**
   * 获取缓存年龄（毫秒）
   */
  public getCacheAge(): number {
    if (!this.isAvailable()) {
      return 0;
    }

    const timestampStr = localStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
    if (!timestampStr) {
      return 0;
    }

    const timestamp = parseInt(timestampStr, 10);
    return Date.now() - timestamp;
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.BACKGROUND_DATA);
      localStorage.removeItem(STORAGE_KEYS.BACKGROUND_SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      console.log('背景图缓存已清理');
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }

  /**
   * 获取缓存信息（用于调试）
   */
  public getCacheInfo(): {
    hasCache: boolean;
    cacheAge: string;
    isExpired: boolean;
    dataSize: string;
    compressed?: boolean;
    compressionRatio?: string;
  } {
    const data = this.getBackgroundData();
    const hasCache = !!data;
    const cacheAge = this.formatDuration(this.getCacheAge());
    const isExpired = this.isCacheExpired();
    
    let dataSize = '0 B';
    let compressed = false;
    let compressionRatio = '';

    if (data) {
      const dataStr = localStorage.getItem(STORAGE_KEYS.BACKGROUND_DATA);
      if (dataStr) {
        dataSize = formatFileSize(dataStr.length);
      }
      
      compressed = data.compressed || false;
      if (data.originalSize && data.compressedSize) {
        const ratio = ((data.originalSize - data.compressedSize) / data.originalSize * 100).toFixed(1);
        compressionRatio = `${ratio}%`;
      }
    }

    return {
      hasCache,
      cacheAge,
      isExpired,
      dataSize,
      compressed,
      compressionRatio,
    };
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// 导出单例实例
export const backgroundStorage = BackgroundStorageManager.getInstance();
