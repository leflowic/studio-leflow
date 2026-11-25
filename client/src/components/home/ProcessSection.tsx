import { Link } from "wouter";
import { ArrowRight, Check, MessageSquare } from "lucide-react";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { JOB_STAGES } from "@/lib/job-stages";

// "Kako izgleda saradnja" - shows the client-facing tools that already exist
// (job status tracking, pre-session brief, timestamped portal comments) on the
// public site. The panel on the right is a static illustration of the real
// "Gde je moja pesma" stepper (MyJobsPanel), built from the same JOB_STAGES
// labels so it can't drift from what clients actually see.

const STEPS = [
  {
    title: "Upit",
    text: "Pošaljete upit preko forme ili nas pozovete. U roku od 24h dobijate tačnu ponudu i predlog termina.",
  },
  {
    title: "Brief pre termina",
    text: "U svom nalogu opišete zvuk koji želite i ubacite linkove ka referentnim pesmama. Na snimanju ne gubimo vreme na objašnjavanje.",
  },
  {
    title: "Pratite gde je pesma",
    text: "Status vidite u nalogu: snimanje, mix, mastering, revizija. Ne morate da pišete i pitate dokle se stiglo.",
  },
  {
    title: "Komentari na tačnu sekundu",
    text: "Verziju slušate na privatnom linku i ostavljate komentar na tačan trenutak u pesmi. Dve revizije su uključene.",
  },
];

const DEMO_STAGE = "mix";

function StepperIllustration() {
  const current = JOB_STAGES.findIndex(s => s.value === DEMO_STAGE);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6" aria-hidden="true">
      <p className="text-xs text-muted-foreground mb-1">Gde je moja pesma</p>
      <p className="font-semibold mb-5">Vaša pesma</p>
      <ol className="space-y-3">
        {JOB_STAGES.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={s.value} className="flex items-center gap-3">
              <span
                className={
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 " +
                  (done
                    ? "bg-primary text-primary-foreground"
                    : now
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground")
                }
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={now ? "font-semibold" : done ? "text-foreground/80" : "text-muted-foreground"}>
                {s.label}
              </span>
              {now && <span className="ml-auto text-xs text-primary font-medium">u toku</span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-6 rounded-lg bg-muted/60 p-3 flex gap-3 items-start">
        <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-mono text-primary text-xs mr-1.5">1:42</span>
          Možemo li malo glasniji vokal u refrenu?
        </p>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Primer prikaza iz korisničkog naloga</p>
    </div>
  );
}

export function ProcessSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30 relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <FadeInWhenVisible>
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-start">
            <div>
              <h2 className="heading-lg mb-4">Kako izgleda saradnja</h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl">
                Sa nalogom na sajtu posao pratite sami, bez jurenja producenta porukama. Nalog je besplatan.
              </p>
              <ol className="space-y-8">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-3">
                    <span className="font-mono text-lg font-medium text-primary leading-none pt-1 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link
                href="/kontakt"
                className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4"
              >
                Pošaljite upit
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="lg:sticky lg:top-28">
              <StepperIllustration />
            </div>
          </div>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}
