/**
 * WebSocket实时通信工具类
 */
import React from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface BatchProgressUpdate {
  batch_job_id: number;
  progress_percentage: number;
  processed_files: number;
  failed_files: number;
  status: string;
  current_file?: string;
}

export interface FileProcessingUpdate {
  file_id: number;
  batch_job_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_result_id?: number;
  error_message?: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  private listeners: {
    [key: string]: ((data: any) => void)[];
  } = {};

  constructor(private url: string) {}

  // 连接WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✓ WebSocket连接成功');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPing();
          
          // 如果不是正常关闭，尝试重连
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.stopPing();
  }

  // 发送消息
  send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  // 添加事件监听器
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // 移除事件监听器
  off(event: string, callback: (data: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // 移除所有事件监听器
  removeAllListeners() {
    this.listeners = {};
  }

  // 处理接收到的消息
  private handleMessage(message: WebSocketMessage) {
    console.log('收到WebSocket消息:', message);
    
    if (this.listeners[message.type]) {
      this.listeners[message.type].forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('处理WebSocket消息时出错:', error);
        }
      });
    }
  }

  // 启动心跳检测
  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // 每30秒发送一次心跳
  }

  // 停止心跳检测
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // 尝试重连
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('重连失败:', error);
        });
      }, this.reconnectInterval);
    } else {
      console.error('达到最大重连次数，停止尝试');
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 全局WebSocket管理器实例
let wsManager: WebSocketManager | null = null;

// 获取WebSocket管理器实例
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    // 构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/batch/`;
    
    wsManager = new WebSocketManager(wsUrl);
  }
  return wsManager;
}

// 批量处理WebSocket Hook
export function useBatchWebSocket(
  batchJobId: number | null,
  onProgressUpdate?: (progress: BatchProgressUpdate) => void,
  onFileUpdate?: (fileUpdate: FileProcessingUpdate) => void
) {
  const [isConnected, setIsConnected] = React.useState(false);
  const wsManager = getWebSocketManager();

  React.useEffect(() => {
    if (!batchJobId) return;

    const handleConnect = async () => {
      try {
        await wsManager.connect();
        setIsConnected(true);
        
        // 订阅批量任务更新
        wsManager.send('subscribe_batch_job', { batch_job_id: batchJobId });
        
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setIsConnected(false);
      }
    };

    const handleProgressUpdate = (data: BatchProgressUpdate) => {
      if (data.batch_job_id === batchJobId) {
        onProgressUpdate?.(data);
      }
    };

    const handleFileUpdate = (data: FileProcessingUpdate) => {
      if (data.batch_job_id === batchJobId) {
        onFileUpdate?.(data);
      }
    };

    // 添加事件监听器
    wsManager.on('batch_progress_update', handleProgressUpdate);
    wsManager.on('file_processing_update', handleFileUpdate);

    // 连接WebSocket
    handleConnect();

    return () => {
      // 清理事件监听器
      wsManager.off('batch_progress_update', handleProgressUpdate);
      wsManager.off('file_processing_update', handleFileUpdate);
      
      // 取消订阅
      if (wsManager.isConnected()) {
        wsManager.send('unsubscribe_batch_job', { batch_job_id: batchJobId });
      }
    };
  }, [batchJobId, onProgressUpdate, onFileUpdate]);

  return {
    isConnected,
    sendMessage: (type: string, data: any) => wsManager.send(type, data),
    disconnect: () => wsManager.disconnect()
  };
}