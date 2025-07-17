/**
 * 月度报表生成组件 - 移植自GUI项目的月度报表功能
 */
'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { monthlyReportApi } from '@/lib/api';
import { formatError, downloadFile } from '@/lib/utils';

interface MonthlyReportProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function MonthlyReport({ onSuccess, onError }: MonthlyReportProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [laborCostFile, setLaborCostFile] = useState<File | null>(null);
  const [outputName, setOutputName] = useState('');
  const [uniformProfitRate, setUniformProfitRate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  // 生成月度报表mutation
  const generateReportMutation = useMutation({
    mutationFn: (data: { 
      csvFile: File; 
      outputName?: string; 
      uniformProfitRate?: boolean; 
      laborCostFile?: File; 
    }) => {
      return monthlyReportApi.generate(data.csvFile, {
        output_name: data.outputName,
        uniform_profit_rate: data.uniformProfitRate,
        labor_cost_file: data.laborCostFile
      });
    },
    onSuccess: (data) => {
      setGeneratedReport(data.data);
      onSuccess?.(data.data);
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // 下载报表mutation
  const downloadMutation = useMutation({
    mutationFn: (filename: string) => monthlyReportApi.download(filename),
    onSuccess: (data, filename) => {
      downloadFile(data.data, filename);
      onSuccess?.('报表下载成功');
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  const handleCsvFileChange = (files: File[]) => {
    setCsvFile(files[0] || null);
  };

  const handleLaborCostFileChange = (files: File[]) => {
    setLaborCostFile(files[0] || null);
  };

  const handleGenerateReport = () => {
    if (!csvFile) {
      onError?.('请先上传CSV文件');
      return;
    }

    const data = {
      csvFile,
      outputName: outputName.trim() || undefined,
      uniformProfitRate,
      laborCostFile: laborCostFile || undefined
    };

    generateReportMutation.mutate(data);
  };

  const handleDownloadReport = () => {
    if (!generatedReport?.filename) {
      onError?.('没有可下载的报表');
      return;
    }

    downloadMutation.mutate(generatedReport.filename);
  };

  const isLoading = generateReportMutation.isPending || downloadMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          月度报表生成
        </CardTitle>
        <CardDescription>
          上传CSV数据文件，自动生成月度统计报表
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV文件上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上传CSV数据文件 *
          </label>
          <FileUpload
            accept="csv"
            multiple={false}
            onFilesChange={handleCsvFileChange}
            disabled={isLoading}
            maxSize={50 * 1024 * 1024} // 50MB
          />
          {csvFile && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              已选择：{csvFile.name}
            </div>
          )}
        </div>

        {/* 基本设置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">基本设置</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输出文件名
            </label>
            <Input
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="例如：3月份账表（留空则自动生成）"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="uniformProfitRate"
              checked={uniformProfitRate}
              onChange={(e) => setUniformProfitRate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="uniformProfitRate" className="text-sm font-medium text-gray-700">
              统一分润比为0.05（否则前5个订单0.05，之后0.08）
            </label>
          </div>
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
            <div className="mt-4 p-4 border rounded-lg border-white/30 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  人工成本文件（可选）
                </label>
                <FileUpload
                  accept="all"
                  multiple={false}
                  onFilesChange={handleLaborCostFileChange}
                  disabled={isLoading}
                  maxSize={1 * 1024 * 1024} // 1MB
                />
                {laborCostFile && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    已选择：{laborCostFile.name}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  上传包含人工成本数据的文本文件，系统会自动读取并计算
                </p>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>成本计算</strong>：自动计算CMA成本、赠品成本、药水成本</p>
                <p>• <strong>地址匹配</strong>：智能匹配客户地址信息</p>
                <p>• <strong>分润分析</strong>：根据订单类型自动计算分润比例</p>
                <p>• <strong>Excel输出</strong>：生成标准格式的Excel报表</p>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerateReport}
            disabled={!csvFile || isLoading}
            loading={generateReportMutation.isPending}
            className="flex-1"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            生成报表
          </Button>

          {generatedReport && (
            <Button
              variant="outline"
              onClick={handleDownloadReport}
              disabled={isLoading}
              loading={downloadMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              下载Excel
            </Button>
          )}
        </div>

        {/* 生成结果 */}
        {generatedReport && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-3">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">报表生成成功</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>文件：{generatedReport.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span>总订单：{generatedReport.total_orders || 0}个</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>总金额：¥{generatedReport.total_amount || 0}</span>
              </div>
            </div>

            {generatedReport.summary && (
              <div className="mt-3 text-sm text-green-700">
                <p>净利润：¥{generatedReport.summary.net_profit || 0}</p>
                <p>成功率：{generatedReport.summary.success_rate || 0}%</p>
              </div>
            )}
          </div>
        )}

        {/* CSV格式说明 */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">CSV文件格式要求：</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>必须包含：履约时间、成交金额列</li>
            <li>可选包含：客户姓名、客户地址、商品类型、面积、CMA点位数量、备注赠品</li>
            <li>支持UTF-8和GBK编码</li>
            <li>第一行为列标题</li>
            <li>日期格式：YYYY-MM-DD 或 YYYY/MM/DD</li>
          </ul>
        </div>

        {/* 处理说明 */}
        {!generatedReport && (
          <div className="p-4 border-2 border-dashed border-white/30 rounded-lg text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">报表预览区域</p>
            <p className="text-sm text-gray-400">
              上传CSV文件并配置基本信息后，点击"生成报表"查看预览
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
