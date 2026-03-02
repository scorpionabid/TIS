/**
 * RealTimeCollaboration - WebSocket-based real-time collaboration for report tables
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Bell,
  MessageSquare,
  Eye,
  MousePointer,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

// WebSocket connection manager
class CollaborationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(tableId: number, token: string): void {
    // TODO: Replace with actual WebSocket URL from config
    const wsUrl = `wss://api.example.com/ws/report-tables/${tableId}?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.type, data.payload);
    };

    this.ws.onclose = () => {
      this.emit('connection', { status: 'disconnected' });
      this.attemptReconnect(tableId, token);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  private attemptReconnect(tableId: number, token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('connection', { status: 'failed' });
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      this.connect(tableId, token);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  send(type: string, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}

// Singleton instance
const wsManager = new CollaborationWebSocket();

// Types
interface ActiveUser {
  id: number;
  name: string;
  color: string;
  cursor?: { row: number; col: number };
  lastSeen: string;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface RealTimeCollaborationProps {
  tableId: number;
  responseId?: number;
}

const USER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#f43f5e', // rose
];

export function RealTimeCollaboration({ tableId, responseId }: RealTimeCollaborationProps) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [myColor] = useState(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);

  useEffect(() => {
    // TODO: Get actual auth token
    const token = 'mock-token';
    
    wsManager.connect(tableId, token);

    const unsubConnection = wsManager.on('connection', (data) => {
      setIsConnected(data.status === 'connected');
      if (data.status === 'failed') {
        toast.error('Real-time bağlantı qurula bilmədi');
      }
    });

    const unsubUsers = wsManager.on('users', (data) => {
      setActiveUsers(data.users.map((u: any, i: number) => ({
        ...u,
        color: USER_COLORS[i % USER_COLORS.length],
      })));
    });

    const unsubCursor = wsManager.on('cursor', (data) => {
      setActiveUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, cursor: data.cursor } : u
      ));
    });

    const unsubNotification = wsManager.on('notification', (data) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: data.type || 'info',
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

      // Show toast for important notifications
      if (data.showToast) {
        switch (notification.type) {
          case 'success':
            toast.success(notification.message);
            break;
          case 'error':
            toast.error(notification.message);
            break;
          case 'warning':
            toast.warning(notification.message);
            break;
          default:
            toast.info(notification.message);
        }
      }

      // Refresh data if needed
      if (data.refresh) {
        queryClient.invalidateQueries({ queryKey: ['report-table', tableId] });
        queryClient.invalidateQueries({ queryKey: ['report-table-responses', tableId] });
      }
    });

    const unsubCellUpdate = wsManager.on('cell_update', (data) => {
      // Another user updated a cell
      queryClient.invalidateQueries({ queryKey: ['report-table-response', data.responseId] });
    });

    return () => {
      unsubConnection();
      unsubUsers();
      unsubCursor();
      unsubNotification();
      unsubCellUpdate();
      wsManager.disconnect();
    };
  }, [tableId, queryClient]);

  const sendCursorPosition = useCallback((row: number, col: number) => {
    wsManager.send('cursor', { row, col, responseId });
  }, [responseId]);

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {isConnected ? 'Canlı' : 'Offline'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConnected ? 'Real-time bağlantı aktiv' : 'Bağlantı kəsilib'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Active Users */}
        <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-8">
              <Users className="h-4 w-4" />
              <span className="text-xs">{activeUsers.length}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Aktiv istifadəçilər
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {activeUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  Başqa aktiv istifadəçi yoxdur
                </p>
              ) : (
                activeUsers.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name}</p>
                      {user.cursor && (
                        <p className="text-xs text-gray-500">
                          Sətir {user.cursor.row + 1}, sütun {user.cursor.col + 1}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(user.lastSeen), 'HH:mm', { locale: az })}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications */}
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-8 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Bildirişlər
                </span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={markNotificationsRead}
                  >
                    Oxundu
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={clearNotifications}
                  >
                    Təmizlə
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 max-h-[50vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Bildiriş yoxdur</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50'
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-gray-600">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {format(new Date(notification.timestamp), 'dd MMM, HH:mm', { locale: az })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Hook for sending collaboration events
export function useCollaboration(tableId: number, responseId?: number) {
  const sendCellUpdate = useCallback((rowIdx: number, colKey: string, value: string) => {
    wsManager.send('cell_update', {
      tableId,
      responseId,
      rowIdx,
      colKey,
      value,
      timestamp: new Date().toISOString(),
    });
  }, [tableId, responseId]);

  const sendTyping = useCallback((rowIdx: number, colKey: string) => {
    wsManager.send('typing', {
      tableId,
      responseId,
      rowIdx,
      colKey,
    });
  }, [tableId, responseId]);

  return {
    sendCellUpdate,
    sendTyping,
    wsManager,
  };
}

export default RealTimeCollaboration;
