/**
 * 订单记录列表组件
 */
'use client';

import React, { useState, useEffect } from 'react';
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
import { getApiBaseUrl } from '@/lib/utils';

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

export function OrderRecordsList({ onEdit, onDelete, onError }: OrderRecordsListProps) {
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

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (searchName) params.append('customer_name', searchName);
      if (searchPhone) params.append('customer_phone', searchPhone);
      if (selectedMonth) params.append('fulfillment_month', selectedMonth);

      // 使用工具函数获取API基础URL
      const baseUrl = getApiBaseUrl();

      const response = await fetch(`${baseUrl}/orders/records/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取订单记录失败');
      }

      const data = await response.json();
      setRecords(data.results || data);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // 当月份改变时自动搜索
  useEffect(() => {
    fetchRecords();
  }, [selectedMonth]);

  const handleSearch = () => {
    fetchRecords();
  };

  const handleDeleteRecord = async (record: OrderRecord) => {
    if (!confirm(`确定要删除客户"${record.客户姓名}"的订单记录吗？`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/v1/orders/records/${record.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('删除记录失败');
      }

      // 刷新列表
      fetchRecords();
      onDelete?.(record);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '删除失败');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

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
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
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
                      setSelectedMonth(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
                    }}
                    className="text-xs whitespace-nowrap"
                  >
                    上月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMonth('')}
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
            {selectedMonth ? (
              <>
                {selectedMonth} 月份共找到 {records.length} 条记录
                {records.length > 0 && (
                  <span className="ml-4 text-sm text-gray-500">
                    总金额: ¥{records.reduce((sum, record) => {
                      const amount = parseFloat(record.成交金额) || 0;
                      return sum + amount;
                    }, 0).toLocaleString()}
                  </span>
                )}
              </>
            ) : (
              `共找到 ${records.length} 条记录`
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
                              title={record.备注赠品}
                            >
                              {record.备注赠品}
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
                            onClick={() => onEdit?.(record)}
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
        </CardContent>
      </Card>

      {/* 详情查看模态框 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
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
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.客户姓名}</div>
                </div>
                <div>
                  <Label>客户电话</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.客户电话 || '-'}</div>
                </div>
                <div className="col-span-2">
                  <Label>客户地址</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.客户地址}</div>
                </div>
                <div>
                  <Label>商品类型</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.商品类型 || '-'}</div>
                </div>
                <div>
                  <Label>成交金额</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.成交金额 || '-'}</div>
                </div>
                <div>
                  <Label>面积</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.面积 || '-'}</div>
                </div>
                <div>
                  <Label>履约时间</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{formatDate(selectedRecord.履约时间)}</div>
                </div>
                <div>
                  <Label>CMA点位数量</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.CMA点位数量 || '-'}</div>
                </div>
                <div className="col-span-2">
                  <Label>备注赠品</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedRecord.备注赠品 || '-'}</div>
                </div>
                <div>
                  <Label>创建时间</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{formatDateTime(selectedRecord.created_at)}</div>
                </div>
                <div>
                  <Label>更新时间</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{formatDateTime(selectedRecord.updated_at)}</div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  关闭
                </Button>
                <Button onClick={() => {
                  onEdit?.(selectedRecord);
                  setSelectedRecord(null);
                }}>
                  编辑
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
