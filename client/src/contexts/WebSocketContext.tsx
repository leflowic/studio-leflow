import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import notificationSound from "@assets/universfield-new-notification-035-485894.mp3";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string, senderUsername?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.hidden) return; // Only show when tab is in background
  const notifOptions: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: "/leflow-logo-white.png",
    tag: senderUsername || "message",
    renotify: true,
  };
  const n = new Notification(title, notifOptions);
  n.onclick = () => { window.focus(); n.close(); };
}

export type WebSocketMessage =
  | { type: 'online_status'; userId: number; online: boolean }
  | { type: 'typing_start'; userId: number }
  | { type: 'typing_stop'; userId: number }
  | { type: 'new_message'; message: any }
  | { type: 'message_read'; conversationId: number; readBy: number }
  | { type: 'message_deleted'; messageId: number }
  | { type: 'message_edited'; message: any }
  | { type: 'message_reaction'; messageId: number; userId: number; emoji: string; added: boolean }
  | { type: 'notification'; title: string; description?: string; variant?: 'default' | 'destructive' }
  | { type: 'feed_notification'; notification: any }
  | { type: 'community-chat:new'; message: any }
  | { type: 'community-chat:delete'; messageId: number }
  | { type: 'community-chat:clear' };

interface WebSocketContextType {
  isConnected: boolean;
  send: (message: any) => void;
  subscribe: (listener: (message: WebSocketMessage) => void) => () => void;
  playNotificationSound: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectDelay = useRef(3000);
  const messageListeners = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const userRef = useRef(user); // Track current user to prevent stale reconnects
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Load audio via AudioContext - works reliably in background tabs
  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    fetch(notificationSound)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { audioBufferRef.current = decoded; })
      .catch(e => console.warn('[Audio] Failed to load sound:', e));

    // AudioContext starts suspended - resume on first user interaction
    const unlock = () => {
      ctx.resume().catch(() => {});
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      ctx.close().catch(() => {});
    };
  }, []);

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
      reconnectDelay.current = 3000; // reset backoff on successful connect
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
          
          playNotificationSound();
        }
        
        // Handle feed notifications (like, comment, mention)
        if (message.type === 'feed_notification') {
          playNotificationSound();
          // Bust the unread count cache so bell updates immediately
          import('@/lib/queryClient').then(({ queryClient }) => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
          });
        }

        // Handle new messages from other users
        if (message.type === 'new_message') {
          const currentUserId = userRef.current?.id;
          const messageSenderId = message.message?.senderId;
          const senderUsername = message.message?.senderUsername || "Novi msg";

          if (currentUserId && messageSenderId && messageSenderId !== currentUserId) {
            playNotificationSound();

            if (document.hidden) {
              showBrowserNotification(
                `Nova poruka od ${senderUsername}`,
                message.message?.content || "Poslao ti je poruku",
                senderUsername,
              );
              document.title = `💬 Nova poruka - Studio LeFlow`;
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
          console.log(`[WebSocket] Reconnecting (delay ${reconnectDelay.current}ms)...`);
          connect();
        }
      }, reconnectDelay.current);
      // Exponential backoff: 3s → 6s → 12s → ... capped at 30s
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
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

  const playNotificationSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }
    try {
      const gain = ctx.createGain();
      gain.gain.value = document.hidden ? 0.5 : 0.3;
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(0);
    } catch (e) {
      console.warn('[Audio] Playback failed:', e);
    }
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
    <WebSocketContext.Provider value={{ isConnected, send, subscribe, playNotificationSound }}>
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
