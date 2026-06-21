import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { Loader2, MessageCircle } from "lucide-react";
import { isToday, isYesterday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import UserSearch from "./UserSearch";

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
    refetchInterval: 5000,
    staleTime: 0,
  });

  const filteredConversations = conversations?.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  useEffect(() => {
    return subscribe(message => {
      if (["new_message", "message_read", "message_deleted"].includes(message.type)) refetch();
    });
  }, [subscribe, refetch]);

  const getLastMessageText = (conv: ConversationData): string => {
    if (!conv.lastMessage) return "Započni konverzaciju";
    if (conv.lastMessage.deleted) return "Poruka obrisana";
    const prefix = conv.lastMessage.senderId === user?.id ? "Ti: " : "";
    const content = conv.lastMessage.content;
    const text = content === "📎" ? "📷 Slika" : content;
    const truncated = text.length > 45 ? text.slice(0, 45) + "…" : text;
    return prefix + truncated;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="conversation-list">

      {/* New conversation search */}
      <div className="px-4 py-2 border-b border-border/30">
        <UserSearch onSelectUser={onSelectConversation} />
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length > 0 ? (
          <div className="py-1" data-testid="conversations-list">
            {filteredConversations.map(conv => {
              const isSelected = selectedUserId === conv.otherUser.id;
              const hasUnread = conv.unreadCount > 0;
              const lastText = getLastMessageText(conv);
              const isDeletedMsg = conv.lastMessage?.deleted;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.otherUser.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/5"
                  )}
                  data-testid={`conversation-item-${conv.otherUser.id}`}
                >
                  {/* Active indicator bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                  )}

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <AvatarWithInitials
                      src={conv.otherUser.avatarUrl}
                      alt={conv.otherUser.username}
                      name={conv.otherUser.username}
                      userId={conv.otherUser.id}
                      className="w-11 h-11"
                    />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p className={cn("text-sm truncate", hasUnread ? "font-bold" : "font-medium")}>
                        {conv.otherUser.username}
                      </p>
                      <span className={cn(
                        "text-[11px] flex-shrink-0 tabular-nums",
                        hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {formatTimestamp(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs truncate",
                        isDeletedMsg ? "italic text-muted-foreground/60" : hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {lastText}
                      </p>
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="py-10 px-6 text-center text-muted-foreground">
            <p className="text-sm">Nema rezultata pretrage</p>
          </div>
        ) : (
          <div className="py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium mb-1">Nema konverzacija</p>
            <p className="text-xs text-muted-foreground">Pretražite korisnika gore da biste započeli</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
