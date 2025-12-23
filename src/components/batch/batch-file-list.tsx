/**
 * 批量处理文件列表组件
 */
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  Download,
  SkipForward
} from 'lucide-react';
import { BatchFileItem } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface BatchFileListProps {
  fileItems: BatchFileItem[];
  currentIndex: number;
  onSelectFile: (index: number) => void;
  onDownloadReport?: (fileItem: BatchFileItem) => void;
  onRetryFile?: (fileItem: BatchFileItem) => void;
}

export function BatchFileList({
  fileItems,
  currentIndex,
  onSelectFile,
  onDownloadReport,
  onRetryFile
}: BatchFileListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-500/50 bg-transparent text-green-600';
      case 'failed': return 'border-red-500/50 bg-transparent text-red-600';
      case 'processing': return 'border-blue-500/50 bg-transparent text-blue-600';
      case 'skipped': return 'border-yellow-500/50 bg-transparent text-yellow-600';
      default: return 'border-gray-500/50 bg-transparent text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'processing': return '处理中';
      case 'pending': return '待处理';
      case 'skipped': return '已跳过';
      default: return status;
    }
  };

  const completedCount = fileItems.filter(item => item.status === 'completed').length;
  const failedCount = fileItems.filter(item => item.status === 'failed').length;
  const processingCount = fileItems.filter(item => item.status === 'processing').length;
  const pendingCount = fileItems.filter(item => item.status === 'pending').length;
  const skippedCount = fileItems.filter(item => item.status === 'skipped').length;

  const progressPercentage = fileItems.length > 0 
    ? ((completedCount + failedCount + skippedCount) / fileItems.length) * 100 
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>文件列表</span>
          <Badge variant="outline">
            {fileItems.length} 个文件
          </Badge>
        </CardTitle>
        
        {/* 整体进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>整体进度</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} />
        </div>

        {/* 状态统计 */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-600 font-bold">{completedCount}</div>
            <div className="text-green-600">完成</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-bold">{failedCount}</div>
            <div className="text-red-600">失败</div>
          </div>
          <div className="text-center">
            <div className="text-blue-600 font-bold">{processingCount}</div>
            <div className="text-blue-600">处理中</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-bold">{pendingCount}</div>
            <div className="text-gray-600">待处理</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-600 font-bold">{skippedCount}</div>
            <div className="text-yellow-600">跳过</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="h-full max-h-[calc(100vh-400px)] overflow-y-auto">
          {fileItems.map((fileItem, index) => (
            <div
              key={fileItem.id}
              className={`p-3 border-b cursor-pointer hover:bg-muted/20 transition-colors ui-border ${
                index === currentIndex ? 'bg-[hsl(var(--card)/var(--ui-surface-alpha))]' : ''
              }`}
              onClick={() => onSelectFile(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(fileItem.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {fileItem.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(fileItem.file_size)}
                      {fileItem.processing_time_seconds && (
                        <span className="ml-2">
                          耗时: {fileItem.processing_time_seconds.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge 
                    className={`${getStatusColor(fileItem.status)} text-xs`}
                  >
                    {getStatusText(fileItem.status)}
                  </Badge>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 ml-2">
                    {fileItem.status === 'completed' && fileItem.ocr_result && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadReport?.(fileItem);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {fileItem.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryFile?.(fileItem);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 错误信息 */}
              {fileItem.error_message && (
                <div className="mt-2 text-xs text-red-600 border ui-surface-subtle ui-border p-2 rounded">
                  {fileItem.error_message}
                </div>
              )}
              
              {/* OCR结果预览 */}
              {fileItem.ocr_result && fileItem.status === 'completed' && (
                <div className="mt-2 text-xs text-gray-600 ui-surface-subtle border ui-border p-2 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>电话: {fileItem.ocr_result.phone || '未识别'}</div>
                    <div>日期: {fileItem.ocr_result.date || '未识别'}</div>
                    <div>温度: {fileItem.ocr_result.temperature || '未识别'}</div>
                    <div>湿度: {fileItem.ocr_result.humidity || '未识别'}</div>
                  </div>
                  <div className="mt-1">
                    检测点位: {Object.keys(fileItem.ocr_result.points_data || {}).length}个
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {fileItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <div>暂无文件</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
