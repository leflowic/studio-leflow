import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Trash2, Smile, Paperclip, CornerUpLeft, X, ChevronDown, Pencil, Forward, ExternalLink } from "lucide-react";
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

const QUICK_REACTIONS = ["❤️","👍","😂","😮","😢","🔥"];

interface Reaction { emoji: string; count: number; userIds: number[] }

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
  editedAt: string | null;
  reactions: Reaction[];
}

interface OtherUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  lastSeen: string | null;
}

interface Conversation {
  id: number;
  otherUser: { id: number; username: string; avatarUrl: string | null };
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatInterfaceProps {
  selectedUserId: number;
  onBack: () => void;
}

// Link preview component
function LinkPreview({ text }: { text: string }) {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  const url = urlMatch?.[1];

  const { data, isLoading } = useQuery({
    queryKey: ["/api/link-preview", url],
    queryFn: async () => {
      if (!url) return null;
      const res = await apiRequest("GET", `/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!url,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (!url || isLoading || !data || (!data.title && !data.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex gap-2 rounded-xl overflow-hidden border border-border/40 bg-background/50 hover:bg-background/80 transition-colors text-left no-underline"
      onClick={e => e.stopPropagation()}
    >
      {data.image && (
        <img src={data.image} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 p-2">
        {data.siteName && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{data.siteName}</p>
        )}
        {data.title && (
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{data.title}</p>
        )}
        {data.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{data.description}</p>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 m-2 text-muted-foreground" />
    </a>
  );
}

export default function ChatInterface({ selectedUserId, onBack }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { send, subscribe, playNotificationSound } = useWebSocketContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const DRAFT_KEY = `draft_msg_${selectedUserId}`;
  const [messageText, setMessageText] = useState(() => localStorage.getItem(`draft_msg_${selectedUserId}`) ?? "");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Forward state
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Unread divider
  const firstUnreadIdRef = useRef<number | null>(null);
  const hasScrolledToUnreadRef = useRef(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const knownMessageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/conversation/${selectedUserId}`);
      return res.json();
    },
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
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
      localStorage.removeItem(DRAFT_KEY);
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

  const getScrollViewport = useCallback(() =>
    scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
  , []);

  const scrollToBottom = useCallback(() => {
    const sc = getScrollViewport();
    if (sc) sc.scrollTop = sc.scrollHeight;
  }, [getScrollViewport]);

  // Unread divider scroll
  useEffect(() => {
    if (!messages || !user || hasScrolledToUnreadRef.current) return;
    const firstUnread = messages.find(m => m.senderId !== user.id && !m.isRead && !m.deleted);
    if (firstUnread) {
      firstUnreadIdRef.current = firstUnread.id;
      setTimeout(() => {
        const el = document.getElementById("unread-divider");
        if (el) {
          const sc = getScrollViewport();
          if (sc) sc.scrollTop = el.offsetTop - 60;
        }
      }, 100);
    } else {
      scrollToBottom();
    }
    hasScrolledToUnreadRef.current = true;
  }, [messages, user, getScrollViewport, scrollToBottom]);

  // Scroll-to-bottom button visibility
  useEffect(() => {
    const sc = getScrollViewport();
    if (!sc) return;
    const onScroll = () => {
      const distFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => sc.removeEventListener("scroll", onScroll);
  }, [getScrollViewport, messages]);

  // Draft saving
  useEffect(() => {
    if (messageText) localStorage.setItem(DRAFT_KEY, messageText);
    else localStorage.removeItem(DRAFT_KEY);
  }, [messageText, DRAFT_KEY]);

  // Clear draft key when switching conversations (runs on unmount)
  useEffect(() => () => { /* draft stays — intentional */ }, [selectedUserId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Jump to quoted message
  const jumpToMessage = useCallback((msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    const sc = getScrollViewport();
    if (sc) {
      const offset = el.offsetTop - sc.clientHeight / 2;
      sc.scrollTo({ top: offset, behavior: "smooth" });
    }
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }, [getScrollViewport]);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "new_message") {
        const newMsg = message.message;
        if (newMsg && (newMsg.senderId === selectedUserId || newMsg.receiverId === selectedUserId)) {
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
      if (message.type === "message_edited") {
        queryClient.setQueryData(
          ["/api/messages/conversation", selectedUserId],
          (old: Message[] | undefined) => old
            ? old.map(m => m.id === message.message.id ? { ...m, ...message.message } : m)
            : old
        );
      }
      if (message.type === "message_reaction") {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingMessageId) cancelEdit();
        else if (replyTo) setReplyTo(null);
        else if (lightboxSrc) setLightboxSrc(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingMessageId, replyTo, lightboxSrc]);

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

  // Edit handlers
  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.content);
    setTimeout(() => editTextareaRef.current?.focus(), 50);
  };
  const cancelEdit = () => { setEditingMessageId(null); setEditText(""); };
  const saveEdit = async () => {
    if (!editText.trim() || !editingMessageId) return;
    try {
      await apiRequest("PATCH", `/api/messages/${editingMessageId}`, { content: editText.trim() });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      cancelEdit();
    } catch { /* silent */ }
  };

  // Reaction handler
  const toggleReaction = async (messageId: number, emoji: string) => {
    try {
      await apiRequest("POST", `/api/messages/${messageId}/react`, { emoji });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
    } catch { /* silent */ }
  };

  // Forward handler
  const handleForward = async (toUserId: number) => {
    if (!forwardMessage) return;
    await apiRequest("POST", "/api/messages/send", { receiverId: toUserId, content: forwardMessage.content });
    setForwardMessage(null);
    toast({ title: "Poruka prosleđena" });
  };

  if (messagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex justify-start"><Skeleton className="h-10 w-48 rounded-2xl rounded-bl-md" /></div>
          <div className="flex justify-end"><Skeleton className="h-10 w-36 rounded-2xl rounded-br-md" /></div>
          <div className="flex justify-start"><Skeleton className="h-16 w-56 rounded-2xl rounded-bl-md" /></div>
          <div className="flex justify-end"><Skeleton className="h-10 w-40 rounded-2xl rounded-br-md" /></div>
        </div>
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
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-card/80 backdrop-blur-sm flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <AvatarWithInitials
            src={otherUser?.avatarUrl}
            alt={otherUser?.username || "User"}
            name={otherUser?.username || "User"}
            userId={selectedUserId}
            className="w-10 h-10 flex-shrink-0"
          />
          {otherUser?.lastSeen && new Date().getTime() - new Date(otherUser.lastSeen).getTime() < 3 * 60 * 1000 && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate leading-tight">{otherUser?.username || "Učitavanje..."}</h3>
          {otherUserTyping ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-primary">kuca</span>
              <span className="flex gap-0.5 items-end pb-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          ) : otherUser?.lastSeen ? (
            <p className="text-xs text-muted-foreground leading-tight">{formatLastSeen(otherUser.lastSeen)}</p>
          ) : null}
        </div>
        {/* Delete conversation */}
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

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="absolute bottom-24 right-4 z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 md:px-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-0.5 py-4">
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const currentDate = new Date(message.createdAt);
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null;
              const showDateHeader = !previousDate || !isSameDay(currentDate, previousDate);
              const isGrouped = !showDateHeader && !!previousMessage &&
                previousMessage.senderId === message.senderId &&
                (currentDate.getTime() - new Date(previousMessage.createdAt).getTime()) < 60000;

              return (
                <div key={message.id} id={`msg-${message.id}`} className={cn(
                  "rounded-xl transition-colors duration-700",
                  highlightedMsgId === message.id && "bg-primary/10"
                )}>
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-5">
                      <div className="bg-muted px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-muted-foreground">{formatDateHeader(currentDate)}</span>
                      </div>
                    </div>
                  )}

                  {/* Unread divider */}
                  {firstUnreadIdRef.current === message.id && (
                    <div id="unread-divider" className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-primary/30" />
                      <span className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
                        Nepročitano
                      </span>
                      <div className="flex-1 h-px bg-primary/30" />
                    </div>
                  )}

                  <div className={cn(
                    "flex gap-2 items-end",
                    isOwn ? "justify-end" : "justify-start",
                    isGrouped ? "mt-0.5" : "mt-3"
                  )}>
                    {/* Avatar */}
                    {!isOwn && (
                      isGrouped
                        ? <div className="w-7 flex-shrink-0" />
                        : <AvatarWithInitials
                            src={otherUser?.avatarUrl}
                            alt={otherUser?.username || "User"}
                            name={otherUser?.username || "User"}
                            userId={selectedUserId}
                            className="w-7 h-7 flex-shrink-0 mb-0.5"
                          />
                    )}

                    <div className="flex items-end gap-1 group max-w-[80vw] md:max-w-[65%]">

                      {/* Action buttons (own, left of bubble) */}
                      {isOwn && !message.deleted && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity order-first">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                            onClick={() => { setReplyTo(message); textareaRef.current?.focus(); }} title="Odgovori" aria-label="Odgovori">
                            <CornerUpLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                            onClick={() => startEdit(message)} title="Izmeni" aria-label="Izmeni poruku">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                            onClick={() => setForwardMessage(message)} title="Prosledi" aria-label="Prosledi poruku">
                            <Forward className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label="Obriši poruku">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Obriši poruku</AlertDialogTitle>
                                <AlertDialogDescription>Poruka će biti označena kao obrisana za obe strane.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMessageMutation.mutate(message.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Obriši</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className="relative group/bubble">
                        {/* Quick reaction bar on hover */}
                        {!message.deleted && (
                          <div className={cn(
                            "absolute -top-8 z-20 flex gap-0.5 bg-popover border border-border/60 rounded-full px-1.5 py-1 shadow-lg opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none group-hover/bubble:pointer-events-auto",
                            isOwn ? "right-0" : "left-0"
                          )}>
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(message.id, emoji)}
                                className="text-sm hover:scale-125 transition-transform leading-none px-0.5"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className={cn(
                          "rounded-2xl px-3.5 py-2.5 shadow-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border/60 text-foreground rounded-bl-md",
                          message.deleted && "opacity-50"
                        )}>
                          {/* Reply quote — clickable, jumps to original */}
                          {!message.deleted && message.replyToId && (
                            <button
                              type="button"
                              onClick={() => jumpToMessage(message.replyToId!)}
                              className={cn(
                                "mb-2 px-2.5 py-1.5 rounded-xl text-xs border-l-[3px] w-full text-left transition-opacity hover:opacity-80 active:opacity-60",
                                isOwn ? "border-primary-foreground/50 bg-primary-foreground/10" : "border-primary bg-primary/10"
                              )}
                            >
                              <p className="font-semibold mb-0.5 opacity-80">{getReplyUsername(message.replyToId)}</p>
                              <p className="truncate opacity-70">{getReplyPreview(message.replyToId)}</p>
                            </button>
                          )}

                          {message.deleted ? (
                            <p className="text-sm italic opacity-60">Poruka obrisana</p>
                          ) : editingMessageId === message.id ? (
                            <div className="space-y-1.5">
                              <textarea
                                ref={editTextareaRef}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                className="w-full bg-transparent border border-primary-foreground/30 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none min-h-[60px]"
                                rows={2}
                              />
                              <div className="flex gap-1 justify-end">
                                <button onClick={cancelEdit} className="text-[10px] px-2 py-0.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20">Otkaži</button>
                                <button onClick={saveEdit} className="text-[10px] px-2 py-0.5 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 font-semibold">Sačuvaj</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {!(message.imageUrl && message.content === "📎") && (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed [word-break:break-word] [overflow-wrap:anywhere]">
                                  {message.content}
                                </p>
                              )}
                              {!(message.imageUrl && message.content === "📎") && (
                                <LinkPreview text={message.content} />
                              )}
                              {message.imageUrl && (
                                <img
                                  src={message.imageUrl}
                                  alt="attachment"
                                  className="mt-1 rounded-xl max-w-full h-auto cursor-pointer max-h-72 object-cover"
                                  onClick={() => setLightboxSrc(message.imageUrl!)}
                                />
                              )}
                            </>
                          )}

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {message.reactions.map(r => (
                                <button key={r.emoji} onClick={() => toggleReaction(message.id, r.emoji)}
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all",
                                    r.userIds.includes(user?.id ?? -1)
                                      ? "bg-primary/20 border-primary/40 text-primary"
                                      : isOwn ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : "bg-muted border-border text-foreground"
                                  )}>
                                  {r.emoji} <span className="font-medium">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                            <span className={cn("text-[10px] leading-none tabular-nums", isOwn ? "text-primary-foreground/55" : "text-muted-foreground/60")}>
                              {format(new Date(message.createdAt), "HH:mm")}
                            </span>
                            {message.editedAt && !message.deleted && (
                              <span className={cn("text-[9px]", isOwn ? "text-primary-foreground/40" : "text-muted-foreground/50")}>(izmenjeno)</span>
                            )}
                            {isOwn && (
                              message.isRead
                                ? <CheckCheck className="w-3 h-3 text-primary-foreground/55" />
                                : <Check className="w-3 h-3 text-primary-foreground/55" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (other user's messages, right side) */}
                      {!isOwn && !message.deleted && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground rounded-lg flex-shrink-0"
                            onClick={() => { setReplyTo(message); textareaRef.current?.focus(); }} title="Odgovori">
                            <CornerUpLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground rounded-lg flex-shrink-0"
                            onClick={() => setForwardMessage(message)} title="Prosledi">
                            <Forward className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Send className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium mb-1">Nema poruka</p>
              <p className="text-xs text-muted-foreground">Pošaljite prvu poruku ispod</p>
            </div>
          )}
          <div ref={bottomSentinelRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border/60 bg-card/80 backdrop-blur-sm px-3 md:px-4 pt-2.5 pb-3 space-y-2 flex-shrink-0">

        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/8 border border-primary/20 rounded-xl text-sm">
            <CornerUpLeft className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-primary text-xs">
                {replyTo.senderId === user?.id ? "Ti" : otherUser?.username}
              </span>
              <p className="text-muted-foreground truncate text-xs mt-0.5">
                {replyTo.imageUrl && replyTo.content === "📎" ? "📷 Slika" : replyTo.content}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => setReplyTo(null)} aria-label="Otkaži odgovor">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="grid grid-cols-10 gap-1 p-3 bg-popover border border-border/60 rounded-2xl shadow-xl">
            {EMOJI_LIST.map(emoji => (
              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-muted rounded-lg p-1 transition-colors leading-none aspect-square flex items-center justify-center">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 items-end">
          <div className="flex gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl"
              onClick={() => setShowEmojiPicker(p => !p)} title="Emoji">
              <Smile className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl"
              onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} title="Priloži sliku">
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageAttach} />
          </div>

          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={e => { setMessageText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Poruka..."
            className="min-h-[42px] max-h-[120px] resize-none flex-1 rounded-2xl bg-muted/60 border-0 focus-visible:ring-1 focus-visible:bg-background text-sm py-2.5 px-4"
            disabled={sendMessageMutation.isPending}
          />

          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            size="icon"
            className={cn(
              "h-10 w-10 flex-shrink-0 rounded-xl transition-all",
              messageText.trim() ? "bg-primary hover:bg-primary/90 scale-100" : "opacity-50 scale-95"
            )}
          >
            {sendMessageMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxSrc}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
            alt="Prikaz slike"
          />
        </div>
      )}

      {/* Forward modal */}
      <Dialog open={!!forwardMessage} onOpenChange={open => { if (!open) setForwardMessage(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Prosledi poruku</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
            {forwardMessage && (
              <div className="mb-3 p-2 bg-muted rounded-lg text-sm text-muted-foreground line-clamp-3">
                {forwardMessage.content}
              </div>
            )}
            {conversations && conversations.length > 0 ? (
              conversations
                .filter(c => c.otherUser.id !== selectedUserId)
                .map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleForward(conv.otherUser.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <AvatarWithInitials
                      src={conv.otherUser.avatarUrl}
                      alt={conv.otherUser.username}
                      name={conv.otherUser.username}
                      userId={conv.otherUser.id}
                      className="w-8 h-8 flex-shrink-0"
                    />
                    <span className="text-sm font-medium">{conv.otherUser.username}</span>
                  </button>
                ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nema dostupnih konverzacija</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
