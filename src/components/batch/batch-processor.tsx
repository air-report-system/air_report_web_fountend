/**
 * 批量处理主界面组件
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Upload,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Download,
  SkipForward,
  Settings
} from 'lucide-react';
import { batchApi, BatchJob, BatchFileItem } from '@/lib/api';
import { AxiosError } from 'axios';
import { formatError, formatDateTime, formatFileSize } from '@/lib/utils';

interface BatchProcessorProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onBatchJobCreated?: (batchJob: BatchJob) => void;
}

export function BatchProcessor({ onSuccess, onError, onBatchJobCreated }: BatchProcessorProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');
  const [useMultiOcr, setUseMultiOcr] = useState(false);
  const [ocrCount, setOcrCount] = useState(3);
  const [currentBatchJob, setCurrentBatchJob] = useState<BatchJob | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const queryClient = useQueryClient();

  // 创建批量任务
  const createBatchMutation = useMutation({
    mutationFn: (data: {
      files: File[];
      batch_name: string;
      use_multi_ocr: boolean;
      ocr_count: number;
      auto_start: boolean;
    }) => batchApi.uploadAndCreateJob(data.files, {
      batch_name: data.batch_name,
      use_multi_ocr: data.use_multi_ocr,
      ocr_count: data.ocr_count,
      auto_start: data.auto_start,
    }),
    onSuccess: (response) => {
      const batchJob = response.data;
      setCurrentBatchJob(batchJob);
      setCurrentFileIndex(0);

      // 检查是否有重复文件的提示
      const totalFiles = files.length;
      const actualFiles = batchJob.total_files;

      if (totalFiles > actualFiles) {
        const duplicateCount = totalFiles - actualFiles;
        onSuccess?.(`批量任务创建成功！检测到 ${duplicateCount} 个重复文件已自动跳过，实际处理 ${actualFiles} 个文件。`);
      } else {
        onSuccess?.('批量任务创建成功，开始处理...');
      }

      // 通知父组件批量任务已创建
      onBatchJobCreated?.(batchJob);
    },
    onError: (error: AxiosError | Error) => {
      console.error('批量上传错误:', error);
      if ('response' in error) {
        console.error('错误响应:', error.response);
        console.error('错误状态:', error.response?.status);
        console.error('错误数据:', error.response?.data);
      }
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // 获取批量任务详情
  const { data: batchJobData, refetch: refetchBatchJob } = useQuery({
    queryKey: ['batchJob', currentBatchJob?.id],
    queryFn: () => currentBatchJob ? batchApi.getJob(currentBatchJob.id) : null,
    enabled: !!currentBatchJob,
    refetchInterval: currentBatchJob?.status === 'running' ? 2000 : false,
  });

  // 更新当前批量任务数据
  useEffect(() => {
    if (batchJobData?.data) {
      setCurrentBatchJob(batchJobData.data);
    }
  }, [batchJobData]);

  // 启动批量任务
  const startBatchMutation = useMutation({
    mutationFn: (jobId: number) => batchApi.startJob(jobId),
    onSuccess: () => {
      onSuccess?.('批量任务已启动');
      refetchBatchJob();
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // 取消批量任务
  const cancelBatchMutation = useMutation({
    mutationFn: (jobId: number) => batchApi.cancelJob(jobId),
    onSuccess: () => {
      onSuccess?.('批量任务已取消');
      refetchBatchJob();
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0 && !batchName) {
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/[\/\s:]/g, '');
      setBatchName(`批量处理_${timestamp}`);
    }
  }, [batchName]);

  const handleStartBatch = () => {
    if (files.length === 0) {
      onError?.('请先选择要处理的图片文件');
      return;
    }

    if (!batchName.trim()) {
      onError?.('请输入批量任务名称');
      return;
    }

    createBatchMutation.mutate({
      files,
      batch_name: batchName.trim(),
      use_multi_ocr: useMultiOcr,
      ocr_count: ocrCount,
      auto_start: true,
    });
  };

  const handleCancelBatch = () => {
    if (currentBatchJob) {
      cancelBatchMutation.mutate(currentBatchJob.id);
    }
  };

  const handleRetryFailed = () => {
    if (currentBatchJob) {
      // TODO: 实现重试失败项的功能
      onError?.('重试功能正在开发中');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      case 'skipped': return 'bg-yellow-500';
      default: return 'bg-gray-400';
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

  const isLoading = createBatchMutation.isPending || 
                   startBatchMutation.isPending || 
                   cancelBatchMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      {!currentBatchJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量图片上传
            </CardTitle>
            <CardDescription>
              选择多张检测报告图片进行批量处理
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              accept="image"
              multiple={true}
              maxFiles={50}
              onFilesChange={handleFilesChange}
              disabled={isLoading}
              maxSize={10 * 1024 * 1024} // 10MB
            />

            {files.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务名称
                  </label>
                  <Input
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="输入批量任务名称"
                    disabled={isLoading}
                  />
                </div>

                {/* 高级设置 */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    高级设置
                  </Button>

                  {showAdvanced && (
                    <div className="mt-4 p-4 border rounded-lg space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="useMultiOcr"
                          checked={useMultiOcr}
                          onChange={(e) => setUseMultiOcr(e.target.checked)}
                          disabled={isLoading}
                        />
                        <label htmlFor="useMultiOcr" className="text-sm">
                          启用多重OCR验证（提高准确性）
                        </label>
                      </div>

                      {useMultiOcr && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            OCR次数: {ocrCount}
                          </label>
                          <input
                            type="range"
                            min="2"
                            max="5"
                            value={ocrCount}
                            onChange={(e) => setOcrCount(parseInt(e.target.value))}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    已选择 {files.length} 个文件
                  </span>
                  <Button
                    onClick={handleStartBatch}
                    disabled={isLoading || !batchName.trim()}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    开始批量处理
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 批量处理进度 */}
      {currentBatchJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {currentBatchJob.name}
              </div>
              <Badge className={getStatusColor(currentBatchJob.status)}>
                {getStatusText(currentBatchJob.status)}
              </Badge>
            </CardTitle>
            <CardDescription>
              批量处理进度：{currentBatchJob.processed_files} / {currentBatchJob.total_files}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>整体进度</span>
                <span>{Math.round(currentBatchJob.progress_percentage)}%</span>
              </div>
              <Progress value={currentBatchJob.progress_percentage} />
            </div>

            <div className="flex items-center gap-2">
              {currentBatchJob.status === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelBatch}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  取消任务
                </Button>
              )}

              {currentBatchJob.failed_files > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  重试失败项 ({currentBatchJob.failed_files})
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentBatchJob(null)}
                className="flex items-center gap-2"
              >
                返回上传
              </Button>
            </div>

            {/* 任务统计 */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {currentBatchJob.processed_files - currentBatchJob.failed_files}
                </div>
                <div className="text-sm text-green-600">已完成</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {currentBatchJob.failed_files}
                </div>
                <div className="text-sm text-red-600">失败</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {currentBatchJob.total_files - currentBatchJob.processed_files}
                </div>
                <div className="text-sm text-blue-600">待处理</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
