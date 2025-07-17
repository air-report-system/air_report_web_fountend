"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller, FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAiConfig, AiConfig } from '@/contexts/ai-config-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";

const configSchema = z.object({
    name: z.string().min(1, '名称不能为空'),
    description: z.string().optional(),
    provider: z.string().min(1, '提供商不能为空'),
    api_format: z.string().min(1, 'API 格式不能为空'),
    api_base_url: z.string().url('请输入有效的 URL'),
    api_key: z.string().min(10, 'API密钥长度不能少于10个字符'),
    model_name: z.string().min(1, '模型名称不能为空'),
    timeout_seconds: z.string().refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 5 && num <= 300;
    }, {
        message: '超时时间必须在5到300秒之间',
    }),
    max_retries: z.string().refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 0 && num <= 10;
    }, {
        message: '最大重试次数必须在0到10之间',
    }),
    is_active: z.boolean(),
    priority: z.string().refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= 1000;
    }, {
        message: '优先级必须在1到1000之间',
    }),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface AiConfigFormProps {
    configToEdit?: AiConfig | null;
    onFinished: () => void;
}

export const AiConfigForm = ({ configToEdit, onFinished }: AiConfigFormProps) => {
    const { addConfig, updateConfig } = useAiConfig();
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ConfigFormData>({
        resolver: zodResolver(configSchema),
        defaultValues: {
            is_active: true,
            priority: '10',
            timeout_seconds: '60',
            max_retries: '3',
            api_format: 'openai',
            name: '',
            description: '',
            provider: '',
            api_base_url: '',
            api_key: '',
            model_name: '',
        }
    });

    useEffect(() => {
        if (configToEdit) {
            reset({
                ...configToEdit,
                timeout_seconds: String(configToEdit.timeout_seconds),
                max_retries: String(configToEdit.max_retries),
                priority: String(configToEdit.priority),
            });
        } else {
            reset({
                name: '',
                description: '',
                provider: '',
                api_format: 'openai',
                api_base_url: '',
                api_key: '',
                model_name: '',
                is_active: true,
                priority: '10',
                timeout_seconds: '60',
                max_retries: '3',
            });
        }
    }, [configToEdit, reset]);

    const onSubmit = async (data: ConfigFormData) => {
        setServerErrors({});
        try {
            const processedData = {
                ...data,
                timeout_seconds: parseInt(data.timeout_seconds, 10),
                max_retries: parseInt(data.max_retries, 10),
                priority: parseInt(data.priority, 10),
            };

            const response = configToEdit
                ? await updateConfig(configToEdit.id, processedData)
                : await addConfig(processedData);
            
            // 后端验证成功
            if (response) {
                onFinished();
            }

        } catch (error: any) {
            if (error.response && error.response.data) {
                const backendErrors = error.response.data;
                 if (typeof backendErrors === 'object' && backendErrors !== null) {
                    setServerErrors(backendErrors);
                } else {
                    // 通用错误
                    setServerErrors({ non_field_errors: [error.message || '保存失败'] });
                }
            } else {
                console.error("保存配置失败:", error);
                setServerErrors({ non_field_errors: ['发生未知错误，请检查网络或联系管理员。'] });
            }
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverErrors.non_field_errors && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">错误: </strong>
                    <span className="block sm:inline">{serverErrors.non_field_errors.join(', ')}</span>
                </div>
            )}
            <div>
                <Label htmlFor="name">名称</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                {serverErrors.name && <p className="text-red-500 text-sm">{serverErrors.name[0]}</p>}
            </div>

            <div>
                <Label htmlFor="description">描述</Label>
                <Textarea id="description" {...register('description')} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label>提供商</Label>
                    <Controller
                       name="provider"
                       control={control}
                       render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                               <SelectTrigger>
                                   <SelectValue placeholder="选择提供商" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="gemini">Google Gemini</SelectItem>
                                   <SelectItem value="openai">OpenAI</SelectItem>
                                   <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                                   <SelectItem value="custom">自定义服务</SelectItem>
                               </SelectContent>
                           </Select>
                       )}
                   />
                   {errors.provider && <p className="text-red-500 text-sm">{errors.provider.message}</p>}
                   {serverErrors.provider && <p className="text-red-500 text-sm">{serverErrors.provider[0]}</p>}
                </div>
                 <div>
                    <Label>API 格式</Label>
                     <Controller
                        name="api_format"
                        control={control}
                        render={({ field }) => (
                             <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择格式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="gemini">Gemini</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="api_base_url">API Base URL</Label>
                <Input id="api_base_url" {...register('api_base_url')} />
                {errors.api_base_url && <p className="text-red-500 text-sm">{errors.api_base_url.message}</p>}
                {serverErrors.api_base_url && <p className="text-red-500 text-sm">{serverErrors.api_base_url[0]}</p>}
            </div>
            
            <div>
                <Label htmlFor="api_key">API Key (可选，不填则使用服务器环境变量)</Label>
                <Input id="api_key" type="password" {...register('api_key')} />
            </div>

            <div>
                <Label htmlFor="model_name">模型名称</Label>
                <Input id="model_name" {...register('model_name')} />
                {errors.model_name && <p className="text-red-500 text-sm">{errors.model_name.message}</p>}
                {serverErrors.model_name && <p className="text-red-500 text-sm">{serverErrors.model_name[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="timeout_seconds">超时 (秒)</Label>
                    <Input id="timeout_seconds" type="number" {...register('timeout_seconds')} />
                     {errors.timeout_seconds && <p className="text-red-500 text-sm">{errors.timeout_seconds.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="max_retries">最大重试次数</Label>
                    <Input id="max_retries" type="number" {...register('max_retries')} />
                     {errors.max_retries && <p className="text-red-500 text-sm">{errors.max_retries.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="priority">优先级 (数字越小越高)</Label>
                    <Input id="priority" type="number" {...register('priority')} />
                    {errors.priority && <p className="text-red-500 text-sm">{errors.priority.message}</p>}
                </div>
                <div className="flex items-center space-x-2 pt-6">
                     <Controller
                        name="is_active"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="is_active"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <Label htmlFor="is_active">是否激活</Label>
                </div>
            </div>

            <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={onFinished}>取消</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '保存中...' : '保存'}
                </Button>
            </div>
        </form>
    );
};