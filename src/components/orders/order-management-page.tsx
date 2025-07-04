/**
 * 订单信息记录管理页面
 */
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, FileText, List } from 'lucide-react';
import { OrderInfoForm } from './order-info-form';
import { OrderRecordsList } from './order-records-list';

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface OrderManagementPageProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function OrderManagementPage({ onSuccess, onError }: OrderManagementPageProps) {
  const [activeTab, setActiveTab] = useState('form');
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    // 3秒后自动清除通知
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFormSuccess = (result: any) => {
    if (result.message) {
      showNotification('success', result.message);
      onSuccess?.(result.message);
      // 如果是保存成功，切换到记录列表
      if (result.message.includes('保存成功')) {
        setActiveTab('records');
      }
    } else {
      showNotification('success', 'AI处理完成，请检查并确认信息');
    }
  };

  const handleFormError = (error: string) => {
    showNotification('error', error);
    onError?.(error);
  };

  const handleRecordsError = (error: string) => {
    showNotification('error', error);
    onError?.(error);
  };

  const handleEditRecord = (record: any) => {
    // 切换到表单页面进行编辑
    setActiveTab('form');
    showNotification('success', `正在编辑客户"${record.客户姓名}"的订单信息`);
  };

  const handleDeleteRecord = (record: any) => {
    showNotification('success', `已删除客户"${record.客户姓名}"的订单记录`);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">订单信息记录</h1>
        <p className="text-gray-600 mt-1">
          智能处理订单信息，自动提取关键数据并存储到数据库
        </p>
      </div>

      {/* 通知消息 */}
      {notification && (
        <Alert className={notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 功能选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            订单录入
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            记录管理
          </TabsTrigger>
        </TabsList>

        {/* 订单录入页面 */}
        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>智能订单信息处理</CardTitle>
              <CardDescription>
                输入原始订单信息，AI将自动提取客户姓名、电话、地址、商品类型、成交金额等关键数据，
                并格式化为标准的订单记录保存到数据库中。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderInfoForm
                onSuccess={handleFormSuccess}
                onError={handleFormError}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 记录管理页面 */}
        <TabsContent value="records">
          <OrderRecordsList
            onEdit={handleEditRecord}
            onDelete={handleDeleteRecord}
            onError={handleRecordsError}
          />
        </TabsContent>
      </Tabs>

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                智能订单录入
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 支持自然语言订单信息输入</li>
                <li>• AI自动提取关键字段信息</li>
                <li>• 智能识别客户信息和商品详情</li>
                <li>• 自动格式化为标准CSV格式</li>
                <li>• 实时数据验证和错误提示</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <List className="h-4 w-4" />
                订单记录管理
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 查看所有历史订单记录</li>
                <li>• 按客户姓名和电话搜索</li>
                <li>• 详细信息查看和编辑</li>
                <li>• 订单记录删除管理</li>
                <li>• 数据导出和统计分析</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">支持的订单信息格式</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 客户基本信息：姓名、电话、地址</p>
              <p>• 商品信息：类型（国标/母婴）、成交金额、面积</p>
              <p>• 服务信息：履约时间、CMA点位数量</p>
              <p>• 赠品信息：除醛宝、炭包、除醛机、除醛喷雾等</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
