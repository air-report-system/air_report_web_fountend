'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { FileText, Upload, BarChart3, Settings, ShoppingCart, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { OCRResult } from '@/lib/api';
import { VersionDisplayInline } from '@/components/ui/version-display';
import { GlobalBackground } from '@/components/ui/global-background';

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
  const [currentOcrResult, setCurrentOcrResult] = useState<OCRResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
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
      <div className="min-h-screen relative">
        {/* 全局背景图 */}
        <GlobalBackground />

        {/* 顶部导航 */}
        <header
          className="border-b ui-border ui-surface relative z-10"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Image
                  src="/logo.svg"
                  alt="空气检测系统Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
                <h1 className="ml-3 text-xl font-semibold text-foreground">
                  室内空气检测数据处理系统
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <VersionDisplayInline />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* 通知栏 */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg border ${notification.type === 'success' ? 'text-green-400 border-border bg-muted/40' :
              'text-red-400 border-border bg-muted/40'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* 主要内容 - 侧边栏布局 */}
        <div className="flex relative">
          {/* 侧边导航栏 */}
          <nav
            className={`${isNavCollapsed ? 'w-16' : 'w-64'} border-r ui-border ui-surface min-h-[calc(100vh-4rem)] transition-all duration-300 relative z-10`}
          >
            {/* 折叠按钮 */}
            <div className="p-4 border-b border-border">
              <button
                onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                className="w-full flex items-center justify-center p-2 rounded-md hover:bg-muted/20 transition-colors"
                title={isNavCollapsed ? '展开菜单' : '折叠菜单'}
              >
                {isNavCollapsed ? (
                  <ChevronsRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronsLeft className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* 导航菜单 */}
            <div className="p-4">
              <button
                onClick={() => setActiveTab('ocr')}
                className={`w-full flex items-center ${isNavCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'ocr'
                  ? 'text-foreground border border-border bg-muted/30'
                  : 'text-muted-foreground hover:bg-muted/20'
                  }`}
                title="OCR图片处理"
              >
                <Upload className="h-5 w-5" />
                {!isNavCollapsed && <span className="ml-3">OCR图片处理</span>}
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center ${isNavCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 mt-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports'
                  ? 'text-foreground border border-border bg-muted/30'
                  : 'text-muted-foreground hover:bg-muted/20'
                  }`}
                title="报告生成"
              >
                <FileText className="h-5 w-5" />
                {!isNavCollapsed && <span className="ml-3">报告生成</span>}
              </button>

              <button
                onClick={() => setActiveTab('monthly')}
                className={`w-full flex items-center ${isNavCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 mt-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'monthly'
                  ? 'text-foreground border border-border bg-muted/30'
                  : 'text-muted-foreground hover:bg-muted/20'
                  }`}
                title="月度报表"
              >
                <BarChart3 className="h-5 w-5" />
                {!isNavCollapsed && <span className="ml-3">月度报表</span>}
              </button>

              <button
                onClick={() => setActiveTab('batch')}
                className={`w-full flex items-center ${isNavCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 mt-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'batch'
                  ? 'text-foreground border border-border bg-muted/30'
                  : 'text-muted-foreground hover:bg-muted/20'
                  }`}
                title="批量处理"
              >
                <Settings className="h-5 w-5" />
                {!isNavCollapsed && <span className="ml-3">批量处理</span>}
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center ${isNavCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 mt-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'orders'
                  ? 'text-foreground border border-border bg-muted/30'
                  : 'text-muted-foreground hover:bg-muted/20'
                  }`}
                title="订单管理"
              >
                <ShoppingCart className="h-5 w-5" />
                {!isNavCollapsed && <span className="ml-3">订单管理</span>}
              </button>
            </div>
          </nav>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-w-0 relative z-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

              {/* OCR图片处理 */}
              <TabsContent value="ocr" className="mt-0 p-6">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Upload className="h-5 w-5" />
                      OCR图片处理
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      上传检测报告图片，自动识别并提取数据结构化信息
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <OCRUpload
                      onSuccess={() => showNotification('success', 'OCR处理完成')}
                      onError={(error) => showNotification('error', error)}
                      onOCRComplete={setCurrentOcrResult}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 报告生成 */}
              <TabsContent value="reports" className="mt-0 p-6">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <FileText className="h-5 w-5" />
                      报告生成
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      基于OCR识别结果，生成标准格式的检测报告
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ReportGenerator
                      onSuccess={() => showNotification('success', '报告生成成功')}
                      onError={(error) => showNotification('error', error)}
                      ocrResult={currentOcrResult || undefined}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 月度报表 */}
              <TabsContent value="monthly" className="mt-0 p-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="border-b border-border">
                      <CardTitle className="flex items中心 gap-2 text-foreground">
                        <BarChart3 className="h-5 w-5" />
                        月度报表生成
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        上传CSV数据文件，生成标准格式的月度统计报表
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <MonthlyReport
                        onSuccess={() => showNotification('success', '月度报表生成成功')}
                        onError={(error) => showNotification('error', error)}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-border">
                      <CardTitle className="text-foreground">数据库月度报表</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        基于系统数据库中的OCR记录生成月度报表
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <MonthlyReportDB
                        onSuccess={() => showNotification('success', '数据库月度报表生成成功')}
                        onError={(error) => showNotification('error', error)}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 批量处理 */}
              <TabsContent value="batch" className="mt-0 p-6">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Settings className="h-5 w-5" />
                      批量处理
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      批量上传图片进行OCR识别和报告生成，支持并行处理
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <BatchProcessingPage
                      onSuccess={(message) => showNotification('success', message)}
                      onError={(error) => showNotification('error', error)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 订单管理 */}
              <TabsContent value="orders" className="mt-0 p-6">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <ShoppingCart className="h-5 w-5" />
                      订单管理
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      处理和管理检测订单，支持批量操作和数据导出
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <OrderManagementPage
                      onSuccess={(message) => showNotification('success', message)}
                      onError={(error) => showNotification('error', error)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
