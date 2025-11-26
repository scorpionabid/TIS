import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useAuth } from './AuthContext';
import { WebSocketMessage, WebSocketEventHandler } from '@/types/events';
import { logger } from '@/utils/logger';
import { apiClient } from '@/services/api';

// Configure Pusher
window.Pusher = Pusher;

interface WebSocketConfig {
  key: string;
  cluster?: string;
  host: string;
  port: number;
  scheme: string;
  encrypted: boolean;
  forceTLS: boolean;
  enableLogging?: boolean;
  authEndpoint?: string;
  auth?: {
    headers: {
      Authorization?: string;
    };
  };
}

export interface WebSocketContextType {
  // Laravel Echo support (primary)
  echo: Echo | null;
  isEchoConnected: boolean;

  // Legacy WebSocket support (for backward compatibility)
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastMessage: WebSocketMessage | null;

  // Unified methods
  subscribe: (channel: string, callback: WebSocketEventHandler) => () => void;
  unsubscribe: (channel: string, callback: WebSocketEventHandler) => void;
  send: (message: Record<string, unknown>) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Laravel Echo specific methods
  listenToUserChannel: (userId: number, callback: (data: any) => void) => void;
  listenToInstitutionChannel: (institutionId: number, callback: (data: any) => void) => void;
  listenToRoleChannel: (role: string, callback: (data: any) => void) => void;
  stopListening: (channelName: string) => void;
  isWebSocketConnected: () => boolean;
  getEcho: () => Echo | null;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

interface ChannelSubscription {
  channel: string;
  callback: WebSocketEventHandler;
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
  const { currentUser, getAuthToken } = useAuth();

  // Laravel Echo state
  const [echo, setEcho] = useState<Echo | null>(null);
  const [isEchoConnected, setIsEchoConnected] = useState(false);
  const [config, setConfig] = useState<WebSocketConfig | null>(null);
  const [websocketUnavailable, setWebsocketUnavailable] = useState(false);

  // Legacy WebSocket state (for backward compatibility)
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Shared state
  const subscriptions = useRef<ChannelSubscription[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);
  const maxReconnectDelay = 30000;
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const scheduleReconnectRef = useRef<() => void>();

  // Get WebSocket configuration from backend
  const getWebSocketConfig = useCallback(async (): Promise<WebSocketConfig | null> => {
    try {
      const response = await fetch('/api/test/websocket/info');

      if (!response.ok) {
        logger.info(`WebSocket config request failed (${response.status}). Falling back to polling.`);
        return null;
      }

      const rawText = await response.text();
      if (!rawText) {
        const message = 'Empty WebSocket configuration response';
        logger.warn(message);
        throw new Error(message);
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        logger.error('Invalid WebSocket configuration payload', parseError);
        throw new Error('WebSocket configuration is not valid JSON');
      }

      if (data.success) {
        return {
          key: data.data.app_key || 'atis-key',
          host: data.data.reverb_host,
          port: data.data.reverb_port,
          scheme: data.data.reverb_port === 443 ? 'https' : 'http',
          encrypted: data.data.reverb_port === 443,
          forceTLS: data.data.reverb_port === 443,
          enableLogging: process.env.NODE_ENV === 'development',
        };
      }

      // WebSocket is disabled on the backend
      const message = data.message || 'WebSocket/Broadcasting is disabled';
      logger.info(message + ' - Real-time updates will use polling instead.');
      return null;
    } catch (error) {
      logger.warn('Could not fetch WebSocket configuration - using polling for updates');
      return null;
    }
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
          
        case 'notification': {
          // Handle general notifications
          const notificationSubscribers = subscriptions.current.filter(
            sub => sub.channel === 'notifications'
          );
          notificationSubscribers.forEach(sub => sub.callback(message.data));
          break;
        }
          
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

  // Initialize Laravel Echo connection
  const setupEchoListeners = useCallback((echoInstance: Echo) => {
    if (!echoInstance) return;

    echoInstance.connector.pusher.connection.bind('connected', () => {
      logger.info('Laravel Echo connected successfully');
      setIsEchoConnected(true);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    echoInstance.connector.pusher.connection.bind('disconnected', () => {
      logger.warn('Laravel Echo disconnected');
      setIsEchoConnected(false);
      setIsConnected(false);
      scheduleReconnectRef.current?.();
    });

    echoInstance.connector.pusher.connection.bind('error', (error: any) => {
      logger.error('Laravel Echo connection error', error);
      setIsEchoConnected(false);
      setIsConnected(false);
    });

    echoInstance.connector.pusher.connection.bind('unavailable', () => {
      logger.error('Laravel Echo connection unavailable');
      setIsEchoConnected(false);
      setIsConnected(false);
    });
  }, []);

  const initializeEcho = useCallback(async (authToken?: string): Promise<void> => {
    try {
      logger.info('Initializing Laravel Echo connection...');

      // Get configuration from backend
      const wsConfig = await getWebSocketConfig();
      if (!wsConfig) {
        setConfig(null);
        setWebsocketUnavailable(true);
        logger.info('WebSocket configuration unavailable. Skipping Echo initialization.');
        setIsConnecting(false);
        return;
      }
      setWebsocketUnavailable(false);
      setConfig(wsConfig);

      // Create Echo instance
      const echoInstance = new Echo({
        broadcaster: 'reverb',
        key: wsConfig.key,
        wsHost: wsConfig.host,
        wsPort: wsConfig.port,
        wssPort: wsConfig.port,
        forceTLS: wsConfig.forceTLS,
        encrypted: wsConfig.encrypted,
        enableLogging: wsConfig.enableLogging || false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: wsConfig.authEndpoint || '/broadcasting/auth',
        auth: (() => {
          const bearerEnabled = typeof apiClient.isBearerAuthEnabled === 'function'
            ? apiClient.isBearerAuthEnabled()
            : true;
          const headers: Record<string, string> = bearerEnabled ? apiClient.getAuthHeaders() : {};

          if (bearerEnabled && !headers.Authorization && authToken) {
            headers.Authorization = `Bearer ${authToken}`;
          }

          return Object.keys(headers).length > 0 ? { headers } : undefined;
        })(),
      });

      setupEchoListeners(echoInstance);
      setEcho(echoInstance);
      setIsEchoConnected(true);
      setIsConnected(true); // For backward compatibility
      reconnectAttempts.current = 0;

      logger.info('Laravel Echo connection established', {
        host: wsConfig.host,
        port: wsConfig.port,
        scheme: wsConfig.scheme,
      });
    } catch (error) {
      logger.warn('Failed to initialize Laravel Echo connection - using polling instead', error);
      setConnectionError('Failed to initialize Echo connection');
      scheduleReconnectRef.current?.();
    }
  }, [getWebSocketConfig, setupEchoListeners]);

  // Connect to WebSocket (unified method for both Echo and legacy)
  const connect = useCallback(async () => {
    if (websocketUnavailable) {
      return;
    }

    if (echo?.connector?.pusher?.connection?.state === 'connected' || isConnecting) {
      return;
    }

    if (!currentUser) {
      setConnectionError('User not authenticated');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const authToken = getAuthToken ? getAuthToken() : null;
    await initializeEcho(authToken);
  }, [currentUser, echo, isConnecting, getAuthToken, initializeEcho, websocketUnavailable]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (websocketUnavailable) {
      return;
    }

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
  }, [connect, websocketUnavailable]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

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

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string, callback: WebSocketEventHandler) => {
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

  // Subscribe to channel
  const subscribe = useCallback((channel: string, callback: WebSocketEventHandler): (() => void) => {
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
  }, [socket, currentUser?.id, unsubscribe]);

  // Send message (unified for both Echo and legacy WebSocket)
  const send = useCallback((message: Record<string, unknown>) => {
    if (echo && isEchoConnected) {
      // Use Echo for sending (if needed)
      logger.debug('Sending message via Echo', message);
    } else if (socket?.readyState === WebSocket.OPEN) {
      // Legacy WebSocket support
      socket.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id
      }));
    } else {
      logger.warn('Neither Echo nor WebSocket is connected');
    }
  }, [echo, isEchoConnected, socket, currentUser?.id]);

  // Laravel Echo specific methods
  const listenToUserChannel = useCallback((userId: number, callback: (data: any) => void): void => {
    if (!echo) {
      logger.error('Laravel Echo not initialized');
      return;
    }

    const channelName = `App.Models.User.${userId}`;

    echo.private(channelName)
      .listen('.notification.sent', (data: any) => {
        logger.info('Received notification via Laravel Echo', data);
        callback(data);
      });

    logger.info(`Subscribed to user channel: ${channelName}`);
  }, [echo]);

  const listenToInstitutionChannel = useCallback((institutionId: number, callback: (data: any) => void): void => {
    if (!echo) {
      logger.error('Laravel Echo not initialized');
      return;
    }

    const channelName = `institution.${institutionId}`;

    echo.private(channelName)
      .listen('.notification.sent', (data: any) => {
        logger.info('Received institution notification via Laravel Echo', data);
        callback(data);
      });

    logger.info(`Subscribed to institution channel: ${channelName}`);
  }, [echo]);

  const listenToRoleChannel = useCallback((role: string, callback: (data: any) => void): void => {
    if (!echo) {
      logger.error('Laravel Echo not initialized');
      return;
    }

    const channelName = `role.${role}`;

    echo.private(channelName)
      .listen('.notification.sent', (data: any) => {
        logger.info('Received role notification via Laravel Echo', data);
        callback(data);
      });

    logger.info(`Subscribed to role channel: ${channelName}`);
  }, [echo]);

  const stopListening = useCallback((channelName: string): void => {
    if (!echo) return;

    echo.leaveChannel(channelName);
    logger.info(`Unsubscribed from channel: ${channelName}`);
  }, [echo]);

  const isWebSocketConnected = useCallback((): boolean => {
    return isEchoConnected && echo !== null;
  }, [isEchoConnected, echo]);

  const getEcho = useCallback((): Echo | null => {
    return echo;
  }, [echo]);

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
    // Laravel Echo support
    echo,
    isEchoConnected,

    // Legacy WebSocket support (for backward compatibility)
    socket,
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,

    // Unified methods
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
    reconnect,

    // Laravel Echo specific methods
    listenToUserChannel,
    listenToInstitutionChannel,
    listenToRoleChannel,
    stopListening,
    isWebSocketConnected,
    getEcho
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
