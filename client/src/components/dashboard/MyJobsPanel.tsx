import { Fragment, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PanelCard } from "@/components/ui/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Music, CalendarClock, MessageSquareHeart, Sparkles, Link2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { JOB_STAGES } from "@/lib/job-stages";

type MyJob = {
  id: number;
  title: string;
  stage: string;
  deliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  contractNumber: string | null;
  invoiceNumber: string | null;
  hasTestimonial: boolean;
  brief: { description: string; referenceLinks: string[] } | null;
};

function JobStepper({ stage }: { stage: string }) {
  const currentIndex = Math.max(0, JOB_STAGES.findIndex(s => s.value === stage));
  return (
    <div className="flex items-center">
      {JOB_STAGES.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <Fragment key={s.value}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : current
                    ? "border-primary text-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border text-muted-foreground bg-muted/30"
              }`}
              title={s.label}
            >
              {done ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </div>
            {i < JOB_STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentIndex ? "bg-primary" : "bg-border"}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function TestimonialPrompt({ jobId }: { jobId: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/testimonials", { jobId, text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      toast({ title: "Hvala na utisku!" });
    },
    onError: () => toast({ title: "Greška", description: "Utisak nije poslat, pokušaj ponovo", variant: "destructive" }),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <MessageSquareHeart className="w-3.5 h-3.5" />
        Ostavi utisak o saradnji
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Kako je proteklo snimanje, da li si zadovoljan rezultatom..."
        className="text-sm min-h-20"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={text.trim().length < 10 || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "Šaljem..." : "Pošalji utisak"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Otkaži</Button>
      </div>
    </div>
  );
}

function BriefPrompt({ jobId, brief }: { jobId: number; brief: MyJob["brief"] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(brief?.description ?? "");
  const [linksText, setLinksText] = useState((brief?.referenceLinks ?? []).join("\n"));

  const submitMutation = useMutation({
    mutationFn: () => {
      const referenceLinks = linksText.split("\n").map(l => l.trim()).filter(Boolean);
      return apiRequest("POST", `/api/user/jobs/${jobId}/brief`, { description, referenceLinks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      setOpen(false);
      toast({ title: brief ? "Brief ažuriran" : "Brief poslat producentu" });
    },
    onError: (e: any) => toast({ title: "Greška", description: e.message ?? "Brief nije poslat, pokušaj ponovo", variant: "destructive" }),
  });

  if (!open) {
    if (brief) {
      return (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Tvoj brief je poslat
            </p>
            <button type="button" onClick={() => setOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Izmeni
            </button>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{brief.description}</p>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Pošalji brief pre snimanja
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Kakav zvuk/vajb tražiš, koje pesme su ti referenca, ideje za aranžman..."
        className="text-sm min-h-20"
      />
      <div className="space-y-1">
        <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Referentni linkovi (po jedan u redu, opciono)
        </p>
        <Textarea
          value={linksText}
          onChange={e => setLinksText(e.target.value)}
          placeholder={"https://open.spotify.com/track/...\nhttps://youtube.com/..."}
          className="text-sm min-h-16"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={description.trim().length < 10 || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "Šaljem..." : brief ? "Sačuvaj izmene" : "Pošalji brief"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Otkaži</Button>
      </div>
    </div>
  );
}

export function MyJobsPanel() {
  const { data: jobs, isLoading } = useQuery<MyJob[]>({ queryKey: ["/api/user/jobs"] });

  if (isLoading) {
    return (
      <PanelCard icon={Music} iconBg="bg-blue-500/10" iconColor="text-blue-500" title="Gde je moja pesma" desc="Status tvog posla u studiju">
        <Skeleton className="h-16 rounded-xl" />
      </PanelCard>
    );
  }

  // Most users don't have an active job on the pipeline board - hide the
  // section entirely rather than showing a permanent empty state.
  if (!jobs?.length) return null;

  return (
    <PanelCard
      icon={Music}
      iconBg="bg-blue-500/10"
      iconColor="text-blue-500"
      title="Gde je moja pesma"
      desc="Status tvog posla u studiju, uživo"
    >
      <div className="space-y-5">
        {jobs.map(job => {
          const currentLabel = JOB_STAGES.find(s => s.value === job.stage)?.label ?? job.stage;
          return (
            <div key={job.id} className="p-4 rounded-xl border border-border/40 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium truncate">{job.title}</p>
                {job.deliveryDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {format(new Date(job.deliveryDate), "dd.MM.yyyy")}
                  </span>
                )}
              </div>
              <JobStepper stage={job.stage} />
              <p className="text-xs text-muted-foreground">
                Trenutna faza: <span className="font-medium text-foreground">{currentLabel}</span>
              </p>
              {job.stage !== "isporuceno" && <BriefPrompt jobId={job.id} brief={job.brief} />}
              {job.stage === "isporuceno" && !job.hasTestimonial && <TestimonialPrompt jobId={job.id} />}
              {job.stage === "isporuceno" && job.hasTestimonial && (
                <p className="text-xs text-muted-foreground italic">Hvala na utisku!</p>
              )}
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
