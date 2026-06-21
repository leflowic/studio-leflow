import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/SEO";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Music, MessageCircle, Heart, FileText, Image, Users, Play, Pause, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

type PublicUser = {
  id: number;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
};

type FeedPost = {
  id: number;
  userId: number;
  type: string;
  content: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  collabTag: string | null;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
};

const POST_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  status: { label: "Status", icon: FileText, color: "text-blue-500" },
  audio: { label: "Demo", icon: Music, color: "text-primary" },
  image: { label: "Foto", icon: Image, color: "text-emerald-500" },
  collab: { label: "Kolaboracija", icon: Users, color: "text-violet-500" },
};

function AudioPlayer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (cancelled || !containerRef.current) return;
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "hsl(var(--muted-foreground) / 0.4)",
        progressColor: "hsl(var(--primary))",
        cursorColor: "transparent",
        barWidth: 2, barGap: 1, barRadius: 2,
        height: 36, normalize: true, url,
      });
      ws.on("ready", () => setReady(true));
      ws.on("play", () => setPlaying(true));
      ws.on("pause", () => setPlaying(false));
      ws.on("finish", () => setPlaying(false));
      wsRef.current = ws;
    });
    return () => { cancelled = true; wsRef.current?.destroy(); wsRef.current = null; };
  }, [url]);

  return (
    <div className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3 mt-2">
      <button
        onClick={() => wsRef.current?.playPause()}
        disabled={!ready}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
      </button>
      <div ref={containerRef} className="flex-1 min-w-0" />
    </div>
  );
}

function MiniPostCard({ post, currentUserId }: { post: FeedPost; currentUserId?: number }) {
  const { toast } = useToast();
  const meta = POST_TYPE_META[post.type] ?? { label: "Status", icon: FileText, color: "text-blue-500" };
  const TypeIcon = meta.icon;

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/like`, {}),
    onSuccess: async (res) => {
      const { liked, likesCount } = await res.json();
      queryClient.setQueryData<FeedPost[]>([`/api/posts/user/${post.userId}`], (old = []) =>
        old.map(p => p.id === post.id ? { ...p, hasLiked: liked, likesCount } : p)
      );
    },
    onError: () => toast({ title: "Greška", description: "Pokušajte ponovo", variant: "destructive" }),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className={cn("text-xs gap-1 px-2 py-0.5", meta.color)}>
          <TypeIcon className="w-3 h-3" />
          {meta.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: sr })}
        </span>
      </div>

      {post.type === "collab" && post.collabTag && (
        <p className="text-xs font-semibold text-violet-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> Tražim: {post.collabTag}
        </p>
      )}

      {post.content && (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
      )}

      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden bg-muted max-h-60">
          <img src={post.imageUrl} alt="Slika" className="w-full h-full object-cover" />
        </div>
      )}

      {post.audioUrl && <AudioPlayer url={post.audioUrl} />}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => currentUserId ? likeMutation.mutate() : toast({ title: "Prijavite se", variant: "destructive" })}
          disabled={likeMutation.isPending}
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            post.hasLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("w-4 h-4", post.hasLiked && "fill-current")} />
          <span>{post.likesCount}</span>
        </button>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {post.commentsCount}
        </span>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const { data: profileUser, isLoading: userLoading, error: userError } = useQuery<PublicUser>({
    queryKey: [`/api/users/by-username/${username}`],
    enabled: !!username,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<FeedPost[]>({
    queryKey: [`/api/posts/user/${profileUser?.id}`],
    enabled: !!profileUser?.id,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/posts/user/${profileUser!.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Greška");
      return res.json();
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 max-w-3xl py-12 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (userError || !profileUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Korisnik nije pronađen</p>
          <p className="text-muted-foreground mb-6">Korisnik <span className="font-mono">@{username}</span> ne postoji.</p>
          <Link href="/zajednica"><Button>Nazad na zajednicu</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${profileUser.username} — Studio LeFlow`}
        description={`Profil korisnika ${profileUser.username} na Studio LeFlow zajednici.`}
        noIndex={true}
      />

      <div className="min-h-screen bg-background">
        <FadeInWhenVisible>
          <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-background to-muted/20">
            <div className="relative container mx-auto px-4 max-w-3xl py-10">
              <div className="flex items-center gap-5">
                <Avatar className="w-20 h-20 ring-4 ring-background shadow-lg">
                  {profileUser.avatarUrl ? (
                    <img src={profileUser.avatarUrl} alt={profileUser.username} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {profileUser.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profileUser.username}</h1>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Član od {formatDistanceToNow(new Date(profileUser.createdAt), { addSuffix: true, locale: sr })}
                  </p>
                </div>
                {currentUser && currentUser.id !== profileUser.id && (
                  <Link href={`/inbox?search=${encodeURIComponent(profileUser.username)}`}>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                      <MessageCircle className="w-4 h-4" />
                      Poruka
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        <div className="container mx-auto px-4 max-w-3xl py-8 space-y-4">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Objave</h2>
            {!postsLoading && posts.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{posts.length} {posts.length === 1 ? "objava" : posts.length < 5 ? "objave" : "objava"}</span>
            )}
          </div>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
              <Music className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Još nema objava</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <MiniPostCard key={post.id} post={post} currentUserId={currentUser?.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
