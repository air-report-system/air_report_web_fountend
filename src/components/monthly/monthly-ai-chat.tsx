/**
 * 月度账表 AI 对话（WebSocket）
 * - 输入自然语言问题
 * - 后端生成受限JSON计算计划 -> pandas 执行 -> 写回Excel末尾
 * - WS 实时推送进度，最终触发外部刷新预览
 */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatError } from '@/lib/utils';
import { Bot, Loader2, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { getWebSocketUrl } from '@/lib/websocket';

type WsEnvelope =
  | { type: 'connection_established'; data: { user_id?: number; username?: string; message?: string }; timestamp?: number }
  | { type: 'subscribed'; data: { report_id: number }; timestamp?: number }
  | { type: 'progress'; data: { stage: string; message?: string }; timestamp?: number }
  | { type: 'final'; data: { label?: string; value?: number | string; write_cell?: string; plan?: unknown; preview?: unknown }; timestamp?: number }
  | { type: 'error'; data: { error: string }; timestamp?: number }
  | { type: 'pong'; data: unknown; timestamp?: number };

interface MonthlyAIChatProps {
  reportId: number;
  onFinal?: (payload: WsEnvelope) => void;
  onError?: (msg: string) => void;
}

export function MonthlyAIChat({ reportId, onFinal, onError }: MonthlyAIChatProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'running' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ label?: string; value?: unknown; unit?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);

  const wsUrl = useMemo(() => {
    // 后端路由：/ws/monthly/ （report_id 通过 subscribe_report 发送）
    // 注意：WebSocket 不走 Next.js rewrite，需要直连后端；token 通过 querystring 鉴权
    const token = (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '') || '';
    return getWebSocketUrl('/ws/monthly/', token ? { token } : undefined);
  }, []);

  const pushLog = (line: string) => {
    setLog((prev) => {
      const next = [...prev, line];
      // 控制长度，避免页面膨胀
      return next.slice(-50);
    });
  };

  const closeWs = () => {
    try {
      wsRef.current?.close();
    } catch {
      // ignore
    } finally {
      wsRef.current = null;
      connectingRef.current = false;
    }
  };

  const ensureWs = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (connectingRef.current) return;
    connectingRef.current = true;

    setStatus('connecting');
    pushLog('正在连接 AI 服务…');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      connectingRef.current = false;
      setStatus('ready');
      pushLog('连接成功。');
      // 连接后立刻订阅 report（后端只在 subscribe_report 后才绑定 group/report_id）
      try {
        ws.send(JSON.stringify({ type: 'subscribe_report', data: { report_id: reportId } }));
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      connectingRef.current = false;
      setStatus((s) => (s === 'running' ? 'error' : 'idle'));
      pushLog('连接已关闭。');
    };

    ws.onerror = () => {
      connectingRef.current = false;
      setStatus('error');
      pushLog('连接错误。');
      onError?.('AI WebSocket 连接失败');
    };

    ws.onmessage = (ev) => {
      let msg: WsEnvelope | null = null;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        pushLog(`收到非JSON消息：${String(ev.data).slice(0, 200)}`);
        return;
      }

      if (!msg) return;
      if (msg.type === 'connection_established') {
        setStatus('ready');
        pushLog(msg.data?.message ? String(msg.data.message) : '连接已建立。');
        return;
      }
      if (msg.type === 'subscribed') {
        setStatus('ready');
        pushLog(`已订阅报表 #${msg.data.report_id}`);
        return;
      }
      if (msg.type === 'progress') {
        setStatus('running');
        pushLog(`${msg.data.stage}${msg.data.message ? `：${msg.data.message}` : ''}`);
        return;
      }
      if (msg.type === 'final') {
        setStatus('ready');
        pushLog('完成：已写回 Excel，并生成最新预览。');
        setLastResult({ label: msg.data.label, value: msg.data.value });
        onFinal?.(msg);
        return;
      }
      if (msg.type === 'error') {
        setStatus('error');
        pushLog(`错误：${msg.data.error}`);
        onError?.(msg.data.error);
        return;
      }
    };
  };

  useEffect(() => {
    if (!open) {
      closeWs();
      setStatus('idle');
      setLog([]);
      return;
    }
    ensureWs();
    return () => closeWs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wsUrl]);

  const canSend = status === 'ready' && question.trim().length > 0;
  const sending = status === 'running' || status === 'connecting';

  const handleSend = () => {
    const q = question.trim();
    if (!q) return;
    try {
      ensureWs();
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        onError?.('AI 服务尚未连接成功，请稍后再试');
        return;
      }
      setLastResult(null);
      setStatus('running');
      pushLog(`你：${q}`);
      // 后端协议：{ type:'ai_calculate', data:{ report_id, question } }
      wsRef.current.send(JSON.stringify({ type: 'ai_calculate', data: { report_id: reportId, question: q } }));
      setQuestion('');
    } catch (e) {
      setStatus('error');
      onError?.(formatError(e));
    }
  };

  return (
    <div className="p-4 rounded-lg ui-surface-subtle ui-border space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-gray-700" />
          <div className="text-sm font-medium text-gray-900">AI 计算（写回 Excel）</div>
          <Badge variant="outline" className="text-xs">
            report_id: {reportId}
          </Badge>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <Sparkles className="mr-2 h-4 w-4" />
          {open ? '收起' : '打开'}
        </Button>
      </div>

      {open && (
        <>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {status === 'ready' && (
              <>
                <Wifi className="h-3.5 w-3.5" />
                已连接
              </>
            )}
            {status === 'connecting' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                连接中…
              </>
            )}
            {status === 'idle' && (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                未连接
              </>
            )}
            {status === 'running' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                计算中…
              </>
            )}
            {status === 'error' && (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                出错（可重试）
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='例如："列出原价比实付价格平均高出多少"'
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <Button type="button" onClick={handleSend} disabled={!canSend} loading={sending}>
              发送
            </Button>
          </div>

          {lastResult && (
            <div className="text-sm text-gray-800">
              <span className="font-medium">结果：</span>
              <span>{lastResult.label ? `${lastResult.label} = ` : ''}</span>
              <span className="font-mono">{String(lastResult.value ?? '')}</span>
              {lastResult.unit ? <span className="ml-1">{lastResult.unit}</span> : null}
            </div>
          )}

          <div className="max-h-40 overflow-auto rounded-md ui-border ui-surface-subtle p-2 text-xs text-gray-700 space-y-1">
            {log.length === 0 ? <div className="text-gray-500">暂无消息</div> : null}
            {log.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


