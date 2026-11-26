import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Gamepad2, Bell, MessageCircle, Music, Trophy, Flame, ChevronRight } from "lucide-react";
import { JOB_STAGES } from "@/lib/job-stages";
import { useMonthlyChallenge, useChallengeCountdown } from "@/components/ChallengeBanner";
import { PushToggle } from "@/components/PushToggle";
import { getPushState } from "@/lib/push";

// "Za tebe danas" - a personal strip right under the hero for logged-in,
// verified users. Each item only renders when it has something real to say;
// if nothing applies, the whole strip disappears. The hero stays as-is (it's
// CMS-backed brand copy that guests and search engines need).

export type ForYouItem = { key: string; href: string; icon: React.ElementType; title: string; detail: string; highlight?: boolean };

/** Live "what's happening for you" items - shared by the home strip and the Dashboard.
 *  Pass includeJob=false where the job stepper is already on screen (Dashboard). */
export function useForYouItems(gameData: any, { includeJob = true }: { includeJob?: boolean } = {}) {
  const { data: unreadNotifs } = useQuery<{ count: number }>({ queryKey: ["/api/notifications/unread-count"] });
  const { data: unreadMsgs } = useQuery<{ count: number }>({ queryKey: ["/api/messages/unread-count"] });
  const { data: jobs } = useQuery<Array<{ id: number; title: string; stage: string }>>({ queryKey: ["/api/user/jobs"] });
  const { data: challenge } = useMonthlyChallenge();
  const { label: challengeLabel, ended: challengeEnded } = useChallengeCountdown(challenge?.deadline);
  const [pushOff, setPushOff] = useState(false);

  useEffect(() => {
    getPushState().then(s => setPushOff(s === "off")).catch(() => {});
  }, []);

  const items: ForYouItem[] = [];

  if (gameData) {
    const streak = gameData.streak?.current ?? 0;
    if (gameData.available && !gameData.alreadyPlayed) {
      items.push({ key: "game", href: "/igra", icon: Gamepad2, title: "Pogodi Pesmu je otvorena", detail: streak ? `Ne prekidaj niz od ${streak} dana` : "Imaš jedan pokušaj", highlight: true });
    } else if (gameData.available && gameData.alreadyPlayed) {
      items.push({ key: "game", href: "/igra", icon: streak > 1 ? Flame : Gamepad2, title: "Današnja igra je odigrana", detail: streak > 1 ? `Niz: ${streak} dana zaredom` : "Vrati se sutra" });
    } else if (gameData.reason === "not_yet" && gameData.openHour != null) {
      const hh = String(gameData.openHour).padStart(2, "0");
      const mm = String(gameData.openMinute ?? 0).padStart(2, "0");
      items.push({ key: "game", href: "/igra", icon: Gamepad2, title: `Igra počinje u ${hh}:${mm}`, detail: "Pogodi Pesmu" });
    }
  }

  const activeJob = includeJob ? jobs?.find(j => j.stage !== "isporuceno") : undefined;
  if (activeJob) {
    const stage = JOB_STAGES.find(s => s.value === activeJob.stage)?.label ?? activeJob.stage;
    items.push({ key: "job", href: "/dashboard", icon: Music, title: activeJob.title, detail: `Faza: ${stage}` });
  }

  if (unreadMsgs?.count) {
    items.push({ key: "msg", href: "/inbox", icon: MessageCircle, title: `${unreadMsgs.count} ${unreadMsgs.count === 1 ? "nova poruka" : "nove poruke"}`, detail: "Inbox", highlight: true });
  }
  if (unreadNotifs?.count) {
    items.push({ key: "notif", href: "/zajednica", icon: Bell, title: `${unreadNotifs.count} ${unreadNotifs.count === 1 ? "novo obaveštenje" : "nova obaveštenja"}`, detail: "Zajednica" });
  }
  if (challenge && challenge.isActive && !challengeEnded) {
    items.push({ key: "challenge", href: "/giveaway", icon: Trophy, title: challenge.theme, detail: challengeLabel ? `Izazov meseca · ${challengeLabel}` : "Izazov meseca" });
  }

  return { items, pushOff };
}

export function ForYouToday({ gameData }: { gameData: any }) {
  const { items, pushOff } = useForYouItems(gameData);

  if (!items.length && !pushOff) return null;

  return (
    <section className="bg-background relative z-10 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold">Za tebe danas</h2>
          {pushOff && <div className="hidden sm:block"><PushToggle variant="compact" /></div>}
        </div>
        {items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(({ key, href, icon: Icon, title, detail, highlight }) => (
              <Link key={key} href={href}>
                <div className={`group flex items-center gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${highlight ? "border-primary/40 bg-primary/5 hover:bg-primary/10" : "border-border/60 bg-card hover:border-primary/30"}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
        {pushOff && (
          <div className="sm:hidden mt-4"><PushToggle variant="compact" /></div>
        )}
      </div>
    </section>
  );
}
