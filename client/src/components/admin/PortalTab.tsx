import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Plus, Link2, Trash2, Upload, CheckCircle2, MessageCircle,
  ChevronRight, X, Check, Music2, Clock, User, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import type { ClientPortal, PortalVersion, PortalComment } from "@shared/schema";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type PortalWithStats = ClientPortal & { versionsCount: number; unresolvedComments: number };
type VersionWithCount = PortalVersion & { commentCount: number };

// ─── Comment item ────────────────────────────────────────────────────────────

function CommentItem({ comment, onResolve }: { comment: PortalComment; onResolve: (id: number) => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${comment.resolved ? "border-zinc-800 opacity-50" : "border-zinc-700 bg-zinc-900/40"}`}>
      <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${comment.authorType === "producer" ? "bg-amber-500" : "bg-blue-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">
            {formatTime(comment.timestampSeconds)}
          </span>
          <span className="text-xs font-medium">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {comment.authorType === "producer" ? "Studio" : "Klijent"}
          </span>
        </div>
        <p className="text-sm text-zinc-200">{comment.text}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
        </p>
      </div>
      {!comment.resolved && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300" onClick={() => onResolve(comment.id)}>
          <Check className="w-3 h-3 mr-1" /> Reši
        </Button>
      )}
    </div>
  );
}

// ─── Version panel ────────────────────────────────────────────────────────────

function VersionPanel({ version, token, onDelete }: { version: VersionWithCount; token: string; onDelete: (id: number) => void }) {
  const { toast } = useToast();
  const [producerComment, setProducerComment] = useState("");
  const [commentTs, setCommentTs] = useState("");

  const { data: comments = [] } = useQuery<PortalComment[]>({
    queryKey: [`/api/admin/portals/versions/${version.id}/comments`],
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/portals/comments/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/admin/portals/versions/${version.id}/comments`] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/portals/versions/${version.id}/comment`, {
      text: producerComment,
      timestampSeconds: parseInt(commentTs) || 0,
    }),
    onSuccess: () => {
      setProducerComment("");
      setCommentTs("");
      queryClient.invalidateQueries({ queryKey: [`/api/admin/portals/versions/${version.id}/comments`] });
      toast({ title: "Komentar dodat" });
    },
  });

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-900/60 px-4 py-3 flex items-center gap-3">
        <Music2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{version.versionName}</span>
            {version.approved ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Odobreno
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-zinc-400">Na čekanju</Badge>
            )}
            {comments.filter(c => !c.resolved).length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                <MessageCircle className="w-3 h-3 mr-1" />
                {comments.filter(c => !c.resolved).length} novih
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(version.createdAt), "dd.MM.yyyy")}
            {version.approved && version.approvedAt && ` · Odobreno ${format(new Date(version.approvedAt), "dd.MM.yyyy")}`}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle>Obriši verziju?</AlertDialogTitle>
              <AlertDialogDescription>Ovo će obrisati i sve komentare na ovoj verziji.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(version.id)}>Obriši</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {comments.length > 0 && (
        <div className="px-4 py-3 space-y-2 border-t border-zinc-800">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Komentari ({comments.length})</p>
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} onResolve={(id) => resolveMutation.mutate(id)} />
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-xs font-medium text-muted-foreground mb-2">Odgovor studia</p>
        <div className="flex gap-2 mb-2">
          <Input
            type="number"
            placeholder="Sekunda (npr. 92)"
            value={commentTs}
            onChange={e => setCommentTs(e.target.value)}
            className="w-36 h-8 text-xs bg-zinc-900 border-zinc-700"
          />
          <span className="text-xs text-muted-foreground self-center">= {formatTime(parseInt(commentTs) || 0)}</span>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Odgovor na komentar klijenta..."
            value={producerComment}
            onChange={e => setProducerComment(e.target.value)}
            className="text-sm bg-zinc-900 border-zinc-700 min-h-[60px] resize-none"
          />
          <Button
            size="sm"
            className="h-auto bg-amber-600 hover:bg-amber-500 text-black self-end"
            disabled={!producerComment.trim() || addCommentMutation.isPending}
            onClick={() => addCommentMutation.mutate()}
          >
            Pošalji
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Portal detail drawer ──────────────────────────────────────────────────────

function PortalDetail({ portal, onClose }: { portal: PortalWithStats; onClose: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [versionName, setVersionName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: versions = [], refetch } = useQuery<VersionWithCount[]>({
    queryKey: [`/api/admin/portals/${portal.id}/versions`],
  });

  const shareUrl = `${APP_URL}/portal/${portal.shareToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link kopiran!" });
  };

  const deleteVersionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/portals/versions/${id}`),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portals"] });
      toast({ title: "Verzija obrisana" });
    },
  });

  const uploadVersion = async () => {
    if (!selectedFile || !versionName.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);
      formData.append("versionName", versionName.trim());
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/portals/${portal.id}/versions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Greška");
      }
      setVersionName("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portals"] });
      toast({ title: "Verzija uploadovana!" });
    } catch (e: any) {
      toast({ title: "Greška", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" className="mt-0.5 h-8 w-8 p-0" onClick={onClose}>
          <ChevronRight className="w-4 h-4 rotate-180" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold truncate">{portal.name}</h3>
          <p className="text-sm text-muted-foreground">
            <User className="w-3 h-3 inline mr-1" />
            {portal.clientName}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={copyLink} className="h-8 text-xs border-zinc-700">
            <Link2 className="w-3.5 h-3.5 mr-1.5" /> Kopiraj link
          </Button>
          <Button size="sm" variant="outline" asChild className="h-8 text-xs border-zinc-700">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Pregledaj
            </a>
          </Button>
        </div>
      </div>

      {/* Upload new version */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-500" /> Dodaj verziju
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Input
            placeholder="Naziv verzije (npr. Mix v1, Master)"
            value={versionName}
            onChange={e => setVersionName(e.target.value)}
            className="bg-zinc-900 border-zinc-700"
          />
          <div
            className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <Music2 className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-zinc-300 truncate max-w-[200px]">{selectedFile.name}</span>
                <button onClick={e => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Klikni da izabereš audio fajl <span className="text-zinc-500 text-xs">(MP3, WAV, do 50MB)</span>
              </p>
            )}
          </div>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
          <Button
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold"
            onClick={uploadVersion}
            disabled={!selectedFile || !versionName.trim() || uploading}
          >
            {uploading ? "Uploadujem..." : "Upload verzije"}
          </Button>
        </CardContent>
      </Card>

      {/* Versions */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Verzije ({versions.length})
        </h4>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nema verzija. Uploaduj prvu verziju gore.</p>
        ) : (
          versions.map(v => (
            <VersionPanel key={v.id} version={v} token={portal.shareToken} onDelete={(id) => deleteVersionMutation.mutate(id)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main PortalTab ────────────────────────────────────────────────────────────

export function PortalTab() {
  const { toast } = useToast();
  const [selectedPortal, setSelectedPortal] = useState<PortalWithStats | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");

  const { data: portals = [], isLoading } = useQuery<PortalWithStats[]>({
    queryKey: ["/api/admin/portals"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/portals", { name: newName, clientName: newClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portals"] });
      setCreateOpen(false);
      setNewName("");
      setNewClient("");
      toast({ title: "Portal kreiran!" });
    },
    onError: (e: any) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/portals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portals"] });
      if (selectedPortal) setSelectedPortal(null);
      toast({ title: "Portal obrisan" });
    },
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${APP_URL}/portal/${token}`);
    toast({ title: "Link kopiran!" });
  };

  if (selectedPortal) {
    return <PortalDetail portal={selectedPortal} onClose={() => setSelectedPortal(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Client Portal</h2>
          <p className="text-sm text-muted-foreground">Deli mixeve sa klijentima i prikupljaj komentare</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-500 text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Novi portal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Kreiraj novi portal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Naziv projekta/pesme</label>
                <Input placeholder="npr. Marko - Pesma 01" value={newName} onChange={e => setNewName(e.target.value)} className="bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ime klijenta</label>
                <Input placeholder="npr. Marko Marković" value={newClient} onChange={e => setNewClient(e.target.value)} className="bg-zinc-800 border-zinc-700" />
              </div>
              <Button
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold"
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || !newClient.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Kreiram..." : "Kreiraj portal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />)}
        </div>
      ) : portals.length === 0 ? (
        <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
          <CardContent className="py-16 text-center">
            <Music2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nema portala</p>
            <p className="text-sm text-zinc-600 mt-1">Kreiraj prvi portal i podeli link sa klijentom</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {portals.map(p => (
            <Card key={p.id} className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => setSelectedPortal(p)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      {p.unresolvedComments > 0 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          <MessageCircle className="w-3 h-3 mr-1" /> {p.unresolvedComments} nov{p.unresolvedComments === 1 ? "i" : "ih"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span><User className="w-3 h-3 inline mr-0.5" />{p.clientName}</span>
                      <span><Music2 className="w-3 h-3 inline mr-0.5" />{p.versionsCount} verzi{p.versionsCount === 1 ? "ja" : "ja"}</span>
                      <span><Clock className="w-3 h-3 inline mr-0.5" />{format(new Date(p.createdAt), "dd.MM.yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700" onClick={() => copyLink(p.shareToken)}>
                      <Link2 className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Obriši portal?</AlertDialogTitle>
                          <AlertDialogDescription>Ovo će obrisati sve verzije i komentare za "{p.name}".</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(p.id)}>Obriši</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
