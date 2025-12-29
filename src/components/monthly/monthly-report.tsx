/**
 * 月度报表生成组件 - 移植自GUI项目的月度报表功能
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Settings, 
  CheckCircle,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { fileApi, monthlyReportApi } from '@/lib/api';
import { formatError, downloadFile } from '@/lib/utils';
import { MonthlyAIChat } from './monthly-ai-chat';

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
  const [uploadedCsvFileId, setUploadedCsvFileId] = useState<number | null>(null);

  const [csvPreview, setCsvPreview] = useState<{
    columns: string[];
    rows_head: string[][];
    total_rows: number;
  } | null>(null);

  const [columnFilter, setColumnFilter] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [excelPreview, setExcelPreview] = useState<{
    sheet: string;
    columns: string[];
    rows_head: string[][];
    rows_tail: string[][];
    total_rows: number;
  } | null>(null);

  const reportId = generatedReport?.id as number | undefined;
  const summary = (generatedReport?.summary_data || {}) as Record<string, unknown>;
  const summaryDisplay = useMemo(() => {
    // CSV流：MonthlyReportService._generate_summary_data
    // DB流：MonthlyReportService._generate_summary_data_db
    const s = summary as any;
    const totalOrders = s.total_orders ?? s.order_count ?? s.total_orders_processed ?? 0;
    const totalRevenue = s.total_revenue ?? s.total_sales_amount ?? s.total_amount ?? 0;
    const totalProfit = s.total_profit ?? s.total_profit_amount ?? 0;
    const totalCmaCost = s.total_cma_cost ?? 0;
    return { totalOrders, totalRevenue, totalProfit, totalCmaCost };
  }, [summary]);

  const filteredColumns = useMemo(() => {
    if (!csvPreview?.columns) return [];
    const key = columnFilter.trim();
    if (!key) return csvPreview.columns;
    return csvPreview.columns.filter((c) => c.includes(key));
  }, [csvPreview?.columns, columnFilter]);

  // 上传CSV并拉取预览（列清单 + 前N行）
  const uploadAndPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadResp = await fileApi.upload(file, 'spreadsheet');
      const csv_file_id = uploadResp.data?.id;
      if (!csv_file_id) throw new Error('CSV上传成功但未返回文件ID');

      const previewResp = await monthlyReportApi.previewCsv({
        csv_file_id,
        uniform_profit_rate: uniformProfitRate,
      });

      return { csv_file_id, preview: previewResp.data };
    },
    onSuccess: ({ csv_file_id, preview }) => {
      setUploadedCsvFileId(csv_file_id);
      setCsvPreview(preview);
      const cols = (preview?.columns || []) as string[];
      setSelectedColumns(cols);
    },
    onError: (error) => {
      onError?.(formatError(error));
    },
  });

  const isCsvPreviewLoading = uploadAndPreviewMutation.isPending;
  const csvPreviewErrorText = useMemo(() => {
    if (!uploadAndPreviewMutation.isError) return '';
    return formatError(uploadAndPreviewMutation.error);
  }, [uploadAndPreviewMutation.isError, uploadAndPreviewMutation.error]);

  // 拉取已生成Excel预览（head/tail）
  const fetchExcelPreviewMutation = useMutation({
    mutationFn: (rid: number) => monthlyReportApi.excelPreview(rid),
    onSuccess: (resp) => {
      setExcelPreview(resp.data);
    },
    onError: (error) => {
      onError?.(formatError(error));
    },
  });

  useEffect(() => {
    if (reportId) {
      fetchExcelPreviewMutation.mutate(reportId);
    } else {
      setExcelPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // 生成月度报表mutation
  const generateReportMutation = useMutation({
    mutationFn: (data: { 
      csvFile: File; 
      outputName?: string; 
      uniformProfitRate?: boolean; 
      laborCostFile?: File; 
    }) => {
      const ensureCsvFileId = async () => {
        if (uploadedCsvFileId) return uploadedCsvFileId;
        const uploadResp = await fileApi.upload(data.csvFile, 'spreadsheet');
        const csv_file_id = uploadResp.data?.id;
        if (!csv_file_id) throw new Error('CSV上传成功但未返回文件ID');
        setUploadedCsvFileId(csv_file_id);
        return csv_file_id;
      };

      return ensureCsvFileId().then((csv_file_id) => {
        return monthlyReportApi.generateFromCsv({
          csv_file_id,
          output_name: data.outputName,
          uniform_profit_rate: data.uniformProfitRate,
          selected_columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        });
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
    mutationFn: (rid: number) => monthlyReportApi.downloadExcel(rid),
    onSuccess: (data, rid) => {
      const filename = generatedReport?.title ? `${generatedReport.title}.xlsx` : `monthly_report_${rid}.xlsx`;
      downloadFile(data.data, filename);
      onSuccess?.('报表下载成功');
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  const handleCsvFileChange = (files: File[]) => {
    const f = files[0] || null;
    setCsvFile(f);
    setGeneratedReport(null);
    setUploadedCsvFileId(null);
    setCsvPreview(null);
    setSelectedColumns([]);
    setColumnFilter('');
    setExcelPreview(null);

    if (f) {
      uploadAndPreviewMutation.mutate(f);
    }
  };

  const handleLaborCostFileChange = (files: File[]) => {
    setLaborCostFile(files[0] || null);
  };

  const handleGenerateReport = () => {
    if (!csvFile) {
      onError?.('请先上传CSV文件');
      return;
    }

    if (isCsvPreviewLoading) {
      onError?.('CSV预览正在加载，请稍候再生成报表');
      return;
    }
    if (!csvPreview) {
      onError?.('CSV预览尚未生成（可能上传/预览失败），请稍后或点击重试');
      return;
    }
    if (selectedColumns.length === 0) {
      onError?.('请至少选择一列用于导出');
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
    if (!reportId) {
      onError?.('没有可下载的报表');
      return;
    }

    downloadMutation.mutate(reportId);
  };

  const isLoading =
    generateReportMutation.isPending ||
    downloadMutation.isPending ||
    uploadAndPreviewMutation.isPending ||
    fetchExcelPreviewMutation.isPending;

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
            <div className="mt-2 p-2 border border-green-500/50 rounded text-sm text-green-700">
              已选择：{csvFile.name}
            </div>
          )}
        </div>

        {/* CSV预览 + 列选择（用于最终Excel导出） */}
        {csvFile && (
          <div className="p-4 rounded-lg ui-surface-subtle ui-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-gray-900">表头列选择（用于最终Excel导出）</h4>
              {csvPreview ? (
                <div className="text-xs text-gray-500">
                  共 {csvPreview.columns.length} 列 / {csvPreview.total_rows} 行
                </div>
              ) : (
                <div className="text-xs text-gray-500">正在准备预览…</div>
              )}
            </div>

            {isCsvPreviewLoading && (
              <div className="text-sm text-gray-600">
                正在解析 CSV 并生成预览/列清单，请稍候…
              </div>
            )}

            {!isCsvPreviewLoading && csvPreviewErrorText && (
              <div className="space-y-2">
                <div className="text-sm text-red-600">预览失败：{csvPreviewErrorText}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => csvFile && uploadAndPreviewMutation.mutate(csvFile)}
                  disabled={isLoading}
                >
                  重试预览
                </Button>
              </div>
            )}

            {csvPreview && (
              <>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={columnFilter}
                onChange={(e) => setColumnFilter(e.target.value)}
                placeholder="搜索列名..."
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns(csvPreview.columns)}
                  disabled={isLoading}
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns([])}
                  disabled={isLoading}
                >
                  全不选
                </Button>
              </div>
            </div>

            <div className="max-h-48 overflow-auto rounded-md ui-border ui-surface-subtle p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredColumns.map((col) => {
                  const checked = selectedColumns.includes(col);
                  return (
                    <label key={col} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...selectedColumns, col]))
                            : selectedColumns.filter((x) => x !== col);
                          setSelectedColumns(next);
                        }}
                        disabled={isLoading}
                        className="h-4 w-4"
                      />
                      <span className="truncate" title={col}>
                        {col}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-gray-500">已选择 {selectedColumns.length} 列</div>

            {/* 简单预览：CSV head */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">CSV 预览（前几行）</div>
              <div className="rounded-md ui-border ui-surface-subtle overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-white/70 backdrop-blur">
                    <tr>
                      {csvPreview.columns.map((c, idx) => (
                        <th key={idx} className="text-left p-2 border-b ui-border whitespace-nowrap">
                          {c || '(空列名)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows_head.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-white/10">
                        {row.map((v, cIdx) => (
                          <td key={cIdx} className="p-2 whitespace-nowrap">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            )}
          </div>
        )}

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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border ui-border rounded"
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
            <div className="mt-4 p-4 border rounded-lg ui-surface-subtle ui-border space-y-4">
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
                  <div className="mt-2 p-2 border border-blue-500/50 rounded text-sm text-blue-700">
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
            disabled={!csvFile || isLoading || isCsvPreviewLoading || !csvPreview || selectedColumns.length === 0}
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
          <div className="p-4 border border-green-500/50 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-3">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">报表生成成功</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>标题：{generatedReport.title || '(未命名)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span>月份：{generatedReport.report_month_display || generatedReport.report_month || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Excel：{generatedReport.excel_file ? '已生成' : '无'}</span>
              </div>
            </div>

            {generatedReport.summary_data && (
              <div className="mt-3 text-sm text-green-700">
                <p>成交金额总计：¥{summaryDisplay.totalRevenue ?? 0}</p>
                <p>分润金额总计：¥{summaryDisplay.totalProfit ?? 0}</p>
                <p>CMA成本总计：¥{summaryDisplay.totalCmaCost ?? 0}</p>
                <p>订单总数：{summaryDisplay.totalOrders ?? 0}</p>
              </div>
            )}
          </div>
        )}

        {/* Excel预览（基于已生成文件，head/tail） */}
        {reportId && (
          <div className="p-4 rounded-lg ui-surface-subtle ui-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-gray-900">已生成Excel预览</h4>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExcelPreviewMutation.mutate(reportId)}
                  disabled={isLoading}
                >
                  刷新预览
                </Button>
              </div>
            </div>

            {excelPreview ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-500">
                  Sheet：{excelPreview.sheet} • 数据行数：{excelPreview.total_rows}
                </div>

                <div className="rounded-md ui-border ui-surface-subtle overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-white/70 backdrop-blur">
                      <tr>
                        {excelPreview.columns.map((c, idx) => (
                          <th key={idx} className="text-left p-2 border-b ui-border whitespace-nowrap">
                            {c || '(空列名)'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.rows_head.map((row, rIdx) => (
                        <tr key={`h-${rIdx}`} className="border-b border-white/10">
                          {row.map((v, cIdx) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {excelPreview.rows_tail.length > 0 && (
                        <tr>
                          <td
                            colSpan={Math.max(1, excelPreview.columns.length)}
                            className="p-2 text-center text-gray-400 border-y border-white/20"
                          >
                            … 后续行省略 …
                          </td>
                        </tr>
                      )}

                      {excelPreview.rows_tail.map((row, rIdx) => (
                        <tr key={`t-${rIdx}`} className="border-b border-white/10">
                          {row.map((v, cIdx) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {fetchExcelPreviewMutation.isPending ? '正在加载预览...' : '暂无预览数据'}
              </div>
            )}
          </div>
        )}

        {/* AI 对话：WS 实时计算并写回Excel，完成后刷新预览 */}
        {reportId && (
          <MonthlyAIChat
            reportId={reportId}
            onError={(msg) => onError?.(msg)}
            onFinal={() => {
              fetchExcelPreviewMutation.mutate(reportId);
            }}
          />
        )}

        {/* CSV格式说明 */}
        <div className="text-sm text-gray-600 border border-blue-500/50 p-3 rounded-lg">
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
          <div className="p-4 border-2 border-dashed ui-surface-subtle ui-border rounded-lg text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">报表预览区域</p>
            <p className="text-sm text-gray-400">
              上传CSV文件后会自动加载列清单与CSV预览；点击“生成报表”后将生成Excel并支持预览与下载
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
