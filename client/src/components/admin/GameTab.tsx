import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Music, Trophy, Trash2, Plus, Gift, Upload, CheckCircle2, Loader2, Pencil, X } from "lucide-react";
import { format } from "date-fns";

function getMonday(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0]!;
}

export default function GameTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challenges = [] } = useQuery<any[]>({ queryKey: ["/api/admin/game/challenges"] });
  const { data: prizes = [] } = useQuery<any[]>({ queryKey: ["/api/admin/game/prizes"] });

  // Challenge form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cDate, setCDate] = useState(new Date().toISOString().split('T')[0]);
  const [cUrl, setCUrl] = useState("");
  const [cClipUrl, setCClipUrl] = useState("");
  const [cAnswer, setCAnswer] = useState("");
  const [cClip, setCClip] = useState("30");
  const [cTime, setCTime] = useState("17:00");
  const [uploadingClip, setUploadingClip] = useState(false);
  const clipFileRef = useRef<HTMLInputElement>(null);

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setCDate(c.challengeDate);
    setCUrl(c.youtubeUrl);
    setCClipUrl(c.clipUrl ?? "");
    setCAnswer(c.correctAnswers);
    setCClip(String(c.clipStartSeconds));
    setCTime(`${String(c.openHour ?? 17).padStart(2, '0')}:${String(c.openMinute ?? 0).padStart(2, '0')}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCDate(new Date().toISOString().split('T')[0]!);
    setCUrl(""); setCClipUrl(""); setCAnswer(""); setCClip("30"); setCTime("17:00");
  };

  // Prize form
  const [pWeek, setPWeek] = useState(getMonday());
  const [pDiscount, setPDiscount] = useState("20");
  const [pDesc, setPDesc] = useState("");
  const [pPromo, setPPromo] = useState("");

  const handleClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingClip(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/upload/game-clip", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setCClipUrl(url);
      toast({ title: "Clip uploadovan", description: "Audio clip je spreman" });
    } catch {
      toast({ title: "Greška", description: "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploadingClip(false);
      if (clipFileRef.current) clipFileRef.current.value = "";
    }
  };

  const saveChallenges = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/game/challenges", {
      challengeDate: cDate,
      youtubeUrl: cUrl,
      clipUrl: cClipUrl || null,
      correctAnswers: cAnswer,
      clipStartSeconds: Number(cClip) || 30,
      openHour: parseInt(cTime.split(':')[0] ?? '17', 10),
      openMinute: parseInt(cTime.split(':')[1] ?? '0', 10),
    }),
    onSuccess: () => {
      toast({ title: "Sačuvano", description: editingId ? "Izazov je izmenjen" : "Izazov je dodat" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game/challenges"] });
      cancelEdit();
    },
    onError: () => toast({ title: "Greška", variant: "destructive", description: "Nije moguće sačuvati izazov" }),
  });

  const deleteChallenge = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/game/challenges/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/game/challenges"] }),
  });

  const savePrize = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/game/prizes", {
      weekStart: pWeek,
      discountPct: Number(pDiscount),
      prizeDescription: pDesc,
      promoCode: pPromo || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Sačuvano", description: "Nagrada je sačuvana" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game/prizes"] });
      setPDesc(""); setPPromo("");
    },
    onError: () => toast({ title: "Greška", variant: "destructive", description: "Nije moguće sačuvati nagradu" }),
  });

  const setWinner = useMutation({
    mutationFn: (weekStart: string) => apiRequest("POST", `/api/admin/game/prizes/${weekStart}/set-winner`),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: "Pobednik određen",
        description: data.winnerUsername
          ? `Pobednik: ${data.winnerUsername}${data.promoCode ? ` — Kod: ${data.promoCode}` : ''}`
          : "Nema ko je igrao ove sedmice",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game/prizes"] });
    },
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Add/Edit Challenge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            {editingId ? "Izmeni izazov" : "Dodaj izazov"}
            {editingId && (
              <Button variant="ghost" size="sm" className="ml-auto gap-1 text-muted-foreground" onClick={cancelEdit}>
                <X className="w-4 h-4" /> Otkaži
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Datum</Label>
              <Input type="date" value={cDate} onChange={e => setCDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Clip pozicija (sekunde od početka)</Label>
              <Input type="number" min={0} value={cClip} onChange={e => setCClip(e.target.value)} placeholder="30" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Vreme otvaranja</Label>
            <Input type="time" value={cTime} onChange={e => setCTime(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>YouTube URL (referenca)</Label>
            <Input value={cUrl} onChange={e => setCUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <div className="space-y-1">
            <Label>Audio clip (MP3, max 5MB)</Label>
            <div className="flex items-center gap-2">
              <input ref={clipFileRef} type="file" accept=".mp3,audio/mpeg" className="hidden" onChange={handleClipUpload} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploadingClip}
                onClick={() => clipFileRef.current?.click()}
              >
                {uploadingClip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingClip ? "Uploadovanje..." : "Izaberi MP3"}
              </Button>
              {cClipUrl && !uploadingClip && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Clip uploadovan
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tačan odgovor (više odgovora odvojiti zarezom)</Label>
            <Input value={cAnswer} onChange={e => setCAnswer(e.target.value)} placeholder="Ceza - Sus, ceza sus" />
            <p className="text-xs text-muted-foreground">Poređenje je case-insensitive. Navedi varijante koje se prihvataju.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => saveChallenges.mutate()}
              disabled={!cDate || !cUrl || !cAnswer || saveChallenges.isPending}
              className="gap-2"
            >
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saveChallenges.isPending ? "Čuvanje..." : editingId ? "Sačuvaj izmene" : "Sačuvaj izazov"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit}>Otkaži</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenges list */}
      <Card>
        <CardHeader>
          <CardTitle>Postavljeni izazovi</CardTitle>
        </CardHeader>
        <CardContent>
          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nema izazova</p>
          ) : (
            <ul className="divide-y">
              {challenges.map((c: any) => (
                <li key={c.id} className={`flex items-center gap-3 py-3 ${editingId === c.id ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {new Date(c.challengeDate + "T12:00:00Z").toLocaleDateString('sr-Latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                      {c.challengeDate === today && <Badge className="text-xs">Danas</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.correctAnswers.split(',')[0].trim()}</p>
                    <p className="text-xs text-muted-foreground">
                      Clip: {c.clipStartSeconds}s &nbsp;·&nbsp; Otvara: {String(c.openHour ?? 17).padStart(2,'0')}:{String(c.openMinute ?? 0).padStart(2,'0')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteChallenge.mutate(c.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Add Prize */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Nedeljna nagrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Sedmica (ponedeljak)</Label>
              <Input type="date" value={pWeek} onChange={e => setPWeek(e.target.value)} />
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setPWeek(getMonday(0))}>Ova</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setPWeek(getMonday(1))}>Sledeća</Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Popust (%)</Label>
              <Input type="number" min={1} max={100} value={pDiscount} onChange={e => setPDiscount(e.target.value)} placeholder="20" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Opis nagrade</Label>
            <Input value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="30% popust na Mix & Master" />
          </div>
          <div className="space-y-1">
            <Label>Promo kod (opciono)</Label>
            <Input value={pPromo} onChange={e => setPPromo(e.target.value)} placeholder="LEFLOW30" />
          </div>
          <Button
            onClick={() => savePrize.mutate()}
            disabled={!pWeek || !pDiscount || !pDesc || savePrize.isPending}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {savePrize.isPending ? "Čuvanje..." : "Sačuvaj nagradu"}
          </Button>
        </CardContent>
      </Card>

      {/* Prizes list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Nagrade po nedeljama
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nema nagrada</p>
          ) : (
            <ul className="divide-y">
              {prizes.map((p: any) => (
                <li key={p.id} className="py-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.weekStart}</span>
                    <Badge variant="outline" className="text-xs">{p.discountPct}% popust</Badge>
                    {p.winnerUsername && <Badge className="text-xs bg-yellow-500">🏆 {p.winnerUsername}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.prizeDescription}</p>
                  {p.promoCode && <p className="text-xs font-mono text-primary">{p.promoCode}</p>}
                  {!p.winnerUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={() => setWinner.mutate(p.weekStart)}
                      disabled={setWinner.isPending}
                    >
                      Odredi pobednika
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
