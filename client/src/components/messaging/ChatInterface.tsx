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
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Trash2, Smile, Paperclip, CornerUpLeft, X } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatDateHeader(date: Date): string {
  if (isToday(date)) return "Danas";
  if (isYesterday(date)) return "Juče";
  return format(date, "dd.MM.yyyy");
}

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

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤔","😢","😡","🎉","❤️",
  "👍","👎","🔥","💯","🙏","✅","💪","🎵","🎶","💙",
  "😊","🙂","😏","😒","🥺","😭","😤","🤝","👋","💬",
  "🌟","⭐","🎸","🎤","🥁","🎧","🎼","🎹","🎺","🎻",
  "💥","🚀","💡","📝","📌","🔑","💎","🏆","🎯","✨",
  "😘","🤩","🥳","😴","🤯","🫡","🤗","😬","🫶","❤️‍🔥",
];

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  imageUrl: string | null;
  replyToId: number | null;
  deleted: boolean;
  createdAt: string;
  isRead: boolean;
}

interface OtherUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  lastSeen: string | null;
}

interface ChatInterfaceProps {
  selectedUserId: number;
  onBack: () => void;
}

export default function ChatInterface({ selectedUserId, onBack }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { send, subscribe, playNotificationSound } = useWebSocketContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const knownMessageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/conversation/${selectedUserId}`);
      return res.json();
    },
    refetchInterval: 3000,
    staleTime: 0,
  });

  // Sound for polling-delivered messages
  useEffect(() => {
    if (!messages || !user) return;
    const isFirstLoad = knownMessageIdsRef.current.size === 0;
    let hasNewFromOther = false;
    for (const msg of messages) {
      if (!knownMessageIdsRef.current.has(msg.id)) {
        if (!isFirstLoad && msg.senderId !== user.id) hasNewFromOther = true;
        knownMessageIdsRef.current.add(msg.id);
      }
    }
    if (hasNewFromOther) playNotificationSound();
  }, [messages, user, playNotificationSound]);

  useEffect(() => {
    if (messages) {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    }
  }, [messages, queryClient]);

  const { data: otherUser } = useQuery<OtherUser>({
    queryKey: ["/api/users", selectedUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${selectedUserId}`);
      return res.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: number }) => {
      const res = await apiRequest("POST", "/api/messages/send", {
        receiverId: selectedUserId,
        content,
        replyToId,
      });
      return res.json();
    },
    onSuccess: (newMsg: Message) => {
      queryClient.setQueryData(
        ["/api/messages/conversation", selectedUserId],
        (old: Message[] | undefined) => {
          if (!old) return [newMsg];
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        }
      );
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      setMessageText("");
      setReplyTo(null);
      scrollToBottom();
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

  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/messages/conversation/${selectedUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      toast({ title: "Poruke obrisane", description: "Vaše poruke su obrisane" });
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const sc = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "new_message") {
        const newMsg = message.message;
        if (newMsg && (newMsg.senderId === selectedUserId || newMsg.receiverId === selectedUserId)) {
          // Track ID before setQueryData so the polling effect doesn't double-play sound
          knownMessageIdsRef.current.add(newMsg.id);
          queryClient.setQueryData(
            ["/api/messages/conversation", selectedUserId],
            (old: Message[] | undefined) => {
              if (!old) return [newMsg];
              if (old.some((m) => m.id === newMsg.id)) return old;
              return [...old, newMsg];
            }
          );
          scrollToBottom();
        }
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      if (message.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      if (message.type === "typing_start" && message.userId === selectedUserId) setOtherUserTyping(true);
      if (message.type === "typing_stop" && message.userId === selectedUserId) setOtherUserTyping(false);
    });
    return unsubscribe;
  }, [subscribe, selectedUserId, queryClient, scrollToBottom]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      send({ type: "typing_start", receiverId: selectedUserId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      send({ type: "typing_stop", receiverId: selectedUserId });
    }, 500);
  }, [isTyping, send, selectedUserId]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText.trim(), replyToId: replyTo?.id });
    if (isTyping) {
      setIsTyping(false);
      send({ type: "typing_stop", receiverId: selectedUserId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setMessageText(p => p + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = messageText.slice(0, start) + emoji + messageText.slice(end);
    setMessageText(newText);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
    }, 0);
    setShowEmojiPicker(false);
  };

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Greška", description: "Dozvoljeni su samo JPG, PNG i WebP", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/upload/message-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      // Send as a message with imageUrl
      const msgRes = await apiRequest("POST", "/api/messages/send", {
        receiverId: selectedUserId,
        content: "📎",
        imageUrl: url,
        replyToId: replyTo?.id,
      });
      const newMsg: Message = await msgRes.json();
      queryClient.setQueryData(
        ["/api/messages/conversation", selectedUserId],
        (old: Message[] | undefined) => {
          if (!old) return [newMsg];
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        }
      );
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      setReplyTo(null);
      scrollToBottom();
    } catch {
      toast({ title: "Greška", description: "Nije moguće uploadovati sliku", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getReplyPreview = (replyToId: number | null): string => {
    if (!replyToId || !messages) return "";
    const msg = messages.find(m => m.id === replyToId);
    if (!msg || msg.deleted) return "Obrisana poruka";
    if (msg.imageUrl && msg.content === "📎") return "📷 Slika";
    return msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
  };

  const getReplyUsername = (replyToId: number | null): string => {
    if (!replyToId || !messages) return "";
    const msg = messages.find(m => m.id === replyToId);
    if (!msg) return "";
    return msg.senderId === user?.id ? "Ti" : otherUser?.username ?? "";
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <Card className="border-0 md:border-b rounded-none">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <AvatarWithInitials
            src={otherUser?.avatarUrl}
            alt={otherUser?.username || "User"}
            name={otherUser?.username || "User"}
            userId={selectedUserId}
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{otherUser?.username || "Učitavanje..."}</h3>
            {otherUserTyping ? (
              <p className="text-xs text-primary italic">kuca...</p>
            ) : otherUser?.lastSeen ? (
              <p className="text-xs text-muted-foreground">{formatLastSeen(otherUser.lastSeen)}</p>
            ) : null}
          </div>
          {/* Delete conversation button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0" title="Obriši moje poruke">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Obriši moje poruke</AlertDialogTitle>
                <AlertDialogDescription>
                  Ovo će obrisati sve vaše poslate poruke u ovoj konverzaciji. Poruke druge strane ostaju vidljive njima.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteConversationMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Obriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-1 pb-4">
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const currentDate = new Date(message.createdAt);
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null;
              const showDateHeader = !previousDate || !isSameDay(currentDate, previousDate);
              const isGrouped = previousMessage &&
                previousMessage.senderId === message.senderId &&
                !showDateHeader &&
                (new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) < 60000;

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
                  <div className={cn(
                    "flex gap-2 items-end",
                    isOwn ? "justify-end" : "justify-start",
                    isGrouped ? "mt-1" : "mt-4"
                  )}>
                    {!isGrouped && (
                      <AvatarWithInitials
                        src={isOwn ? user?.avatarUrl : otherUser?.avatarUrl}
                        alt={isOwn ? user?.username : otherUser?.username}
                        name={isOwn ? user?.username || "User" : otherUser?.username || "User"}
                        userId={isOwn ? user?.id : selectedUserId}
                        className={cn("w-8 h-8 flex-shrink-0", isOwn && "order-2")}
                      />
                    )}
                    {isGrouped && <div className="w-8 flex-shrink-0" />}

                    <div className="flex items-end gap-1 group">
                      {/* Reply button (shown on hover, left side for own messages) */}
                      {!message.deleted && isOwn && (
                        <Button
                          variant="ghost" size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground order-first"
                          onClick={() => { setReplyTo(message); textareaRef.current?.focus(); }}
                          title="Odgovori"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <div className={cn(
                        "rounded-lg px-3 py-2 shadow-sm",
                        "max-w-[min(42rem,80vw)]",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                        message.deleted && "opacity-60"
                      )}>
                        {/* Reply quote */}
                        {!message.deleted && message.replyToId && (
                          <div className={cn(
                            "mb-2 px-2 py-1 rounded text-xs border-l-2 opacity-80",
                            isOwn ? "border-primary-foreground/50 bg-primary-foreground/10" : "border-primary bg-primary/10"
                          )}>
                            <p className="font-semibold mb-0.5">{getReplyUsername(message.replyToId)}</p>
                            <p className="truncate">{getReplyPreview(message.replyToId)}</p>
                          </div>
                        )}

                        {message.deleted ? (
                          <p className="text-sm italic opacity-60">Poruka obrisana</p>
                        ) : (
                          <>
                            {!(message.imageUrl && message.content === "📎") && (
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed [word-break:break-word] [overflow-wrap:anywhere]">
                                {message.content}
                              </p>
                            )}
                            {message.imageUrl && (
                              <img
                                src={message.imageUrl}
                                alt="attachment"
                                className="mt-1 rounded max-w-full h-auto cursor-pointer"
                                onClick={() => window.open(message.imageUrl!, "_blank")}
                              />
                            )}
                          </>
                        )}

                        <div className={cn(
                          "flex items-center gap-1.5 mt-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-[11px] leading-none",
                            isOwn ? "text-primary-foreground/60" : "text-muted-foreground/70"
                          )}>
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                          {isOwn && (
                            <span className={cn(isOwn ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                              {message.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reply button for other user's messages (right side) */}
                      {!message.deleted && !isOwn && (
                        <Button
                          variant="ghost" size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground"
                          onClick={() => { setReplyTo(message); textareaRef.current?.focus(); }}
                          title="Odgovori"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Delete own message */}
                      {isOwn && !message.deleted && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Obriši poruku</AlertDialogTitle>
                              <AlertDialogDescription>
                                Da li ste sigurni? Poruka će biti označena kao obrisana za obe strane.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Otkaži</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMessageMutation.mutate(message.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </div>
      </ScrollArea>

      {/* Input area */}
      <Card className="border-0 md:border-t rounded-none">
        <div className="px-4 pt-3 pb-3 space-y-2">
          {/* Reply bar */}
          {replyTo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
              <CornerUpLeft className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-primary text-xs">
                  {replyTo.senderId === user?.id ? "Ti" : otherUser?.username}
                </span>
                <p className="text-muted-foreground truncate text-xs mt-0.5">
                  {replyTo.imageUrl && replyTo.content === "📎" ? "📷 Slika" : replyTo.content}
                </p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="grid grid-cols-10 gap-1 p-3 bg-popover border rounded-xl shadow-lg"
            >
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl hover:bg-muted rounded p-0.5 transition-colors leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar + textarea */}
          <div className="flex gap-2 items-end">
            <div className="flex gap-1 flex-shrink-0 pb-1">
              <Button
                variant="ghost" size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setShowEmojiPicker(p => !p)}
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Pošalji sliku"
              >
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageAttach}
              />
            </div>

            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Napišite poruku..."
              className="min-h-[44px] max-h-[120px] resize-none flex-1"
              disabled={sendMessageMutation.isPending}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-[44px] w-[44px] flex-shrink-0"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
