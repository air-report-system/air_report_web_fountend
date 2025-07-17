/**
 * 用户菜单组件 - 简化版
 */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AiConfigManager } from '@/components/ai-config/ai-config-manager';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowMenu(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2 h-auto p-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.first_name || user.username}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
              {user.role === 'admin' ? '管理员' : '用户'}
            </Badge>
          </div>
        </div>
      </Button>

      {showMenu && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* 菜单内容 */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border z-50">
            <div className="p-3 border-b">
              <p className="text-sm font-medium text-gray-900">
                {user.first_name || user.username}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>

            <div className="p-1">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>AI 配置</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw]">
                  <DialogHeader>
                    <DialogTitle>AI 服务配置</DialogTitle>
                  </DialogHeader>
                  <AiConfigManager />
                </DialogContent>
              </Dialog>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? '登出中...' : '登出'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
