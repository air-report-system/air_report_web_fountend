"use client";

import React, { useState } from 'react';
import { useAiConfig, AiConfig } from '@/contexts/ai-config-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AiConfigList } from './ai-config-list';
import { AiConfigForm } from './ai-config-form';
import { AiConfigStatus } from './ai-config-status';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const AiConfigManager = () => {
    const { loading, error } = useAiConfig();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<AiConfig | null>(null);

    const handleAddNew = () => {
        setEditingConfig(null);
        setIsFormOpen(true);
    };

    const handleEdit = (config: AiConfig) => {
        setEditingConfig(config);
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingConfig(null);
    };

    if (loading) {
        return <div>加载 AI 配置...</div>;
    }

    if (error) {
        return <div className="text-red-500">加载 AI 配置失败: {error.message}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI 服务配置管理</CardTitle>
                <CardDescription>在这里管理、测试和切换不同的 AI 服务提供商。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <AiConfigStatus />
                
                <div className="flex justify-end">
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNew}>添加新配置</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingConfig ? '编辑 AI 配置' : '添加新 AI 配置'}</DialogTitle>
                            </DialogHeader>
                            <AiConfigForm
                                configToEdit={editingConfig}
                                onFinished={handleFormClose}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <AiConfigList onEdit={handleEdit} />
            </CardContent>
        </Card>
    );
};