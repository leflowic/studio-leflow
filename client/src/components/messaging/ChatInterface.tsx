import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Trash2 } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Helper function to format date headers
function formatDateHeader(date: Date): string {
  if (isToday(date)) return "Danas";
  if (isYesterday(date)) return "Juče";
  return format(date, "dd.MM.yyyy");
}

// Helper function to format last seen status
function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Nepoznato";
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = now.getTime() - lastSeenDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  
  if (diffInMinutes < 1) return "Online";
  if (diffInMinutes < 60) return `Aktivan pre ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Aktivan pre ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Aktivan juče";
  if (diffInDays < 7) return `Aktivan pre ${diffInDays} dana`;
  
  return "Aktivan davno";
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  imageUrl: string | null;
  deleted: boolean;
  createdAt: string;
  isRead: boolean;
}

interface OtherUser {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  lastSeen: string | null;
}

interface ChatInterfaceProps {
  selectedUserId: number;
  onBack: () => void;
}

export default function ChatInterface({ selectedUserId, onBack }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { send, subscribe } = useWebSocketContext();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUnreadMessagesRef = useRef<Set<number>>(new Set());

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation/${selectedUserId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const { data: otherUser } = useQuery<OtherUser>({
    queryKey: ["/api/users", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${selectedUserId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUserId,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      setMessageText("");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
        scrollToBottom();
      }
      
      if (message.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      
      if (message.type === "typing_start" && message.userId === selectedUserId) {
        setOtherUserTyping(true);
      }
      
      if (message.type === "typing_stop" && message.userId === selectedUserId) {
        setOtherUserTyping(false);
      }
    });

    return unsubscribe;
  }, [subscribe, selectedUserId, queryClient, scrollToBottom]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      send({ type: "typing_start", receiverId: selectedUserId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      send({ type: "typing_stop", receiverId: selectedUserId });
    }, 500);
  }, [isTyping, send, selectedUserId]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    sendMessageMutation.mutate(messageText.trim());
    
    if (isTyping) {
      setIsTyping(false);
      send({ type: "typing_stop", receiverId: selectedUserId });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <Card className="border-0 md:border-b rounded-none">
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
            data-testid="button-back-to-inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <AvatarWithInitials
            src={otherUser?.avatarUrl}
            alt={otherUser?.username || "User"}
            name={otherUser?.username || "User"}
            userId={selectedUserId}
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="flex-1">
            <h3 className="font-semibold">{otherUser?.username || "Učitavanje..."}</h3>
            {otherUserTyping ? (
              <p className="text-xs text-muted-foreground italic">Korisnik kuca...</p>
            ) : otherUser?.lastSeen && (
              <p className="text-xs text-muted-foreground">{formatLastSeen(otherUser.lastSeen)}</p>
            )}
          </div>
        </div>
      </Card>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-1 pb-4">
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const isAlignedRight = isOwn; // User's messages RIGHT, other's LEFT (WhatsApp style)
              const currentDate = new Date(message.createdAt);
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null;
              const showDateHeader = !previousDate || !isSameDay(currentDate, previousDate);
              
              // Check if this message is from the same sender as previous one (for grouping)
              const isGrouped = previousMessage && 
                previousMessage.senderId === message.senderId && 
                !showDateHeader &&
                (new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) < 60000; // Within 1 minute
              
              return (
                <div key={message.id}>
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-secondary/70 px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {formatDateHeader(currentDate)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex gap-2 items-end",
                      isAlignedRight ? "justify-end" : "justify-start",
                      isGrouped ? "mt-1" : "mt-4"
                    )}
                  >
                    {!isGrouped && (
                      <AvatarWithInitials
                        src={isOwn ? user?.avatarUrl : otherUser?.avatarUrl}
                        alt={isOwn ? user?.username : otherUser?.username}
                        name={isOwn ? user?.username || "User" : otherUser?.username || "User"}
                        userId={isOwn ? user?.id : selectedUserId}
                        className={cn(
                          "w-8 h-8 flex-shrink-0",
                          isAlignedRight && "order-2"
                        )}
                      />
                    )}
                    {isGrouped && <div className="w-8 flex-shrink-0" />}
                    <div className="flex items-start gap-1">
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 group relative shadow-sm",
                          "max-w-[min(42rem,90vw)]",
                          isAlignedRight
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm",
                          message.deleted && "opacity-60"
                        )}
                      >
                        {message.deleted ? (
                          <p className="text-sm italic text-muted-foreground">Poruka obrisana</p>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed [word-break:break-word] [overflow-wrap:anywhere]">
                              {message.content}
                            </p>
                            {message.imageUrl && (
                              <img
                                src={message.imageUrl}
                                alt="attachment"
                                className="mt-2 rounded max-w-full h-auto"
                              />
                            )}
                          </>
                        )}
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1",
                          isAlignedRight ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-[11px] leading-none",
                            isAlignedRight ? "text-primary-foreground/60" : "text-muted-foreground/70"
                          )}>
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                          {isOwn && (
                            <span className={cn(
                              "flex items-center",
                              isAlignedRight ? "text-primary-foreground/60" : "text-muted-foreground/70"
                            )}>
                              {message.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOwn && !message.deleted && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-message-${message.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Obriši poruku</AlertDialogTitle>
                              <AlertDialogDescription>
                                Da li ste sigurni da želite da obrišete ovu poruku? Poruka će biti označena kao obrisana.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Otkaži</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMessageMutation.mutate(message.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete"
                              >
                                Obriši
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>Nema poruka</p>
              <p className="text-sm mt-1">Pošaljite prvu poruku da započnete konverzaciju</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Card className="border-0 md:border-t rounded-none">
        <div className="p-4 flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Napišite poruku..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
