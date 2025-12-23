/**
 * 批量处理图片预览组件
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Maximize2,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { BatchFileItem } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface BatchImagePreviewProps {
  fileItem: BatchFileItem;
  currentIndex: number;
  totalCount: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function BatchImagePreview({
  fileItem,
  currentIndex,
  totalCount,
  onNext,
  onPrevious
}: BatchImagePreviewProps) {
  const [zoom, setZoom] = useState(0.7); // 默认缩放调整为70%
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFullscreen, setShowFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 重置视图状态
  const resetView = () => {
    setZoom(0.7); // 重置时也使用70%缩放
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // 当文件项改变时重置视图
  useEffect(() => {
    resetView();
  }, [fileItem.id]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 0.8) { // 调整拖拽阈值
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 0.8) { // 调整拖拽阈值
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // 阻止页面滚动
    e.stopPropagation(); // 阻止事件冒泡

    const delta = e.deltaY;
    const zoomFactor = 0.1; // 缩放步长

    if (delta < 0) {
      // 向上滚动，放大
      setZoom(prev => Math.min(prev + zoomFactor, 5));
    } else {
      // 向下滚动，缩小
      setZoom(prev => Math.max(prev - zoomFactor, 0.1));
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        onPrevious?.();
        break;
      case 'ArrowRight':
        onNext?.();
        break;
      case 'Escape':
        setShowFullscreen(false);
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
      case 'r':
      case 'R':
        handleRotate();
        break;
    }
  };

  useEffect(() => {
    if (showFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showFullscreen, onNext, onPrevious]);

  // 添加原生滚轮事件监听器，确保完全阻止页面滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      const zoomFactor = 0.1;

      if (delta < 0) {
        setZoom(prev => Math.min(prev + zoomFactor, 5));
      } else {
        setZoom(prev => Math.max(prev - zoomFactor, 0.1));
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // 全屏模式下的滚轮事件监听器
  useEffect(() => {
    if (!showFullscreen) return;

    const handleFullscreenWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      const zoomFactor = 0.1;

      if (delta < 0) {
        setZoom(prev => Math.min(prev + zoomFactor, 5));
      } else {
        setZoom(prev => Math.max(prev - zoomFactor, 0.1));
      }
    };

    document.addEventListener('wheel', handleFullscreenWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleFullscreenWheel);
    };
  }, [showFullscreen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-500/50 bg-transparent text-green-600';
      case 'failed': return 'border-red-500/50 bg-transparent text-red-600';
      case 'processing': return 'border-blue-500/50 bg-transparent text-blue-600';
      case 'pending': return 'border-gray-500/50 bg-transparent text-gray-600';
      case 'skipped': return 'border-yellow-500/50 bg-transparent text-yellow-600';
      default: return 'border-gray-500/50 bg-transparent text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'processing': return '处理中';
      case 'pending': return '待处理';
      case 'skipped': return '已跳过';
      default: return status;
    }
  };

  const imageStyle = {
    transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
    cursor: zoom > 0.8 ? (isDragging ? 'grabbing' : 'grab') : 'default', // 调整光标显示条件
    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <span>图片预览</span>
              <Badge variant="outline">
                {currentIndex + 1} / {totalCount}
              </Badge>
            </div>
            <Badge className={getStatusColor(fileItem.status)}>
              {getStatusText(fileItem.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* 文件信息 */}
          <div className="text-sm text-gray-600 space-y-1">
            <div>文件名：{fileItem.filename}</div>
            <div>文件大小：{formatFileSize(fileItem.file_size)}</div>
            {fileItem.processing_time_seconds && (
              <div>处理耗时：{fileItem.processing_time_seconds.toFixed(1)}秒</div>
            )}
            {fileItem.error_message && (
              <div className="text-red-600">错误：{fileItem.error_message}</div>
            )}
          </div>

          {/* 图片控制工具栏 */}
          <div className="flex items-center gap-2 p-2 border ui-surface-subtle ui-border rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 5}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
            >
              重置
            </Button>
            <div className="flex-1" />
            <div className="text-xs text-gray-500 px-2">
              滚轮缩放
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 图片显示区域 */}
          <div
            ref={containerRef}
            className="relative ui-surface-subtle rounded-lg overflow-hidden flex-1 border ui-border"
            style={{ minHeight: '500px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {fileItem.file_path ? (
              <img
                ref={imageRef}
                src={fileItem.file_path}
                alt={fileItem.filename}
                className="w-full h-full object-contain"
                style={imageStyle}
                draggable={false}
                onError={(e) => {
                  console.error('图片加载失败:', fileItem.file_path);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-lg mb-2">图片加载失败</div>
                  <div className="text-sm">文件路径不存在</div>
                </div>
              </div>
            )}
            
            {/* 缩放提示 */}
            {zoom > 0.8 && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                拖拽移动图片
              </div>
            )}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentIndex === 0}
            >
              上一张
            </Button>
            <Button
              variant="outline"
              onClick={onNext}
              disabled={currentIndex === totalCount - 1}
            >
              下一张
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 全屏模式 */}
      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {fileItem.file_path ? (
              <img
                src={fileItem.file_path}
                alt={fileItem.filename}
                className="max-w-full max-h-full object-contain"
                style={imageStyle}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                draggable={false}
              />
            ) : (
              <div className="text-white text-center">
                <div className="text-lg mb-2">图片加载失败</div>
                <div className="text-sm">文件路径不存在</div>
              </div>
            )}
            
            {/* 全屏控制栏 */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <div className="text-white text-lg font-medium">
                {fileItem.filename} ({currentIndex + 1}/{totalCount})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullscreen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>

            {/* 全屏工具栏 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black bg-opacity-50 rounded-lg p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetView}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                重置
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
