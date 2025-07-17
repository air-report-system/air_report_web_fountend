"use client";

import React from 'react';
import { useAiConfig, AiConfig } from '@/contexts/ai-config-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiConfigActions } from './ai-config-actions';

interface AiConfigListProps {
    onEdit: (config: AiConfig) => void;
}

export const AiConfigList = ({ onEdit }: AiConfigListProps) => {
    const { configs, loading, pagination, fetchConfigs } = useAiConfig();

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchConfigs(newPage);
        }
    };

    const PaginationControls = () => (
        <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
                总计 {pagination.totalConfigs} 条配置
            </span>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                >
                    上一页
                </Button>
                <span>
                    第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                >
                    下一页
                </Button>
            </div>
        </div>
    );

    if (loading) {
        return <div>加载配置列表...</div>;
    }

    if (!configs || configs.length === 0) {
        return <p>没有找到 AI 配置。</p>;
    }

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>提供商</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>默认</TableHead>
                        <TableHead>成功率</TableHead>
                        <TableHead>操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {configs.map((config) => (
                        <TableRow key={config.id}>
                            <TableCell className="font-medium">{config.name}</TableCell>
                            <TableCell>{config.provider}</TableCell>
                            <TableCell>
                                <Badge variant={config.is_active ? 'default' : 'secondary'}>
                                    {config.is_active ? '激活' : '停用'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {config.is_default && <Badge variant="outline">是</Badge>}
                            </TableCell>
                            <TableCell>{config.success_rate.toFixed(2)}%</TableCell>
                            <TableCell>
                                <AiConfigActions config={config} onEdit={onEdit} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {pagination.totalPages > 1 && <PaginationControls />}
        </div>
    );
};