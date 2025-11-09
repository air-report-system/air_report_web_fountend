/**
 * 订单记录列表组件
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Phone,
  MapPin,
  Package
} from 'lucide-react';
import { OrderEditDialog } from './order-edit-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface OrderRecord {
  id: number;
  客户姓名: string;
  客户电话: string;
  客户地址: string;
  商品类型: string;
  成交金额: string;
  面积: string;
  履约时间: string;
  CMA点位数量: string;
  备注赠品: string;
  created_at: string;
  updated_at: string;
}

interface OrderRecordsListProps {
  onEdit?: (record: OrderRecord) => void;
  onDelete?: (record: OrderRecord) => void;
  onError?: (error: string) => void;
}

export function OrderRecordsList({ onEdit: _onEdit, onDelete, onError }: OrderRecordsListProps) {
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认选择当前月份
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedRecord, setSelectedRecord] = useState<OrderRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<OrderRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({
    customerName: '',
    customerPhone: ''
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { ordersApi } = await import('@/lib/api');
      const params: Record<string, string | number> = {
        page: currentPage,
        page_size: pageSize
      };

      if (appliedFilters.customerName) params.customer_name = appliedFilters.customerName;
      if (appliedFilters.customerPhone) params.customer_phone = appliedFilters.customerPhone;
      if (selectedMonth) params.fulfillment_month = selectedMonth;

      const response = await ordersApi.getRecords(params);
      const data = response.data;

      if (Array.isArray(data)) {
        setRecords(data as OrderRecord[]);
        setTotalCount(data.length);
        setHasNextPage(false);
        setHasPreviousPage(currentPage > 1);
      } else {
        const results = (data?.results as OrderRecord[]) || [];
        const count = typeof data?.count === 'number' ? data.count : results.length;

        if (!results.length && count > 0 && currentPage > 1) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
          setFetchVersion((prev) => prev + 1);
          return;
        }

        setRecords(results);
        setTotalCount(count);
        setHasNextPage(Boolean(data?.next));
        setHasPreviousPage(Boolean(data?.previous));
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 && currentPage > 1) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
        setFetchVersion((prev) => prev + 1);
        return;
      }
      if (error instanceof Error) {
        onError?.(error.message);
      } else {
        onError?.('获取记录失败');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, onError, pageSize, selectedMonth]);

  useEffect(() => {
    fetchRecords();
    // fetchVersion 用于在筛选条件未改变时强制刷新
  }, [fetchRecords, fetchVersion]);

  const triggerFetch = () => setFetchVersion((prev) => prev + 1);

  const handlePageChange = (page: number) => {
    if (page < 1 || page === currentPage) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (value: string) => {
    const size = Number(value);
    if (!Number.isNaN(size)) {
      setPageSize(size);
      setCurrentPage(1);
    }
  };

  const handleSearch = () => {
    setAppliedFilters({
      customerName: searchName.trim(),
      customerPhone: searchPhone.trim()
    });
    setCurrentPage(1);
    triggerFetch();
  };

  const handleMonthChange = (value: string) => {
    if (value === selectedMonth) {
      triggerFetch();
    } else {
      setSelectedMonth(value);
    }
    setCurrentPage(1);
  };

  const handleDeleteRecord = async (record: OrderRecord) => {
    if (!confirm(`确定要删除客户"${record.客户姓名}"的订单记录吗？`)) {
      return;
    }

    try {
      // 使用 ordersApi 进行删除
      const { ordersApi } = await import('@/lib/api');
      await ordersApi.deleteRecord(record.id);

      // 刷新列表
      fetchRecords();
      onDelete?.(record);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleEditRecord = (record: OrderRecord) => {
    setEditingRecord(record);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    // 刷新列表
    fetchRecords();
    // 移除自动跳转，编辑完成后留在当前页面
    // onEdit?.(_updatedRecord);
  };

  const handleCloseEditDialog = () => {
    setEditingRecord(null);
    setShowEditDialog(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化JSON显示 - 特别针对备注赠品字段
  const formatGiftsDisplay = (
    giftsData: Record<string, unknown> | string | null | undefined
  ) => {
    if (!giftsData) return '-';

    // 如果已经是对象，直接格式化
    if (typeof giftsData === 'object' && giftsData !== null) {
      return Object.entries(giftsData).map(([key, val]) => `${key}: ${val}`).join(', ');
    }

    // 如果是字符串，尝试解析
    if (typeof giftsData === 'string') {
      try {
        const parsed = JSON.parse(giftsData);
        return Object.entries(parsed).map(([key, val]) => `${key}: ${val}`).join(', ');
      } catch {
        return giftsData; // 如果解析失败，返回原始值
      }
    }

    return String(giftsData);
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  void _onEdit;

  return (
    <div className="space-y-6">
      {/* 搜索过滤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索订单记录
          </CardTitle>
          <CardDescription>
            根据客户姓名或电话号码搜索订单记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="search-name">客户姓名</Label>
              <Input
                id="search-name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="输入客户姓名"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="search-phone">客户电话</Label>
              <Input
                id="search-phone"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="输入电话号码"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="search-month">履约月份</Label>
              <div className="mt-1 flex gap-2 items-center">
                <Input
                  id="search-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      handleMonthChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                    }}
                    className="text-xs whitespace-nowrap"
                  >
                    本月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMonth = new Date();
                      lastMonth.setMonth(lastMonth.getMonth() - 1);
                      handleMonthChange(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
                    }}
                    className="text-xs whitespace-nowrap"
                  >
                    上月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthChange('')}
                    className="text-xs whitespace-nowrap"
                  >
                    全部
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle>订单记录列表</CardTitle>
          <CardDescription>
            {selectedMonth
              ? `${selectedMonth} 月份共找到 ${totalCount} 条记录`
              : `共找到 ${totalCount} 条记录`}
            {totalCount > 0 && (
              <span className="ml-4 text-sm text-gray-500">
                当前第 {Math.min(currentPage, totalPages)} / {totalPages} 页，显示 {records.length} 条
              </span>
            )}
            {records.length > 0 && (
              <span className="ml-4 text-sm text-gray-500">
                当前页总金额: ¥{records
                  .reduce((sum, record) => {
                    const amount = parseFloat(record.成交金额) || 0;
                    return sum + amount;
                  }, 0)
                  .toLocaleString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              加载中...
            </div>
          ) : records.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                暂无订单记录，请先录入订单信息
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">客户姓名</TableHead>
                    <TableHead className="w-[120px]">客户电话</TableHead>
                    <TableHead className="w-[200px]">客户地址</TableHead>
                    <TableHead className="w-[80px]">商品类型</TableHead>
                    <TableHead className="w-[100px]">成交金额</TableHead>
                    <TableHead className="w-[80px]">面积</TableHead>
                    <TableHead className="w-[100px]">履约时间</TableHead>
                    <TableHead className="w-[80px]">CMA点位</TableHead>
                    <TableHead className="w-[150px]">备注赠品</TableHead>
                    <TableHead className="w-[120px]">创建时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.客户姓名 || '-'}
                      </TableCell>
                      <TableCell>
                        {record.客户电话 ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{record.客户电话}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.客户地址 ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span
                              className="text-sm truncate max-w-[180px]"
                              title={record.客户地址}
                            >
                              {record.客户地址}
                            </span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.商品类型 ? (
                          <Badge variant={record.商品类型 === '国标' ? 'default' : 'secondary'}>
                            {record.商品类型}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.成交金额 ? (
                          <span className="text-sm font-medium text-green-600">
                            ¥{record.成交金额}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.面积 ? (
                          <span className="text-sm">{record.面积}㎡</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.履约时间 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{formatDate(record.履约时间)}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.CMA点位数量 ? (
                          <span className="text-sm">{record.CMA点位数量}点</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.备注赠品 ? (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span
                              className="text-sm truncate max-w-[130px]"
                              title={formatGiftsDisplay(record.备注赠品)}
                            >
                              {formatGiftsDisplay(record.备注赠品)}
                            </span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(record.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                            title="查看详情"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRecord(record)}
                            title="编辑"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRecord(record)}
                            className="text-red-600 hover:text-red-700"
                            title="删除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {records.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-600">
                共 {totalCount} 条，当前第 {Math.min(currentPage, totalPages)} / {totalPages} 页
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-[140px]" disabled={loading}>
                    <SelectValue placeholder="每页条数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">每页 10 条</SelectItem>
                    <SelectItem value="20">每页 20 条</SelectItem>
                    <SelectItem value="50">每页 50 条</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={loading || !hasPreviousPage}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={loading || !hasNextPage}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情查看模态框 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-white/30" style={{ backdropFilter: 'blur(4px)' }}>
            <CardHeader>
              <CardTitle>订单详情</CardTitle>
              <CardDescription>
                客户：{selectedRecord.客户姓名}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>客户姓名</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.客户姓名}</div>
                </div>
                <div>
                  <Label>客户电话</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.客户电话 || '-'}</div>
                </div>
                <div className="col-span-2">
                  <Label>客户地址</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.客户地址}</div>
                </div>
                <div>
                  <Label>商品类型</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.商品类型 || '-'}</div>
                </div>
                <div>
                  <Label>成交金额</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.成交金额 || '-'}</div>
                </div>
                <div>
                  <Label>面积</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.面积 || '-'}</div>
                </div>
                <div>
                  <Label>履约时间</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{formatDate(selectedRecord.履约时间)}</div>
                </div>
                <div>
                  <Label>CMA点位数量</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{selectedRecord.CMA点位数量 || '-'}</div>
                </div>
                <div className="col-span-2">
                  <Label>备注赠品</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{formatGiftsDisplay(selectedRecord.备注赠品)}</div>
                </div>
                <div>
                  <Label>创建时间</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{formatDateTime(selectedRecord.created_at)}</div>
                </div>
                <div>
                  <Label>更新时间</Label>
                  <div className="mt-1 p-2 bg-white/20 rounded border border-white/20">{formatDateTime(selectedRecord.updated_at)}</div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  关闭
                </Button>
                <Button onClick={() => {
                  // 直接调用内部的编辑函数而不是外部的onEdit回调
                  handleEditRecord(selectedRecord);
                  setSelectedRecord(null);
                }}>
                  编辑
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑对话框 */}
      <OrderEditDialog
        record={editingRecord}
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        onSuccess={handleEditSuccess}
        onError={onError}
      />
    </div>
  );
}
