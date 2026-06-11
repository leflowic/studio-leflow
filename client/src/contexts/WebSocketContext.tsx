import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import notificationSound from "@assets/bottle-opening-wine-cork-pop-352701_1762664855578.mp3";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string, senderUsername?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.hidden) return; // Only show when tab is in background
  const n = new Notification(title, {
    body,
    icon: "/leflow-logo-white.png",
    tag: senderUsername || "message",
    renotify: true,
  });
  n.onclick = () => { window.focus(); n.close(); };
}

export type WebSocketMessage = 
  | { type: 'online_status'; userId: number; online: boolean }
  | { type: 'typing_start'; userId: number }
  | { type: 'typing_stop'; userId: number }
  | { type: 'new_message'; message: any }
  | { type: 'message_read'; conversationId: number; readBy: number }
  | { type: 'message_deleted'; messageId: number }
  | { type: 'notification'; title: string; description?: string; variant?: 'default' | 'destructive' }
  | { type: 'community-chat:new'; message: any }
  | { type: 'community-chat:delete'; messageId: number }
  | { type: 'community-chat:clear' };

interface WebSocketContextType {
  isConnected: boolean;
  send: (message: any) => void;
  subscribe: (listener: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageListeners = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const userRef = useRef(user); // Track current user to prevent stale reconnects
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const connect = useCallback(() => {
    // CRITICAL: Read from ref, not closure, to prevent stale reconnects
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    // Only prevent connection if socket is currently open or connecting
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      requestNotificationPermission();

      const authUser = userRef.current;
      if (authUser) {
        const token = localStorage.getItem('auth_token');
        ws.current?.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Handle notification messages globally
        if (message.type === 'notification') {
          toast({
            title: message.title,
            description: message.description,
            variant: message.variant || 'default',
          });
          
          // Play notification sound
          if (!audioRef.current) {
            audioRef.current = new Audio(notificationSound);
            audioRef.current.volume = 0.5;
          }
          audioRef.current.play().catch((error) => {
            console.log('[WebSocket] Could not play notification sound:', error);
          });
        }
        
        // Handle new messages from other users
        if (message.type === 'new_message') {
          const currentUserId = userRef.current?.id;
          const messageSenderId = message.message?.senderId;
          const senderUsername = message.message?.senderUsername || "Novi msg";

          if (currentUserId && messageSenderId && messageSenderId !== currentUserId) {
            // Play sound only when tab is hidden or user is not actively reading
            if (document.hidden) {
              if (!audioRef.current) {
                audioRef.current = new Audio(notificationSound);
                audioRef.current.volume = 0.5;
              }
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});

              // Browser notification
              showBrowserNotification(
                `Nova poruka od ${senderUsername}`,
                message.message?.content || "Poslao ti je poruku",
                senderUsername,
              );
            } else {
              // Tab is visible — play sound quietly
              if (!audioRef.current) {
                audioRef.current = new Audio(notificationSound);
              }
              audioRef.current.volume = 0.3;
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

            // Update document title with unread indicator
            if (document.hidden) {
              document.title = `💬 Nova poruka — Studio LeFlow`;
            }
          }
        }
        
        messageListeners.current.forEach(listener => listener(message));
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      ws.current = null; // Clear the reference so reconnect can create new socket
      
      reconnectTimeout.current = setTimeout(() => {
        // CRITICAL: Check current user from ref, not closure
        // This prevents reconnecting with stale auth after logout
        if (userRef.current) {
          console.log('[WebSocket] Reconnecting...');
          connect();
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }, []); // No user dependency - reads from ref instead

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
    userRef.current = user;
  }, [user]);

  // Reset document title when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && document.title.startsWith("💬")) {
        document.title = "Studio LeFlow";
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, send, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
