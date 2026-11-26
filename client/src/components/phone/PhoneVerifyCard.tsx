import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, Loader2, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";

// WhatsApp account verification for the prize games (Ploča dana, Pogodi Pesmu).
// Shown only when the admin switch is on and this account isn't verified yet.
// Server: /api/phone-verify/* + /api/whatsapp/webhook (server/phone-verify.ts).

type Status = { required: boolean; configured: boolean; verified: boolean };
type Started = { verified: boolean; code?: string; link?: string; expiresAt?: string };

const STATUS_KEY = ["/api/phone-verify/status"];

export function usePhoneGate(enabled = true) {
  const { data, isLoading } = useQuery<Status>({ queryKey: STATUS_KEY, enabled, staleTime: 30_000 });
  return { needsPhone: !!data?.required && !data?.verified, loading: isLoading, status: data };
}

export function PhoneVerifyCard({ onVerified }: { onVerified?: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { subscribe } = useWebSocketContext();
  const [started, setStarted] = useState<Started | null>(null);
  const [starting, setStarting] = useState(false);
  const [taken, setTaken] = useState(false);
  const [now, setNow] = useState(Date.now());

  const expired = !!started?.expiresAt && new Date(started.expiresAt).getTime() < now;
  const waiting = !!started?.code && !expired;

  const done = () => {
    qc.invalidateQueries({ queryKey: STATUS_KEY });
    toast({ title: "Nalog je potvrđen", description: "Sada možeš da igraš za nagrade." });
    onVerified?.();
  };

  // live confirmation over the socket, plus a slow poll as a safety net
  useEffect(() => subscribe(m => {
    if (m.type === "phone_verified") done();
    if (m.type === "phone_verify_failed") setTaken(true);
  }), [subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(async () => {
      setNow(Date.now());
      try {
        const s: Status = await (await apiRequest("GET", "/api/phone-verify/status")).json();
        if (s.verified) { clearInterval(id); done(); }
      } catch { /* keep waiting */ }
    }, 4000);
    return () => clearInterval(id);
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (starting) return;
    setStarting(true);
    setTaken(false);
    try {
      const r: Started = await (await apiRequest("POST", "/api/phone-verify/start")).json();
      if (r.verified) return done();
      setStarted(r);
      setNow(Date.now());
    } catch (e: any) {
      toast({ title: "Kod nije napravljen", description: e?.message || "Pokušaj ponovo.", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">Potvrdi nalog preko WhatsApp-a</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Igre sa nagradama su samo za potvrđene naloge. Pošalješ jednu poruku i gotovo - jednom, zauvek. Jedan broj potvrđuje jedan nalog.
          </p>
        </div>
      </div>

      {!waiting ? (
        <div className="mt-5">
          {expired && <p className="text-sm text-muted-foreground mb-3">Kod je istekao. Napravi novi.</p>}
          <Button onClick={start} aria-busy={starting} className={starting ? "opacity-70" : ""}>
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : expired ? <RotateCcw className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {expired ? "Novi kod" : "Potvrdi preko WhatsApp-a"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="font-mono text-primary">1.</span> Otvori WhatsApp dugmetom ispod - poruka je već napisana.</li>
            <li className="flex gap-2"><span className="font-mono text-primary">2.</span> Samo je pošalji. Ova strana će se sama osvežiti.</li>
          </ol>
          {/* a real link (not window.open after an await) so phones open the app reliably */}
          <a
            href={started!.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Pošalji poruku na WhatsApp
          </a>
          <p className="text-xs text-muted-foreground">
            Tvoj kod: <span className="font-mono text-foreground">{started!.code}</span> · važi 15 minuta
          </p>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Čekam poruku...
          </p>
          {taken && (
            <p className="text-sm text-destructive">Ovaj broj je već potvrdio drugi nalog. Pošalji poruku sa svog broja.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function PhoneVerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="w-3.5 h-3.5 text-primary" /> Nalog potvrđen
    </span>
  );
}
