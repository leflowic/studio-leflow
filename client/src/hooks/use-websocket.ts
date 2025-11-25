import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./use-auth";

export type WebSocketMessage = 
  | { type: 'online_status'; userId: number; online: boolean }
  | { type: 'typing_start'; userId: number }
  | { type: 'typing_stop'; userId: number }
  | { type: 'new_message'; message: any }
  | { type: 'message_read'; conversationId: number; readBy: number }
  | { type: 'message_deleted'; messageId: number }
  | { type: 'notification'; title: string; description?: string; variant?: 'default' | 'destructive' };

export function useWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageListeners = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  const connect = useCallback(() => {
    if (!user || ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      
      // Send authentication
      if (user) {
        ws.current?.send(JSON.stringify({ type: 'auth', userId: user.id }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        messageListeners.current.forEach(listener => listener(message));
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      
      // Reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(() => {
        console.log('[WebSocket] Reconnecting...');
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }, [user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((listener: (message: WebSocketMessage) => void) => {
    messageListeners.current.add(listener);
    
    return () => {
      messageListeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    isConnected,
    send,
    subscribe,
  };
}
