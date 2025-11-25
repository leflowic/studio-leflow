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
import { Crown, Trophy, Shield, User as UserIcon, Trash2, Send, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type CommunityMessageWithUser = {
  id: number;
  userId: number;
  username: string;
  rank: "user" | "vip" | "legend" | "admin";
  message: string;
  createdAt: string;
};

function getRankColor(rank: string): string {
  switch (rank) {
    case "vip":
      return "text-blue-500 dark:text-blue-400";
    case "legend":
      return "text-yellow-500 dark:text-yellow-400";
    case "admin":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function getRankIcon(rank: string) {
  switch (rank) {
    case "vip":
      return <Crown className="h-3 w-3 text-blue-500 dark:text-blue-400" />;
    case "legend":
      return <Trophy className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />;
    case "admin":
      return <Shield className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}

interface MessageItemProps {
  message: CommunityMessageWithUser;
  isOwnMessage: boolean;
  isAdmin: boolean;
  onDelete: (messageId: number) => void;
}

function MessageItem({ message, isOwnMessage, isAdmin, onDelete }: MessageItemProps) {
  const canDelete = isOwnMessage || isAdmin;
  const rankIcon = getRankIcon(message.rank);

  return (
    <div
      className={cn("flex flex-col gap-1.5", isOwnMessage ? "items-end" : "items-start")}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center gap-2">
        {!isOwnMessage && (
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">
              {message.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex items-center gap-1.5">
          {rankIcon}
          <span className={cn("text-sm font-semibold", getRankColor(message.rank))}>
            {message.username}
          </span>
        </div>
        {isOwnMessage && (
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">
              {message.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={cn("flex items-start gap-2 max-w-[80%]", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3 shadow-sm",
            isOwnMessage 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted border border-border"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
        </div>

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={() => onDelete(message.id)}
            data-testid={`button-delete-message-${message.id}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      <span className={cn("text-xs text-muted-foreground px-1", isOwnMessage ? "mr-1" : "")} data-testid={`timestamp-${message.id}`}>
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: sr })}
      </span>
    </div>
  );
}

interface MessageListProps {
  messages: CommunityMessageWithUser[];
  isLoading: boolean;
  currentUserId: number | undefined;
  isAdmin: boolean;
  onDelete: (messageId: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  endRef: React.RefObject<HTMLDivElement>;
}

function MessageList({ messages, isLoading, currentUserId, isAdmin, onDelete, containerRef, endRef }: MessageListProps) {
  if (isLoading) {
    return (
      <ScrollArea className="h-[450px] px-6 bg-muted/30 rounded-lg">
        <div className="space-y-5 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (messages.length === 0) {
    return (
      <ScrollArea className="h-[450px] px-6 bg-muted/30 rounded-lg">
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <MessageSquare className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-lg font-medium mb-2">Nema poruka u chatu</p>
          <p className="text-sm">Budite prvi koji će poslati poruku!</p>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[450px] px-6 bg-muted/30 rounded-lg" ref={containerRef}>
      <div className="space-y-5 py-6">
        {messages.map((message) => (
          <div key={message.id} className="group">
            <MessageItem
              message={message}
              isOwnMessage={message.userId === currentUserId}
              isAdmin={isAdmin}
              onDelete={onDelete}
            />
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}

interface MessageInputProps {
  onSubmit: (message: string) => void;
  isPending: boolean;
  cooldownSeconds: number;
  resetTrigger?: number;
}

function MessageInput({ onSubmit, isPending, cooldownSeconds, resetTrigger }: MessageInputProps) {
  const form = useForm<InsertCommunityMessage>({
    resolver: zodResolver(insertCommunityMessageSchema),
    defaultValues: {
      message: "",
    },
  });

  const handleSubmit = (data: InsertCommunityMessage) => {
    onSubmit(data.message);
  };

  useEffect(() => {
    if (resetTrigger) {
      form.reset({ message: "" });
    }
  }, [resetTrigger, form]);

  return (
    <div className="bg-card rounded-lg border p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Napiši poruku..."
                    maxLength={85}
                    rows={2}
                    disabled={isPending || cooldownSeconds > 0}
                    data-testid="textarea-message"
                    className="resize-none focus-visible:ring-1"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-3">
            {cooldownSeconds > 0 ? (
              <p className="text-sm font-medium text-destructive" data-testid="text-cooldown">
                Sledeća poruka za {cooldownSeconds}s
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {form.watch("message")?.length || 0}/85 karaktera
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending || cooldownSeconds > 0 || !form.watch("message")?.trim()}
              data-testid="button-send-message"
              className="gap-2"
              size="default"
            >
              <Send className="h-4 w-4" />
              Pošalji
            </Button>
          </div>
        </form>
      </Form>
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

  useEffect(() => {
    setMessages(fetchedMessages);
  }, [fetchedMessages]);

  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;

    const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return true;

    const { scrollHeight, scrollTop, clientHeight } = scrollArea;
    return scrollHeight - (scrollTop + clientHeight) < 64;
  };

  const scrollToBottom = (smooth = true) => {
    if (isNearBottom()) {
      endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  const [formResetTrigger, setFormResetTrigger] = useState(0);

  const postMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/community-chat", { message });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] });
      setFormResetTrigger(prev => prev + 1);
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit") || error.message.includes("10 sekund")) {
        setCooldownSeconds(10);
        
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }

        cooldownIntervalRef.current = setInterval(() => {
          setCooldownSeconds((prev) => {
            if (prev <= 1) {
              if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        toast({
          title: "Sačekajte malo",
          description: "Možete slati poruke svakih 10 sekundi",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Greška",
          description: error.message || "Nije moguće poslati poruku",
          variant: "destructive",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/community-chat/${messageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] });
      toast({
        title: "Uspešno",
        description: "Poruka je obrisana",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće obrisati poruku",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/community-chat/clear", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat"] });
      toast({
        title: "Uspešno",
        description: "Sve poruke su obrisane",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće obrisati sve poruke",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "community-chat:new") {
        const newMessage = message.message as CommunityMessageWithUser;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          const updated = [...prev, newMessage];
          return updated;
        });
        setTimeout(() => scrollToBottom(true), 100);
      } else if (message.type === "community-chat:delete") {
        setMessages((prev) => prev.filter((m) => m.id !== message.messageId));
      } else if (message.type === "community-chat:clear") {
        setMessages([]);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = (message: string) => {
    postMutation.mutate(message);
  };

  const handleDelete = (messageId: number) => {
    deleteMutation.mutate(messageId);
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  if (!user) {
    return (
      <Card className="w-full max-w-5xl mx-auto shadow-sm">
        <CardContent className="py-20">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-6 opacity-40" />
            <p className="text-xl font-semibold mb-3">Prijavite se da pristupite chatu</p>
            <p className="text-sm">Chat zajednice je dostupan samo registrovanim korisnicima</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAdmin = user.role === "admin" || user.rank === "admin";

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-lg">
      <CardHeader className="border-b bg-muted/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <MessageSquare className="h-7 w-7 text-primary" />
              Chat Zajednice
            </CardTitle>
            <CardDescription className="mt-2">
              Razgovarajte u real-time sa drugim članovima zajednice Studio LeFlow
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <UserIcon className="h-3 w-3" />
              {messages.length} {
                messages.length === 1 ? 'poruka' : 
                messages.length >= 2 && messages.length <= 4 ? 'poruke' : 
                'poruka'
              }
            </Badge>
            {isAdmin && messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    data-testid="button-clear-all-messages"
                  >
                    <Trash2 className="h-4 w-4" />
                    Obriši Sve Poruke
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ova akcija će trajno obrisati SVE poruke iz chata zajednice. 
                      Ova radnja ne može biti poništena.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-clear">
                      Otkaži
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-clear"
                    >
                      Obriši Sve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          currentUserId={user.id}
          isAdmin={isAdmin}
          onDelete={handleDelete}
          containerRef={containerRef}
          endRef={endRef}
        />

        <MessageInput
          onSubmit={handleSubmit}
          isPending={postMutation.isPending}
          cooldownSeconds={cooldownSeconds}
          resetTrigger={formResetTrigger}
        />
      </CardContent>
    </Card>
  );
}
