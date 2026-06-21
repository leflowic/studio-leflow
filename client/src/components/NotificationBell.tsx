import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Notif = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  postId: number | null;
  fromUsername: string | null;
  fromAvatarUrl: string | null;
};

const TYPE_EMOJI: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  mention: "📢",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { subscribe } = useWebSocketContext();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000,
  });

  const { data: notifs = [], isLoading } = useQuery<Notif[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-read", {}),
    onSuccess: () => {
      queryClient.setQueryData(["/api/notifications/unread-count"], { count: 0 });
      queryClient.setQueryData<Notif[]>(["/api/notifications"], old =>
        old?.map(n => ({ ...n, read: true })) ?? []
      );
    },
  });

  // Real-time count bump on WS feed_notification
  useEffect(() => {
    return subscribe(msg => {
      if (msg.type === "feed_notification") {
        queryClient.setQueryData<{ count: number }>(["/api/notifications/unread-count"], old =>
          ({ count: (old?.count ?? 0) + 1 })
        );
        if (open) {
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      }
    });
  }, [subscribe, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = countData?.count ?? 0;

  const handleOpen = () => {
    setOpen(s => !s);
    if (!open && unread > 0) markRead.mutate();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
        aria-label="Notifikacije"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border/60 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="font-semibold text-sm">Notifikacije</span>
            {unread > 0 && <span className="text-xs text-muted-foreground">{unread} novih</span>}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Učitavam...</div>
            ) : notifs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nema notifikacija</div>
            ) : (
              notifs.map(n => (
                <Link
                  key={n.id}
                  href={n.postId ? "/zajednica" : "/zajednica"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-8 h-8">
                      {n.fromAvatarUrl ? (
                        <img src={n.fromAvatarUrl} alt={n.fromUsername ?? ""} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(n.fromUsername ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 text-[11px]">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: sr })}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
