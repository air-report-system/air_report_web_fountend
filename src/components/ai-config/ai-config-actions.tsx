"use client";

import React, { useState } from 'react';
import { useAiConfig, AiConfig, TestResult } from '@/contexts/ai-config-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AiConfigActionsProps {
    config: AiConfig;
    onEdit: (config: AiConfig) => void;
}

export const AiConfigActions = ({ config, onEdit }: AiConfigActionsProps) => {
    const { testConfig, deleteConfig, activateConfig, deactivateConfig, setDefaultConfig, fetchConfigs, pagination } = useAiConfig();
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const result = await testConfig(config.id);
        if(result) {
            setTestResult(result);
            setIsTestDialogOpen(true);
        }
        setIsTesting(false);
    };

    const handleDelete = () => {
        deleteConfig(config.id);
    };

    const handleToggleActive = () => {
        // 后端约束：默认配置不能停用
        if (config.is_default && config.is_active) return;
        if (config.is_active) {
            deactivateConfig(config.id);
        } else {
            activateConfig(config.id);
        }
    };
    
    const handleSetDefault = () => {
        setDefaultConfig(config.id);
    }

    return (
        <div className="space-x-2 flex items-center">
            <Button variant="outline" size="sm" onClick={() => onEdit(config)}>编辑</Button>
            
            <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                {isTesting ? '测试中...' : '测试'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={config.is_default && config.is_active}
              title={config.is_default && config.is_active ? '默认配置不能停用' : undefined}
            >
              {config.is_active ? '停用' : '激活'}
            </Button>
            
            {!config.is_default && (
                 <Button variant="outline" size="sm" onClick={handleSetDefault}>
                    设为默认
                </Button>
            )}

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">删除</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除?</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将永久删除 AI 配置 “{config.name}”。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
              open={isTestDialogOpen}
              onOpenChange={(open) => {
                setIsTestDialogOpen(open);
                // 关闭弹窗后再刷新列表，避免打开弹窗时组件被 loading 刷新卸载
                if (!open) {
                  fetchConfigs(pagination.page);
                }
              }}
            >
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>AI 配置测试：{config.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  {!testResult ? (
                    <div>暂无测试结果。</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">结果：</div>
                        {testResult.success ? (
                          <div className="text-green-600">成功</div>
                        ) : (
                          <div className="text-red-600">失败</div>
                        )}
                        <div className="text-muted-foreground">（HTTP {testResult.http_status}）</div>
                      </div>

                      {typeof testResult.response_time_ms === 'number' && (
                        <div>
                          <span className="font-medium">耗时：</span>
                          {testResult.response_time_ms} ms
                        </div>
                      )}

                      {testResult.success ? (
                        <div>
                          <div className="font-medium mb-1">响应内容（截断）：</div>
                          <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3">
                            {testResult.sample_output || '(空)'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium mb-1">错误信息：</div>
                          <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-red-700">
                            {testResult.error_message || testResult.message || '未知错误'}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
        </div>
    );
};