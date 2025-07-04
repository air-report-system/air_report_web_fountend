'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OCRUpload } from '@/components/ocr/ocr-upload';
import { ReportGenerator } from '@/components/reports/report-generator-simple';
import { MonthlyReport } from '@/components/monthly/monthly-report';
import { MonthlyReportDB } from '@/components/monthly/monthly-report-db';
import { BatchProcessingPage } from '@/components/batch/batch-processing-page';
import { OrderManagementPage } from '@/components/orders/order-management-page';
import { LoginForm } from '@/components/auth/login-form';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, BarChart3, MessageSquare, Settings, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function MainApp() {
  const [activeTab, setActiveTab] = useState('ocr');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentOcrResult, setCurrentOcrResult] = useState<any>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // 确保组件已挂载，避免hydration不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // 在客户端挂载前显示加载状态
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示登录表单
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <img
                  src="/logo.svg"
                  alt="空气检测系统Logo"
                  className="h-10 w-10"
                />
                <h1 className="ml-3 text-xl font-semibold text-gray-900">
                  室内空气检测数据处理系统
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  Web版本 v1.0
                </div>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* 通知栏 */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              'bg-red-100 text-red-800 border border-red-200'
            }`}>
            {notification.message}
          </div>
        )}

        {/* 主要内容 - 侧边栏布局 */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            {/* 左侧导航栏 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">功能导航</h2>
                </div>
                <nav className="p-2">
                  <button
                    onClick={() => setActiveTab('ocr')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${activeTab === 'ocr'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">OCR & 报告</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('batch')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${activeTab === 'batch'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">批量处理</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${activeTab === 'monthly'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium">月度报表</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${activeTab === 'orders'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="font-medium">订单信息记录</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* 右侧内容区域 */}
            <div className="flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                {/* OCR处理和报告生成页面 */}
                <TabsContent value="ocr" className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* 左侧：OCR处理 */}
                    <div className="space-y-6">
                      <OCRUpload
                        onSuccess={(message) => {
                          showNotification('success', message || 'OCR处理成功！');
                        }}
                        onError={(error) => {
                          showNotification('error', error);
                        }}
                        onOCRComplete={(ocrResult) => {
                          // OCR完成后自动填充表单
                          setCurrentOcrResult(ocrResult);
                          showNotification('success', 'OCR处理完成，数据已自动填充到表单！');
                          console.log('OCR结果:', ocrResult);
                        }}
                      />

                      {/* OCR结果展示 */}
                      {currentOcrResult && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Upload className="h-5 w-5" />
                              OCR识别结果
                            </CardTitle>
                            <CardDescription>
                              最新的OCR处理结果
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium text-gray-700">文件名：</span>
                                  <span className="text-gray-900">{currentOcrResult.file?.original_name || '未知'}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">电话：</span>
                                  <span className="text-gray-900">{currentOcrResult.phone || '未识别'}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">日期：</span>
                                  <span className="text-gray-900">{currentOcrResult.date || '未识别'}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">检测点位：</span>
                                  <span className="text-gray-900">{Object.keys(currentOcrResult.points_data || {}).length}个</span>
                                </div>
                              </div>
                              {currentOcrResult.temperature && (
                                <div>
                                  <span className="font-medium text-gray-700">环境条件：</span>
                                  <span className="text-gray-900">
                                    {currentOcrResult.temperature}°C, {currentOcrResult.humidity}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* 右侧：报告生成 */}
                    <div>
                      <ReportGenerator
                        ocrResult={currentOcrResult}
                        onSuccess={(report) => {
                          showNotification('success', '报告创建成功！');
                          setCurrentReport(report);
                          console.log('报告结果:', report);
                        }}
                        onError={(error) => {
                          showNotification('error', error);
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* 批量处理页面 */}
                <TabsContent value="batch">
                  <BatchProcessingPage
                    onSuccess={(message) => {
                      showNotification('success', message);
                    }}
                    onError={(error) => {
                      showNotification('error', error);
                    }}
                  />
                </TabsContent>

                {/* 月度报表页面 */}
                <TabsContent value="monthly">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        月度报表
                      </CardTitle>
                      <CardDescription>
                        生成和查看月度检测数据报表
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* 子标签页 */}
                      <Tabs defaultValue="database" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="database">数据库报表</TabsTrigger>
                          <TabsTrigger value="csv">CSV报表</TabsTrigger>
                        </TabsList>

                        {/* 数据库报表子页面 */}
                        <TabsContent value="database" className="mt-6">
                          <MonthlyReportDB
                            onSuccess={(result) => {
                              showNotification('success', '基于数据库的月度报表生成成功！');
                              console.log('月度报表结果:', result);
                            }}
                            onError={(error) => {
                              showNotification('error', error);
                            }}
                          />
                        </TabsContent>

                        {/* CSV报表子页面 */}
                        <TabsContent value="csv" className="mt-6">
                          <MonthlyReport
                            onSuccess={(result) => {
                              showNotification('success', '月度报表生成成功！');
                              console.log('月度报表结果:', result);
                            }}
                            onError={(error) => {
                              showNotification('error', error);
                            }}
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 订单信息记录页面 */}
                <TabsContent value="orders">
                  <OrderManagementPage
                    onSuccess={(message) => {
                      showNotification('success', message);
                    }}
                    onError={(error) => {
                      showNotification('error', error);
                    }}
                  />
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
