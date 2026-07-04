import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Play, Pause, CheckCircle2, MessageSquarePlus, X, Send,
  Music2, Clock, ChevronRight, Volume2
} from "lucide-react";
import type { ClientPortal, PortalVersion, PortalComment } from "@shared/schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Waveform player with timestamped comments ───────────────────────────────

interface WaveformPlayerProps {
  version: PortalVersion & { commentCount: number };
  comments: PortalComment[];
  onAddComment: (timestamp: number, text: string) => void;
  addingComment: boolean;
  onSeekReady?: (fn: (ts: number) => void) => void;
}

function WaveformPlayer({ version, comments, onAddComment, addingComment, onSeekReady }: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [commentMode, setCommentMode] = useState(false);
  const [pendingComment, setPendingComment] = useState<{ pct: number; timestamp: number } | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPendingComment(null);
    setCommentMode(false);

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audioRef.current = audio;

    const onMeta = () => { setDuration(audio.duration); setIsLoading(false); onSeekReady?.((ts) => { audio.currentTime = ts; }); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);
    const onErr = () => setIsLoading(false);

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);

    audio.src = version.audioUrl;
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [version.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (commentMode) {
      audioRef.current.pause();
      const ts = Math.floor(relX * duration);
      setPendingComment({ pct: relX * 100, timestamp: ts });
      setCommentText("");
    } else {
      audioRef.current.currentTime = relX * duration;
    }
  };

  const seekToComment = (ts: number) => {
    if (!audioRef.current || duration === 0) return;
    audioRef.current.currentTime = ts;
  };

  const submitComment = () => {
    if (!pendingComment || !commentText.trim()) return;
    onAddComment(pendingComment.timestamp, commentText.trim());
    setPendingComment(null);
    setCommentText("");
    setCommentMode(false);
  };

  const cancelComment = () => {
    setPendingComment(null);
    setCommentText("");
  };

  return (
    <div className="space-y-4">
      {/* Player card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        {/* Controls row */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-black transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{version.versionName}</p>
            <p className="text-xs text-muted-foreground">{formatTime(currentTime)} / {formatTime(duration)}</p>
          </div>
          <Volume2 className="w-4 h-4 text-zinc-600 flex-shrink-0" />
        </div>

        {/* Progress bar + comment markers */}
        <div
          ref={progressRef}
          className="relative h-12 flex items-center select-none"
          style={{ cursor: isLoading ? "default" : commentMode ? "crosshair" : "pointer" }}
          onClick={handleProgressClick}
        >
          {/* Track background */}
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-visible relative">
            {/* Filled progress */}
            <div
              className="h-full bg-amber-500 rounded-full transition-none"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>

          {/* Loading skeleton overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-1 items-end">
                {[4, 6, 8, 5, 7, 9, 6, 4, 8, 5].map((h, i) => (
                  <div key={i} className="w-1.5 rounded-sm bg-zinc-700 animate-pulse" style={{ height: `${h * 3}px`, animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Comment markers */}
          {!isLoading && duration > 0 && comments.map(c => (
            <button
              key={c.id}
              title={`${formatTime(c.timestampSeconds)} - ${c.authorName}: ${c.text}`}
              onClick={(e) => { e.stopPropagation(); seekToComment(c.timestampSeconds); }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group z-10"
              style={{ left: `${(c.timestampSeconds / duration) * 100}%` }}
            >
              <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 transition-transform group-hover:scale-150 ${c.authorType === "producer" ? "bg-amber-500" : c.resolved ? "bg-zinc-500" : "bg-blue-500"}`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap max-w-[200px] text-left shadow-xl">
                  <span className="font-mono text-amber-400">{formatTime(c.timestampSeconds)}</span>
                  <span className="text-zinc-400 mx-1">·</span>
                  <span className="font-medium">{c.authorName}</span>
                  <p className="text-zinc-300 mt-0.5 truncate">{c.text}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Pending comment marker */}
          {pendingComment && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20" style={{ left: `${pendingComment.pct}%` }}>
              <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-zinc-900 animate-pulse" />
            </div>
          )}
        </div>

        {/* Comment mode banner */}
        {commentMode && !pendingComment && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <MessageSquarePlus className="w-3.5 h-3.5 flex-shrink-0" />
            Klikni na talasogram da dodaš komentar na taj momenat
          </div>
        )}

        {/* Pending comment input */}
        {pendingComment && (
          <div className="mt-3 bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                {formatTime(pendingComment.timestamp)}
              </span>
              <span className="text-xs text-zinc-400">Komentar na ovom mestu</span>
              <button onClick={cancelComment} className="ml-auto text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Textarea
              autoFocus
              placeholder="Upiši komentar..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-sm resize-none min-h-[70px]"
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment(); }}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={cancelComment}>Otkaži</Button>
              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-black" onClick={submitComment} disabled={!commentText.trim() || addingComment}>
                <Send className="w-3 h-3 mr-1" />
                {addingComment ? "Saljem..." : "Pošalji (Ctrl+Enter)"}
              </Button>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => { setCommentMode(v => !v); setPendingComment(null); }}
            disabled={isLoading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              commentMode
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {commentMode ? "Izađi iz mod komentara" : "Dodaj komentar"}
          </button>
          <span className="text-xs text-zinc-600">{comments.length} komentara</span>
        </div>
      </div>
    </div>
  );
}

// ─── Comment list item ────────────────────────────────────────────────────────

function CommentRow({ comment, onJump }: { comment: PortalComment; onJump: (ts: number) => void }) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-colors hover:border-zinc-700 ${comment.resolved ? "border-zinc-800/50 opacity-60" : "border-zinc-800"}`}>
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${comment.authorType === "producer" ? "bg-amber-500" : "bg-blue-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <button
            onClick={() => onJump(comment.timestampSeconds)}
            className="font-mono text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-400 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            {formatTime(comment.timestampSeconds)}
          </button>
          <span className="text-sm font-medium">{comment.authorName}</span>
          {comment.authorType === "producer" && (
            <Badge className="text-[10px] h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">Studio</Badge>
          )}
          {comment.resolved && (
            <Badge className="text-[10px] h-4 bg-green-500/10 text-green-400 border-green-500/20">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Rešeno
            </Badge>
          )}
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{comment.text}</p>
      </div>
    </div>
  );
}

// ─── Main portal page ─────────────────────────────────────────────────────────

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const seekFnRef = useRef<((ts: number) => void) | null>(null);

  type PortalData = { portal: ClientPortal; versions: Array<PortalVersion & { commentCount: number }> };

  const { data, isLoading, isError, error: portalQueryError } = useQuery<PortalData, Error>({
    queryKey: [`/api/portal/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
  });
  const portalErrorStatus = portalQueryError ? parseInt(portalQueryError.message) : null;

  const portal = data?.portal;
  const versions = data?.versions ?? [];

  useEffect(() => {
    if (versions.length > 0 && activeVersionId === null) {
      setActiveVersionId(versions[versions.length - 1]!.id);
    }
  }, [versions, activeVersionId]);

  const activeVersion = versions.find(v => v.id === activeVersionId) ?? null;

  const { data: comments = [] } = useQuery<PortalComment[]>({
    queryKey: [`/api/portal/${token}/versions/${activeVersionId}/comments`],
    queryFn: async () => {
      if (!activeVersionId) return [];
      const res = await fetch(`/api/portal/${token}/versions/${activeVersionId}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeVersionId,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ timestamp, text }: { timestamp: number; text: string }) =>
      fetch(`/api/portal/${token}/versions/${activeVersionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestampSeconds: timestamp, text }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/portal/${token}/versions/${activeVersionId}/comments`] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/portal/${token}/versions/${activeVersionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/portal/${token}`] });
      setApproveOpen(false);
    },
  });

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm">Učitavanje portala...</p>
        </div>
      </div>
    );
  }

  if (isError || !portal) {
    const isServerError = portalErrorStatus !== null && portalErrorStatus >= 500;
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <Music2 className="w-7 h-7 text-zinc-600" />
          </div>
          <h1 className="text-xl font-bold">
            {isServerError ? "Greška na serveru" : "Portal nije pronađen"}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isServerError
              ? "Došlo je do tehničke greške. Pokušaj ponovo za nekoliko trenutaka."
              : "Link je možda istekao ili je nevažeći. Kontaktiraj studio za novi link."}
          </p>
          <a href="https://studioleflow.com" className="text-amber-500 text-sm hover:text-amber-400 transition-colors">
            studioleflow.com
          </a>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-7 w-auto" />
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">Client Portal</span>
          </div>
          <a href="https://studioleflow.com" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">
            studioleflow.com
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Project info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{portal.name}</h1>
          <p className="text-zinc-400 mt-1">
            Pripremljeno za: <span className="text-zinc-200 font-medium">{portal.clientName}</span>
          </p>
        </div>

        {/* Version tabs */}
        {versions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {versions.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVersionId(v.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  v.id === activeVersionId
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-600 bg-zinc-900/50"
                }`}
              >
                {v.versionName}
                {v.approved && <CheckCircle2 className={`w-3.5 h-3.5 ${v.id === activeVersionId ? "text-black" : "text-green-400"}`} />}
              </button>
            ))}
          </div>
        )}

        {/* Active version player */}
        {activeVersion ? (
          <>
            <WaveformPlayer
              key={activeVersion.id}
              version={activeVersion}
              comments={comments}
              onAddComment={(ts, text) => addCommentMutation.mutate({ timestamp: ts, text })}
              addingComment={addCommentMutation.isPending}
              onSeekReady={(fn) => { seekFnRef.current = fn; }}
            />

            {/* Comments list */}
            {comments.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                  Komentari · {activeVersion.versionName}
                </h2>
                <div className="space-y-2">
                  {comments.map(c => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      onJump={(ts) => seekFnRef.current?.(ts)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Approval section */}
            <div className={`rounded-2xl border p-6 text-center space-y-4 ${activeVersion.approved ? "border-green-500/20 bg-green-500/5" : "border-zinc-800 bg-zinc-900/30"}`}>
              {activeVersion.approved ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                  <div>
                    <p className="font-semibold text-green-400">Verzija odobrena</p>
                    {activeVersion.approvedAt && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Odobrio/la {activeVersion.approvedByName} · {new Date(activeVersion.approvedAt).toLocaleDateString("sr-RS")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-zinc-300 font-medium">Zadovoljan/na si ovom verzijom?</p>
                  <p className="text-sm text-zinc-500">Možeš ostaviti komentare gore, ili odobriti ovu verziju ako si zadovoljan/na.</p>
                  <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-500 text-white font-semibold px-8">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Odobravam ovu verziju
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Odobriti {activeVersion.versionName}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          Ovo potvrđuje da si zadovoljan/na ovom verzijom. Studio će biti obavešten.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700">Otkaži</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? "Šaljem..." : "Potvrdi odobrenje"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-zinc-500">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Studio još nije uploadovao verzije.</p>
            <p className="text-sm mt-1">Provjeri ponovo uskoro.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 mt-16 py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-zinc-600">
          <span>© Studio LeFlow</span>
          <a href="https://studioleflow.com" className="hover:text-zinc-400 transition-colors">studioleflow.com</a>
        </div>
      </footer>
    </div>
  );
}
