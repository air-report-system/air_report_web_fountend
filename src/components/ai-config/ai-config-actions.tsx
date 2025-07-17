"use client";

import React, { useState } from 'react';
import { useAiConfig, AiConfig, TestResult } from '@/contexts/ai-config-context';
import { Button } from '@/components/ui/button';
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
    const { testConfig, deleteConfig, activateConfig, deactivateConfig, setDefaultConfig } = useAiConfig();
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const result = await testConfig(config.id);
        if(result) {
            setTestResult(result);
        }
        setIsTesting(false);
    };

    const handleDelete = () => {
        deleteConfig(config.id);
    };

    const handleToggleActive = () => {
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

            <Button variant="outline" size="sm" onClick={handleToggleActive}>
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

            {testResult && (
                <div className="text-sm ml-4 p-2 rounded-md border border-white/50">
                   测试结果: {testResult.success ? <span className="text-green-600">成功</span> : <span className="text-red-600">失败</span>}
                   {testResult.message && ` - ${testResult.message}`}
                </div>
            )}
        </div>
    );
};