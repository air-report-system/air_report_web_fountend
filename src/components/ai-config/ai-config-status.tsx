"use client";

import React from 'react';
import { useAiConfig } from '@/contexts/ai-config-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AiConfigStatus = () => {
    const { status, loading } = useAiConfig();

    if (loading) {
        return <div>加载状态...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>系统状态</CardTitle>
            </CardHeader>
            <CardContent>
                {status ? (
                    <div className="flex items-center space-x-4">
                        <span className="font-medium">当前服务:</span>
                        {status.current_service ? (
                            <Badge variant="default">{status.current_service.name}</Badge>
                        ) : (
                            <Badge variant="secondary">无</Badge>
                        )}
                        <span className="font-medium">激活的服务数:</span>
                        <Badge variant="outline">{status.active_services} / {status.total_services}</Badge>
                    </div>
                ) : (
                    <div>无法获取系统状态。</div>
                )}
            </CardContent>
        </Card>
    );
};