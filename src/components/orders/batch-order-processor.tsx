/**
 * 批量订单处理组件
 */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, CheckCircle, AlertCircle, Upload, Download, Edit2 } from 'lucide-react';

import { ordersApi } from '@/lib/api';

interface OrderData {
  客户姓名: string;
  客户电话: string;
  客户地址: string;
  商品类型: string;
  成交金额: string;
  面积: string;
  履约时间: string;
  CMA点位数量: string;
  备注赠品: string;
}

interface ProcessedOrder {
  order_data: OrderData;
  validation_errors: string[];
  duplicate_check: any;
}

interface BatchProcessResult {
  formatted_csv_lines: string[];
  order_data_list: ProcessedOrder[];
  validation_errors: string[];
  total_orders: number;
}

interface BatchOrderProcessorProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function BatchOrderProcessor({ onSuccess, onError }: BatchOrderProcessorProps) {
  const [orderTexts, setOrderTexts] = useState('');
  const [processedOrders, setProcessedOrders] = useState<ProcessedOrder[]>([]);
  const [formattedCsvLines, setFormattedCsvLines] = useState<string[]>([]);
  const [globalValidationErrors, setGlobalValidationErrors] = useState<string[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [editingCell, setEditingCell] = useState<{row: number, field: string} | null>(null);
  const [tempValue, setTempValue] = useState('');

  const handleProcessBatchOrders = async () => {
    if (!orderTexts.trim()) {
      onError?.('请输入订单信息');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('开始批量处理订单...');
      const response = await ordersApi.processMultiple(orderTexts);
      console.log('API响应:', response.data);
      
      const result: BatchProcessResult = response.data;
      
      // 确保数据结构正确
      if (!result.order_data_list || !Array.isArray(result.order_data_list)) {
        throw new Error('API返回的数据格式不正确');
      }
      
      setProcessedOrders(result.order_data_list);
      setFormattedCsvLines(result.formatted_csv_lines || []);
      setGlobalValidationErrors(result.validation_errors || []);
      setTotalOrders(result.total_orders || result.order_data_list.length);
      setShowResults(true);

      console.log('处理完成，订单数量:', result.order_data_list.length);
      onSuccess?.(result);
    } catch (error) {
      console.error('批量处理失败:', error);
      let errorMessage = '批量处理失败';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'AI处理超时，请重试或减少订单数量';
        } else if (error.message.includes('Network Error')) {
          errorMessage = '网络连接失败，请检查网络连接';
        } else {
          errorMessage = error.message;
        }
      }
      
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (orderIndex: number, field: keyof OrderData, value: string) => {
    setProcessedOrders(prev => 
      prev.map((order, index) => 
        index === orderIndex 
          ? { ...order, order_data: { ...order.order_data, [field]: value } }
          : order
      )
    );
  };

  const handleCellDoubleClick = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, field });
    setTempValue(currentValue);
  };

  const handleCellKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const handleCellSave = () => {
    if (editingCell) {
      handleFieldChange(editingCell.row, editingCell.field as keyof OrderData, tempValue);
      setEditingCell(null);
      setTempValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue('');
  };

  const handleSubmitBatchOrders = async () => {
    setIsSubmitting(true);
    try {
      const response = await ordersApi.submit(
        processedOrders.map(order => order.order_data)
      );
      
      const result = response.data;
      onSuccess?.({ message: `成功保存 ${result.success_count} 个订单信息`, records: result.records });
      
      // 重置表单
      setOrderTexts('');
      setProcessedOrders([]);
      setFormattedCsvLines([]);
      setGlobalValidationErrors([]);
      setTotalOrders(0);
      setShowResults(false);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '批量提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCsvData = () => {
    const csvContent = formattedCsvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `batch_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hasValidationErrors = processedOrders.some(order => order.validation_errors.length > 0) || globalValidationErrors.length > 0;

  return (
    <div className="space-y-6">
      {/* 批量订单信息输入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            批量订单信息录入
          </CardTitle>
          <CardDescription>
            请输入多个订单信息，AI将自动提取并格式化所有订单数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="batch-order-texts">批量订单信息</Label>
            <Textarea
              id="batch-order-texts"
              placeholder="请输入多个订单信息，例如：

业务类型：治理
跟单人：王璐平
治理标准：母婴
项目类别：家装
面积：140
成交金额：5402
联系人&联系电话：李先生 15884497902
客户地址：四川成都东府小区2栋四单元6号房
期望治理时间：7月4号
线索渠道：京东
CMA检测：是4个点位
其他备注：15罐除醛宝 三盒碳包

业务类型：治理
跟单人：赵雷鸣
成交日期：5月29日
治理标准：国标
项目类别：家装
面积：108
成交金额：2900
联系人&联系电话：易女士13996433228
客户地址：四川成都天府新区保利璟园8栋1603室
期望治理时间：7月3日上午9点
线索渠道：抖音
CMA检测：是（2个点）
其他备注：赠品10盒小绿罐"
              value={orderTexts}
              onChange={(e) => setOrderTexts(e.target.value)}
              rows={15}
              className="mt-1"
            />
          </div>
          
          <Button 
            onClick={handleProcessBatchOrders} 
            disabled={isProcessing || !orderTexts.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI批量处理中...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                批量智能格式化
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 批量处理结果 */}
      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              批量处理结果
            </CardTitle>
            <CardDescription>
              共处理 {totalOrders} 个订单，双击表格中的内容可以修改，确认无误后批量保存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 全局验证错误提示 */}
            {globalValidationErrors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">批量处理发现以下问题：</div>
                    <ul className="list-disc list-inside space-y-1">
                      {globalValidationErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 处理结果统计 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                <div className="text-sm text-blue-800">总订单数</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {processedOrders.filter(order => order.validation_errors.length === 0).length}
                </div>
                <div className="text-sm text-green-800">验证通过</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">
                  {processedOrders.filter(order => order.validation_errors.length > 0).length}
                </div>
                <div className="text-sm text-red-800">需要修正</div>
              </div>
            </div>

            {/* 订单数据编辑表格 */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">序号</TableHead>
                    <TableHead className="w-[120px]">客户姓名</TableHead>
                    <TableHead className="w-[120px]">客户电话</TableHead>
                    <TableHead className="w-[200px]">客户地址</TableHead>
                    <TableHead className="w-[100px]">商品类型</TableHead>
                    <TableHead className="w-[100px]">成交金额</TableHead>
                    <TableHead className="w-[80px]">面积</TableHead>
                    <TableHead className="w-[120px]">履约时间</TableHead>
                    <TableHead className="w-[100px]">CMA点位数量</TableHead>
                    <TableHead className="w-[150px]">备注赠品</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedOrders.map((processedOrder, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="text-center font-medium">
                        {rowIndex + 1}
                      </TableCell>
                      {Object.entries(processedOrder.order_data).map(([field, value]) => (
                        <TableCell 
                          key={field} 
                          className="cursor-pointer hover:bg-gray-50 relative"
                          onDoubleClick={() => handleCellDoubleClick(rowIndex, field, value)}
                        >
                          {editingCell?.row === rowIndex && editingCell?.field === field ? (
                            <div className="flex items-center gap-2">
                              {field === '履约时间' ? (
                                <Input
                                  type="date"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onKeyDown={handleCellKeyPress}
                                  className="w-full h-8 text-sm"
                                  autoFocus
                                />
                              ) : field === '商品类型' ? (
                                <select
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onKeyDown={handleCellKeyPress}
                                  className="w-full h-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                >
                                  <option value="">请选择</option>
                                  <option value="国标">国标</option>
                                  <option value="母婴">母婴</option>
                                  <option value="其他">其他</option>
                                </select>
                              ) : field === '备注赠品' || field === '客户地址' ? (
                                <Textarea
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onKeyDown={handleCellKeyPress}
                                  placeholder={field === '备注赠品' ? '格式：{除醛宝:2,炭包:1}' : `请输入${field}`}
                                  rows={2}
                                  className="w-full text-sm"
                                  autoFocus
                                />
                              ) : (
                                <Input
                                  type={field === '成交金额' || field === '面积' || field === 'CMA点位数量' ? 'number' : 'text'}
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onKeyDown={handleCellKeyPress}
                                  placeholder={`请输入${field}`}
                                  className="w-full h-8 text-sm"
                                  autoFocus
                                />
                              )}
                              <Button size="sm" variant="ghost" onClick={handleCellSave} className="h-6 w-6 p-0">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCellCancel} className="h-6 w-6 p-0">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={value}>{value || '-'}</span>
                              <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-1">
                          {processedOrder.validation_errors.length > 0 && (
                            <Badge variant="destructive" className="text-xs">错误</Badge>
                          )}
                          {processedOrder.duplicate_check && processedOrder.duplicate_check.is_duplicate && (
                            <Badge variant="outline" className="text-xs">重复</Badge>
                          )}
                          {processedOrder.validation_errors.length === 0 && (
                            <Badge variant="default" className="text-xs">正常</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 验证错误详情 */}
            {processedOrders.some(order => order.validation_errors.length > 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">需要修正的订单：</div>
                    {processedOrders.map((order, index) => (
                      order.validation_errors.length > 0 && (
                        <div key={index} className="text-sm">
                          <strong>订单 {index + 1}:</strong> {order.validation_errors.join(', ')}
                        </div>
                      )
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-4 justify-end">
              {formattedCsvLines.length > 0 && (
                <Button
                  variant="outline"
                  onClick={exportCsvData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </Button>
              )}
              
              <Button
                onClick={handleSubmitBatchOrders}
                disabled={isSubmitting || hasValidationErrors}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    批量保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    批量保存所有订单 ({totalOrders} 个)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 