/**
 * OCR图片上传组件 - 移植自GUI项目的OCR处理功能
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Settings, Play, RotateCcw } from 'lucide-react';
import { ocrApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { formatError } from '@/lib/utils';

interface OCRUploadProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onOCRComplete?: (ocrResult: any) => void; // 新增：OCR完成回调
}

export function OCRUpload({ onSuccess, onError, onOCRComplete }: OCRUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [useMultiOcr, setUseMultiOcr] = useState(false);
  const [ocrCount, setOcrCount] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pollingOcrId, setPollingOcrId] = useState<number | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('');

  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 轮询OCR结果
  const startPolling = (ocrResultId: number) => {
    setPollingOcrId(ocrResultId);
    setPollingStatus('正在处理OCR...');

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await ocrApi.getResult(ocrResultId);
        const ocrResult = response.data;

        if (ocrResult.status === 'completed') {
          // OCR完成
          clearInterval(pollingIntervalRef.current!);
          setPollingOcrId(null);
          setPollingStatus('');

          // 触发OCR完成回调
          onOCRComplete?.(ocrResult);
          onSuccess?.('OCR处理完成，数据已自动填充到表单');

        } else if (ocrResult.status === 'failed') {
          // OCR失败
          clearInterval(pollingIntervalRef.current!);
          setPollingOcrId(null);
          setPollingStatus('');
          onError?.('OCR处理失败，请重新上传图片');

        } else {
          // 仍在处理中
          setPollingStatus(`OCR处理中... (${ocrResult.status})`);
        }
      } catch (error) {
        console.error('轮询OCR结果失败:', error);
      }
    }, 2000); // 每2秒轮询一次
  };

  // OCR处理mutation
  const ocrMutation = useMutation({
    mutationFn: ({ file, useMultiOcr, ocrCount }: { file: File; useMultiOcr: boolean; ocrCount: number }) =>
      ocrApi.uploadAndProcess(file, useMultiOcr, ocrCount),
    onSuccess: (data) => {
      // 刷新OCR结果列表
      queryClient.invalidateQueries({ queryKey: queryKeys.ocr.results() });

      // 开始轮询OCR结果
      if (data.data.ocr_result_id) {
        startPolling(data.data.ocr_result_id);
      }

      setFiles([]);
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // OCR测试mutation
  const testMutation = useMutation({
    mutationFn: ({ file, useMultiOcr, ocrCount }: { file: File; useMultiOcr: boolean; ocrCount: number }) =>
      ocrApi.test(file, useMultiOcr, ocrCount),
    onSuccess: (data) => {
      onSuccess?.(data.data);
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  const handleProcess = () => {
    if (files.length === 0) {
      onError?.('请先选择图片文件');
      return;
    }

    const file = files[0];
    ocrMutation.mutate({ file, useMultiOcr, ocrCount });
  };

  const handleTest = () => {
    if (files.length === 0) {
      onError?.('请先选择图片文件');
      return;
    }

    const file = files[0];
    testMutation.mutate({ file, useMultiOcr, ocrCount });
  };

  const isLoading = ocrMutation.isPending || testMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          OCR图片处理
        </CardTitle>
        <CardDescription>
          上传检测报告图片，自动识别文字信息并提取关键数据
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 文件上传区域 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择图片文件
          </label>
          <FileUpload
            accept="image"
            multiple={false}
            onFilesChange={setFiles}
            disabled={isLoading}
            maxSize={10 * 1024 * 1024} // 10MB
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
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-4">
              {/* 多重OCR设置 */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="useMultiOcr"
                  checked={useMultiOcr}
                  onChange={(e) => setUseMultiOcr(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="useMultiOcr" className="text-sm font-medium text-gray-700">
                  启用多重OCR（提高识别准确性）
                </label>
              </div>

              {/* OCR次数设置 */}
              {useMultiOcr && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OCR识别次数
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={5}
                    value={ocrCount}
                    onChange={(e) => setOcrCount(parseInt(e.target.value) || 3)}
                    className="w-24"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    建议2-5次，次数越多准确性越高但耗时更长
                  </p>
                </div>
              )}

              {/* 功能说明 */}
              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>单次OCR</strong>：快速处理，适合清晰图片</p>
                <p>• <strong>多重OCR</strong>：多次识别并分析差异，适合模糊或复杂图片</p>
                <p>• <strong>自动匹配</strong>：智能匹配联系人信息和历史数据</p>
              </div>
            </div>
          )}
        </div>

        {/* 轮询状态显示 */}
        {pollingOcrId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="font-medium">{pollingStatus}</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              请稍候，完成后将自动填充表单数据
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handleProcess}
            disabled={files.length === 0 || isLoading || pollingOcrId !== null}
            loading={ocrMutation.isPending}
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            开始处理
          </Button>

          <Button
            variant="outline"
            onClick={handleTest}
            disabled={files.length === 0 || isLoading || pollingOcrId !== null}
            loading={testMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            测试识别
          </Button>
        </div>

        {/* 处理说明 */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">处理流程说明：</h4>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>上传检测报告图片（支持JPG、PNG等格式）</li>
            <li>AI自动识别图片中的文字信息</li>
            <li>提取关键数据：电话、日期、温湿度、检测点位等</li>
            <li>智能匹配联系人信息和历史记录</li>
            <li>生成结构化数据，可用于后续报告生成</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
