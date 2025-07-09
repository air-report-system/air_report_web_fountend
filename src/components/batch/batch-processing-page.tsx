/**
 * 批量处理主页面组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Settings,
  FileText,
  Download,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { BatchProcessor } from './batch-processor';
import { BatchStepProcessor } from './batch-step-processor';
import { BatchReportManager } from './batch-report-manager';
import { BatchJob, batchApi } from '@/lib/api';

interface BatchProcessingPageProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function BatchProcessingPage({ onSuccess, onError }: BatchProcessingPageProps) {
  const [currentBatchJob, setCurrentBatchJob] = useState<BatchJob | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [processingMode, setProcessingMode] = useState<'auto' | 'manual'>('manual');
  const [isRestoring, setIsRestoring] = useState(true);

  // 页面加载时恢复上次的任务状态
  useEffect(() => {
    const restoreLastSession = async () => {
      try {
        // 检查是否已经在恢复过程中，避免重复执行
        if (!isRestoring) {
          return;
        }

        // 从localStorage获取上次的任务ID和状态
        const lastJobId = localStorage.getItem('lastBatchJobId');
        const lastActiveTab = localStorage.getItem('lastActiveTab');
        const lastProcessingMode = localStorage.getItem('lastProcessingMode');
        const lastJobCompleted = localStorage.getItem('lastBatchJobCompleted');

        console.log('尝试恢复会话状态:', { lastJobId, lastActiveTab, lastProcessingMode, lastJobCompleted });

        if (lastJobId && lastJobCompleted !== 'true') {
          try {
            // 尝试恢复上次的任务
            const jobResponse = await batchApi.getJob(parseInt(lastJobId));
            const job = jobResponse.data;

            // 只有任务未完成时才恢复
            if (job && job.status !== 'completed') {
              setCurrentBatchJob(job);
              setActiveTab(lastActiveTab || 'process');
              setProcessingMode((lastProcessingMode as 'auto' | 'manual') || 'manual');
              console.log('✓ 恢复上次的批量处理任务:', job.name);

              // 使用setTimeout避免在useEffect中直接调用onSuccess
              setTimeout(() => {
                onSuccess?.(`恢复上次的批量处理任务: ${job.name}`);
              }, 100);
            } else {
              // 任务已完成，清理localStorage
              console.log('任务已完成，清理会话存储');
              clearSessionStorage();
            }
          } catch (apiError) {
            console.log('API调用失败，清理会话存储:', apiError);
            clearSessionStorage();
          }
        } else {
          console.log('没有需要恢复的会话状态');
        }
      } catch (error) {
        console.error('恢复会话状态时发生错误:', error);
        // 清理无效的localStorage数据
        clearSessionStorage();
      } finally {
        setIsRestoring(false);
      }
    };

    // 只在组件首次挂载时执行一次
    if (isRestoring) {
      restoreLastSession();
    }
  }, [isRestoring]); // 只依赖isRestoring状态

  // 清理会话存储
  const clearSessionStorage = () => {
    try {
      localStorage.removeItem('lastBatchJobId');
      localStorage.removeItem('lastActiveTab');
      localStorage.removeItem('lastProcessingMode');
      localStorage.removeItem('lastBatchJobCompleted');
      console.log('✓ 会话存储已清理');
    } catch (error) {
      console.error('清理会话存储时出错:', error);
    }
  };

  // 保存会话状态
  const saveSessionState = (job: BatchJob, tab: string, mode: 'auto' | 'manual') => {
    try {
      localStorage.setItem('lastBatchJobId', job.id.toString());
      localStorage.setItem('lastActiveTab', tab);
      localStorage.setItem('lastProcessingMode', mode);
      localStorage.removeItem('lastBatchJobCompleted'); // 确保未标记为完成
      console.log('✓ 会话状态已保存:', { jobId: job.id, tab, mode });
    } catch (error) {
      console.error('保存会话状态时出错:', error);
    }
  };

  const handleBatchJobCreated = (batchJob: BatchJob) => {
    setCurrentBatchJob(batchJob);
    const newTab = processingMode === 'manual' ? 'process' : 'monitor';
    setActiveTab(newTab);

    // 保存会话状态
    saveSessionState(batchJob, newTab, processingMode);

    onSuccess?.(`批量任务创建成功！共 ${batchJob.total_files} 个文件，开始处理...`);
  };

  const handleProcessingComplete = () => {
    setActiveTab('reports');

    // 更新会话状态
    if (currentBatchJob) {
      saveSessionState(currentBatchJob, 'reports', processingMode);
    }

    onSuccess?.('批量处理已完成！');
  };

  const handleBackToUpload = () => {
    setCurrentBatchJob(null);
    setActiveTab('upload');

    // 清理会话状态
    clearSessionStorage();
  };

  // 标记任务完成
  const handleMarkJobCompleted = () => {
    if (currentBatchJob) {
      try {
        localStorage.setItem('lastBatchJobCompleted', 'true');
        clearSessionStorage();
        setCurrentBatchJob(null);
        setActiveTab('upload');
        console.log('✓ 任务已标记为完成');
        onSuccess?.('任务已标记为完成，下次打开将是新的批量处理页面');
      } catch (error) {
        console.error('标记任务完成时出错:', error);
        onError?.('标记任务完成时出错，请重试');
      }
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'upload': return <Upload className="h-4 w-4" />;
      case 'process': return <Settings className="h-4 w-4" />;
      case 'monitor': return <BarChart3 className="h-4 w-4" />;
      case 'reports': return <Download className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getJobStatusBadge = (job: BatchJob) => {
    switch (job.status) {
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
          <Badge variant="outline">
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
            {job.status}
          </Badge>
        );
    }
  };

  // 如果正在恢复状态，显示加载提示
  if (isRestoring) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在恢复上次的批量处理任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">批量处理</h1>
          <p className="text-gray-600 mt-1">
            批量上传图片，自动识别并生成检测报告
          </p>
        </div>
        
        {currentBatchJob && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium">{currentBatchJob.name}</div>
              <div className="text-sm text-gray-500">
                {currentBatchJob.processed_files} / {currentBatchJob.total_files} 已处理
              </div>
            </div>
            {getJobStatusBadge(currentBatchJob)}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkJobCompleted}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <CheckCircle className="h-4 w-4" />
                任务完成
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToUpload}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                新建任务
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={(newTab) => {
        setActiveTab(newTab);
        // 保存Tab状态
        if (currentBatchJob) {
          saveSessionState(currentBatchJob, newTab, processingMode);
        }
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            {getTabIcon('upload')}
            文件上传
          </TabsTrigger>
          <TabsTrigger
            value="process"
            disabled={!currentBatchJob}
            className={`flex items-center gap-2 ${!currentBatchJob ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {getTabIcon('process')}
            逐张处理
          </TabsTrigger>
          <TabsTrigger
            value="monitor"
            disabled={!currentBatchJob}
            className={`flex items-center gap-2 ${!currentBatchJob ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {getTabIcon('monitor')}
            进度监控
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            {getTabIcon('reports')}
            报告管理
          </TabsTrigger>
        </TabsList>

        {/* 文件上传标签页 */}
        <TabsContent value="upload" className="space-y-6">
          <BatchProcessor
            onSuccess={onSuccess}
            onError={onError}
            onBatchJobCreated={handleBatchJobCreated}
          />

          {/* 处理模式选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                处理模式设置
              </CardTitle>
              <CardDescription>
                选择批量处理的工作模式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    processingMode === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setProcessingMode('manual')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={processingMode === 'manual'}
                      onChange={() => setProcessingMode('manual')}
                      className="text-blue-600"
                    />
                    <span className="font-medium">逐张确认模式</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    用户可以逐张查看OCR结果，确认数据后再生成报告。适合需要精确控制的场景。
                  </p>
                </div>

                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    processingMode === 'auto'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setProcessingMode('auto')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={processingMode === 'auto'}
                      onChange={() => setProcessingMode('auto')}
                      className="text-blue-600"
                    />
                    <span className="font-medium">自动处理模式</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    系统自动处理所有图片并生成报告，用户只需监控进度。适合大批量处理。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 逐张处理标签页 */}
        <TabsContent value="process" className="space-y-6">
          {currentBatchJob ? (
            <BatchStepProcessor
              batchJob={currentBatchJob}
              onSuccess={onSuccess}
              onError={onError}
              onComplete={handleProcessingComplete}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  请先上传文件
                </h3>
                <p className="text-gray-600 mb-4">
                  在开始逐张处理之前，请先上传要处理的图片文件
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 进度监控标签页 */}
        <TabsContent value="monitor" className="space-y-6">
          {currentBatchJob ? (
            <Card>
              <CardHeader>
                <CardTitle>批量处理监控</CardTitle>
                <CardDescription>
                  实时监控批量处理进度和状态
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div>进度监控功能正在开发中</div>
                  <div className="text-sm mt-2">
                    当前请使用"逐张处理"模式进行批量处理
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  暂无监控任务
                </h3>
                <p className="text-gray-600 mb-4">
                  请先创建批量处理任务
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 报告管理标签页 */}
        <TabsContent value="reports" className="space-y-6">
          <BatchReportManager
            batchJobId={currentBatchJob?.id}
            onSuccess={onSuccess}
            onError={onError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
