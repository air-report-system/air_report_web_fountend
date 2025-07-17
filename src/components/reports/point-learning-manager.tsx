/**
 * 点位学习管理组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Plus, 
  Trash2, 
  TrendingUp, 
  History, 
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { pointLearningApi, checkTypeInferenceApi } from '@/lib/api';
import { formatError, formatToThreeDecimals } from '@/lib/utils';

interface PointLearningManagerProps {
  pointsData: Record<string, number>;
  onPointsDataChange: (pointsData: Record<string, number>) => void;
  onCheckTypeInferred?: (checkType: 'initial' | 'recheck', confidence: number) => void;
  disabled?: boolean;
}

interface PointSuggestion {
  point_name: string;
  usage_count: number;
  avg_value: number;
  confidence: number;
  source: 'learned' | 'default';
}

interface CheckTypeInference {
  inferred_type: 'initial' | 'recheck';
  confidence: number;
  statistics: {
    high_count: number;
    low_count: number;
    threshold: number;
    total_points: number;
  };
}

export function PointLearningManager({
  pointsData,
  onPointsDataChange,
  onCheckTypeInferred,
  disabled = false
}: PointLearningManagerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<CheckTypeInference | null>(null);
  
  const queryClient = useQueryClient();

  // 获取点位建议
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['point-suggestions', Object.keys(pointsData)],
    queryFn: () => pointLearningApi.getSuggestions({
      existing_points: Object.keys(pointsData),
      limit: 10
    }),
    enabled: showSuggestions,
  });

  // 获取热门点位
  const { data: popularPoints } = useQuery({
    queryKey: ['popular-points'],
    queryFn: () => pointLearningApi.getPopular(20),
  });

  // 检测类型推断
  const inferCheckTypeMutation = useMutation({
    mutationFn: (data: { points_data: Record<string, number>; threshold?: number }) =>
      checkTypeInferenceApi.infer(data),
    onSuccess: (data) => {
      setInferenceResult(data.data);
      onCheckTypeInferred?.(data.data.inferred_type, data.data.confidence);
    },
    onError: (error) => {
      console.error('检测类型推断失败:', formatError(error));
    },
  });

  // 更新点位学习数据
  const updateLearningMutation = useMutation({
    mutationFn: (data: { points_data: Record<string, number>; check_type?: 'initial' | 'recheck' }) =>
      pointLearningApi.updateLearning(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['point-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['popular-points'] });
    },
  });

  // 自动推断检测类型
  useEffect(() => {
    if (Object.keys(pointsData).length > 0) {
      inferCheckTypeMutation.mutate({ points_data: pointsData });
    }
  }, [pointsData]);

  const handlePointChange = (pointName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPointsData = { ...pointsData, [pointName]: numValue };
    onPointsDataChange(newPointsData);
  };

  const addNewPoint = (pointName?: string) => {
    const newPointName = pointName || `检测点${Object.keys(pointsData).length + 1}`;
    const newPointsData = { ...pointsData, [newPointName]: 0 };
    onPointsDataChange(newPointsData);
  };

  const removePoint = (pointName: string) => {
    const newPointsData = { ...pointsData };
    delete newPointsData[pointName];
    onPointsDataChange(newPointsData);
  };

  const applySuggestion = (suggestion: PointSuggestion) => {
    addNewPoint(suggestion.point_name);
    setShowSuggestions(false);
  };

  const updateLearningData = () => {
    if (Object.keys(pointsData).length > 0) {
      updateLearningMutation.mutate({
        points_data: pointsData,
        check_type: inferenceResult?.inferred_type || 'initial'
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              智能点位管理
            </CardTitle>
            <CardDescription>
              基于历史数据的智能点位建议和检测类型推断
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              disabled={disabled}
            >
              <Lightbulb className="mr-1 h-4 w-4" />
              建议
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatistics(!showStatistics)}
            >
              <BarChart3 className="mr-1 h-4 w-4" />
              统计
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 检测类型推断结果 */}
        {inferenceResult && (
          <div className={`p-4 rounded-lg border ${
            inferenceResult.inferred_type === 'initial' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">
                智能推断: {inferenceResult.inferred_type === 'initial' ? '初检' : '复检'}
              </span>
              <Badge variant="secondary">
                置信度: {(inferenceResult.confidence * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                高值点位({inferenceResult.statistics.threshold}以上): {inferenceResult.statistics.high_count}个 | 
                低值点位: {inferenceResult.statistics.low_count}个
              </p>
            </div>
          </div>
        )}

        {/* 点位数据编辑 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">检测点位数据</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNewPoint()}
                disabled={disabled}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加点位
              </Button>
              {Object.keys(pointsData).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateLearningData}
                  loading={updateLearningMutation.isPending}
                  disabled={disabled}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  更新学习
                </Button>
              )}
            </div>
          </div>

          {Object.keys(pointsData).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(pointsData).map(([pointName, value]) => (
                <div key={pointName} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {pointName}
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={value}
                      onChange={(e) => handlePointChange(pointName, e.target.value)}
                      className="h-8"
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePoint(pointName)}
                    className="text-red-500 hover:text-red-700 p-1"
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">暂无检测点位数据</p>
              <Button
                variant="outline"
                onClick={() => addNewPoint()}
                disabled={disabled}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加第一个点位
              </Button>
            </div>
          )}
        </div>

        {/* 点位建议 */}
        {showSuggestions && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              智能建议点位
            </h4>
            {suggestionsLoading ? (
              <div className="text-center py-4">加载建议中...</div>
            ) : suggestions?.data?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions?.data?.map((suggestion: PointSuggestion) => (
                  <div
                    key={suggestion.point_name}
                    className="p-3 border rounded-lg hover:bg-white/10 cursor-pointer border-white/30"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{suggestion.point_name}</span>
                      <div className="flex gap-1">
                        <Badge variant={suggestion.source === 'learned' ? 'default' : 'secondary'}>
                          {suggestion.source === 'learned' ? '学习' : '默认'}
                        </Badge>
                        {suggestion.usage_count > 0 && (
                          <Badge variant="outline">
                            {suggestion.usage_count}次
                          </Badge>
                        )}
                      </div>
                    </div>
                    {suggestion.avg_value > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        平均值: {formatToThreeDecimals(suggestion.avg_value)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                暂无建议点位
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
