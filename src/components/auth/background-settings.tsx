/**
 * 用户背景图设置组件
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Trash2, ImageIcon, Sliders, AlertCircle, CheckCircle, HardDrive, Clock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { backgroundStorage } from '@/lib/background-storage';
import { useBackground } from '@/contexts/background-context';

interface BackgroundSettings {
  background_image: string | null;
  background_opacity: number;
}

export function BackgroundSettings() {
  const { cacheInfo, clearCache } = useBackground();
  const [settings, setSettings] = useState<BackgroundSettings>({
    background_image: null,
    background_opacity: 0.1
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载用户背景图设置
  const loadSettings = async () => {
    try {
      const response = await authApi.backgroundImage.get();
      setSettings(response.data);
    } catch (error) {
      console.error('加载背景图设置失败:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 显示消息提示
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    // 检查文件类型
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      showMessage('error', '只支持 JPEG 和 PNG 格式的图片');
      return;
    }

    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', '图片大小不能超过 5MB');
      return;
    }

    setIsLoading(true);

    try {
      // 将文件转换为 base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        
        try {
          const response = await authApi.backgroundImage.upload({
            background_image: base64String,
            background_opacity: settings.background_opacity
          });

          setSettings({
            background_image: response.data.background_image,
            background_opacity: response.data.background_opacity
          });

          // 保存到localStorage，用户上传的图片需要压缩
          await backgroundStorage.saveBackgroundData({
            background_image: response.data.background_image,
            background_opacity: response.data.background_opacity
          });

          // 发送事件通知全局背景组件更新
          window.dispatchEvent(new CustomEvent('backgroundSettingsUpdate'));

          showMessage('success', '背景图上传成功');
        } catch (error: unknown) {
          let errorMessage = '上传失败';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response: { data: { background_image?: string[]; error?: string } } };
            errorMessage = axiosError.response?.data?.background_image?.[0] ||
                          axiosError.response?.data?.error ||
                          '上传失败';
          }
          showMessage('error', errorMessage);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showMessage('error', '文件读取失败');
      setIsLoading(false);
    }
  };

  // 处理透明度变化
  const handleOpacityChange = async (opacity: number) => {
    if (!settings.background_image) return;

    try {
      const response = await authApi.backgroundImage.updateOpacity(opacity);
      setSettings(prev => ({
        ...prev,
        background_opacity: response.data.background_opacity
      }));

      // 更新localStorage，透明度更新不需要压缩
      await backgroundStorage.saveBackgroundData({
        background_image: settings.background_image,
        background_opacity: response.data.background_opacity
      }, { skipCompression: true });

      // 发送事件通知全局背景组件更新
      window.dispatchEvent(new CustomEvent('backgroundSettingsUpdate'));
    } catch (error: unknown) {
      let errorMessage = '透明度更新失败';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { data: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || '透明度更新失败';
      }
      showMessage('error', errorMessage);
    }
  };

  // 删除背景图
  const handleDelete = async () => {
    if (!settings.background_image) return;
    
    setIsLoading(true);
    try {
      await authApi.backgroundImage.delete();
      setSettings({
        background_image: null,
        background_opacity: 0.1
      });

      // 清理localStorage缓存
      backgroundStorage.clearCache();

      // 发送事件通知全局背景组件更新
      window.dispatchEvent(new CustomEvent('backgroundSettingsUpdate'));

      showMessage('success', '背景图删除成功');
    } catch (error: unknown) {
      let errorMessage = '删除失败';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { data: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || '删除失败';
      }
      showMessage('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 文件拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // 文件选择处理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <Card
      className="border border-white/50 bg-white/20"
    >
      <CardHeader className="border-b border-white/50">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <ImageIcon className="h-5 w-5" />
          背景图设置
        </CardTitle>
        <CardDescription className="text-gray-800">
          设置个性化背景图片，支持 JPEG、PNG 格式，最大 5MB
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* 消息提示 */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-white/50' : 'border-white/50'}>
            {message.type === 'error' ?
              <AlertCircle className="h-4 w-4 text-red-600" /> :
              <CheckCircle className="h-4 w-4 text-green-600" />
            }
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 缓存信息 */}
        {cacheInfo.hasCache && (
          <div className="bg-white/10 border border-white/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                <HardDrive className="h-4 w-4" />
                本地缓存信息
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCache}
                className="text-xs"
              >
                清理缓存
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>缓存时间: {cacheInfo.cacheAge}</span>
              </div>
              <div>
                <span>数据大小: {cacheInfo.dataSize}</span>
              </div>
              {cacheInfo.compressed && (
                <>
                  <div>
                    <span>已压缩: 是</span>
                  </div>
                  {cacheInfo.compressionRatio && (
                    <div>
                      <span>压缩率: {cacheInfo.compressionRatio}</span>
                    </div>
                  )}
                </>
              )}
              <div className="col-span-2">
                <span className={cacheInfo.isExpired ? 'text-orange-600' : 'text-green-600'}>
                  状态: {cacheInfo.isExpired ? '已过期' : '有效'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 当前背景图预览 */}
        {settings.background_image && (
          <div className="space-y-2">
            <Label className="text-gray-900 drop-shadow-sm">当前背景图</Label>
            <div className="relative w-full h-32 border rounded-lg overflow-hidden border-white/30">
              <Image
                src={settings.background_image}
                alt="背景图预览"
                fill
                className="object-cover"
                style={{ opacity: settings.background_opacity }}
              />
              <div className="absolute inset-0 bg-gray-900" style={{ opacity: 1 - settings.background_opacity }} />
            </div>
          </div>
        )}

        {/* 透明度调节 */}
        {settings.background_image && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-900">
              <Sliders className="h-4 w-4" />
              透明度: {Math.round(settings.background_opacity * 100)}%
            </Label>
            <Input
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.background_opacity * 100)}
              onChange={(e) => {
                const opacity = parseInt(e.target.value) / 100;
                setSettings(prev => ({ ...prev, background_opacity: opacity }));
                handleOpacityChange(opacity);
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>完全透明</span>
              <span>完全不透明</span>
            </div>
          </div>
        )}

        {/* 文件上传区域 */}
        <div className="space-y-2">
          <Label className="text-gray-900 drop-shadow-sm">上传背景图</Label>
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-blue-400' : 'border-white/50 hover:border-white/70'}
              ${isLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isLoading ? '上传中...' : '点击选择或拖拽图片到此处'}
            </p>
            <p className="text-xs text-gray-500">
              支持 JPEG、PNG 格式，最大 5MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            选择图片
          </Button>

          {settings.background_image && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 