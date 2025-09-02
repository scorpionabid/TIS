import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  user_id?: number;
  channel?: string;
}

export interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastMessage: WebSocketMessage | null;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  unsubscribe: (channel: string, callback: (data: any) => void) => void;
  send: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

interface ChannelSubscription {
  channel: string;
  callback: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const subscriptions = useRef<ChannelSubscription[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);
  const maxReconnectDelay = 30000;
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL - temporarily disable for Redis broadcasting
  const getWebSocketUrl = useCallback((): string => {
    // For now, we'll use polling instead of WebSocket since Redis broadcasting
    // requires additional WebSocket server setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:6001' 
      : window.location.host;
    
    const token = localStorage.getItem('auth_token');
    const baseUrl = `${protocol}//${host}/app/atis-key`;
    
    return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      setLastMessage(message);
      
      // Handle different message types
      switch (message.type) {
        case 'bulk-approval-progress':
        case 'bulk-approval-completed':
          // Route to channel-specific subscribers
          if (message.channel) {
            const channelSubscribers = subscriptions.current.filter(
              sub => sub.channel === message.channel || sub.channel === `user.${currentUser?.id}.bulk-approval`
            );
            
            channelSubscribers.forEach(sub => {
              try {
                sub.callback(message.data);
              } catch (error) {
                console.error('Error in channel subscriber:', error);
              }
            });
          }
          break;
          
        case 'notification':
          // Handle general notifications
          const notificationSubscribers = subscriptions.current.filter(
            sub => sub.channel === 'notifications'
          );
          notificationSubscribers.forEach(sub => sub.callback(message.data));
          break;
          
        case 'pong':
          // Handle ping/pong for connection health
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [currentUser?.id]);

  // Connect to WebSocket - temporarily disabled for Redis broadcasting
  const connect = useCallback(() => {
    // Temporarily disable WebSocket connection until we set up proper WebSocket server
    console.log('WebSocket connection temporarily disabled - using polling fallback');
    setConnectionError('WebSocket server not configured - using polling fallback');
    return;
    
    if (socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!currentUser) {
      setConnectionError('User not authenticated');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        console.log('WebSocket connected');
        setSocket(ws);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;

        // Send authentication after connection
        ws.send(JSON.stringify({
          type: 'auth',
          token: localStorage.getItem('auth_token'),
          user_id: currentUser.id
        }));

        // Start ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);

        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Attempt reconnection if not a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to create connection');
      setIsConnecting(false);
    }
  }, [currentUser, getWebSocketUrl, handleMessage]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    reconnectAttempts.current++;
    const delay = Math.min(reconnectDelay.current, maxReconnectDelay);
    
    console.log(`Scheduling reconnection attempt ${reconnectAttempts.current} in ${delay}ms`);
    
    reconnectTimer.current = setTimeout(() => {
      connect();
    }, delay);

    // Exponential backoff with jitter
    reconnectDelay.current = Math.min(reconnectDelay.current * 2 + Math.random() * 1000, maxReconnectDelay);
  }, [connect]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }

    if (socket) {
      socket.close(1000, 'Manual disconnect');
    }

    setSocket(null);
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    reconnectAttempts.current = 0;
  }, [socket]);

  // Force reconnection
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Subscribe to channel
  const subscribe = useCallback((channel: string, callback: (data: any) => void): (() => void) => {
    const subscription: ChannelSubscription = { channel, callback };
    subscriptions.current.push(subscription);

    // Send subscription message to server if connected
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel,
        user_id: currentUser?.id
      }));
    }

    // Return unsubscribe function
    return () => {
      unsubscribe(channel, callback);
    };
  }, [socket, currentUser?.id]);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string, callback: (data: any) => void) => {
    subscriptions.current = subscriptions.current.filter(
      sub => !(sub.channel === channel && sub.callback === callback)
    );

    // Send unsubscription message to server if connected
    if (socket?.readyState === WebSocket.OPEN) {
      const remainingForChannel = subscriptions.current.filter(sub => sub.channel === channel);
      if (remainingForChannel.length === 0) {
        socket.send(JSON.stringify({
          type: 'unsubscribe',
          channel,
          user_id: currentUser?.id
        }));
      }
    }
  }, [socket, currentUser?.id]);

  // Send message
  const send = useCallback((message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id
      }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [socket, currentUser?.id]);

  // Auto-connect when user is available
  useEffect(() => {
    if (currentUser && !socket && !isConnecting) {
      connect();
    } else if (!currentUser && socket) {
      disconnect();
    }
  }, [currentUser, socket, isConnecting, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Re-subscribe to channels when reconnected
  useEffect(() => {
    if (isConnected && socket && subscriptions.current.length > 0) {
      const uniqueChannels = [...new Set(subscriptions.current.map(sub => sub.channel))];
      uniqueChannels.forEach(channel => {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel,
          user_id: currentUser?.id
        }));
      });
    }
  }, [isConnected, socket, currentUser?.id]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;