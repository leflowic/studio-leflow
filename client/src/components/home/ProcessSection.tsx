import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
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

// Plays once when it scrolls into view: the stages tick off one by one up to
// the demo stage, then the timestamped comment slides in. Reduced-motion
// visitors see the finished state straight away.
function StepperIllustration() {
  const current = JOB_STAGES.findIndex(s => s.value === DEMO_STAGE);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [reached, setReached] = useState(reduce ? current : -1);

  useEffect(() => {
    if (reduce) { setReached(current); return; }
    if (!inView) return;
    let i = -1;
    const id = setInterval(() => {
      i += 1;
      setReached(i);
      if (i >= current) clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [inView, reduce, current]);

  const finished = reached >= current;

  return (
    <div ref={ref} className="rounded-xl border border-border/60 bg-card p-5 sm:p-6" aria-hidden="true">
      <p className="text-xs text-muted-foreground mb-1">Gde je moja pesma</p>
      <p className="font-semibold mb-5">Vaša pesma</p>
      <ol className="space-y-3">
        {JOB_STAGES.map((s, i) => {
          const done = i < current && i < reached;
          const now = i === current && reached >= current;
          return (
            <li key={s.value} className="flex items-center gap-3">
              <span
                className={
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors duration-300 " +
                  (done
                    ? "bg-primary text-primary-foreground"
                    : now
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground")
                }
              >
                {done ? (
                  <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                    <Check className="w-3.5 h-3.5" />
                  </motion.span>
                ) : (
                  i + 1
                )}
              </span>
              <span className={"transition-colors duration-300 " + (now ? "font-semibold" : done ? "text-foreground/80" : "text-muted-foreground")}>
                {s.label}
              </span>
              {now && (
                <span className="ml-auto inline-flex items-center gap-2 text-xs text-primary font-medium">
                  <span className="flex items-end gap-[2px] h-3">
                    {[0, 1, 2].map(b => (
                      <span
                        key={b}
                        className="eq-bar w-[2px] h-3 rounded-full bg-primary"
                        style={{ ["--eq-dur" as string]: `${0.8 + b * 0.2}s`, ["--eq-delay" as string]: `${-b * 0.3}s`, ["--eq-min" as string]: 0.3 }}
                      />
                    ))}
                  </span>
                  u toku
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-6 min-h-[3.25rem]">
        <AnimatePresence>
          {finished && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-lg bg-muted/60 p-3 flex gap-3 items-start"
            >
              <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                <span className="font-mono text-primary text-xs mr-1.5">1:42</span>
                Možemo li malo glasniji vokal u refrenu?
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
