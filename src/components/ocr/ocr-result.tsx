/**
 * OCR结果显示组件
 */
'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Phone, 
  Calendar, 
  Thermometer, 
  Droplets, 
  MapPin, 
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { OCRResult } from '@/lib/api';
import { ocrApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { formatDateTime, formatError, formatToThreeDecimals } from '@/lib/utils';

interface OCRResultProps {
  result: OCRResult;
  onReprocess?: () => void;
  onCreateReport?: (result: OCRResult) => void;
}

export function OCRResultDisplay({ result, onReprocess, onCreateReport }: OCRResultProps) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // 重新处理mutation
  const reprocessMutation = useMutation({
    mutationFn: () => ocrApi.reprocess(result.id, false, 3),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ocr.result(result.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ocr.results() });
      onReprocess?.();
    },
    onError: (error) => {
      console.error('重新处理失败:', formatError(error));
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '处理完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '处理失败';
      case 'pending':
        return '等待处理';
      default:
        return '未知状态';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle className="text-lg">
                {result.file?.original_name || '未知文件'}
              </CardTitle>
              <CardDescription>
                处理时间：{formatDateTime(result.created_at)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(result.status)} className="flex items-center gap-1">
              {getStatusIcon(result.status)}
              {getStatusText(result.status)}
            </Badge>
            {result.confidence_score && (
              <Badge variant="outline">
                置信度: {Math.round(result.confidence_score * 100)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 基本信息 */}
        {result.status === 'completed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 联系信息 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                联系信息
              </h4>
              <div className="space-y-2 text-sm">
                {result.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{result.phone}</span>
                  </div>
                )}
                {result.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{result.date}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 环境信息 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                环境信息
              </h4>
              <div className="space-y-2 text-sm">
                {result.temperature && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-gray-500" />
                    <span>{result.temperature}°C</span>
                  </div>
                )}
                {result.humidity && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-gray-500" />
                    <span>{result.humidity}%</span>
                  </div>
                )}
                {result.check_type && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>{result.check_type === 'initial' ? '初检' : '复检'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 检测点位数据 */}
        {result.status === 'completed' && result.points_data && Object.keys(result.points_data).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">检测点位数据</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '收起' : '展开'}
              </Button>
            </div>
            
            {showDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(result.points_data).map(([point, value]) => (
                  <div key={point} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-sm text-gray-900">{point}</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {typeof value === 'number' ? formatToThreeDecimals(value) : value} mg/m³
                    </div>
                    <div className="text-xs text-gray-500">
                      {typeof value === 'number' && value > 0.08 ? '超标' : '合格'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                共检测到 {Object.keys(result.points_data).length} 个点位数据
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending}
            loading={reprocessMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重新处理
          </Button>

          {result.status === 'completed' && onCreateReport && (
            <Button onClick={() => onCreateReport(result)}>
              生成报告
            </Button>
          )}
        </div>

        {/* 错误信息 */}
        {result.status === 'failed' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">处理失败</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              请检查图片质量或重新上传，如果问题持续存在请联系技术支持。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
