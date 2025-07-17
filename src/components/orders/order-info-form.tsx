/**
 * 订单信息录入表单组件
 */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiBaseUrl, reformatCsvData } from '@/lib/utils';

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

interface OrderInfoFormProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function OrderInfoForm({ onSuccess, onError }: OrderInfoFormProps) {
  const [orderText, setOrderText] = useState('');
  const [orderData, setOrderData] = useState<OrderData>({
    客户姓名: '',
    客户电话: '',
    客户地址: '',
    商品类型: '',
    成交金额: '',
    面积: '',
    履约时间: '',
    CMA点位数量: '',
    备注赠品: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formattedCsv, setFormattedCsv] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);

  const handleProcessOrder = async () => {
    if (!orderText.trim()) {
      onError?.('请输入订单信息');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');

      // 使用工具函数获取API基础URL
      const baseUrl = getApiBaseUrl();

      const response = await fetch(`${baseUrl}/orders/process/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ order_text: orderText })
      });

      if (!response.ok) {
        throw new Error('处理订单信息失败');
      }

      const result = await response.json();
      setOrderData(result.order_data);
      setValidationErrors(result.validation_errors || []);
      setFormattedCsv(result.formatted_csv);
      setDuplicateCheck(result.duplicate_check || null);
      setShowResults(true);

      onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (field: keyof OrderData, value: string) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');

      // 使用工具函数获取API基础URL
      const baseUrl = getApiBaseUrl();

      const response = await fetch(`${baseUrl}/orders/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ order_data: orderData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交订单失败');
      }

      const result = await response.json();
      onSuccess?.({ message: '订单信息保存成功', record: result.record });
      
      // 重置表单
      setOrderText('');
      setOrderData({
        客户姓名: '',
        客户电话: '',
        客户地址: '',
        商品类型: '',
        成交金额: '',
        面积: '',
        履约时间: '',
        CMA点位数量: '',
        备注赠品: ''
      });
      setShowResults(false);
      setValidationErrors([]);
      setDuplicateCheck(null);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 订单信息输入 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            订单信息录入
          </CardTitle>
          <CardDescription>
            请输入原始订单信息，AI将自动提取并格式化关键数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="order-text">订单信息</Label>
            <Textarea
              id="order-text"
              placeholder="请输入订单信息，包括客户姓名、电话、地址、商品类型、成交金额等..."
              value={orderText}
              onChange={(e) => setOrderText(e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>
          
          <Button 
            onClick={handleProcessOrder} 
            disabled={isProcessing || !orderText.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI处理中...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                智能格式化
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 处理结果 */}
      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              格式化结果
            </CardTitle>
            <CardDescription>
              请检查并修改AI提取的信息，确认无误后提交保存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 验证错误提示 */}
            {validationErrors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">请修正以下问题：</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 重复记录警告 */}
            {duplicateCheck && duplicateCheck.is_duplicate && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-yellow-800">
                      ⚠️ 检测到可能的重复记录 ({duplicateCheck.duplicate_count} 条)
                    </div>
                    <div className="space-y-2">
                      {duplicateCheck.match_details.map((detail: any, index: number) => (
                        <div key={index} className="p-2 bg-yellow-100 rounded text-sm">
                          <div className="font-medium text-yellow-900">
                            匹配原因：{detail.match_type}
                          </div>
                          <div className="text-yellow-800 mt-1">
                            现有记录：{detail.existing_name} | {detail.existing_phone} | {detail.existing_address}
                            {detail.existing_date && ` | 履约时间：${detail.existing_date}`}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-yellow-700 mt-2">
                      这是一个提醒，您仍然可以继续保存。如果确认不是重复记录，请点击"保存订单信息"按钮。
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 订单数据编辑表格 */}
            <div className="mb-6">
              <Label>订单信息编辑</Label>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="border-b border-white/20">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">字段</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(orderData).map(([key, value], index) => (
                      <tr key={key} className={index % 2 === 0 ? 'bg-white/10' : 'bg-white/5'}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-600 border-b">{key}</td>
                        <td className="px-4 py-2 border-b">
                          {key === '履约时间' ? (
                            <Input
                              type="date"
                              value={value}
                              onChange={(e) => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full text-sm"
                            />
                          ) : key === '商品类型' ? (
                            <select
                              value={value}
                              onChange={(e) => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">请选择</option>
                              <option value="国标">国标</option>
                              <option value="母婴">母婴</option>
                              <option value="其他">其他</option>
                            </select>
                          ) : key === '备注赠品' ? (
                            <Textarea
                              value={value}
                              onChange={(e) => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder="格式：{除醛宝:2,炭包:1}"
                              rows={2}
                              className="w-full text-sm"
                            />
                          ) : key === '客户地址' ? (
                            <Textarea
                              value={value}
                              onChange={(e) => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`请输入${key}`}
                              rows={2}
                              className="w-full text-sm"
                            />
                          ) : (
                            <Input
                              type={key === '成交金额' || key === '面积' || key === 'CMA点位数量' ? 'number' : 'text'}
                              value={value}
                              onChange={(e) => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`请输入${key}`}
                              className="w-full text-sm"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            {/* 格式化的CSV预览 */}
            {formattedCsv && (
              <div>
                <Label>CSV格式预览</Label>
                <Textarea
                  value={reformatCsvData(formattedCsv)}
                  readOnly
                  rows={3}
                  className="mt-1 font-mono text-sm border border-white/30 rounded p-2"
                />
              </div>
            )}

            {/* 提交按钮 */}
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || validationErrors.length > 0}
              className={`w-full ${duplicateCheck && duplicateCheck.is_duplicate ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  保存订单信息
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
