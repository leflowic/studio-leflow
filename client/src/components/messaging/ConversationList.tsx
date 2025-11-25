import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { sr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import UserSearch from "./UserSearch";

interface ConversationData {
  id: number;
  otherUser: {
    id: number;
    username: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    receiverId: number;
    deleted: boolean;
  } | null;
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
  
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  
  if (isYesterday(date)) {
    return "Juče";
  }
  
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return formatDistanceToNow(date, { addSuffix: true, locale: sr });
  }
  
  return format(date, "d MMM", { locale: sr });
}

export default function ConversationList({ selectedUserId, onSelectConversation, searchQuery = "" }: ConversationListProps) {
  const { user } = useAuth();
  const { subscribe } = useWebSocketContext();

  const { data: conversations, isLoading, refetch } = useQuery<ConversationData[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  // Filter conversations based on search query
  const filteredConversations = conversations?.filter((conv) =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "new_message") {
        refetch();
      }
      if (message.type === "message_read") {
        refetch();
      }
      if (message.type === "message_deleted") {
        refetch();
      }
    });

    return unsubscribe;
  }, [subscribe, refetch]);

  const truncateMessage = (text: string | null, maxLength: number = 50): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="conversation-list">
      <div className="p-4">
        <UserSearch onSelectUser={onSelectConversation} />
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        {filteredConversations && filteredConversations.length > 0 ? (
          <div data-testid="conversations-list">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.otherUser.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b",
                  selectedUserId === conversation.otherUser.id && "bg-muted"
                )}
                data-testid={`conversation-item-${conversation.otherUser.id}`}
              >
                <AvatarWithInitials
                  src={conversation.otherUser.avatarUrl}
                  alt={conversation.otherUser.username}
                  name={conversation.otherUser.username}
                  userId={conversation.otherUser.id}
                  className="w-10 h-10 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm truncate">
                      {conversation.otherUser.username}
                    </p>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatTimestamp(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm truncate",
                      conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {conversation.lastMessage?.deleted ? (
                        <span className="italic text-muted-foreground">Poruka obrisana</span>
                      ) : conversation.lastMessage?.content ? (
                        truncateMessage(conversation.lastMessage.content)
                      ) : (
                        <span className="italic">Započni konverzaciju</span>
                      )}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nema rezultata pretrage</p>
            <p className="text-xs mt-1">Pokušajte sa drugim imenom korisnika</p>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nema aktivnih konverzacija</p>
            <p className="text-xs mt-1">Pretražite korisnike da započnete chat</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
