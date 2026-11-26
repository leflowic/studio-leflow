import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
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
import { ArrowLeft, Send, Loader2, Check, CheckCheck, Trash2, Smile, Paperclip, CornerUpLeft, X, ChevronDown, Pencil, Forward, ExternalLink, MoreVertical, Ban, Flag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImageLabel, AudioLabel } from "@/components/messaging/ImageLabel";
import { AudioMessage, AUDIO_PLACEHOLDER } from "@/components/messaging/AudioMessage";
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
  audioUrl?: string | null;
  audioName?: string | null;
  audioDuration?: number | null;
  replyToId: number | null;
  deleted: boolean;
  createdAt: string;
  isRead: boolean;
  editedAt: string | null;
  reactions: Reaction[];
  replyTo?: { id: number; senderId: number; content: string; imageUrl: string | null; deleted: boolean } | null;
}

const PAGE_SIZE = 50; // must match the server's page size

function mergeMessages(older: Message[], latest: Message[] | undefined): Message[] {
  if (!older.length) return latest ?? [];
  const latestIds = new Set((latest ?? []).map(m => m.id));
  return [...older.filter(m => !latestIds.has(m.id)), ...(latest ?? [])];
}

interface OtherUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  lastSeen: string | null;
  online?: boolean;
  blockedByMe?: boolean;
  blockedMe?: boolean;
}

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "Uznemiravanje ili pretnje" },
  { value: "spam", label: "Spam ili reklame" },
  { value: "inappropriate", label: "Neprimeren sadržaj" },
  { value: "scam", label: "Prevara ili lažno predstavljanje" },
  { value: "other", label: "Nešto drugo" },
];

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

  // Message toolbar (reactions + actions): hover on desktop, tap on touch screens
  const [activeMsgId, setActiveMsgId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  useEffect(() => {
    if (activeMsgId == null) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest?.(`[data-msg-id="${activeMsgId}"]`)) setActiveMsgId(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [activeMsgId]);

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

  const { data: latest, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/conversation/${selectedUserId}`);
      return res.json();
    },
    // New messages arrive over the WebSocket; this is only a safety net (and the
    // socket refetches on reconnect), so it doesn't hit the DB every few seconds.
    refetchInterval: 60_000,
    staleTime: 0,
  });

  // The query holds the newest page; older pages are fetched on scroll-up and kept here.
  const [older, setOlder] = useState<Message[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prependAnchorRef = useRef<{ height: number; top: number } | null>(null);
  const messages = useMemo(() => (latest ? mergeMessages(older, latest) : undefined), [older, latest]);

  useEffect(() => {
    if (latest && hasMoreOlder === null) setHasMoreOlder(latest.length >= PAGE_SIZE);
  }, [latest, hasMoreOlder]);

  const patchOlder = useCallback((fn: (m: Message) => Message) => {
    setOlder(prev => (prev.length ? prev.map(fn) : prev));
  }, []);

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
    refetchInterval: 60_000, // keeps "online" / "aktivan pre..." current
  });

  const blocked = !!(otherUser?.blockedByMe || otherUser?.blockedMe);
  const [showDeleteMine, setShowDeleteMine] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportAlsoBlock, setReportAlsoBlock] = useState(true);

  const blockMutation = useMutation({
    mutationFn: (block: boolean) => apiRequest(block ? "POST" : "DELETE", `/api/users/${selectedUserId}/block`),
    onSuccess: (_r, block) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserId] });
      toast({ title: block ? "Korisnik je blokiran" : "Korisnik je odblokiran", description: block ? "Više ne može da vam šalje poruke." : undefined });
    },
    onError: () => toast({ title: "Nije uspelo", description: "Pokušajte ponovo.", variant: "destructive" }),
  });

  const reportMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${selectedUserId}/report`, { reason: reportReason, note: reportNote, block: reportAlsoBlock }),
    onSuccess: () => {
      setShowReport(false);
      setReportReason(""); setReportNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserId] });
      toast({ title: "Prijava je poslata", description: "Pregledaćemo je. Hvala što pomažete da zajednica ostane prijatna." });
    },
    onError: (e: any) => toast({ title: "Prijava nije poslata", description: e?.message || "Pokušajte ponovo.", variant: "destructive" }),
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
      if (textareaRef.current) textareaRef.current.style.height = "";
      scrollToBottom();
    },
    onError: (e: any) => {
      toast({ title: "Poruka nije poslata", description: e?.message || "Pokušajte ponovo.", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserId] });
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
      patchOlder(m => (m.senderId === user?.id ? { ...m, deleted: true } : m));
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

  const loadingOlderRef = useRef(false); // state updates too late to stop a burst of scroll events
  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreOlder || !messages?.length) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const res = await apiRequest("GET", `/api/messages/conversation/${selectedUserId}?before=${messages[0]!.id}`);
      const page: Message[] = await res.json();
      const sc = getScrollViewport();
      if (sc) prependAnchorRef.current = { height: sc.scrollHeight, top: sc.scrollTop };
      setOlder(prev => {
        const have = new Set(prev.map(m => m.id));
        return [...page.filter(m => !have.has(m.id)), ...prev];
      });
      page.forEach(m => knownMessageIdsRef.current.add(m.id));
      setHasMoreOlder(page.length >= PAGE_SIZE);
    } catch {
      toast({ title: "Starije poruke nisu učitane", description: "Pokušajte ponovo.", variant: "destructive" });
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [hasMoreOlder, messages, selectedUserId, getScrollViewport, toast]);

  // Keep the view still when older messages are prepended above it.
  useLayoutEffect(() => {
    const a = prependAnchorRef.current;
    const sc = getScrollViewport();
    if (!a || !sc) return;
    sc.scrollTop = a.top + (sc.scrollHeight - a.height);
    prependAnchorRef.current = null;
  }, [older, getScrollViewport]);

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
      if (sc.scrollTop < 80 && hasScrolledToUnreadRef.current) loadOlder();
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => sc.removeEventListener("scroll", onScroll);
  }, [getScrollViewport, messages, loadOlder]);

  // Draft saving
  useEffect(() => {
    if (messageText) localStorage.setItem(DRAFT_KEY, messageText);
    else localStorage.removeItem(DRAFT_KEY);
  }, [messageText, DRAFT_KEY]);

  // Clear draft key when switching conversations (runs on unmount)
  useEffect(() => () => { /* draft stays - intentional */ }, [selectedUserId]);

  useEffect(() => {
    const sc = getScrollViewport();
    if (!sc) return;
    if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < 200) scrollToBottom();
  }, [latest, getScrollViewport, scrollToBottom]);

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
        patchOlder(m => (m.id === message.message.id ? { ...m, ...message.message } : m));
        queryClient.setQueryData(
          ["/api/messages/conversation", selectedUserId],
          (old: Message[] | undefined) => old
            ? old.map(m => m.id === message.message.id ? { ...m, ...message.message } : m)
            : old
        );
      }
      if (message.type === "message_reaction") {
        const { messageId, userId: rxUser, emoji, added } = message as any;
        patchOlder(m => {
          if (m.id !== messageId) return m;
          const list = m.reactions.map(r => ({ ...r, userIds: [...r.userIds] }));
          const g = list.find(r => r.emoji === emoji);
          if (added) {
            if (g) { if (!g.userIds.includes(rxUser)) { g.userIds.push(rxUser); g.count++; } }
            else list.push({ emoji, count: 1, userIds: [rxUser] });
          } else if (g) {
            g.userIds = g.userIds.filter(id => id !== rxUser);
            g.count = g.userIds.length;
          }
          return { ...m, reactions: list.filter(r => r.count > 0) };
        });
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      if (message.type === "message_deleted") {
        patchOlder(m => (m.id === (message as any).messageId ? { ...m, deleted: true } : m));
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      }
      if (message.type === "typing_start" && message.userId === selectedUserId) setOtherUserTyping(true);
      if (message.type === "typing_stop" && message.userId === selectedUserId) setOtherUserTyping(false);
    });
    return unsubscribe;
  }, [subscribe, selectedUserId, queryClient, scrollToBottom, patchOlder]);

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
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    if (!isImage && !isAudio) {
      toast({ title: "Ovaj fajl ne može da se pošalje", description: "Slike (JPG, PNG, WebP) ili audio (MP3, WAV, M4A...).", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (isAudio && file.size > 10 * 1024 * 1024) {
      toast({ title: "Audio je prevelik", description: "Najviše 10 MB - pošaljite MP3 verziju.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(isAudio ? "/api/upload/message-audio" : "/api/upload/message-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Upload failed");
      }
      const up = await res.json();
      const msgRes = await apiRequest("POST", "/api/messages/send", isAudio ? {
        receiverId: selectedUserId,
        content: AUDIO_PLACEHOLDER,
        audioUrl: up.url,
        audioName: up.name ?? file.name,
        audioDuration: up.duration ?? undefined,
        replyToId: replyTo?.id,
      } : {
        receiverId: selectedUserId,
        content: "📎",
        imageUrl: up.url,
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
    } catch (err: any) {
      toast({ title: "Fajl nije poslat", description: err?.message && err.message !== "Upload failed" ? err.message : "Pokušajte ponovo.", variant: "destructive" });
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
      const id = editingMessageId, text = editText.trim();
      patchOlder(m => (m.id === id ? { ...m, content: text, editedAt: new Date().toISOString() } : m));
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
    await apiRequest("POST", "/api/messages/send", {
      receiverId: toUserId,
      content: forwardMessage.content,
      imageUrl: forwardMessage.imageUrl ?? undefined,
      audioUrl: forwardMessage.audioUrl ?? undefined,
      audioName: forwardMessage.audioName ?? undefined,
      audioDuration: forwardMessage.audioDuration ?? undefined,
    });
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

  const findQuoted = (replyToId: number) => {
    const loaded = messages?.find(m => m.id === replyToId);
    if (loaded) return loaded;
    const holder = messages?.find(m => m.replyToId === replyToId && m.replyTo);
    return holder?.replyTo ?? undefined;
  };

  const getReplyPreview = (replyToId: number | null): React.ReactNode => {
    if (!replyToId || !messages) return "";
    const msg = findQuoted(replyToId);
    if (!msg || msg.deleted) return "Obrisana poruka";
    // "📎" is the stored placeholder content of an image-only message - never shown as-is
    if (msg.imageUrl && msg.content === "📎") return <ImageLabel />;
    if (msg.content === AUDIO_PLACEHOLDER) return <AudioLabel />;
    return msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
  };

  const getReplyUsername = (replyToId: number | null): string => {
    if (!replyToId || !messages) return "";
    const msg = findQuoted(replyToId);
    if (!msg) return "";
    return msg.senderId === user?.id ? "Ti" : otherUser?.username ?? "";
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-3 md:px-5 border-b border-border/60 bg-card flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-1 shrink-0" aria-label="Nazad na razgovore">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <a href={otherUser ? `/u/${otherUser.username}` : undefined} className="flex items-center gap-3 min-w-0 flex-1 rounded-xl -my-1 py-1 pr-2 hover:opacity-90">
          <span className="relative shrink-0">
            <AvatarWithInitials
              src={otherUser?.avatarUrl}
              alt={otherUser?.username || "Korisnik"}
              name={otherUser?.username || "Korisnik"}
              userId={selectedUserId}
              className="w-10 h-10"
            />
            {otherUser?.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" aria-label="Online" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-[15px] truncate leading-tight">{otherUser?.username || "Učitavanje..."}</span>
            <span className="block text-xs text-muted-foreground leading-tight mt-0.5 h-4">
              {otherUserTyping ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  piše
                  <span className="inline-flex gap-0.5 items-end">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </span>
              ) : otherUser?.online ? "Online" : otherUser?.lastSeen ? formatLastSeen(otherUser.lastSeen) : ""}
            </span>
          </span>
        </a>
        {/* Conversation menu: report / block / delete my messages */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0" aria-label="Opcije razgovora">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => setShowReport(true)}>
              <Flag className="w-4 h-4 mr-2" /> Prijavi korisnika
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => blockMutation.mutate(!otherUser?.blockedByMe)}>
              <Ban className="w-4 h-4 mr-2" /> {otherUser?.blockedByMe ? "Odblokiraj" : "Blokiraj"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setShowDeleteMine(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Obriši moje poruke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog open={showDeleteMine} onOpenChange={setShowDeleteMine}>
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
            aria-label="Na najnovije poruke"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-muted transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 md:px-6 [&_[data-radix-scroll-area-viewport]>div]:!block" ref={scrollAreaRef}>
        <div className="flex flex-col py-4 max-w-3xl mx-auto w-full">
          {hasMoreOlder && messages && messages.length > 0 && (
            <div className="flex justify-center pb-3">
              <button
                type="button"
                onClick={loadOlder}
                aria-busy={loadingOlder}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors ${loadingOlder ? "opacity-60 pointer-events-none" : ""}`}
              >
                {loadingOlder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {loadingOlder ? "Učitavam..." : "Starije poruke"}
              </button>
            </div>
          )}
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const currentDate = new Date(message.createdAt);
              const prev = index > 0 ? messages[index - 1] : null;
              const next = index < messages.length - 1 ? messages[index + 1] : null;
              const showDateHeader = !prev || !isSameDay(currentDate, new Date(prev.createdAt));
              const GROUP_MS = 5 * 60 * 1000;
              const groupedWithPrev = !showDateHeader && !!prev && prev.senderId === message.senderId &&
                currentDate.getTime() - new Date(prev.createdAt).getTime() < GROUP_MS && firstUnreadIdRef.current !== message.id;
              const groupedWithNext = !!next && next.senderId === message.senderId && isSameDay(currentDate, new Date(next.createdAt)) &&
                new Date(next.createdAt).getTime() - currentDate.getTime() < GROUP_MS && firstUnreadIdRef.current !== next.id;
              const lastInGroup = !groupedWithNext;
              const isAttachmentOnly = (message.imageUrl && message.content === "📎") || (message.audioUrl && message.content === AUDIO_PLACEHOLDER);
              const toolbarOpen = activeMsgId === message.id;

              return (
                <div key={message.id} id={`msg-${message.id}`} data-msg-id={message.id} className={cn(
                  "rounded-2xl transition-colors duration-700",
                  highlightedMsgId === message.id && "bg-primary/10"
                )}>
                  {showDateHeader && (
                    <div className="flex justify-center my-5">
                      <span className="text-[11px] font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted/60">{formatDateHeader(currentDate)}</span>
                    </div>
                  )}

                  {firstUnreadIdRef.current === message.id && (
                    <div id="unread-divider" className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-primary/30" />
                      <span className="text-[11px] text-primary font-medium">Nove poruke</span>
                      <div className="flex-1 h-px bg-primary/30" />
                    </div>
                  )}

                  <div className={cn("flex gap-2 items-end", isOwn ? "justify-end" : "justify-start", groupedWithPrev ? "mt-[3px]" : "mt-3")}>
                    {!isOwn && (
                      lastInGroup
                        ? <AvatarWithInitials
                            src={otherUser?.avatarUrl}
                            alt={otherUser?.username || "Korisnik"}
                            name={otherUser?.username || "Korisnik"}
                            userId={selectedUserId}
                            className="w-7 h-7 flex-shrink-0"
                          />
                        : <div className="w-7 flex-shrink-0" />
                    )}

                    <div className={cn("relative group/msg flex flex-col max-w-[82%] md:max-w-[68%]", isOwn ? "items-end" : "items-start")}>
                      {/* Toolbar: reactions + actions */}
                      {!message.deleted && editingMessageId !== message.id && (
                        <div
                          className={cn(
                            "absolute -top-10 z-20 flex items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg transition-opacity",
                            isOwn ? "right-0" : "left-0",
                            toolbarOpen ? "opacity-100" : "opacity-0 pointer-events-none [@media(hover:hover)]:group-hover/msg:opacity-100 [@media(hover:hover)]:group-hover/msg:pointer-events-auto",
                          )}
                        >
                          {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} type="button" onClick={() => { toggleReaction(message.id, emoji); setActiveMsgId(null); }}
                              className="w-7 h-7 rounded-full text-[15px] leading-none hover:bg-muted hover:scale-110 transition" aria-label={`Reakcija ${emoji}`}>
                              {emoji}
                            </button>
                          ))}
                          <span className="w-px h-5 bg-border mx-1" />
                          <button type="button" onClick={() => { setReplyTo(message); setActiveMsgId(null); textareaRef.current?.focus(); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Odgovori" aria-label="Odgovori">
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => { setForwardMessage(message); setActiveMsgId(null); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Prosledi" aria-label="Prosledi poruku">
                            <Forward className="w-3.5 h-3.5" />
                          </button>
                          {isOwn && !isAttachmentOnly && (
                            <button type="button" onClick={() => { startEdit(message); setActiveMsgId(null); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Izmeni" aria-label="Izmeni poruku">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isOwn && (
                            <button type="button" onClick={() => { setDeleteTargetId(message.id); setActiveMsgId(null); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted" title="Obriši" aria-label="Obriši poruku">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        onClick={e => {
                          // touch screens have no hover: a tap opens the toolbar
                          if (!window.matchMedia("(hover: none)").matches) return;
                          if ((e.target as HTMLElement).closest("button,a,audio,img,textarea,[role=slider]")) return;
                          setActiveMsgId(id => (id === message.id ? null : message.id));
                        }}
                        title={format(currentDate, "d.M.yyyy. HH:mm")}
                        className={cn(
                          "rounded-[20px] px-3.5 py-2 text-[14.5px] leading-snug",
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                          isOwn ? (groupedWithPrev ? "rounded-tr-md" : "") + (groupedWithNext ? " rounded-br-md" : " rounded-br-[6px]")
                                : (groupedWithPrev ? "rounded-tl-md" : "") + (groupedWithNext ? " rounded-bl-md" : " rounded-bl-[6px]"),
                          message.deleted && "bg-transparent border border-border text-muted-foreground",
                          message.imageUrl && message.content === "📎" && !message.replyToId && "p-1",
                          toolbarOpen && "ring-2 ring-primary/40",
                        )}
                      >
                        {!message.deleted && message.replyToId && (
                          <button
                            type="button"
                            onClick={() => jumpToMessage(message.replyToId!)}
                            className={cn(
                              "mb-1.5 mt-0.5 px-2.5 py-1.5 rounded-xl text-xs border-l-2 w-full text-left transition-opacity hover:opacity-80",
                              isOwn ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-background/60"
                            )}
                          >
                            <p className="font-semibold mb-0.5 opacity-80">{getReplyUsername(message.replyToId)}</p>
                            <p className="truncate opacity-75">{getReplyPreview(message.replyToId)}</p>
                          </button>
                        )}

                        {message.deleted ? (
                          <p className="text-sm italic">Poruka je obrisana</p>
                        ) : editingMessageId === message.id ? (
                          <div className="space-y-1.5 min-w-[220px]">
                            <textarea
                              ref={editTextareaRef}
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="w-full bg-transparent border border-current/30 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none min-h-[60px]"
                              rows={2}
                            />
                            <div className="flex gap-1 justify-end">
                              <button onClick={cancelEdit} className="text-xs px-2.5 py-1 rounded-full hover:bg-black/10">Otkaži</button>
                              <button onClick={saveEdit} className="text-xs px-2.5 py-1 rounded-full bg-black/10 hover:bg-black/20 font-semibold">Sačuvaj</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {!isAttachmentOnly && (
                              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
                            )}
                            {!isAttachmentOnly && <LinkPreview text={message.content} />}
                            {message.audioUrl && (
                              <AudioMessage url={message.audioUrl} name={message.audioName ?? null} duration={message.audioDuration ?? null} own={isOwn} />
                            )}
                            {message.imageUrl && (
                              <img
                                src={message.imageUrl}
                                alt="Slika iz poruke"
                                loading="lazy"
                                className="rounded-[16px] max-w-full h-auto cursor-zoom-in max-h-80 object-cover"
                                onClick={() => setLightboxSrc(message.imageUrl!)}
                              />
                            )}
                          </>
                        )}
                      </div>

                      {/* Reactions: small pills hanging off the bubble */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 -mt-1.5 relative z-10", isOwn ? "justify-end pr-2" : "pl-2")}>
                          {message.reactions.map(r => {
                            const mine = r.userIds.includes(user?.id ?? -1);
                            return (
                              <button key={r.emoji} type="button" onClick={() => toggleReaction(message.id, r.emoji)}
                                className={cn(
                                  "flex items-center gap-1 h-6 px-1.5 rounded-full text-xs border bg-card shadow-sm transition-colors",
                                  mine ? "border-primary/60" : "border-border hover:bg-muted"
                                )}
                                aria-label={`${r.emoji} ${r.count}${mine ? ", vaša reakcija" : ""}`}>
                                <span className="leading-none">{r.emoji}</span>
                                {r.count > 1 && <span className="font-mono text-[10px] text-muted-foreground">{r.count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Time + read receipt: once per group */}
                      {lastInGroup && (
                        <div className={cn("flex items-center gap-1 mt-1 px-1 text-[11px] text-muted-foreground", isOwn ? "justify-end" : "justify-start")}>
                          <span className="font-mono">{format(currentDate, "HH:mm")}</span>
                          {message.editedAt && !message.deleted && <span>· izmenjeno</span>}
                          {isOwn && !message.deleted && (
                            message.isRead
                              ? <span className="inline-flex items-center gap-0.5 text-primary"><CheckCheck className="w-3.5 h-3.5" /> Viđeno</span>
                              : <Check className="w-3.5 h-3.5" aria-label="Poslato" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AvatarWithInitials
                src={otherUser?.avatarUrl}
                alt={otherUser?.username || "Korisnik"}
                name={otherUser?.username || "Korisnik"}
                userId={selectedUserId}
                className="w-16 h-16 mb-3"
              />
              <p className="font-semibold">{otherUser?.username}</p>
              <p className="text-sm text-muted-foreground mt-1">Pošaljite prvu poruku.</p>
            </div>
          )}
          <div ref={bottomSentinelRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border/60 bg-card px-3 md:px-5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 flex-shrink-0">

        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-l-2 border-primary rounded-xl text-sm max-w-3xl mx-auto">
            <CornerUpLeft className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-primary text-xs">
                {replyTo.senderId === user?.id ? "Ti" : otherUser?.username}
              </span>
              <p className="text-muted-foreground truncate text-xs mt-0.5">
                {replyTo.imageUrl && replyTo.content === "📎" ? <ImageLabel /> : replyTo.content === AUDIO_PLACEHOLDER ? <AudioLabel /> : replyTo.content}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => setReplyTo(null)} aria-label="Otkaži odgovor">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="grid grid-cols-8 sm:grid-cols-10 gap-1 p-3 bg-popover border border-border rounded-2xl shadow-xl max-w-3xl mx-auto max-h-56 overflow-y-auto">
            {EMOJI_LIST.map(emoji => (
              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                className="text-xl hover:bg-muted rounded-lg p-1 transition-colors leading-none aspect-square flex items-center justify-center">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {blocked && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-muted/60 text-sm max-w-3xl mx-auto">
            <span className="text-muted-foreground">
              {otherUser?.blockedByMe ? "Blokirali ste ovog korisnika. Ne može da vam piše." : "Ne možete odgovoriti u ovom razgovoru."}
            </span>
            {otherUser?.blockedByMe && (
              <Button size="sm" variant="outline" onClick={() => blockMutation.mutate(false)} aria-busy={blockMutation.isPending}>Odblokiraj</Button>
            )}
          </div>
        )}

        {/* Composer */}
        <div className={cn("flex gap-2 items-end max-w-3xl mx-auto", blocked && "hidden")}>
          <div className="flex-1 min-w-0 flex items-end gap-0.5 rounded-[22px] bg-muted/70 border border-transparent focus-within:border-border focus-within:bg-background transition-colors px-1.5">
            <button type="button" onClick={() => setShowEmojiPicker(p => !p)} aria-label="Emoji"
              className={cn("w-9 h-9 my-[3px] rounded-full flex items-center justify-center shrink-0 transition-colors", showEmojiPicker ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Smile className="w-5 h-5" />
            </button>
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={e => {
                setMessageText(e.target.value);
                handleTyping();
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Napišite poruku..."
              rows={1}
              className="min-h-[42px] max-h-[140px] resize-none flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] py-[11px] px-1"
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Pošalji sliku ili audio"
              title="Slika ili audio (demo, mix)" aria-busy={uploadingImage}
              className={cn("w-9 h-9 my-[3px] rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors", uploadingImage && "pointer-events-none")}>
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" className="hidden" onChange={handleImageAttach} />
          </div>

          <button
            type="button"
            onClick={handleSendMessage}
            aria-label="Pošalji"
            aria-busy={sendMessageMutation.isPending}
            className={cn(
              "h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all",
              messageText.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95" : "bg-muted text-muted-foreground pointer-events-none",
            )}
          >
            {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -translate-x-[1px] translate-y-[1px]" />}
          </button>
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

      <AlertDialog open={deleteTargetId != null} onOpenChange={o => { if (!o) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši poruku</AlertDialogTitle>
            <AlertDialogDescription>Poruka će biti obrisana za obe strane.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTargetId != null) deleteMessageMutation.mutate(deleteTargetId); setDeleteTargetId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prijavi {otherUser?.username ?? "korisnika"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Prijavu vidi samo tim studija. Korisnik ne saznaje ko ga je prijavio.</p>
          <div className="grid gap-1.5" role="radiogroup" aria-label="Razlog prijave">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={reportReason === r.value}
                onClick={() => setReportReason(r.value)}
                className={cn(
                  "text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors",
                  reportReason === r.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Textarea
            value={reportNote}
            onChange={e => setReportNote(e.target.value.slice(0, 500))}
            placeholder="Šta se desilo? (nije obavezno)"
            className="min-h-[80px] text-sm"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={reportAlsoBlock} onChange={e => setReportAlsoBlock(e.target.checked)} className="accent-[hsl(var(--primary))] w-4 h-4" />
            Blokiraj i ovog korisnika
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setShowReport(false)}>Otkaži</Button>
            <Button
              onClick={() => reportReason && !reportMutation.isPending && reportMutation.mutate()}
              aria-busy={reportMutation.isPending}
              className={cn((!reportReason || reportMutation.isPending) && "opacity-60")}
            >
              {reportMutation.isPending ? "Šaljem..." : "Pošalji prijavu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
