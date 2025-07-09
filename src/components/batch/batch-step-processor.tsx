/**
 * 批量处理逐张确认流程组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  SkipForward,
  FileText,
  Download,
  RefreshCw,
  Pause,
  Play
} from 'lucide-react';
import { BatchImagePreview } from './batch-image-preview';
import { BatchOCRResult } from './batch-ocr-result';
import { BatchFileList } from './batch-file-list';
import { batchApi, BatchJob, BatchFileItem } from '@/lib/api';
import { formatError } from '@/lib/utils';

interface BatchStepProcessorProps {
  batchJob: BatchJob;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function BatchStepProcessor({
  batchJob,
  onSuccess,
  onError,
  onComplete
}: BatchStepProcessorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // 获取批量任务详情
  const { data: batchJobData, refetch } = useQuery({
    queryKey: ['batchJob', batchJob.id],
    queryFn: () => batchApi.getJob(batchJob.id),
    refetchInterval: batchJob.status === 'running' && !isPaused ? 3000 : false,
  });

  const currentBatchJob = batchJobData?.data || batchJob;
  const fileItems = currentBatchJob.file_items || [];
  const currentFileItem = fileItems[currentIndex];

  // 自动跳转到下一个需要处理的文件（在逐张处理模式下，不自动跳转）
  // 用户需要手动导航或通过报告生成后的跳转
  useEffect(() => {
    // 在逐张处理模式下，我们不自动跳转到下一个文件
    // 让用户完全控制处理流程
  }, [fileItems, currentIndex, generatedReports, isPaused]);

  // 检查是否所有文件都已处理完成 - 但不自动跳转
  const [allFilesProcessed, setAllFilesProcessed] = useState(false);

  useEffect(() => {
    const isAllProcessed = currentBatchJob.status === 'completed' &&
        fileItems.every(item =>
          item.status === 'completed' ||
          item.status === 'failed' ||
          item.status === 'skipped'
        );

    if (isAllProcessed && !allFilesProcessed) {
      setAllFilesProcessed(true);
      onSuccess?.('🎉 所有文件已处理完成！您可以在下方查看已生成的报告，或切换到"报告管理"页面查看所有报告。');
      console.log('批量处理已完成，但保持在当前页面等待用户操作');
    }
  }, [currentBatchJob.status, fileItems, allFilesProcessed, onSuccess]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < fileItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelectFile = (index: number) => {
    setCurrentIndex(index);
  };

  const handleGenerateReport = (reportData: any) => {
    setGeneratedReports(prev => [...prev, reportData]);
    onSuccess?.(`报告 "${reportData.title}" 生成成功`);
    
    // 自动跳转到下一个需要处理的文件
    const nextIndex = fileItems.findIndex((item, index) => 
      index > currentIndex && 
      item.status === 'completed' && 
      item.ocr_result &&
      !generatedReports.some(report => report.ocr_result === item.ocr_result?.id)
    );
    
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkipCurrent = () => {
    onSuccess?.('已跳过当前图片');
    
    // 跳转到下一个文件
    if (currentIndex < fileItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDownloadReport = (fileItem: BatchFileItem) => {
    const report = generatedReports.find(r => r.ocr_result === fileItem.ocr_result?.id);
    if (report) {
      // TODO: 实现报告下载功能
      onSuccess?.(`开始下载报告: ${report.title}`);
    }
  };

  const handleRetryFile = (fileItem: BatchFileItem) => {
    // TODO: 实现重试单个文件的功能
    onError?.('重试功能正在开发中');
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    onSuccess?.(isPaused ? '已恢复批量处理' : '已暂停批量处理');
  };

  const completedReports = generatedReports.length;
  const totalFiles = fileItems.length;
  const progressPercentage = totalFiles > 0 ? (completedReports / totalFiles) * 100 : 0;

  const getNextActionText = () => {
    if (!currentFileItem) return '无文件';
    
    if (currentFileItem.status === 'processing') {
      return 'OCR识别中...';
    } else if (currentFileItem.status === 'completed' && currentFileItem.ocr_result) {
      const hasReport = generatedReports.some(report => 
        report.ocr_result === currentFileItem.ocr_result?.id
      );
      return hasReport ? '已生成报告' : '等待确认生成报告';
    } else if (currentFileItem.status === 'failed') {
      return '处理失败';
    } else if (currentFileItem.status === 'pending') {
      return '等待OCR识别';
    }
    return '未知状态';
  };

  return (
    <div className="space-y-6">
      {/* 批量处理控制栏 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>{currentBatchJob.name}</span>
              <Badge variant="outline">
                逐张确认模式
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                className="flex items-center gap-2"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? '恢复' : '暂停'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            当前状态：{getNextActionText()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 整体进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>报告生成进度</span>
              <span>{completedReports} / {totalFiles} ({Math.round(progressPercentage)}%)</span>
            </div>
            <Progress value={progressPercentage} />

            {/* 完成状态提示 */}
            {allFilesProcessed && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">所有文件已处理完成！</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  您可以在下方查看已生成的报告，或切换到"报告管理"页面查看所有报告。
                </p>
              </div>
            )}
          </div>

          {/* 当前文件导航 */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              上一张
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                第 {currentIndex + 1} 张 / 共 {totalFiles} 张
              </span>
              {currentFileItem && (
                <Badge className={
                  currentFileItem.status === 'completed' ? 'bg-green-500' :
                  currentFileItem.status === 'failed' ? 'bg-red-500' :
                  currentFileItem.status === 'processing' ? 'bg-blue-500' :
                  'bg-gray-400'
                }>
                  {currentFileItem.status === 'completed' ? '已完成' :
                   currentFileItem.status === 'failed' ? '失败' :
                   currentFileItem.status === 'processing' ? '处理中' :
                   '待处理'}
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === totalFiles - 1}
              className="flex items-center gap-2"
            >
              下一张
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主处理区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 h-full min-h-[calc(100vh-200px)]">
        {/* 左侧：文件列表（缩小到1列） */}
        <div className="lg:col-span-1">
          <BatchFileList
            fileItems={fileItems}
            currentIndex={currentIndex}
            onSelectFile={handleSelectFile}
            onDownloadReport={handleDownloadReport}
            onRetryFile={handleRetryFile}
          />
        </div>

        {/* 中间：图片预览（扩大到3列） */}
        <div className="lg:col-span-3">
          {currentFileItem ? (
            <BatchImagePreview
              fileItem={currentFileItem}
              currentIndex={currentIndex}
              totalCount={totalFiles}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <div>请选择要预览的文件</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：OCR结果和报告生成（扩大到2列） */}
        <div className="lg:col-span-2">
          {currentFileItem ? (
            <BatchOCRResult
              fileItem={currentFileItem}
              batchJob={batchJob}
              onGenerateReport={handleGenerateReport}
              onSkip={handleSkipCurrent}
              onError={onError}
              onSuccess={onSuccess}
              onRefetch={refetch}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <div>请选择文件查看OCR结果</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 已生成报告列表 */}
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              已生成报告 ({generatedReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedReports.map((report, index) => (
                <div key={report.id} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-1">{report.title}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(report.created_at).toLocaleString('zh-CN')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // TODO: 实现下载功能
                        onSuccess?.(`开始下载: ${report.title}`);
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      下载
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
