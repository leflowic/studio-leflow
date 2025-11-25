type BroadcastFunction = (userId: number, message: any) => void;
type NotificationFunction = (userId: number, title: string, description?: string, variant?: 'default' | 'destructive') => void;
type OnlineUsersAccessor = () => number[];

interface WebSocketHelpers {
  broadcastToUser: BroadcastFunction | null;
  sendNotification: NotificationFunction | null;
  getOnlineUserIds: OnlineUsersAccessor | null;
}

export const wsHelpers: WebSocketHelpers = {
  broadcastToUser: null,
  sendNotification: null,
  getOnlineUserIds: null,
};

export function setBroadcastFunction(fn: BroadcastFunction) {
  wsHelpers.broadcastToUser = fn;
}

export function setNotificationFunction(fn: NotificationFunction) {
  wsHelpers.sendNotification = fn;
}

export function setOnlineUsersAccessor(fn: OnlineUsersAccessor) {
  wsHelpers.getOnlineUserIds = fn;
}

export function notifyUser(userId: number, title: string, description?: string, variant: 'default' | 'destructive' = 'default') {
  if (wsHelpers.sendNotification) {
    wsHelpers.sendNotification(userId, title, description, variant);
  } else {
    console.warn('[WS] sendNotification not initialized yet, skipping notification');
  }
}

export function getOnlineUsersSnapshot(): number[] {
  if (wsHelpers.getOnlineUserIds) {
    return wsHelpers.getOnlineUserIds();
  }
  return [];
}
