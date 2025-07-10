/**
 * 简化版报告生成组件
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Brain,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { reportApi, OCRResult, pointLearningApi, checkTypeInferenceApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { formatError, formatDateTime } from '@/lib/utils';

interface ReportGeneratorProps {
  ocrResult?: OCRResult;
  onSuccess?: (report: any) => void;
  onError?: (error: string) => void;
}

interface PointSuggestion {
  point_name: string;
  usage_count: number;
  avg_value: number;
  confidence: number;
  source: 'learned' | 'default';
}

export function ReportGenerator({ ocrResult, onSuccess, onError }: ReportGeneratorProps) {
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

        console.log('轮询报告状态:', report);
        console.log('is_generated:', report.is_generated, 'typeof:', typeof report.is_generated);
        console.log('docx_file:', report.docx_file);
        console.log('pdf_file:', report.pdf_file);
        console.log('error_message:', report.error_message);
        setCreatedReport(report);

        // 检查是否生成完成或失败
        if (report.is_generated) {
          // 报告生成完成
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          console.log('报告生成完成');
        } else if (report.error_message && report.error_message.trim() !== '') {
          // 报告生成失败
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          console.error('报告生成失败:', report.error_message);
          onError?.(`报告生成失败: ${report.error_message}`);
        }
      } catch (error) {
        console.error('轮询报告状态失败:', error);
        // 连续轮询失败时停止轮询
        const errorCount = (window as any).pollingErrorCount || 0;
        (window as any).pollingErrorCount = errorCount + 1;
        
        if (errorCount >= 3) {
          clearInterval(pollingIntervalRef.current!);
          setPollingReportId(null);
          onError?.('无法获取报告状态，请刷新页面重试');
          (window as any).pollingErrorCount = 0;
        }
      }
    }, 2000); // 每2秒轮询一次
    
    // 设置超时机制，避免无限轮询
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        setPollingReportId(null);
        onError?.('报告生成超时，请联系管理员');
      }
    }, 300000); // 5分钟超时
  };

  // 当OCR结果变化时，自动填充表单数据
  useEffect(() => {
    if (ocrResult) {
      console.log('收到OCR结果，开始自动填充表单:', ocrResult);
      console.log('联系人信息详情:', ocrResult.contact_info);

      // 填充基本信息
      setFormData(prev => {
        // 确保check_type是有效值
        let validCheckType: 'initial' | 'recheck' = 'initial';
        if (ocrResult.check_type === 'initial' || ocrResult.check_type === 'recheck') {
          validCheckType = ocrResult.check_type;
        }

        // 格式化联系人信息
        const contactName = ocrResult.contact_info?.contact_name || '';
        const contactPhone = ocrResult.contact_info?.full_phone || ocrResult.phone || '';
        
        let contactDisplay = '';
        if (contactName && contactPhone) {
            contactDisplay = `${contactName} ${contactPhone}`;
        } else if (contactName) {
            contactDisplay = contactName;
        } else if (contactPhone) {
            contactDisplay = contactPhone;
        }

        const newFormData = {
          title: '', // 每次都重置标题
          sampling_date: ocrResult.date || '',
          check_type: validCheckType,
          temperature: ocrResult.temperature?.toString() || '',
          humidity: ocrResult.humidity?.toString() || '',
          contact_person: contactDisplay.trim(),
          project_address: ocrResult.contact_info?.address || '',
          notes: ''
        };

        // 自动生成报告标题 - 参考GUI版本格式: {地址}+{检测类型}报告+{日期}
        const address = ocrResult.contact_info?.address || '';
        const checkTypeText = newFormData.check_type === 'recheck' ? '复检' : '初检';
        const date = ocrResult.date || '';

        // 简化地址显示
        let shortAddress = '';
        if (address) {
          const districtIndex = address.lastIndexOf('区');
          const countyIndex = address.lastIndexOf('县');
          const cityIndex = address.lastIndexOf('市');
          
          let lastIndex = Math.max(districtIndex, countyIndex);

          if (lastIndex === -1 && cityIndex !== -1 && cityIndex < address.length - 1) {
              lastIndex = cityIndex;
          }

          if (lastIndex !== -1) {
            shortAddress = address.substring(lastIndex + 1).trim();
          } else {
            shortAddress = address.substring(0, 20);
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
        
        return newFormData;
      });

      // 填充点位数据
      if (ocrResult.points_data && Object.keys(ocrResult.points_data).length > 0) {
        console.log('OCR识别到点位数据:', ocrResult.points_data);
        setPointsData(ocrResult.points_data);
      }
    } else if (Object.keys(pointsData).length === 0) {
      // 如果没有OCR数据且没有现有点位，保持空白
      // 用户可以手动添加点位
    }
  }, [ocrResult]);

  // 当点位数据变化时，自动推断检测类型
  useEffect(() => {
    if (Object.keys(pointsData).length > 0) {
      inferCheckType();
    }
  }, [pointsData]);

  const queryClient = useQueryClient();

  // 创建报告mutation
  const createReportMutation = useMutation({
    mutationFn: (data: any) => reportApi.create(data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.list() });
      // 更新点位学习数据
      updatePointLearning();

      // 保存创建的报告信息
      setCreatedReport(data.data);

      // 自动开始生成报告文件
      try {
        console.log('报告创建成功，开始生成文件:', data.data);
        await reportApi.generate(data.data.id);
        console.log('报告生成任务已启动');

        // 开始轮询报告生成状态
        startReportPolling(data.data.id);

        onSuccess?.(data.data);
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

  // 推断检测类型（优先使用后端API，失败时使用本地逻辑）
  const inferCheckType = async () => {
    // 检查是否有有效的点位数据
    if (Object.keys(pointsData).length === 0) {
      return;
    }

    try {
      // 尝试调用后端API
      const response = await checkTypeInferenceApi.infer({
        points_data: pointsData
      });

      setInferredCheckType(response.data.inferred_type);
      setCheckTypeConfidence(response.data.confidence);

      // 如果置信度高，自动更新检测类型
      if (response.data.confidence > 0.7 && response.data.inferred_type !== formData.check_type) {
        setFormData(prev => ({ ...prev, check_type: response.data.inferred_type }));
      }

      console.log(`后端AI推断: ${response.data.inferred_type}, 置信度: ${(response.data.confidence * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('后端推断失败，使用本地逻辑:', error);

      // 后端失败时使用本地推断逻辑
      try {
        const threshold = 0.080;
        const values = Object.values(pointsData);
        const validValues = values.filter(v => typeof v === 'number' && v >= 0);

        if (validValues.length === 0) {
          return;
        }

        // 统计高于和低于阈值的点位数量
        const highCount = validValues.filter(v => v > threshold).length;
        const lowCount = validValues.filter(v => v <= threshold).length;

        // 推断检测类型
        let inferredType: 'initial' | 'recheck';
        let confidence: number;

        if (highCount > lowCount) {
          inferredType = 'initial';
          confidence = highCount / (highCount + lowCount);
        } else if (lowCount > highCount) {
          inferredType = 'recheck';
          confidence = lowCount / (highCount + lowCount);
        } else {
          inferredType = 'initial'; // 默认初检
          confidence = 0.5;
        }

        setInferredCheckType(inferredType);
        setCheckTypeConfidence(confidence);

        // 如果置信度高，自动更新检测类型
        if (confidence > 0.7 && inferredType !== formData.check_type) {
          setFormData(prev => ({ ...prev, check_type: inferredType }));
        }

        console.log(`本地AI推断: ${inferredType}, 置信度: ${(confidence * 100).toFixed(1)}%`);
      } catch (localError) {
        console.error('本地推断也失败:', localError);
      }
    }
  };

  // 更新点位学习数据（优先使用后端API，失败时本地存储）
  const updatePointLearning = async () => {
    // 检查是否有有效的点位数据
    if (Object.keys(pointsData).length === 0) {
      return;
    }

    try {
      // 尝试调用后端API
      await pointLearningApi.updateLearning({
        points_data: pointsData,
        check_type: formData.check_type
      });
      console.log('点位学习数据已更新到后端');
    } catch (error) {
      console.error('后端更新失败，使用本地存储:', error);

      // 后端失败时使用本地存储
      try {
        const learningData = {
          points_data: pointsData,
          check_type: formData.check_type,
          timestamp: new Date().toISOString()
        };

        // 存储到localStorage作为备用方案
        if (typeof window !== 'undefined') {
          const existingData = localStorage.getItem('point_learning_data');
          const allData = existingData ? JSON.parse(existingData) : [];
          allData.push(learningData);

          // 只保留最近50条记录
          if (allData.length > 50) {
            allData.splice(0, allData.length - 50);
          }

          localStorage.setItem('point_learning_data', JSON.stringify(allData));
          console.log('点位学习数据已保存到本地');
        }
      } catch (localError) {
        console.error('本地存储也失败:', localError);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };

      // Fields that act as a source for the report title
      const titleSourceFields = ['project_address', 'check_type', 'sampling_date', 'contact_person'];

      if (titleSourceFields.includes(field)) {
        const address = newFormData.project_address;
        const checkTypeText = newFormData.check_type === 'recheck' ? '复检' : '初检';
        const date = newFormData.sampling_date;
        const contactName = newFormData.contact_person.split(' ')[0] || '';

        // Title generation using the full address
        let newTitle = '';
        if (address && date) {
          newTitle = `${address}+${checkTypeText}报告+${date}`;
        } else if (contactName && date) {
          newTitle = `${contactName}+${checkTypeText}报告+${date}`;
        } else if (address) {
          newTitle = `${address}+${checkTypeText}报告`;
        } else if (contactName) {
          newTitle = `${contactName}+${checkTypeText}报告`;
        } else {
          newTitle = `室内空气质量${checkTypeText}报告`;
        }
        
        newFormData.title = newTitle;
      }

      return newFormData;
    });
  };

  const handlePointDataChange = (pointName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPointsData(prev => ({ ...prev, [pointName]: numValue }));
  };

  const handlePointNameChange = (oldName: string, newName: string) => {
    if (newName.trim() === '' || newName === oldName) return;

    setPointsData(prev => {
      const newData = { ...prev };
      const value = newData[oldName];
      delete newData[oldName];
      newData[newName.trim()] = value;
      return newData;
    });
  };

  // 默认点位名称（参考GUI版本）
  const defaultPointNames = [
    "客厅", "主卧", "次卧", "次卧1", "次卧2",
    "儿童房", "书房", "衣帽间", "厨房", "餐厅"
  ];

  const addNewPoint = (pointName?: string) => {
    if (pointName) {
      // 使用指定的点位名称
      setPointsData(prev => ({ ...prev, [pointName]: 0 }));
    } else {
      // 自动选择下一个可用的默认点位名称
      const existingNames = Object.keys(pointsData);
      const availableName = defaultPointNames.find(name => !existingNames.includes(name));
      const newPointName = availableName || `检测点${Object.keys(pointsData).length + 1}`;
      setPointsData(prev => ({ ...prev, [newPointName]: 0 }));
    }
  };

  const removePoint = (pointName: string) => {
    setPointsData(prev => {
      const newData = { ...prev };
      delete newData[pointName];
      return newData;
    });
  };

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
      ocr_result: ocrResult.id,  // 修正字段名
      report_type: 'detection',  // 添加必需的报告类型
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

  const isLoading = createReportMutation.isPending;

  // 下载报告文件
  const handleDownloadReport = async (format: 'docx' | 'pdf') => {
    if (!createdReport) return;

    try {
      const response = format === 'docx'
        ? await reportApi.downloadDocx(createdReport.id)
        : await reportApi.downloadPdf(createdReport.id);

      // 检查响应数据类型并创建下载链接
      console.log('下载响应数据:', response);
      console.log('响应数据类型:', typeof response.data);
      console.log('是否为Blob:', response.data instanceof Blob);

      let blob: Blob;
      if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        // 如果不是Blob，尝试创建Blob
        blob = new Blob([response.data]);
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${createdReport.title}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`下载${format.toUpperCase()}失败:`, error);
      onError?.(`下载${format.toUpperCase()}文件失败：` + formatError(error));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          报告生成
        </CardTitle>
        <CardDescription>
          基于OCR识别结果生成标准检测报告
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OCR结果状态 */}
        {ocrResult ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">OCR数据已就绪</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>• 文件：{ocrResult.file?.original_name}</p>
              <p>• 电话：{ocrResult.phone || '未识别'}</p>
              <p>• 检测类型：{ocrResult.check_type === 'initial' ? '初检' : '复检'}</p>
              <p>• 检测点位：{Object.keys(ocrResult.points_data || {}).length}个</p>
              {ocrResult.points_data && Object.keys(ocrResult.points_data).length > 0 && (
                <p>• 点位数据：{Object.keys(ocrResult.points_data).join('、')}</p>
              )}
              <p>• 处理时间：{formatDateTime(ocrResult.created_at)}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">请先完成OCR处理</span>
            </div>
            <p className="text-sm text-yellow-700">
              需要先上传图片并完成OCR识别，才能生成报告
            </p>
          </div>
        )}

        {/* 基本信息表单 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">报告基本信息</h4>
          
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
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">暂无检测点位数据</p>
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
            onClick={handleCreateReport}
            disabled={!ocrResult || !formData.title.trim() || isLoading}
            loading={createReportMutation.isPending}
            className="flex-1"
          >
            <FileText className="mr-2 h-4 w-4" />
            创建报告
          </Button>
        </div>

        {/* 报告生成状态和下载 */}
        {createdReport && (
          <div className={`mt-4 p-4 rounded-lg border ${
            createdReport.error_message && createdReport.error_message.trim() !== ''
              ? 'bg-red-50 border-red-200'
              : createdReport.is_generated
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {createdReport.error_message && createdReport.error_message.trim() !== '' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">报告生成失败</span>
                </>
              ) : createdReport.is_generated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">报告生成完成</span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                  <span className="font-medium text-blue-800">报告生成中...</span>
                </>
              )}
            </div>
            <p className="text-sm mb-3">
              报告标题：{createdReport.title}
            </p>

            {/* 错误信息显示 */}
            {createdReport.error_message && createdReport.error_message.trim() !== '' && (
              <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                <p className="font-medium mb-1">错误详情：</p>
                <p className="whitespace-pre-wrap">{createdReport.error_message}</p>
                <p className="mt-2 text-xs text-red-600">
                  如果问题持续存在，请联系系统管理员或检查模板文件是否正确配置。
                </p>
              </div>
            )}

            {/* 文件状态 */}
            <div className="mb-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-600">Word文件:</span>
                {createdReport.docx_file ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    已生成
                  </span>
                ) : createdReport.is_generated ? (
                  <span className="text-gray-500 flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    已删除（根据设置）
                  </span>
                ) : createdReport.error_message ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    生成失败
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <Clock className="h-4 w-4 animate-spin" />
                    生成中...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">PDF文件:</span>
                {createdReport.pdf_file ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    已生成
                  </span>
                ) : createdReport.error_message ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    生成失败
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <Clock className="h-4 w-4 animate-spin" />
                    生成中...
                  </span>
                )}
              </div>
            </div>

            {/* 下载按钮 */}
            {(createdReport.docx_file || createdReport.pdf_file) && (
              <div className="flex gap-2">
                {createdReport.docx_file && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadReport('docx')}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    下载Word
                  </Button>
                )}
                {createdReport.pdf_file && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadReport('pdf')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    下载PDF
                  </Button>
                )}
              </div>
            )}

            {/* 生成中提示 */}
            {!createdReport.is_generated && !createdReport.error_message && (
              <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>正在生成报告文件，预计需要30秒到2分钟...</span>
                </div>
                <p className="text-xs mt-1 text-blue-600">
                  系统正在处理模板文件、生成表格和转换PDF，请耐心等待
                </p>
              </div>
            )}

            {/* 重试按钮 */}
            {createdReport.error_message && createdReport.error_message.trim() !== '' && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await reportApi.generate(createdReport.id, true);
                      startReportPolling(createdReport.id);
                    } catch (error) {
                      console.error('重新生成失败:', error);
                      onError?.('重新生成报告失败：' + formatError(error));
                    }
                  }}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  重新生成
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 功能说明 */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">报告生成流程：</h4>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>填写报告基本信息（标题、联系人等）</li>
            <li>系统自动整合OCR识别的检测数据</li>
            <li>生成标准格式的Word检测报告</li>
            <li>自动转换为PDF格式便于分享</li>
            <li>支持下载和在线预览</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
