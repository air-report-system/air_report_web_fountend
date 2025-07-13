/**
 * 批量报告管理组件
 */
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  FolderOpen,
  Archive,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw, // 导入 RefreshCw 图标
  Clock, // 导入 Clock 图标
} from 'lucide-react';
import { reportApi, Report } from '@/lib/api';
import { formatError, formatDateTime, downloadFile } from '@/lib/utils';

interface BatchReportManagerProps {
  batchJobId?: number;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function BatchReportManager({
  batchJobId,
  onSuccess,
  onError
}: BatchReportManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'generated' | 'pending'>('all');
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 获取报告列表
  const { data: reportsData, isLoading, refetch } = useQuery({
    queryKey: ['reports', {
      batch_job_id: batchJobId,
      search: searchTerm,
      filter: filterType,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      page: currentPage,
      pageSize: pageSize
    }],
    queryFn: () => reportApi.getList({
      page: currentPage,
      page_size: pageSize,
      report_type: 'detection',
      is_generated: filterType === 'generated' ? true : filterType === 'pending' ? false : undefined,
      search: searchTerm || undefined,
      created_after: dateFilter.startDate || undefined,
      created_before: dateFilter.endDate || undefined,
    }),
  });

  // 下载单个报告
  const downloadReportMutation = useMutation({
    mutationFn: async ({ reportId, format }: { reportId: number; format: 'docx' | 'pdf' }) => {
      if (format === 'docx') {
        return reportApi.downloadDocx(reportId);
      } else {
        return reportApi.downloadPdf(reportId);
      }
    },
    onSuccess: (data, variables) => {
      const report = reports.find((r: any) => r.id === variables.reportId);
      const filename = `${report?.title || 'report'}.${variables.format}`;

      // 检查响应数据类型
      console.log('下载响应数据:', data);
      console.log('响应数据类型:', typeof data.data);
      console.log('是否为Blob:', data.data instanceof Blob);

      if (data.data instanceof Blob) {
        downloadFile(data.data, filename);
        onSuccess?.(`报告 "${filename}" 下载成功`);
      } else {
        console.error('响应数据不是Blob类型:', data.data);
        onError?.('下载失败：响应数据格式错误');
      }
    },
    onError: (error) => {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    },
  });

  // 重新生成报告
  const regenerateReportMutation = useMutation({
    mutationFn: (reportId: number) => {
      // 调用API，强制重新生成
      return reportApi.generate(reportId, true);
    },
    onSuccess: (data, reportId) => {
      onSuccess?.(`报告 #${reportId} 已加入重新生成队列`);
      // 触发报告列表刷新
      refetch();
    },
    onError: (error, reportId) => {
      const errorMessage = formatError(error);
      onError?.(`报告 #${reportId} 重新生成失败: ${errorMessage}`);
    },
  });

  const reports = reportsData?.data?.results || [];
  // 服务端已经处理了筛选和分页，不需要客户端再次过滤

  const handleSelectReport = (reportId: number, checked: boolean) => {
    if (checked) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(reports.map((r: any) => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleDownloadReport = (reportId: number, format: 'docx' | 'pdf') => {
    downloadReportMutation.mutate({ reportId, format });
  };

  const handleBatchDownload = async (format: 'docx' | 'pdf') => {
    if (selectedReports.length === 0) {
      onError?.('请先选择要下载的报告');
      return;
    }

    try {
      onSuccess?.(`开始批量下载 ${selectedReports.length} 个报告...`);
      
      for (const reportId of selectedReports) {
        await downloadReportMutation.mutateAsync({ reportId, format });
        // 添加延迟避免过快请求
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      onSuccess?.(`批量下载完成，共 ${selectedReports.length} 个报告`);
      setSelectedReports([]);
    } catch (error) {
      const errorMessage = formatError(error);
      onError?.(errorMessage);
    }
  };

  const getStatusBadge = (report: Report) => {
    // 检查是否有正在进行的重新生成任务
    const isRegenerating = regenerateReportMutation.isPending && regenerateReportMutation.variables === report.id;

    if (isRegenerating) {
      return (
        <Badge className="bg-blue-500 text-white">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          生成中...
        </Badge>
      );
    }

    if (report.is_generated) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          已生成
        </Badge>
      );
    } else if (report.error_message) {
      return (
        <Badge variant="destructive" title={report.error_message}>
          <AlertCircle className="h-3 w-3 mr-1" />
          生成失败
        </Badge>
      );
    } else {
      // 默认“待生成”状态，但可能被“生成中”覆盖
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          待生成
        </Badge>
      );
    }
  };

  const isLoading_download = downloadReportMutation.isPending;

  // 日期筛选辅助函数
  const handleDateFilterChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
    resetToFirstPage();
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: ''
    });
    resetToFirstPage();
  };

  const setQuickDateFilter = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    setDateFilter({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    resetToFirstPage();
  };

  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter({
      startDate: today,
      endDate: today
    });
    setCurrentPage(1); // 重置到第一页
  };

  // 分页相关函数
  const totalReports = reportsData?.data?.count || 0;
  const totalPages = Math.ceil(totalReports / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedReports([]); // 清除选择
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
    setSelectedReports([]); // 清除选择
  };

  // 当筛选条件改变时重置到第一页
  const resetToFirstPage = () => {
    setCurrentPage(1);
    setSelectedReports([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          报告管理
        </CardTitle>
        <CardDescription>
          管理和下载批量生成的检测报告
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索和过滤 */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索报告标题、联系人或电话..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetToFirstPage();
                }}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any);
                  resetToFirstPage();
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">全部报告</option>
                <option value="generated">已生成</option>
                <option value="pending">待生成</option>
              </select>
            </div>
          </div>

          {/* 日期筛选 */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">创建时间:</span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                className="w-auto"
                placeholder="开始日期"
              />
              <span className="text-gray-500">至</span>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                className="w-auto"
                placeholder="结束日期"
              />
            </div>

            {/* 快速日期选择 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={setTodayFilter}
                className="text-xs"
              >
                今天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateFilter(7)}
                className="text-xs"
              >
                最近7天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateFilter(30)}
                className="text-xs"
              >
                最近30天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateFilter}
                className="text-xs"
              >
                清除
              </Button>
            </div>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedReports.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              已选择 {selectedReports.length} 个报告
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchDownload('docx')}
              disabled={isLoading_download}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              批量下载Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchDownload('pdf')}
              disabled={isLoading_download}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              批量下载PDF
            </Button>
          </div>
        )}

        {/* 报告列表 */}
        <div className="space-y-2">
          {/* 表头 */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium">
            <div className="w-8">
              <Checkbox
                checked={selectedReports.length === reports.length && reports.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </div>
            <div className="flex-1">报告信息</div>
            <div className="w-24">状态</div>
            <div className="w-32">创建时间</div>
            <div className="w-32">操作</div>
          </div>

          {/* 报告项 */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <div>加载中...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>暂无报告</div>
            </div>
          ) : (
            reports.map((report: any) => (
              <div
                key={report.id}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-8">
                  <Checkbox
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{report.title}</div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {report.form_data?.contact_person && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {report.form_data.contact_person}
                        {report.form_data?.phone && ` ${report.form_data.phone}`}
                      </div>
                    )}
                    {report.form_data?.project_address && (
                      <div className="truncate">{report.form_data.project_address}</div>
                    )}
                  </div>
                </div>
                
                <div className="w-24">
                  {getStatusBadge(report)}
                </div>
                
                <div className="w-32 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(report.created_at)}
                  </div>
                </div>
                
                <div className="w-32">
                  {report.is_generated ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(report.id, 'docx')}
                        disabled={isLoading_download}
                        className="h-8 w-8 p-0"
                        title="下载Word"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(report.id, 'pdf')}
                        disabled={isLoading_download}
                        className="h-8 w-8 p-0"
                        title="下载PDF"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateReportMutation.mutate(report.id)}
                      disabled={regenerateReportMutation.isPending}
                      className="flex items-center gap-1 h-8 text-xs px-2"
                      title="重新生成报告"
                    >
                      <RefreshCw className={`h-3 w-3 ${regenerateReportMutation.isPending && regenerateReportMutation.variables === report.id ? 'animate-spin' : ''}`} />
                      生成
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页器 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>每页显示:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>条</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
          <div>
            共 {totalReports} 个报告，当前页显示 {reports.length} 个
          </div>
          <div className="flex items-center gap-4">
            <span>已生成: {reports.filter((r: any) => r.is_generated).length}</span>
            <span>待生成: {reports.filter((r: any) => !r.is_generated).length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
