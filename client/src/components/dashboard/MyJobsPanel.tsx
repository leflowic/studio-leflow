import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { PanelCard } from "@/components/ui/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Music, CalendarClock } from "lucide-react";
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
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
