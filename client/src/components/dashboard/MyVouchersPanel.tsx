import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ticket, Copy, Check } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";

const fmtDate = (d: string) => { const x = new Date(d); const p = (n: number) => String(n).padStart(2, "0"); return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}.`; };


type MyVoucher = { id: number; code: string; type: string; title?: string | null; expiresAt: string; redeemedAt: string | null; createdAt: string };

const TYPE_LABEL: Record<string, string> = { studio_50: "50% popusta na snimanje + mix/master" };

// Vouchers won on the Ploča dana. Hidden entirely when the user has none.
export function MyVouchersPanel() {
  const { data } = useQuery<MyVoucher[]>({ queryKey: ["/api/me/vouchers"] });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  if (!data?.length) return null;

  return (
    <PanelCard icon={Ticket} iconBg="bg-primary/10" iconColor="text-primary" title="Moji vaučeri" desc="Navedite kod kad zakazujete termin" bodyClassName="p-0">
      <ul className="divide-y divide-border/60">
        {data.map(v => {
          const expired = !v.redeemedAt && new Date(v.expiresAt) < new Date();
          const status = v.redeemedAt ? "Iskorišćen" : expired ? "Istekao" : `Važi do ${fmtDate(v.expiresAt)}`;
          const active = !v.redeemedAt && !expired;
          return (
            <li key={v.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${active ? "" : "text-muted-foreground"}`}>{v.title ?? TYPE_LABEL[v.type] ?? "Vaučer"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{status}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-mono text-sm tracking-wider ${active ? "" : "text-muted-foreground line-through"}`}>{v.code}</span>
                {active && (
                  <button
                    type="button" aria-label="Kopiraj kod"
                    onClick={() => { navigator.clipboard.writeText(v.code); setCopiedId(v.id); setTimeout(() => setCopiedId(null), 1600); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {copiedId === v.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {active && <Link href="/kontakt" className="text-xs text-primary hover:underline underline-offset-4 w-full sm:w-auto">Zakažite termin</Link>}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
