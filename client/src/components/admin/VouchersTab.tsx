import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, Search } from "lucide-react";
import { format } from "date-fns";

type AdminVoucher = {
  id: number; code: string; type: string; userId: number; username: string; email: string;
  expiresAt: string; redeemedAt: string | null; createdAt: string;
};

const TYPE_LABEL: Record<string, string> = { studio_50: "50% snimanje + mix/master" };

// Vouchers won on the "Ploča dana". Staff checks the code a client quotes when
// booking, then marks it redeemed here. Read-only list + one toggle, so no
// forceMount needed on its TabsContent.
export function VouchersTab() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useQuery<AdminVoucher[]>({ queryKey: ["/api/admin/vouchers"] });

  const redeem = useMutation({
    mutationFn: ({ id, redeemed }: { id: number; redeemed: boolean }) => apiRequest("PATCH", `/api/admin/vouchers/${id}`, { redeemed }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
      toast({ title: v.redeemed ? "Vaučer je označen kao iskorišćen" : "Oznaka je poništena" });
    },
    onError: () => toast({ title: "Izmena nije sačuvana", variant: "destructive" }),
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/\s/g, "");
    return (data ?? []).filter(v => !term || v.code.toLowerCase().replace(/-/g, "").includes(term.replace(/-/g, "")) || v.username.toLowerCase().includes(term));
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Vaučeri</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dobici sa Ploče dana. Kad klijent navede kod, proverite ga ovde i označite kao iskorišćen. Najviše 2 studijska vaučera mesečno.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Kod (LF-...) ili korisničko ime" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-10 font-mono" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : isError ? (
        <p className="text-sm text-destructive">Vaučeri nisu učitani. Osvežite stranicu.</p>
      ) : !data?.length ? (
        <EmptyState icon={Ticket} text="Još niko nije osvojio vaučer" sub="Pojaviće se ovde čim neko dobije popust na Ploči dana." />
      ) : !list.length ? (
        <p className="text-sm text-muted-foreground">Nijedan vaučer ne odgovara pretrazi.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {list.map(v => {
              const expired = !v.redeemedAt && new Date(v.expiresAt) < new Date();
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                  <span className="font-mono text-sm tracking-wider w-32">{v.code}</span>
                  <div className="flex-1 min-w-[10rem]">
                    <p className="text-sm font-medium">{v.username} <span className="text-muted-foreground font-normal">· {v.email}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[v.type] ?? v.type} · osvojen <span className="font-mono">{format(new Date(v.createdAt), "dd.MM.yyyy.")}</span>
                    </p>
                  </div>
                  <span className={`text-xs ${v.redeemedAt ? "text-muted-foreground" : expired ? "text-destructive" : "text-primary"}`}>
                    {v.redeemedAt
                      ? <>Iskorišćen <span className="font-mono">{format(new Date(v.redeemedAt), "dd.MM.yyyy.")}</span></>
                      : expired ? "Istekao" : <>Važi do <span className="font-mono">{format(new Date(v.expiresAt), "dd.MM.yyyy.")}</span></>}
                  </span>
                  <Button
                    size="sm" variant={v.redeemedAt ? "ghost" : "outline"}
                    className={redeem.isPending ? "opacity-60 pointer-events-none" : ""}
                    onClick={() => redeem.mutate({ id: v.id, redeemed: !v.redeemedAt })}
                  >
                    {v.redeemedAt ? "Poništi" : "Označi kao iskorišćen"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
