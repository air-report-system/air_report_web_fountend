/**
 * 全局背景图组件
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useBackground } from '@/contexts/background-context';

export function GlobalBackground() {
  const { backgroundImage, backgroundOpacity } = useBackground();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 图片预加载
  useEffect(() => {
    if (!backgroundImage) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    console.log('开始预加载背景图片...');
    const startTime = performance.now();
    
    const img = new Image();
    
    img.onload = () => {
      const endTime = performance.now();
      console.log(`背景图片预加载完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);
      setImageLoaded(true);
      setImageError(false);
    };
    
    img.onerror = () => {
      console.error('背景图片加载失败');
      setImageLoaded(false);
      setImageError(true);
    };
    
    img.src = backgroundImage;
    
    // 清理函数
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [backgroundImage]);

  // 如果没有设置背景图或加载失败，不渲染任何内容
  if (!backgroundImage || imageError) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: imageLoaded ? backgroundOpacity : 0,
        zIndex: 0,
      }}
    />
  );
}