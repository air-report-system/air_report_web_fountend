/**
 * 订单编辑对话框组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X } from 'lucide-react';

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

interface OrderEditDialogProps {
  record: OrderRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (record: OrderRecord) => void;
  onError?: (error: string) => void;
}

export function OrderEditDialog({ 
  record, 
  open, 
  onClose, 
  onSuccess, 
  onError 
}: OrderEditDialogProps) {
  const [formData, setFormData] = useState<Partial<OrderRecord>>({});
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (record) {
      setFormData({
        客户姓名: record.客户姓名,
        客户电话: record.客户电话,
        客户地址: record.客户地址,
        商品类型: record.商品类型,
        成交金额: record.成交金额,
        面积: record.面积,
        履约时间: record.履约时间,
        CMA点位数量: record.CMA点位数量,
        备注赠品: record.备注赠品,
      });
      setValidationErrors([]);
    }
  }, [record]);

  const validateForm = () => {
    const errors: string[] = [];
    
    // 客户电话格式检查
    if (formData.客户电话 && !/^1[3-9]\d{9}$/.test(formData.客户电话)) {
      errors.push('客户电话格式不正确');
    }
    
    // 商品类型检查
    if (formData.商品类型 && !['国标', '母婴'].includes(formData.商品类型)) {
      errors.push('商品类型只能是"国标"或"母婴"');
    }
    
    // 成交金额格式检查
    if (formData.成交金额 && isNaN(Number(formData.成交金额))) {
      errors.push('成交金额格式不正确');
    }
    
    // 面积格式检查
    if (formData.面积 && isNaN(Number(formData.面积))) {
      errors.push('面积格式不正确');
    }
    
    // 履约时间格式检查
    if (formData.履约时间) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(formData.履约时间)) {
        errors.push('履约时间格式不正确，应为YYYY-MM-DD');
      }
    }
    
    // CMA点位数量格式检查
    if (formData.CMA点位数量 && isNaN(Number(formData.CMA点位数量))) {
      errors.push('CMA点位数量格式不正确');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (field: keyof OrderRecord, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!record || !validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { ordersApi } = await import('@/lib/api');
      const response = await ordersApi.updateRecord(record.id, formData);
      
      const updatedRecord = { ...record, ...formData };
      onSuccess?.(updatedRecord);
      onClose();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setValidationErrors([]);
    onClose();
  };

  if (!record) {
    return null;
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>编辑订单记录</CardTitle>
          <CardDescription>
            编辑客户"{record.客户姓名}"的订单信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 验证错误提示 */}
          {validationErrors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                <div className="space-y-1">
                  <div className="font-medium">请修正以下错误：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 编辑表单 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="客户姓名">客户姓名</Label>
              <Input
                id="客户姓名"
                value={formData.客户姓名 || ''}
                onChange={(e) => handleInputChange('客户姓名', e.target.value)}
                placeholder="请输入客户姓名"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="客户电话">客户电话</Label>
              <Input
                id="客户电话"
                value={formData.客户电话 || ''}
                onChange={(e) => handleInputChange('客户电话', e.target.value)}
                placeholder="请输入客户电话"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="客户地址">客户地址</Label>
              <Textarea
                id="客户地址"
                value={formData.客户地址 || ''}
                onChange={(e) => handleInputChange('客户地址', e.target.value)}
                placeholder="请输入客户地址"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="商品类型">商品类型</Label>
              <select
                id="商品类型"
                value={formData.商品类型 || ''}
                onChange={(e) => handleInputChange('商品类型', e.target.value)}
                className="mt-1 w-full px-3 py-2 border ui-border rounded-md bg-[hsl(var(--background)/var(--ui-input-alpha))] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                <option value="国标">国标</option>
                <option value="母婴">母婴</option>
              </select>
            </div>

            <div>
              <Label htmlFor="成交金额">成交金额</Label>
              <Input
                id="成交金额"
                type="number"
                value={formData.成交金额 || ''}
                onChange={(e) => handleInputChange('成交金额', e.target.value)}
                placeholder="请输入成交金额"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="面积">面积 (平方米)</Label>
              <Input
                id="面积"
                type="number"
                value={formData.面积 || ''}
                onChange={(e) => handleInputChange('面积', e.target.value)}
                placeholder="请输入面积"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="履约时间">履约时间</Label>
              <Input
                id="履约时间"
                type="date"
                value={formData.履约时间 || ''}
                onChange={(e) => handleInputChange('履约时间', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="CMA点位数量">CMA点位数量</Label>
              <Input
                id="CMA点位数量"
                type="number"
                value={formData.CMA点位数量 || ''}
                onChange={(e) => handleInputChange('CMA点位数量', e.target.value)}
                placeholder="请输入CMA点位数量"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="备注赠品">备注赠品</Label>
              <Textarea
                id="备注赠品"
                value={formData.备注赠品 || ''}
                onChange={(e) => handleInputChange('备注赠品', e.target.value)}
                placeholder='JSON格式：{"除醛宝": 15, "炭包": 3}'
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || validationErrors.length > 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}