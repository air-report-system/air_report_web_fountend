/**
 * 基于数据库的月度报表生成组件
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Settings,
  CheckCircle,
  AlertCircle,
  Calculator,
  TrendingUp,
  Database,
  Upload,
  FileText,
  Info,
  Copy
} from 'lucide-react';
import { formatError, downloadFile } from '@/lib/utils';
import api from '@/lib/api';

interface MonthlyReportDBProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface ReportConfig {
  uniform_profit_rate?: boolean;
  profit_rate_value?: number;
  medicine_cost_per_order?: number;
  cma_cost_per_point?: number;
}

export function MonthlyReportDB({ onSuccess, onError }: MonthlyReportDBProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<ReportConfig>({
    uniform_profit_rate: false,
    profit_rate_value: 0.05,
    medicine_cost_per_order: 120.1,
    cma_cost_per_point: 60.0,
  });
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [laborCostFile, setLaborCostFile] = useState<File | null>(null);
  const [laborCostUploadStatus, setLaborCostUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // 生成月度报表mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: {
      year: number;
      month: number;
      title?: string;
      config_data?: ReportConfig;
      labor_cost_file?: File;
    }) => {
      const formData = new FormData();
      formData.append('year', data.year.toString());
      formData.append('month', data.month.toString());
      if (data.title) formData.append('title', data.title);
      if (data.config_data) formData.append('config_data', JSON.stringify(data.config_data));
      if (data.labor_cost_file) formData.append('labor_cost_file', data.labor_cost_file);

      const response = await api.post('/monthly/create-from-db/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedReport(data.report);
      onSuccess?.(data.report);
    },
    onError: (error: any) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  const isLoading = generateReportMutation.isPending;

  const handleGenerateReport = () => {
    const reportTitle = title.trim() || `${year}年${month}月订单报表`;

    const data = {
      year,
      month,
      title: reportTitle,
      config_data: config,
      labor_cost_file: laborCostFile || undefined
    };

    generateReportMutation.mutate(data);
  };

  const handleLaborCostFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件格式
      if (!file.name.endsWith('.txt')) {
        onError?.('人工成本文件必须是txt格式');
        return;
      }

      setLaborCostFile(file);
      setLaborCostUploadStatus('success');
    } else {
      setLaborCostFile(null);
      setLaborCostUploadStatus('idle');
    }
  };

  const handleRemoveLaborCostFile = () => {
    setLaborCostFile(null);
    setLaborCostUploadStatus('idle');
    // 清空文件输入框
    const fileInput = document.getElementById('labor-cost-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCopyPrompt = async () => {
    const promptText = `整理每天的人工费邮费:(今年2025年)
日期可能在每条消息的右上角, 但是如果消息内容明确说明了是哪天的, 则以消息内说明的为准, 同一天的应合并
关于时间的补充, 如果消息是在早上7点之前发的, 则算前一天, 比如5号凌晨发的今日则算4号
按照以下格式:
<======
日期:
人工费: 油费: 其他具体费用:
共计:
<======`;

    try {
      await navigator.clipboard.writeText(promptText);
      onSuccess?.('Prompt已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      onError?.('复制失败，请手动复制');
    }
  };

  const handleDownloadReport = async () => {
    if (generatedReport?.id) {
      try {
        // 通过API下载文件
        const response = await api.get(`/monthly/reports/${generatedReport.id}/download_excel/`, {
          responseType: 'blob'
        });

        // 创建下载链接
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generatedReport.title}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        onSuccess?.('报表下载成功');
      } catch (error) {
        console.error('下载失败:', error);
        onError?.('下载失败，请重试');
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          基于数据库的月度报表生成
        </CardTitle>
        <CardDescription>
          从数据库中的订单记录生成月度统计报表，无需上传CSV文件
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 报表参数设置 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="year">年份</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min={2020}
              max={2030}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="month">月份</Label>
            <Input
              id="month"
              type="number"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              min={1}
              max={12}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="title">报表标题（可选）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${year}年${month}月订单报表`}
              className="mt-1"
            />
          </div>
        </div>

        {/* 配置选项 */}
        <div className="space-y-4 p-4 border border-white/30 rounded-lg">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            报表配置
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medicine-cost">药水成本（元/单）</Label>
              <Input
                id="medicine-cost"
                type="number"
                step="0.1"
                value={config.medicine_cost_per_order}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  medicine_cost_per_order: parseFloat(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cma-cost">CMA成本（元/点）</Label>
              <Input
                id="cma-cost"
                type="number"
                step="0.1"
                value={config.cma_cost_per_point}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  cma_cost_per_point: parseFloat(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* 人工成本文件上传 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 文件上传区域 */}
            <div className="space-y-2">
              <Label htmlFor="labor-cost-file" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                人工成本文件（可选）
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="labor-cost-file"
                  type="file"
                  accept=".txt"
                  onChange={handleLaborCostFileChange}
                  className="flex-1"
                />
                {laborCostFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLaborCostFile}
                    className="px-2"
                  >
                    移除
                  </Button>
                )}
              </div>
              {laborCostFile && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  已选择文件: {laborCostFile.name}
                </div>
              )}
              <p className="text-xs text-gray-500">
                上传txt格式的人工成本文件，用于计算人工成本列。如不上传，将自动检测或使用默认值。
              </p>
            </div>

            {/* Prompt建议区域 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                AI整理建议
              </Label>
              <div className="bg-white/20 border border-white/30 rounded-lg p-3" style={{ backdropFilter: 'blur(4px)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-blue-800">
                    人工成本整理Prompt
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-6 px-2 text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    复制
                  </Button>
                </div>
                <div className="text-xs text-blue-700 bg-white/20 rounded p-2 font-mono whitespace-pre-line border border-white/30" style={{ backdropFilter: 'blur(4px)' }}>
                  {`整理每天的人工费邮费:(今年2025年)
日期可能在每条消息的右上角, 但是如果消息内容明确说明了是哪天的, 则以消息内说明的为准, 同一天的应合并
关于时间的补充, 如果消息是在早上7点之前发的, 则算前一天, 比如5号凌晨发的今日则算4号
按照以下格式:
<======
日期:
人工费: 油费: 其他具体费用:
共计:
<======`}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 可以将此Prompt复制给AI助手，帮助整理微信群或其他聊天记录中的人工成本信息
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="uniform-profit"
              checked={config.uniform_profit_rate}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                uniform_profit_rate: e.target.checked 
              }))}
              className="rounded"
            />
            <Label htmlFor="uniform-profit">使用统一分润比</Label>
          </div>

          {config.uniform_profit_rate && (
            <div>
              <Label htmlFor="profit-rate">分润比例</Label>
              <Input
                id="profit-rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.profit_rate_value}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  profit_rate_value: parseFloat(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="w-full bg-transparent border border-white/30 hover:bg-white/10 text-gray-900"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              生成中...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              生成月度报表
            </>
          )}
        </Button>

        {/* 生成结果 */}
        {generatedReport && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">报表生成成功</span>
              </div>
              <Button
                onClick={handleDownloadReport}
                variant="outline"
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <Download className="h-4 w-4 mr-2" />
                下载报表
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>标题：{generatedReport.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span>总订单：{generatedReport.summary_data?.total_orders || 0}个</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>总金额：¥{generatedReport.summary_data?.total_revenue?.toFixed(2) || 0}</span>
              </div>
            </div>

            {generatedReport.summary_data && (
              <div className="mt-3 text-sm text-green-700 grid grid-cols-2 md:grid-cols-4 gap-2">
                <p>分润金额：¥{generatedReport.summary_data.total_profit_amount?.toFixed(2) || 0}</p>
                <p>总成本：¥{generatedReport.summary_data.total_cost?.toFixed(2) || 0}</p>
                <p>净利润：¥{generatedReport.summary_data.total_net_profit?.toFixed(2) || 0}</p>
                <p>平均订单：¥{generatedReport.summary_data.average_order_amount?.toFixed(2) || 0}</p>
              </div>
            )}
          </div>
        )}

        {/* 功能说明 */}
        <div className="text-sm text-gray-800 bg-white/20 p-3 rounded-lg border border-white/30" style={{ backdropFilter: 'blur(4px)' }}>
          <h4 className="font-medium text-blue-900 mb-2">功能说明：</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>直接从数据库中的订单记录生成报表</li>
            <li>支持自定义成本配置和分润比设置</li>
            <li>自动计算各项成本和净利润</li>
            <li>生成Excel格式的详细报表</li>
            <li>包含完整的统计数据和分析</li>
          </ul>
        </div>

        {/* 预览区域 */}
        {!generatedReport && (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">报表预览区域</p>
            <p className="text-sm text-gray-400">
              选择年月并生成报表后，结果将在此处显示
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
