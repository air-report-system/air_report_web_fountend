/**
 * OCR状态指示器组件 - 显示OCR处理状态和进度提示
 */
'use client';

import React from 'react';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OCRStatusIndicatorProps {
  isProcessing: boolean;
  isRetrying?: boolean;
  error?: string | null;
  success?: boolean;
  className?: string;
}

export function OCRStatusIndicator({ 
  isProcessing, 
  isRetrying = false,
  error, 
  success = false,
  className = '' 
}: OCRStatusIndicatorProps) {
  // 如果没有任何状态，不显示
  if (!isProcessing && !error && !success && !isRetrying) {
    return null;
  }

  // 成功状态
  if (success && !isProcessing) {
    return (
      <Alert className={`border-green-500/50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          OCR处理完成！结果已保存到系统中。
        </AlertDescription>
      </Alert>
    );
  }

  // 错误状态
  if (error && !isProcessing) {
    return (
      <Alert className={`border-red-500/50 ${className}`}>
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  // 重试状态
  if (isRetrying) {
    return (
      <Alert className={`border-yellow-500/50 ${className}`}>
        <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
        <AlertDescription className="text-yellow-800">
          连接出现问题，正在重试...请稍候
        </AlertDescription>
      </Alert>
    );
  }

  // 处理中状态
  if (isProcessing) {
    return (
      <Alert className={`ui-border ${className}`}>
        <Clock className="h-4 w-4 text-gray-800" />
        <AlertDescription className="text-gray-800 drop-shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>AI正在处理图片，请耐心等待...</span>
            </div>
            <div className="text-xs text-gray-700">
              处理时间通常需要1-3分钟，复杂图片可能需要更长时间
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// 导出一个简化的状态提示Hook
export function useOCRStatusMessage(isProcessing: boolean, error?: string | null) {
  if (error) {
    // 根据错误类型返回不同的提示
    if (error.includes('socket hang up') || error.includes('ECONNRESET')) {
      return {
        type: 'warning' as const,
        message: 'OCR处理时间较长，连接被重置。处理可能仍在后台进行，请稍后查看结果列表。'
      };
    }
    
    if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
      return {
        type: 'warning' as const,
        message: 'OCR处理超时。AI处理需要较长时间，请稍后查看结果列表或重新尝试。'
      };
    }
    
    if (error.includes('500')) {
      return {
        type: 'warning' as const,
        message: '服务器处理出错。OCR可能仍在后台处理，请稍后查看结果列表。'
      };
    }
    
    return {
      type: 'error' as const,
      message: error
    };
  }
  
  if (isProcessing) {
    return {
      type: 'info' as const,
      message: 'AI正在分析图片内容，通常需要1-3分钟，请耐心等待...'
    };
  }
  
  return null;
}
