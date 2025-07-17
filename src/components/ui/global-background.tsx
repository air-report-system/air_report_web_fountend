/**
 * 全局背景图组件
 */
'use client';

import React from 'react';
import { useBackground } from '@/contexts/background-context';

export function GlobalBackground() {
  const { backgroundImage, backgroundOpacity } = useBackground();

  // 如果没有设置背景图，不渲染任何内容
  if (!backgroundImage) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: backgroundOpacity,
        zIndex: 0,
      }}
    />
  );
} 