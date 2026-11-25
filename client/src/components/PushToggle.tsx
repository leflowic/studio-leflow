import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";

const HINTS: Partial<Record<PushState, string>> = {
  "ios-needs-install": "Na iPhone-u obaveštenja rade kad sajt dodaš na početni ekran: Podeli, pa \"Dodaj na početni ekran\".",
  unsupported: "Ovaj browser ne podržava obaveštenja.",
  denied: "Obaveštenja su blokirana u podešavanjima browsera. Dozvoli ih za studioleflow.com pa pokušaj ponovo.",
};

// variant "row": settings page row with description; "compact": just the button
export function PushToggle({ variant = "row" }: { variant?: "row" | "compact" }) {
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const next = state === "on" ? await disablePush() : await enablePush();
      setState(next);
      if (next === "on") toast({ title: "Obaveštenja su uključena" });
      if (next === "denied") toast({ title: "Obaveštenja su blokirana", description: HINTS.denied });
    } catch (e: any) {
      toast({ title: "Greška", description: e?.message || "Uključivanje nije uspelo, pokušaj ponovo", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (state === null) return null;
  const hint = HINTS[state];
  const canToggle = state === "on" || state === "off";

  const button = canToggle ? (
    <Button size="sm" variant={state === "on" ? "outline" : "default"} onClick={toggle} disabled={busy} className="gap-2 flex-shrink-0">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "on" ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      {state === "on" ? "Isključi" : "Uključi obaveštenja"}
    </Button>
  ) : null;

  if (variant === "compact") {
    return button ?? <p className="text-xs text-muted-foreground">{hint}</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="font-medium text-sm">Obaveštenja na telefonu</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hint ?? "Kad igra počinje, kad izađe nova pesma iz studija, kad ti neko piše i kad se tvoja pesma pomeri u sledeću fazu."}
        </p>
      </div>
      {button}
    </div>
  );
}
