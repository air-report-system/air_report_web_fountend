"use client";

import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/auth-context';
import { AiConfigProvider } from '@/contexts/ai-config-context';
import { queryClient } from '@/lib/query-client';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AiConfigProvider>
          {children}
        </AiConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}