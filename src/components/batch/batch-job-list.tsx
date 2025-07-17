/**
 * 批量任务列表管理组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Eye,
  Settings,
  X
} from 'lucide-react';
import { BatchJob, batchApi } from '@/lib/api';
import { formatError, formatDateTime } from '@/lib/utils';

interface BatchJobListProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onJobSelected?: (job: BatchJob) => void;
}

export function BatchJobList({ onSuccess, onError, onJobSelected }: BatchJobListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  // 获取批量任务列表
  const { data: jobsData, isLoading, refetch } = useQuery({
    queryKey: ['batch-jobs', currentPage, pageSize, statusFilter],
    queryFn: () => batchApi.getJobs({
      page: currentPage,
      page_size: pageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    refetchInterval: 5000, // 每5秒刷新一次
  });

  // 取消任务
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: number) => batchApi.cancelJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['batch-jobs'] });
      onSuccess?.('任务已取消');
    },
    onError: (error) => {
      onError?.('取消任务失败: ' + formatError(error));
    },
  });

  // 重试失败的任务
  const retryJobMutation = useMutation({
    mutationFn: (jobId: number) => batchApi.retryFailedItems(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['batch-jobs'] });
      onSuccess?.('任务重试已开始');
    },
    onError: (error) => {
      onError?.('重试任务失败: ' + formatError(error));
    },
  });

  // 删除任务
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => batchApi.deleteJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['batch-jobs'] });
      onSuccess?.('任务已成功删除');
    },
    onError: (error) => {
      onError?.('删除任务失败: ' + formatError(error));
    },
  });

  const jobs = jobsData?.data?.results || [];
  const totalCount = jobsData?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 过滤任务
  const filteredJobs = jobs.filter((job: BatchJob) => {
    const matchesSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            已完成
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            运行中
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-gray-600">
            已取消
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-gray-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            待处理
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // 获取进度百分比
  const getProgressPercentage = (job: BatchJob) => {
    if (job.total_files === 0) return 0;
    return Math.round((job.processed_files / job.total_files) * 100);
  };

  // 处理任务操作
  const handleJobAction = (action: string, job: BatchJob) => {
    switch (action) {
      case 'resume':
        onJobSelected?.(job);
        break;
      case 'cancel':
        if (confirm(`确定要取消任务 "${job.name}" 吗？`)) {
          cancelJobMutation.mutate(job.id);
        }
        break;
      case 'retry':
        if (confirm(`确定要重试任务 "${job.name}" 中的失败项吗？`)) {
          retryJobMutation.mutate(job.id);
        }
        break;
      case 'delete':
        if (confirm(`确定要删除任务 "${job.name}" 吗？此操作不可恢复。`)) {
          deleteJobMutation.mutate(job.id);
        }
        break;
      default:
        break;
    }
  };

  const StatusFilterOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">批量任务管理</h2>
          <p className="text-gray-600 mt-1">
            管理您的所有批量处理任务，支持恢复、查看和删除
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索和过滤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索任务名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {StatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              任务列表
            </div>
            <Badge variant="outline">
              共 {totalCount} 个任务
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在加载任务列表...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无任务
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? '没有找到匹配的任务' : '您还没有创建任何批量处理任务'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job: BatchJob) => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg hover:bg-white/10 transition-colors border-white/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{job.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(job.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.total_files} 个文件
                          </span>
                          {job.processing_duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(job.processing_duration / 60)} 分钟
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleJobAction('resume', job)}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          恢复
                        </Button>
                        {job.status === 'running' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJobAction('cancel', job)}
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <X className="h-3 w-3" />
                            取消
                          </Button>
                        )}
                        {(job.status === 'failed' || job.failed_files > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJobAction('retry', job)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <RefreshCw className="h-3 w-3" />
                            重试
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleJobAction('delete', job)}
                          disabled={job.status === 'running' || deleteJobMutation.isPending}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">处理进度</span>
                      <span className="font-medium">
                        {job.processed_files} / {job.total_files} ({getProgressPercentage(job)}%)
                      </span>
                    </div>
                    <Progress value={getProgressPercentage(job)} className="h-2" />
                  </div>

                  {/* 详细信息 */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">{job.processed_files}</div>
                        <div className="text-gray-500">已完成</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">{job.failed_files}</div>
                        <div className="text-gray-500">失败</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">
                          {job.total_files - job.processed_files - job.failed_files}
                        </div>
                        <div className="text-gray-500">待处理</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-600">
                          {job.settings.use_multi_ocr ? '多重OCR' : '单次OCR'}
                        </div>
                        <div className="text-gray-500">处理模式</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                显示 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} 项，共 {totalCount} 项
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}