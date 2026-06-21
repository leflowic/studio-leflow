import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Music, Image, Users, FileText, Send, Trash2, ChevronDown, ChevronUp, Play, Pause, Upload, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

type PostComment = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
};

const COLLAB_TAGS = ["Tražim repera", "Tražim vokal", "Tražim beatmakera", "Tražim feat", "Tražim tekstopisca", "Tražim gitaristu"];

const POST_TYPES = [
  { key: "status", label: "Status", icon: FileText, color: "text-blue-500" },
  { key: "audio", label: "Demo", icon: Music, color: "text-primary" },
  { key: "image", label: "Foto", icon: Image, color: "text-emerald-500" },
  { key: "collab", label: "Kolaboracija", icon: Users, color: "text-violet-500" },
];

function AvatarImg({ avatarUrl, username }: { avatarUrl: string | null; username: string }) {
  return (
    <Avatar className="w-9 h-9 ring-2 ring-border/40">
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
      ) : (
        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
          {username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3 mt-2">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
      </button>
      <div className="flex-1 relative h-1.5 bg-border rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = (e.target as HTMLDivElement).getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) { audioRef.current.currentTime = pct * audioRef.current.duration; }
        }}
      >
        <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el && el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

function CommentsSection({ postId, currentUserId, onCountChange }: {
  postId: number;
  currentUserId: number | undefined;
  onCountChange: (delta: number) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: [`/api/posts/${postId}/comments`],
  });

  const addComment = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${postId}/comments`, { content: text.trim() }),
    onSuccess: async (res) => {
      const newComment = await res.json();
      queryClient.setQueryData<PostComment[]>([`/api/posts/${postId}/comments`], (old = []) => [...old, newComment]);
      onCountChange(+1);
      setText("");
    },
    onError: () => toast({ title: "Greška", description: "Komentar nije sačuvan", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: number) => apiRequest("DELETE", `/api/posts/${postId}/comments/${commentId}`),
    onSuccess: (_r, commentId) => {
      queryClient.setQueryData<PostComment[]>([`/api/posts/${postId}/comments`], (old = []) => old.filter(c => c.id !== commentId));
      onCountChange(-1);
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nema komentara. Budite prvi!</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 group">
              <AvatarImg avatarUrl={c.avatarUrl} username={c.username} />
              <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm min-w-0">
                <span className="font-semibold text-xs text-foreground mr-2">{c.username}</span>
                <span className="text-foreground/80 break-words">{c.content}</span>
              </div>
              {currentUserId === c.userId && (
                <button
                  onClick={() => deleteComment.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {currentUserId && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) addComment.mutate(); }}
          className="flex gap-2 mt-2"
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Napiši komentar..."
            maxLength={500}
            className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          />
          <Button type="submit" size="icon" variant="ghost" disabled={!text.trim() || addComment.isPending} className="rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

function PostCard({ post, currentUserId, onDeleted, onLikeChanged, onCommentCountChange }: {
  post: FeedPost;
  currentUserId: number | undefined;
  onDeleted: (id: number) => void;
  onLikeChanged: (id: number, liked: boolean, likesCount: number) => void;
  onCommentCountChange: (id: number, delta: number) => void;
}) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/like`, {}),
    onSuccess: async (res) => {
      const { liked, likesCount } = await res.json();
      onLikeChanged(post.id, liked, likesCount);
    },
    onError: () => toast({ title: "Greška", description: "Pokušajte ponovo", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/posts/${post.id}`),
    onSuccess: () => onDeleted(post.id),
    onError: () => toast({ title: "Greška", description: "Objava nije obrisana", variant: "destructive" }),
  });

  const typeInfo = POST_TYPES.find(t => t.key === post.type);
  const TypeIcon = typeInfo?.icon ?? FileText;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <AvatarImg avatarUrl={post.avatarUrl} username={post.username} />
          <div className="min-w-0">
            <Link href={`/u/${post.username}`} className="font-semibold text-sm leading-tight truncate hover:underline block">{post.username}</Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: sr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className={cn("text-xs gap-1 px-2 py-0.5", typeInfo?.color)}>
            <TypeIcon className="w-3 h-3" />
            {typeInfo?.label ?? post.type}
          </Badge>
          {currentUserId === post.userId && (
            <button
              onClick={() => deleteMutation.mutate()}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collab tag */}
      {post.type === "collab" && post.collabTag && (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-500">Tražim: {post.collabTag}</span>
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden bg-muted max-h-80">
          <img src={post.imageUrl} alt="Slika" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Audio */}
      {post.audioUrl && <AudioPlayer url={post.audioUrl} />}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1">
        <button
          onClick={() => currentUserId ? likeMutation.mutate() : toast({ title: "Prijavite se da biste lajkovali", variant: "destructive" })}
          disabled={likeMutation.isPending}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all",
            post.hasLiked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Heart className={cn("w-4 h-4", post.hasLiked && "fill-current")} />
          <span>{post.likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(s => !s)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all",
            showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentsCount}</span>
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CommentsSection
              postId={post.id}
              currentUserId={currentUserId}
              onCountChange={delta => onCommentCountChange(post.id, delta)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CreatePost({ userId, onCreated }: { userId: number; onCreated: (post: FeedPost) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeType, setActiveType] = useState<string>("status");
  const [content, setContent] = useState("");
  const [collabTag, setCollabTag] = useState(COLLAB_TAGS[0]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, endpoint: string): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem("auth_token");
    const res = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Upload nije uspeo");
    }
    const { url } = await res.json();
    return url;
  };

  const createPost = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let audioUrl: string | undefined;
      let imageUrl: string | undefined;
      try {
        if (audioFile) audioUrl = await uploadFile(audioFile, "/api/upload/post-audio");
        if (imageFile) imageUrl = await uploadFile(imageFile, "/api/upload/post-image");
      } finally {
        setUploading(false);
      }
      return apiRequest("POST", "/api/posts", {
        type: activeType,
        content: content.trim() || undefined,
        audioUrl,
        imageUrl,
        collabTag: activeType === "collab" ? collabTag : undefined,
      });
    },
    onSuccess: async (res) => {
      const rawPost = await res.json();
      onCreated({
        ...rawPost,
        username: user!.username,
        avatarUrl: user!.avatarUrl ?? null,
        likesCount: 0,
        commentsCount: 0,
        hasLiked: false,
      });
      setContent("");
      setAudioFile(null);
      setImageFile(null);
      setImagePreview(null);
      toast({ title: "Objavljeno!" });
    },
    onError: (e: any) => toast({ title: "Greška", description: e.message || "Objava nije sačuvana", variant: "destructive" }),
  });

  const canSubmit = (() => {
    if (activeType === "status") return content.trim().length > 0;
    if (activeType === "audio") return !!audioFile;
    if (activeType === "image") return !!imageFile;
    if (activeType === "collab") return !!collabTag;
    return false;
  })();

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      {/* Type selector */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
        {POST_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeType === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className={cn("w-3.5 h-3.5", activeType === t.key && t.color)} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Collab tag picker */}
      {activeType === "collab" && (
        <div className="flex flex-wrap gap-1.5">
          {COLLAB_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setCollabTag(tag)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                collabTag === tag
                  ? "bg-violet-500/15 border-violet-500/50 text-violet-400"
                  : "border-border/60 text-muted-foreground hover:border-border"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Audio upload */}
      {activeType === "audio" && (
        <div
          onClick={() => audioInputRef.current?.click()}
          className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
        >
          {audioFile ? (
            <div className="flex items-center gap-2 justify-center text-sm">
              <Music className="w-4 h-4 text-primary" />
              <span className="font-medium truncate max-w-[200px]">{audioFile.name}</span>
              <button onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
              <span>Klikni da uploaduješ audio demo</span>
              <p className="text-xs mt-0.5 opacity-60">MP3, WAV, OGG — max 50MB</p>
            </div>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
        </div>
      )}

      {/* Image upload */}
      {activeType === "image" && (
        <div
          onClick={() => !imageFile && imageInputRef.current?.click()}
          className={cn("border-2 border-dashed border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors", imageFile && "cursor-default")}
        >
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Image className="w-5 h-5 mx-auto mb-1 opacity-50" />
              <span>Klikni da dodaš sliku</span>
              <p className="text-xs mt-0.5 opacity-60">JPEG, PNG, WebP, GIF</p>
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
            }} />
        </div>
      )}

      {/* Text area */}
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          activeType === "status" ? "Šta ti je na umu? 🎵" :
          activeType === "audio" ? "Dodaj opis demoa (opcionalno)..." :
          activeType === "image" ? "Dodaj opis slike (opcionalno)..." :
          "Opiši šta tražiš (opcionalno)..."
        }
        maxLength={1000}
        rows={3}
        className="resize-none rounded-xl text-sm"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/1000</span>
        <Button
          onClick={() => createPost.mutate()}
          disabled={!canSubmit || createPost.isPending || uploading}
          size="sm"
          className="rounded-xl gap-2"
        >
          {(createPost.isPending || uploading) ? "Objavljujem..." : (
            <><Send className="w-3.5 h-3.5" /> Objavi</>
          )}
        </Button>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

async function fetchPosts(offset: number): Promise<FeedPost[]> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`/api/posts?limit=${PAGE_SIZE}&offset=${offset}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Greška");
  return res.json();
}

export function CommunityFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { isLoading } = useQuery<FeedPost[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const data = await fetchPosts(0);
      setPosts(data);
      setOffset(data.length);
      setHasMore(data.length === PAGE_SIZE);
      return data;
    },
    staleTime: 0,
  });

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPosts(offset);
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...data.filter(p => !ids.has(p.id))];
      });
      setOffset(prev => prev + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {user && <CreatePost userId={user.id} onCreated={post => setPosts(prev => [post, ...prev])} />}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Music className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="font-medium mb-1">Feed je prazan</p>
          <p className="text-sm text-muted-foreground">Budite prvi koji će nešto podeliti!</p>
        </div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDeleted={id => setPosts(prev => prev.filter(p => p.id !== id))}
                onLikeChanged={(id, liked, likesCount) =>
                  setPosts(prev => prev.map(p => p.id === id ? { ...p, hasLiked: liked, likesCount } : p))
                }
                onCommentCountChange={(id, delta) =>
                  setPosts(prev => prev.map(p => p.id === id ? { ...p, commentsCount: Math.max(0, p.commentsCount + delta) } : p))
                }
              />
            ))}
          </AnimatePresence>

          {hasMore && (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Učitavam..." : "Učitaj više"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
