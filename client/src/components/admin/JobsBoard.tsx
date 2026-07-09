import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, FileText, Receipt, FolderKanban, CalendarClock, TriangleAlert, Sparkles, Link2 } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { JOB_STAGES as STAGES } from "@/lib/job-stages";

type StageAnalytics = {
  avgDaysByStage: Array<{ stage: string; avgDays: number; sampleCount: number }>;
  stuckJobs: Array<{ jobId: number; title: string; stage: string; daysInStage: number }>;
};

function stageLabel(value: string) {
  return STAGES.find(s => s.value === value)?.label ?? value;
}

function BottleneckPanel() {
  const { data } = useQuery<StageAnalytics>({ queryKey: ["/api/admin/jobs/analytics"] });
  if (!data) return null;

  // "Isporuceno" is terminal - there's no "next stage" to measure a duration
  // against, so it never has samples. Not useful in a "where do jobs get
  // stuck" view.
  const bars = data.avgDaysByStage.filter(s => s.stage !== "isporuceno" && s.sampleCount > 0);
  if (bars.length === 0 && data.stuckJobs.length === 0) return null;
  const maxDays = Math.max(...bars.map(b => b.avgDays), 1);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="pt-6 space-y-5">
        {bars.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prosečno vreme po fazi</h3>
            {bars.map(b => (
              <div key={b.stage} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{stageLabel(b.stage)}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${(b.avgDays / maxDays) * 100}%` }} />
                </div>
                <span className="text-xs font-medium w-16 shrink-0 text-right">{b.avgDays} {b.avgDays === 1 ? "dan" : "dana"}</span>
              </div>
            ))}
          </div>
        )}
        {data.stuckJobs.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-zinc-800/70">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" /> Duže nego obično u trenutnoj fazi
            </h3>
            {data.stuckJobs.map(j => (
              <div key={j.jobId} className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span className="truncate">{j.title} <span className="text-muted-foreground/60">- {stageLabel(j.stage)}</span></span>
                <span className="shrink-0 font-medium text-amber-500/90">{j.daysInStage} {j.daysInStage === 1 ? "dan" : "dana"}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Job {
  id: number;
  title: string;
  userId: number;
  stage: string;
  contractId: number | null;
  invoiceId: number | null;
  portalId: number | null;
  notes: string | null;
  deliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  username: string;
  avatarUrl: string | null;
  contractNumber: string | null;
  invoiceNumber: string | null;
  brief: { description: string; referenceLinks: string[] } | null;
}

function JobBriefSection({ brief }: { brief: Job["brief"] }) {
  const [expanded, setExpanded] = useState(false);
  if (!brief) return null;
  return (
    <div className="pt-2 border-t border-zinc-800/70">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300"
      >
        <Sparkles className="w-3 h-3" /> {expanded ? "Sakrij brief" : "Klijent je poslao brief"}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{brief.description}</p>
          {brief.referenceLinks.length > 0 && (
            <div className="space-y-1">
              {brief.referenceLinks.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-violet-400 hover:underline truncate"
                >
                  <Link2 className="w-3 h-3 shrink-0" /> <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function JobsBoard() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const { data: jobs, isLoading } = useQuery<Job[]>({ queryKey: ["/api/admin/jobs"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/jobs", {
        title,
        userId: Number(userId),
        deliveryDate: deliveryDate || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Uspeh", description: "Posao je dodat na tablu" });
      setShowForm(false);
      setTitle("");
      setUserId("");
      setDeliveryDate("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri kreiranju posla", variant: "destructive" });
    },
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      await apiRequest("PATCH", `/api/admin/jobs/${id}/stage`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri pomeranju posla", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/jobs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Uspeh", description: "Posao je obrisan" });
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri brisanju posla", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="w-[280px] shrink-0 h-64" />
        ))}
      </div>
    );
  }

  const jobsByStage = (stage: string) => (jobs ?? []).filter(j => j.stage === stage);

  return (
    <div className="space-y-4" data-testid="content-jobs">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Radna tabla</h2>
          <p className="text-sm text-muted-foreground">Pregled svih poslova kroz proizvodni proces</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-toggle-job-form">
          <Plus className="w-4 h-4 mr-1" />
          {showForm ? "Zatvori" : "Dodaj posao"}
        </Button>
      </div>

      <BottleneckPanel />

      {showForm && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Naziv posla</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="npr. Mix & Master - Nemanja"
                  data-testid="input-job-title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Klijent</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger data-testid="select-job-user">
                    <SelectValue placeholder="Izaberi klijenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rok isporuke (opciono)</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  data-testid="input-job-delivery-date"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Beleške (opciono)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Interna napomena o poslu..."
                rows={2}
                data-testid="textarea-job-notes"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || !userId || createMutation.isPending}
                data-testid="button-save-job"
              >
                Sačuvaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(jobs ?? []).length === 0 ? (
        <EmptyState icon={FolderKanban} text="Nema poslova na tabli" compact />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2" data-testid="board-jobs">
          {STAGES.map(col => (
            <div
              key={col.value}
              className="w-[280px] shrink-0 space-y-3"
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (draggedId != null) {
                  stageMutation.mutate({ id: draggedId, stage: col.value });
                  setDraggedId(null);
                }
              }}
              data-testid={`column-${col.value}`}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</h3>
                <span className="text-xs text-muted-foreground/70">{jobsByStage(col.value).length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {jobsByStage(col.value).map(job => (
                  <Card
                    key={job.id}
                    draggable
                    onDragStart={() => setDraggedId(job.id)}
                    className="bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 transition-all cursor-grab active:cursor-grabbing"
                    data-testid={`card-job-${job.id}`}
                  >
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{job.title}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(job.id)}
                          data-testid={`button-delete-job-${job.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <AvatarWithInitials src={job.avatarUrl} name={job.username} className="w-6 h-6 text-xs" />
                        <span className="text-xs text-muted-foreground truncate">{job.username}</span>
                      </div>
                      {(job.contractNumber || job.invoiceNumber || job.deliveryDate) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/70">
                          {job.contractNumber && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <FileText className="w-3 h-3" />{job.contractNumber}
                            </span>
                          )}
                          {job.invoiceNumber && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Receipt className="w-3 h-3" />{job.invoiceNumber}
                            </span>
                          )}
                          {job.deliveryDate && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CalendarClock className="w-3 h-3" />{format(new Date(job.deliveryDate), "dd.MM.yyyy")}
                            </span>
                          )}
                        </div>
                      )}
                      <JobBriefSection brief={job.brief} />
                      <Select
                        value={job.stage}
                        onValueChange={(stage) => stageMutation.mutate({ id: job.id, stage })}
                      >
                        <SelectTrigger className="h-7 text-xs mt-1" data-testid={`select-stage-${job.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
