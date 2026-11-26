import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle, SearchX, Loader2 } from "lucide-react";
import { ImageLabel, AudioLabel } from "@/components/messaging/ImageLabel";
import { isToday, isYesterday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ConversationData {
  id: number;
  otherUser: { id: number; username: string; avatarUrl: string | null | undefined };
  lastMessage: { id: number; content: string; senderId: number; receiverId: number; deleted: boolean } | null;
  lastMessageAt: string;
  unreadCount: number;
  deleted: boolean;
}

interface ConversationListProps {
  selectedUserId: number | null;
  onSelectConversation: (userId: number) => void;
  searchQuery?: string;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Juče";
  const daysDiff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (daysDiff < 7) {
    const days = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
    return days[date.getDay()] ?? format(date, "d.M.");
  }
  return format(date, "d.M.");
}

export default function ConversationList({ selectedUserId, onSelectConversation, searchQuery = "" }: ConversationListProps) {
  const { user } = useAuth();
  const { subscribe } = useWebSocketContext();

  const { data: conversations, isLoading, refetch } = useQuery<ConversationData[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      return res.json();
    },
    refetchInterval: 60_000, // WebSocket events refetch this; polling is only a safety net
    staleTime: 0,
  });

  const q = searchQuery.trim().toLowerCase();
  const filteredConversations = conversations?.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(q)
  ) ?? [];

  // People search (new conversation) runs from the same box once 2+ characters are typed
  const [debounced, setDebounced] = useState(q);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data: people, isFetching: peopleLoading } = useQuery<Array<{ id: number; username: string; avatarUrl: string | null }>>({
    queryKey: ["/api/users/search", debounced],
    queryFn: async () => (await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(debounced)}`)).json(),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
  const knownIds = new Set((conversations ?? []).map(c => c.otherUser.id));
  const newPeople = q.length >= 2 ? (Array.isArray(people) ? people : []).filter(p => !knownIds.has(p.id)) : [];

  useEffect(() => {
    return subscribe(message => {
      if (["new_message", "message_read", "message_deleted"].includes(message.type)) refetch();
    });
  }, [subscribe, refetch]);

  const getLastMessageText = (conv: ConversationData): React.ReactNode => {
    if (!conv.lastMessage) return "Započni konverzaciju";
    if (conv.lastMessage.deleted) return "Poruka obrisana";
    const prefix = conv.lastMessage.senderId === user?.id ? "Ti: " : "";
    const content = conv.lastMessage.content;
    // "📎" is the stored placeholder content of an image-only message
    if (content === "📎") return <>{prefix}<ImageLabel /></>;
    if (content === "🎵") return <>{prefix}<AudioLabel /></>;
    const truncated = content.length > 45 ? content.slice(0, 45) + "…" : content;
    return prefix + truncated;
  };

  if (isLoading) {
    return (
      <div className="py-1 space-y-0.5 px-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" data-testid="conversation-list">
      {filteredConversations.length > 0 && (
        <div className="py-1.5 px-2" data-testid="conversations-list">
          {filteredConversations.map(conv => {
            const isSelected = selectedUserId === conv.otherUser.id;
            const hasUnread = conv.unreadCount > 0;
            const isDeletedMsg = conv.lastMessage?.deleted;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.otherUser.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  isSelected ? "bg-muted" : "hover:bg-muted/60"
                )}
                aria-current={isSelected ? "true" : undefined}
                data-testid={`conversation-item-${conv.otherUser.id}`}
              >
                <AvatarWithInitials
                  src={conv.otherUser.avatarUrl}
                  alt={conv.otherUser.username}
                  name={conv.otherUser.username}
                  userId={conv.otherUser.id}
                  className="w-12 h-12 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn("text-[15px] truncate", hasUnread ? "font-semibold" : "font-medium")}>{conv.otherUser.username}</p>
                    <span className={cn("text-[11px] flex-shrink-0 font-mono", hasUnread ? "text-primary" : "text-muted-foreground")}>
                      {formatTimestamp(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={cn(
                      "text-[13px] truncate",
                      isDeletedMsg ? "italic text-muted-foreground/70" : hasUnread ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {getLastMessageText(conv)}
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary text-primary-foreground text-[11px] font-semibold rounded-full flex items-center justify-center px-1.5 font-mono">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {q.length >= 2 && (
        <div className="px-2 pb-3">
          <p className="px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
            Novi razgovor {peopleLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>
          {newPeople.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectConversation(p.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-muted/60 transition-colors"
              data-testid={`user-result-${p.id}`}
            >
              <AvatarWithInitials src={p.avatarUrl} alt={p.username} name={p.username} userId={p.id} className="w-10 h-10 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{p.username}</span>
            </button>
          ))}
          {!peopleLoading && debounced === q && newPeople.length === 0 && (
            <p className="px-3 py-1 text-sm text-muted-foreground">Nema drugih korisnika sa tim imenom.</p>
          )}
        </div>
      )}

      {filteredConversations.length === 0 && q.length < 2 && (
        conversations && conversations.length > 0 ? (
          <EmptyState icon={SearchX} text="Nema rezultata pretrage" compact />
        ) : (
          <EmptyState icon={MessageCircle} text="Još nema razgovora" sub="Potražite nekoga po korisničkom imenu iznad." />
        )
      )}
    </ScrollArea>
  );
}
