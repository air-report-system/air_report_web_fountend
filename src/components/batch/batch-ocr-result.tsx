/**
 * 批量处理OCR结果展示和编辑组件
 * 复用单张报告生成的完整功能
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  FileText,
  SkipForward,
  RefreshCw,
  Brain,
  AlertTriangle,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { BatchFileItem, OCRResult, reportApi, ocrApi, pointLearningApi, checkTypeInferenceApi } from '@/lib/api';
import { formatError, formatDateTime } from '@/lib/utils';
import { queryKeys } from '@/lib/query-client';

interface PointSuggestion {
  point_name: string;
  usage_count: number;
  avg_value: number;
  confidence: number;
  source: 'learned' | 'default';
}

interface BatchOCRResultProps {
  fileItem: BatchFileItem;
  onGenerateReport?: (reportData: any) => void;
  onSkip?: () => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function BatchOCRResult({
  fileItem,
  onGenerateReport,
  onSkip,
  onError,
  onSuccess
}: BatchOCRResultProps) {
  // 状态管理
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(fileItem.ocr_result || null);
  const [formData, setFormData] = useState({
    title: '',
    contact_person: '',
    project_address: '',
    sampling_date: '',
    check_type: 'initial' as 'initial' | 'recheck',
    temperature: '',
    humidity: '',
    notes: ''
  });
  const [pointsData, setPointsData] = useState<Record<string, number>>({});
  const [inferredCheckType, setInferredCheckType] = useState<'initial' | 'recheck' | null>(null);
  const [checkTypeConfidence, setCheckTypeConfidence] = useState<number>(0);
  const [createdReport, setCreatedReport] = useState<any>(null);
  const [pollingReportId, setPollingReportId] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 开始轮询报告生成状态
  const startReportPolling = (reportId: number) => {
    setPollingReportId(reportId);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await reportApi.get(reportId);
        const report = response.data;

        setCreatedReport(report);

        // 检查是否生成完成或失败
        if (report.is_generated) {
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          console.log('报告生成完成');
        } else if (report.error_message && report.error_message.trim() !== '') {
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          console.error('报告生成失败:', report.error_message);
          onError?.(`报告生成失败: ${report.error_message}`);
        }
      } catch (error) {
        console.error('轮询报告状态失败:', error);
        const errorCount = (window as any).pollingErrorCount || 0;
        (window as any).pollingErrorCount = errorCount + 1;

        if (errorCount >= 3) {
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          onError?.('无法获取报告状态，请刷新页面重试');
          (window as any).pollingErrorCount = 0;
        }
      }
    }, 2000);

    // 设置超时机制
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        setPollingReportId(null);
        onError?.('报告生成超时，请联系管理员');
      }
    }, 300000);
  };

  // 初始化时检查是否已有OCR结果
  useEffect(() => {
    if (fileItem.ocr_result) {
      setOcrResult(fileItem.ocr_result);
    } else {
      // 如果没有OCR结果，添加默认点位
      setPointsData({
        '客厅': 0,
        '主卧': 0,
        '次卧': 0,
        '书房': 0
      });
    }
  }, [fileItem.ocr_result]);

  // 当OCR结果变化时，自动填充表单数据
  useEffect(() => {
    if (ocrResult) {
      console.log('收到OCR结果，开始自动填充表单:', ocrResult);

      // 填充基本信息
      setFormData(prev => {
        // 确保check_type是有效值
        const validCheckType = (ocrResult.check_type === 'initial' || ocrResult.check_type === 'recheck')
          ? ocrResult.check_type
          : prev.check_type;

        const newFormData = {
          ...prev,
          sampling_date: ocrResult.date || prev.sampling_date,
          check_type: validCheckType,
          temperature: ocrResult.temperature?.toString() || prev.temperature,
          humidity: ocrResult.humidity?.toString() || prev.humidity,
          contact_person: ocrResult.contact_info?.contact_name || prev.contact_person,
          project_address: ocrResult.contact_info?.address || prev.project_address,
        };

        // 自动生成报告标题
        if (!prev.title) {
          const contactName = ocrResult.contact_info?.contact_name || '';
          const address = ocrResult.contact_info?.address || '';
          const checkTypeText = ocrResult.check_type === 'recheck' ? '复检' : '初检';
          const date = ocrResult.date || '';

          // 简化地址显示
          let shortAddress = '';
          if (address) {
            const addressMatch = address.match(/([\u4e00-\u9fa5]+(?:小区|花园|公寓|大厦|新居|家园|苑|庭|城|广场))/);
            if (addressMatch) {
              shortAddress = addressMatch[1];
            } else {
              shortAddress = address.substring(0, 15);
            }
          }

          // 生成标题
          if (shortAddress && date) {
            newFormData.title = `${shortAddress}+${checkTypeText}报告+${date}`;
          } else if (contactName && date) {
            newFormData.title = `${contactName}+${checkTypeText}报告+${date}`;
          } else if (shortAddress) {
            newFormData.title = `${shortAddress}+${checkTypeText}报告`;
          } else if (contactName) {
            newFormData.title = `${contactName}+${checkTypeText}报告`;
          } else {
            newFormData.title = `室内空气质量${checkTypeText}报告`;
          }
        }

        return newFormData;
      });

      // 填充点位数据
      if (ocrResult.points_data && Object.keys(ocrResult.points_data).length > 0) {
        setPointsData(ocrResult.points_data);
      }
    }
  }, [ocrResult]);

  // 当点位数据变化时，自动推断检测类型
  useEffect(() => {
    if (Object.keys(pointsData).length > 0) {
      inferCheckType();
    }
  }, [pointsData]);

  const queryClient = useQueryClient();

  // OCR处理mutation
  const ocrMutation = useMutation({
    mutationFn: (file: File) => ocrApi.uploadAndProcess(file),
    onSuccess: (data) => {
      setOcrResult(data.data);
      setIsProcessingOCR(false);
      onSuccess?.('OCR处理完成');
      console.log('OCR处理成功:', data.data);
    },
    onError: (error) => {
      setIsProcessingOCR(false);
      const errorMessage = formatError(error);
      onError?.(errorMessage);
      console.error('OCR处理失败:', error);
    },
  });

  // 检测类型推断mutation
  const inferCheckTypeMutation = useMutation({
    mutationFn: (pointsData: Record<string, number>) =>
      checkTypeInferenceApi.infer({ points_data: pointsData }),
    onSuccess: (data) => {
      setInferredCheckType(data.data.predicted_type);
      setCheckTypeConfidence(data.data.confidence);
    },
    onError: (error) => {
      console.error('检测类型推断失败:', error);
    },
  });

  // 点位学习更新
  const updatePointLearning = () => {
    if (Object.keys(pointsData).length > 0) {
      pointLearningApi.updateLearning({
        points_data: pointsData,
        check_type: formData.check_type
      }).catch(error => {
        console.error('点位学习失败:', error);
      });
    }
  };

  // 创建报告mutation
  const createReportMutation = useMutation({
    mutationFn: (data: any) => reportApi.create(data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.list() });
      updatePointLearning();

      setCreatedReport(data.data);

      try {
        console.log('报告创建成功，开始生成文件:', data.data);
        await reportApi.generate(data.data.id);
        console.log('报告生成任务已启动');

        startReportPolling(data.data.id);
        onGenerateReport?.(data.data);
        onSuccess?.('报告创建成功，正在生成文件...');
      } catch (generateError) {
        console.error('报告生成失败:', generateError);
        onError?.('报告创建成功，但生成文件失败：' + formatError(generateError));
      }
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // 处理OCR
  const handleProcessOCR = async () => {
    if (!fileItem.file_path) {
      onError?.('文件路径不存在');
      return;
    }

    setIsProcessingOCR(true);
    try {
      // 创建File对象用于OCR处理
      const response = await fetch(fileItem.file_path);
      if (!response.ok) {
        throw new Error(`无法获取图片文件: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], fileItem.filename, { type: blob.type || 'image/*' });

      console.log('开始OCR处理:', fileItem.filename);
      ocrMutation.mutate(file);
    } catch (error) {
      console.error('OCR处理失败:', error);
      onError?.('OCR处理失败: ' + formatError(error));
      setIsProcessingOCR(false);
    }
  };

  // 推断检测类型
  const inferCheckType = () => {
    if (Object.keys(pointsData).length > 0) {
      inferCheckTypeMutation.mutate(pointsData);
    }
  };

  // 表单处理
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 点位数据处理
  const handlePointDataChange = (pointName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPointsData(prev => ({
      ...prev,
      [pointName]: numValue
    }));
  };

  const handlePointNameChange = (oldName: string, newName: string) => {
    if (newName && newName !== oldName) {
      setPointsData(prev => {
        const newData = { ...prev };
        const value = newData[oldName];
        delete newData[oldName];
        newData[newName] = value;
        return newData;
      });
    }
  };

  const addNewPoint = () => {
    const newPointName = `点位${Object.keys(pointsData).length + 1}`;
    setPointsData(prev => ({
      ...prev,
      [newPointName]: 0
    }));
  };

  const removePoint = (pointName: string) => {
    setPointsData(prev => {
      const newData = { ...prev };
      delete newData[pointName];
      return newData;
    });
  };

  // 生成报告
  const handleCreateReport = () => {
    if (!ocrResult) {
      onError?.('请先完成OCR处理');
      return;
    }

    if (!formData.title.trim()) {
      onError?.('请输入报告标题');
      return;
    }

    const reportData = {
      ocr_result: ocrResult.id,
      report_type: 'detection',
      title: formData.title,
      form_data: {
        ...formData,
        phone: ocrResult.phone,
        ocr_date: ocrResult.date,
        ocr_temperature: ocrResult.temperature,
        ocr_humidity: ocrResult.humidity,
        points_data: pointsData
      }
    };

    console.log('发送报告创建请求:', reportData);
    createReportMutation.mutate(reportData);
  };

  const isLoading = isProcessingOCR || ocrMutation.isPending || createReportMutation.isPending || pollingReportId !== null;

  return (
    <div className="space-y-6">

      {/* OCR处理状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              OCR识别处理
            </div>
            <div className="flex gap-2">
              {!ocrResult && (
                <Button
                  onClick={handleProcessOCR}
                  disabled={isLoading}
                  loading={isProcessingOCR || ocrMutation.isPending}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  开始OCR识别
                </Button>
              )}
              {ocrResult && (
                <Button
                  variant="outline"
                  onClick={handleProcessOCR}
                  disabled={isLoading}
                  loading={isProcessingOCR || ocrMutation.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新识别
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProcessingOCR || ocrMutation.isPending ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
              <div className="text-gray-600">正在进行OCR识别...</div>
              <Progress value={undefined} className="mt-4" />
            </div>
          ) : ocrResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>OCR识别完成</span>
                <Badge variant="secondary">
                  置信度: {((ocrResult.confidence_score || 0) * 100).toFixed(1)}%
                </Badge>
              </div>

              {/* 联系人信息识别结果 */}
              {ocrResult.contact_info && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800 mb-2">识别到联系人信息:</div>
                  <div className="text-sm text-blue-700 space-y-1">
                    {ocrResult.contact_info.contact_name && (
                      <div>联系人: {ocrResult.contact_info.contact_name}</div>
                    )}
                    {ocrResult.contact_info.address && (
                      <div>地址: {ocrResult.contact_info.address}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div>点击上方按钮开始OCR识别</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 报告表单 */}
      {ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              报告信息填写
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  报告标题 *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="请输入报告标题"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系人
                  </label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                    placeholder="联系人姓名"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    采样日期
                  </label>
                  <Input
                    type="date"
                    value={formData.sampling_date}
                    onChange={(e) => handleInputChange('sampling_date', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目地址
                </label>
                <Input
                  value={formData.project_address}
                  onChange={(e) => handleInputChange('project_address', e.target.value)}
                  placeholder="检测地址"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    检测类型
                    {inferredCheckType && (
                      <Badge
                        variant={checkTypeConfidence > 0.7 ? "default" : "secondary"}
                        className="ml-2"
                      >
                        AI推断: {inferredCheckType === 'initial' ? '初检' : '复检'}
                        ({(checkTypeConfidence * 100).toFixed(0)}%)
                      </Badge>
                    )}
                  </label>
                  <select
                    value={formData.check_type}
                    onChange={(e) => handleInputChange('check_type', e.target.value)}
                    className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      inferredCheckType && inferredCheckType !== formData.check_type && checkTypeConfidence > 0.7
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  >
                    <option value="initial">初检</option>
                    <option value="recheck">复检</option>
                  </select>
                  {inferredCheckType && inferredCheckType !== formData.check_type && checkTypeConfidence > 0.7 && (
                    <p className="text-sm text-orange-600 mt-1">
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      AI建议选择"{inferredCheckType === 'initial' ? '初检' : '复检'}"
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    温度 (°C)
                  </label>
                  <Input
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    placeholder={ocrResult?.temperature || "25.0"}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    湿度 (%RH)
                  </label>
                  <Input
                    value={formData.humidity}
                    onChange={(e) => handleInputChange('humidity', e.target.value)}
                    placeholder={ocrResult?.humidity || "60.0"}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 智能点位数据管理 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  智能点位数据管理
                </h4>
                <div className="flex gap-2">
                  {ocrResult?.points_data && Object.keys(ocrResult.points_data).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPointsData(ocrResult.points_data)}
                      disabled={isLoading}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      重新加载OCR数据
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNewPoint()}
                    disabled={isLoading}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    添加点位
                  </Button>
                </div>
              </div>

              {/* 推断结果显示 */}
              {inferredCheckType && (
                <div className={`p-3 rounded-lg border ${
                  inferredCheckType === 'initial'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">
                      AI智能推断: {inferredCheckType === 'initial' ? '初检' : '复检'}
                    </span>
                    <Badge variant="secondary">
                      置信度: {(checkTypeConfidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              )}

              {/* 点位数据编辑 */}
              {Object.keys(pointsData).length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 px-2">
                    <div className="col-span-5">点位名称</div>
                    <div className="col-span-5">检测值 (mg/m³)</div>
                    <div className="col-span-2">操作</div>
                  </div>
                  {Object.entries(pointsData).map(([pointName, value]) => (
                    <div key={pointName} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input
                          value={pointName}
                          onChange={(e) => handlePointNameChange(pointName, e.target.value)}
                          placeholder="点位名称"
                          className="h-8"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          type="number"
                          step="0.001"
                          value={value}
                          onChange={(e) => handlePointDataChange(pointName, e.target.value)}
                          placeholder="0.000"
                          className="h-8"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePoint(pointName)}
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div className="mb-4">暂无点位数据</div>
                  <Button
                    variant="outline"
                    onClick={() => addNewPoint()}
                    disabled={isLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一个点位
                  </Button>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1"
                disabled={isLoading}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                跳过此图片
              </Button>

              <Button
                onClick={handleCreateReport}
                disabled={isLoading || !formData.title.trim()}
                loading={createReportMutation.isPending || pollingReportId !== null}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                {pollingReportId ? '生成中...' : '生成报告'}
              </Button>
            </div>

            {/* 报告生成状态 */}
            {createdReport && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">报告创建成功</span>
                </div>
                <div className="text-sm text-green-700">
                  <div>报告标题: {createdReport.title}</div>
                  <div>创建时间: {formatDateTime(createdReport.created_at)}</div>
                  {createdReport.is_generated ? (
                    <div className="text-green-600 font-medium mt-2">✅ 报告文件生成完成</div>
                  ) : pollingReportId ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>正在生成报告文件...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
