/**
 * 点位学习功能测试组件
 */
'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Play, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  RotateCcw
} from 'lucide-react';
import { 
  pointLearningApi, 
  checkTypeInferenceApi, 
  dataSyncApi 
} from '@/lib/api';
import { formatError } from '@/lib/utils';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function PointLearningTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testPointsData, setTestPointsData] = useState({
    "客厅": 0.095,
    "主卧": 0.088,
    "次卧": 0.072,
    "厨房": 0.065
  });

  // 获取同步状态
  const { data: syncStatus, refetch: refetchSyncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => dataSyncApi.getStatus(),
  });

  // 检测类型推断测试
  const inferCheckTypeMutation = useMutation({
    mutationFn: (data: { points_data: Record<string, number> }) =>
      checkTypeInferenceApi.infer(data),
  });

  // 点位学习更新测试
  const updateLearningMutation = useMutation({
    mutationFn: (data: { points_data: Record<string, number>; check_type?: 'initial' | 'recheck' }) =>
      pointLearningApi.updateLearning(data),
  });

  // 获取建议测试
  const getSuggestionsMutation = useMutation({
    mutationFn: (data: { existing_points?: string[]; limit?: number }) =>
      pointLearningApi.getSuggestions(data),
  });

  // 数据同步测试
  const syncDataMutation = useMutation({
    mutationFn: () => dataSyncApi.syncFromGui(),
  });

  const updateTestResult = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        return [...prev];
      } else {
        return [...prev, { name, status, message, data }];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    updateTestResult(testName, 'running');
    try {
      await testFn();
      updateTestResult(testName, 'success', '测试通过');
    } catch (error) {
      updateTestResult(testName, 'error', formatError(error));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      {
        name: '检测类型推断',
        fn: async () => {
          const result = await inferCheckTypeMutation.mutateAsync({
            points_data: testPointsData
          });
          updateTestResult('检测类型推断', 'success', 
            `推断结果: ${result.data.inferred_type}, 置信度: ${(result.data.confidence * 100).toFixed(1)}%`,
            result.data
          );
        }
      },
      {
        name: '点位学习更新',
        fn: async () => {
          const result = await updateLearningMutation.mutateAsync({
            points_data: testPointsData,
            check_type: 'initial'
          });
          updateTestResult('点位学习更新', 'success',
            `更新了 ${result.data.updated_count + result.data.created_count} 个点位`,
            result.data
          );
        }
      },
      {
        name: '获取点位建议',
        fn: async () => {
          const result = await getSuggestionsMutation.mutateAsync({
            existing_points: Object.keys(testPointsData),
            limit: 5
          });
          updateTestResult('获取点位建议', 'success',
            `获得 ${result.data.length} 个建议点位`,
            result.data
          );
        }
      },
      {
        name: '数据同步测试',
        fn: async () => {
          const result = await syncDataMutation.mutateAsync();
          updateTestResult('数据同步测试', 'success',
            `同步了 ${result.data.total_synced} 个点位`,
            result.data
          );
        }
      }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive'
    } as const;

    const labels = {
      pending: '待运行',
      running: '运行中',
      success: '成功',
      error: '失败'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            点位学习功能测试
          </CardTitle>
          <CardDescription>
            测试点位学习、智能判断和数据同步功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 测试数据配置 */}
          <div className="space-y-4">
            <h4 className="font-medium">测试数据配置</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(testPointsData).map(([pointName, value]) => (
                <div key={pointName}>
                  <label className="block text-sm font-medium mb-1">
                    {pointName}
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    value={value}
                    onChange={(e) => setTestPointsData(prev => ({
                      ...prev,
                      [pointName]: parseFloat(e.target.value) || 0
                    }))}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex gap-3">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              loading={isRunning}
            >
              <Play className="mr-2 h-4 w-4" />
              运行所有测试
            </Button>
            <Button
              variant="outline"
              onClick={() => setTestResults([])}
              disabled={isRunning}
            >
              清空结果
            </Button>
            <Button
              variant="outline"
              onClick={() => refetchSyncStatus()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              刷新状态
            </Button>
          </div>

          {/* 测试结果 */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">测试结果</h4>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="p-4 border ui-surface-subtle ui-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.message && (
                      <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                    )}
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500">
                          查看详细数据
                        </summary>
                        <pre className="mt-2 p-2 border ui-surface-subtle ui-border rounded overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 同步状态 */}
          {syncStatus && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                数据同步状态
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">数据库点位:</span>
                  <span className="ml-2 font-medium">{syncStatus.data.database_points}</span>
                </div>
                <div>
                  <span className="text-gray-500">数据库记录:</span>
                  <span className="ml-2 font-medium">{syncStatus.data.database_values}</span>
                </div>
                <div>
                  <span className="text-gray-500">JSON文件:</span>
                  <span className="ml-2">
                    {syncStatus.data.json_file_exists ? (
                      <Badge variant="default">存在</Badge>
                    ) : (
                      <Badge variant="secondary">不存在</Badge>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">TXT文件:</span>
                  <span className="ml-2">
                    {syncStatus.data.txt_file_exists ? (
                      <Badge variant="default">存在</Badge>
                    ) : (
                      <Badge variant="secondary">不存在</Badge>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
