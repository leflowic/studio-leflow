import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, UserPlus } from "lucide-react";

// "Pozovi prijatelja". Flow: a visitor lands on any page with ?ref=CODE ->
// the code is kept in localStorage -> right after their (new) account is
// verified and logged in, ReferralClaimer posts it once. The server only
// accepts it from accounts younger than 72h and pays both sides later, once
// the invitee has been active on 3 different days (engagement-jobs.ts).

const LS_KEY = "ref_code";

export function ReferralClaimer() {
  const { user } = useAuth();
  const sent = useRef(false);

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code && /^[a-z0-9]{4,12}$/i.test(code)) localStorage.setItem(LS_KEY, code.toLowerCase());
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.emailVerified || sent.current) return;
    let code: string | null = null;
    try { code = localStorage.getItem(LS_KEY); } catch {}
    if (!code) return;
    sent.current = true;
    apiRequest("POST", "/api/me/referral/claim", { code })
      .catch(() => {})
      .finally(() => { try { localStorage.removeItem(LS_KEY); } catch {} });
  }, [user?.emailVerified]);

  return null;
}

type ReferralInfo = { code: string; link: string; coins: number; activeDays: number; invited: number; rewarded: number; pending: number };

export function InviteFriendCard() {
  const { data } = useQuery<ReferralInfo>({ queryKey: ["/api/me/referral"] });
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="invite-title">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h2 id="invite-title" className="font-semibold">Pozovi prijatelja</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kad se prijatelj prijavi preko tvog linka i bude aktivan {data.activeDays} različita dana (ploča ili igra), oboje dobijate po <span className="font-mono text-foreground">{data.coins} SC</span>.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0 h-10 rounded-full border border-border bg-background px-4 flex items-center font-mono text-xs text-muted-foreground truncate">
          {data.link.replace(/^https?:\/\//, "")}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(data.link); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Kopirano" : "Kopiraj"}
          </Button>
          {canShare && (
            <Button onClick={() => navigator.share({ title: "Studio LeFlow", text: "Pridruži mi se na Studio LeFlow - igra, ploča dana i popusti u studiju.", url: data.link }).catch(() => {})}>
              <Share2 className="w-4 h-4" /> Podeli
            </Button>
          )}
        </div>
      </div>

      {data.invited > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          Pozvano: <span className="font-mono text-foreground">{data.invited}</span>
          {" · "}nagrađeno: <span className="font-mono text-foreground">{data.rewarded}</span>
          {data.pending > 0 && <>{" · "}čeka aktivnost: <span className="font-mono text-foreground">{data.pending}</span></>}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground/80 mt-3">Pozivi sa iste mreže (iste kuće ili istog telefona) se ne računaju.</p>
    </section>
  );
}
