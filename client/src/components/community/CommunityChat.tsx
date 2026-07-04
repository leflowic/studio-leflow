import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCommunityMessageSchema, type InsertCommunityMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { Crown, Trophy, Shield, Trash2, Send, MessageSquare, Radio, Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type CommunityMessageWithUser = {
  id: number;
  userId: number;
  username: string;
  rank: "user" | "vip" | "legend" | "admin";
  message: string;
  createdAt: string;
};

const RANK_CONFIG = {
  admin:  { color: "text-red-500",    bg: "bg-red-500",    light: "bg-red-500/10",   icon: Shield,  label: "Admin"  },
  legend: { color: "text-amber-500",  bg: "bg-amber-500",  light: "bg-amber-500/10", icon: Trophy,  label: "Legend" },
  vip:    { color: "text-blue-500",   bg: "bg-blue-500",   light: "bg-blue-500/10",  icon: Crown,   label: "VIP"    },
  user:   { color: "text-slate-500",  bg: "bg-slate-400",  light: "bg-muted",        icon: null,    label: ""       },
};

const QUICK_EMOJIS = ["😀","❤️","🔥","👍","🎵","💯"];

function RankAvatar({ rank, username }: { rank: string; username: string }) {
  const cfg = RANK_CONFIG[rank as keyof typeof RANK_CONFIG] ?? RANK_CONFIG.user;
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm", cfg.bg)}>
      {initials}
    </div>
  );
}

function RankBadge({ rank }: { rank: string }) {
  const cfg = RANK_CONFIG[rank as keyof typeof RANK_CONFIG] ?? RANK_CONFIG.user;
  if (!cfg.label) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.light, cfg.color)}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

function MessageItem({
  message, isOwn, isAdmin, onDelete,
}: {
  message: CommunityMessageWithUser;
  isOwn: boolean;
  isAdmin: boolean;
  onDelete: (id: number) => void;
}) {
  const cfg = RANK_CONFIG[message.rank as keyof typeof RANK_CONFIG] ?? RANK_CONFIG.user;
  const canDelete = isOwn || isAdmin;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={cn("flex gap-2.5 group", isOwn ? "flex-row-reverse" : "flex-row")}
      data-testid={`message-${message.id}`}
    >
      <RankAvatar rank={message.rank} username={message.username} />

      <div className={cn("flex flex-col gap-1 max-w-[72%]", isOwn ? "items-end" : "items-start")}>
        {/* Name + rank + time */}
        <div className={cn("flex items-center gap-1.5 flex-wrap", isOwn ? "flex-row-reverse" : "flex-row")}>
          <span className={cn("text-xs font-semibold", cfg.color)}>{message.username}</span>
          <RankBadge rank={message.rank} />
          <span className="text-[10px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: sr })}
          </span>
        </div>

        {/* Bubble */}
        <div className="flex items-end gap-1">
          {!isOwn && canDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive flex-shrink-0"
              data-testid={`button-delete-message-${message.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <div className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
            "[word-break:break-word] [overflow-wrap:anywhere]",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border/60 text-foreground rounded-bl-md"
          )}>
            {message.message}
          </div>

          {isOwn && canDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive flex-shrink-0"
              data-testid={`button-delete-message-${message.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface MessageInputProps {
  onSubmit: (message: string) => void;
  isPending: boolean;
  cooldownSeconds: number;
  resetTrigger?: number;
}

function MessageInput({ onSubmit, isPending, cooldownSeconds, resetTrigger }: MessageInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const form = useForm<InsertCommunityMessage>({
    resolver: zodResolver(insertCommunityMessageSchema),
    defaultValues: { message: "" },
  });
  const currentMsg = form.watch("message") ?? "";

  useEffect(() => {
    if (resetTrigger) form.reset({ message: "" });
  }, [resetTrigger, form]);

  const insertEmoji = (e: string) => {
    form.setValue("message", currentMsg + e);
    setShowEmoji(false);
  };

  return (
    <div className="border-t border-border/40 bg-card/50 px-4 pt-3 pb-3 space-y-2">
      {showEmoji && (
        <div className="flex gap-1.5 flex-wrap pb-1">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => insertEmoji(e)}
              className="text-xl hover:bg-muted rounded-lg p-1 transition-colors leading-none">
              {e}
            </button>
          ))}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(d => onSubmit(d.message))} className="flex items-end gap-2">
          <button type="button" onClick={() => setShowEmoji(v => !v)}
            className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Smile className="w-5 h-5" />
          </button>

          <FormField control={form.control} name="message" render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={cooldownSeconds > 0 ? `Sačekajte ${cooldownSeconds}s...` : "Napiši poruku zajednici..."}
                  maxLength={85}
                  rows={1}
                  disabled={isPending || cooldownSeconds > 0}
                  data-testid="textarea-message"
                  className="resize-none min-h-[42px] max-h-[84px] rounded-2xl bg-muted/60 border-0 focus-visible:ring-1 text-sm py-2.5 px-4"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isPending && cooldownSeconds === 0 && currentMsg.trim()) {
                        form.handleSubmit(d => onSubmit(d.message))();
                      }
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )} />

          <Button
            type="submit"
            disabled={isPending || cooldownSeconds > 0 || !currentMsg.trim()}
            size="icon"
            className={cn(
              "h-10 w-10 flex-shrink-0 rounded-xl transition-all",
              currentMsg.trim() && cooldownSeconds === 0 ? "opacity-100" : "opacity-50"
            )}
            data-testid="button-send-message"
          >
            {isPending ? <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted-foreground/50">{currentMsg.length}/85</span>
        {cooldownSeconds > 0 && (
          <span className="text-[10px] text-amber-500 font-medium">Sledeća poruka za {cooldownSeconds}s</span>
        )}
      </div>
    </div>
  );
}

export function CommunityChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscribe } = useWebSocketContext();
  const [messages, setMessages] = useState<CommunityMessageWithUser[]>([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout>();

  const { data: fetchedMessages = [], isLoading } = useQuery<CommunityMessageWithUser[]>({
    queryKey: ["/api/community-chat"],
    enabled: !!user,
  });

  useEffect(() => { setMessages(fetchedMessages); }, [fetchedMessages]);

  const scrollToBottom = (smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => { scrollToBottom(false); }, [messages]);

  const [formResetTrigger, setFormResetTrigger] = useState(0);

  const postMutation = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/community-chat", { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] });
      setFormResetTrigger(p => p + 1);
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit") || error.message.includes("10 sekund")) {
        setCooldownSeconds(10);
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) { clearInterval(cooldownIntervalRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
        toast({ title: "Sačekajte malo", description: "Možete slati poruke svakih 10 sekundi", variant: "destructive" });
      } else {
        toast({ title: "Greška", description: error.message || "Nije moguće poslati poruku", variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) => apiRequest("DELETE", `/api/community-chat/${messageId}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] }),
    onError: (e: Error) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/community-chat/clear", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] });
      toast({ title: "Obrisano", description: "Sve poruke su obrisane" });
    },
    onError: (e: Error) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    return subscribe(message => {
      if (message.type === "community-chat:new") {
        const newMsg = message.message as CommunityMessageWithUser;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(() => scrollToBottom(true), 80);
      } else if (message.type === "community-chat:delete") {
        setMessages(prev => prev.filter(m => m.id !== (message as any).messageId));
      } else if (message.type === "community-chat:clear") {
        setMessages([]);
      }
    });
  }, [subscribe]);

  useEffect(() => () => { if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current); }, []);

  const isAdmin = user?.role === "admin" || user?.rank === "admin";

  // Unauthenticated state
  if (!user) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Chat Zajednice</h3>
            <p className="text-xs text-muted-foreground">Real-time razgovor</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-500 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="font-semibold mb-1">Prijavite se za pristup chatu</p>
          <p className="text-sm text-muted-foreground">Chat zajednice je dostupan samo registrovanim korisnicima</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col" style={{ height: 560 }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-gradient-to-r from-primary/8 to-transparent flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Chat Zajednice</h3>
          <p className="text-[11px] text-muted-foreground">{messages.length} poruk{messages.length === 1 ? "a" : "a"}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </div>
          {isAdmin && messages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid="button-clear-all-messages">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Obriši sve poruke?</AlertDialogTitle>
                  <AlertDialogDescription>Ova radnja je trajna i ne može biti poništena.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-clear">Otkaži</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearAllMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-clear">
                    Obriši Sve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={containerRef}>
        <div className="px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Radio className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-medium mb-1">Ćutnja u chatu</p>
              <p className="text-sm text-muted-foreground">Budite prvi koji će nešto reći!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isOwn={msg.userId === user.id}
                  isAdmin={isAdmin}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSubmit={msg => postMutation.mutate(msg)}
        isPending={postMutation.isPending}
        cooldownSeconds={cooldownSeconds}
        resetTrigger={formResetTrigger}
      />
    </div>
  );
}
