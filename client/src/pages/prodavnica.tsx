import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MyVouchersPanel } from "@/components/dashboard/MyVouchersPanel";
import { Modal } from "@/components/admin/AdminModal";
import { Coins, Ticket, Sparkles, Disc, Gamepad2, Copy, Check, Loader2, X, ArrowRight } from "lucide-react";

// Studio Coins shop (/prodavnica). Coins are earned on the Ploča dana and in
// Pogodi Pesmu, never bought. Every purchase is validated server-side
// (POST /api/shop/buy - balance, monthly stock, account age, one open voucher).

type ShopItem = {
  id: number; kind: "studio_voucher" | "avatar_frame"; title: string; description: string | null;
  priceSc: number; percentOff: number | null; durationDays: number | null; left: number | null;
};
type ShopData = { enabled: false } | { enabled: true; balance: number; items: ShopItem[]; frameUntil: string | null };
type CoinHistory = { balance: number; history: Array<{ id: number; amount: number; label: string; createdAt: string }> };
type BuyResult = { title: string; balance: number; voucher: { code: string; expiresAt: string } | null; frameUntil: string | null };

const fmtDate = (d: string) => {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}.`;
};
const nf = new Intl.NumberFormat("sr-RS");

export default function ProdavnicaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const verified = !!user?.emailVerified;
  const { data, isLoading } = useQuery<ShopData>({ queryKey: ["/api/shop"], enabled: verified });
  const { data: coins } = useQuery<CoinHistory>({ queryKey: ["/api/me/coins"], enabled: verified });
  const [confirm, setConfirm] = useState<ShopItem | null>(null);
  const [bought, setBought] = useState<BuyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const buy = useMutation({
    mutationFn: async (itemId: number) => (await apiRequest("POST", "/api/shop/buy", { itemId })).json() as Promise<BuyResult>,
    onSuccess: (r) => {
      setConfirm(null);
      setBought(r);
      for (const k of ["/api/shop", "/api/me/coins", "/api/me/vouchers", "/api/user", "/api/spin/today"]) queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: (e: any) => toast({ title: "Kupovina nije uspela", description: e?.message, variant: "destructive" }),
  });

  const shop = data && data.enabled ? data : null;
  const balance = shop?.balance ?? coins?.balance ?? 0;

  let body: React.ReactNode;
  if (authLoading || (verified && isLoading)) {
    body = <div className="grid sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  } else if (!user) {
    body = (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-medium">Prodavnica je za korisnike sa nalogom</p>
        <p className="text-sm text-muted-foreground mt-1">Napravi besplatan nalog, vrti Ploču dana i pogađaj pesme - coini se skupljaju sami.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/registracija"><Button>Napravite nalog</Button></Link>
          <Link href="/prijava"><Button variant="outline">Prijava</Button></Link>
        </div>
      </div>
    );
  } else if (!verified) {
    body = <p className="text-sm text-muted-foreground">Potvrdite email adresu (link je stigao u inbox) i prodavnica je otvorena.</p>;
  } else if (!shop) {
    body = <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-8">Prodavnica je trenutno zatvorena. Coini ti ostaju - vrati se uskoro.</p>;
  } else if (!shop.items.length) {
    body = <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-8">Trenutno nema artikala u ponudi.</p>;
  } else {
    body = (
      <ul className="grid sm:grid-cols-2 gap-3">
        {shop.items.map(item => {
          const soldOut = item.left === 0;
          const short = Math.max(0, item.priceSc - balance);
          const Icon = item.kind === "studio_voucher" ? Ticket : Sparkles;
          return (
            <li key={item.id} className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{item.title}</p>
                  {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                </div>
              </div>
              <div className="mt-auto pt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-xl font-semibold">{nf.format(item.priceSc)} <span className="text-sm text-muted-foreground">SC</span></p>
                  {item.left !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5">{soldOut ? "Rasprodato za ovaj mesec" : `Još ${item.left} ovog meseca`}</p>
                  )}
                </div>
                {soldOut ? (
                  <Button size="sm" variant="outline" className="opacity-50 pointer-events-none">Rasprodato</Button>
                ) : short > 0 ? (
                  <span className="text-xs text-muted-foreground text-right">Fali ti<br /><span className="font-mono text-foreground">{nf.format(short)} SC</span></span>
                ) : (
                  <Button size="sm" onClick={() => setConfirm(item)}>Kupi</Button>
                )}
              </div>
              {item.kind === "avatar_frame" && shop.frameUntil && new Date(shop.frameUntil) > new Date() && (
                <p className="text-xs text-primary mt-3">Tvoj okvir važi do {fmtDate(shop.frameUntil)} - nova kupovina ga produžava.</p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Prodavnica - Studio LeFlow" description="Zameni Studio Coins za popuste u studiju i nagrade na sajtu." noIndex />

      <div className="container mx-auto px-4 max-w-5xl py-10 md:py-14 space-y-10">
        {/* Header + wallet */}
        <header className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold">Prodavnica</h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Studio Coins (SC) skupljaš na Ploči dana i u igri Pogodi Pesmu. Ovde ih menjaš za popuste u studiju i nagrade na sajtu.
            </p>
          </div>
          {verified && (
            <div className="rounded-2xl border border-border bg-card px-5 py-4 min-w-[14rem]">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-primary" /> Novčanik</p>
              <p className="font-mono text-3xl font-semibold mt-1">{nf.format(balance)} <span className="text-base text-muted-foreground">SC</span></p>
            </div>
          )}
        </header>

        {/* How to earn */}
        <section className="grid sm:grid-cols-2 gap-3" aria-label="Kako se zarađuju coini">
          <Link href="/ploca" className="group rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <Disc className="w-5 h-5 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Ploča dana</span>
              <span className="block text-xs text-muted-foreground">Jednom dnevno, od 5 do 100 SC</span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </Link>
          <Link href="/igra" className="group rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <Gamepad2 className="w-5 h-5 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Pogodi Pesmu</span>
              <span className="block text-xs text-muted-foreground">+10 SC za svaku pogođenu pesmu</span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </Link>
        </section>

        {/* Items */}
        <section aria-labelledby="items-title" className="space-y-4">
          <h2 id="items-title" className="text-xl font-semibold">Ponuda</h2>
          {body}
        </section>

        {verified && <MyVouchersPanel />}

        {/* Coin history */}
        {verified && !!coins?.history.length && (
          <section aria-labelledby="history-title" className="space-y-4">
            <h2 id="history-title" className="text-xl font-semibold">Istorija coina</h2>
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <ul className="divide-y divide-border/60">
                {coins.history.map(h => (
                  <li key={h.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{fmtDate(h.createdAt)}</span>
                    <span className="flex-1 min-w-0 text-sm truncate">{h.label}</span>
                    <span className={`font-mono text-sm ${h.amount > 0 ? "text-primary" : "text-muted-foreground"}`}>{h.amount > 0 ? "+" : ""}{nf.format(h.amount)} SC</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="text-sm text-muted-foreground max-w-2xl space-y-1.5 border-t border-border/60 pt-8">
          <p>Studio Coins važe samo na ovom sajtu. Ne mogu da se kupe, prodaju, poklone niti zamene za novac.</p>
          <p>Popuste mogu da kupe nalozi stari bar 7 dana, i to jedan po jedan - novi tek kad iskoristiš prethodni. Količine popusta su ograničene na mesečnom nivou.</p>
          <Link href="/pravila#ploca-dana" className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4">Sva pravila <ArrowRight className="w-3.5 h-3.5" /></Link>
        </section>
      </div>

      {/* Confirm purchase */}
      <Modal open={!!confirm} onClose={() => !buy.isPending && setConfirm(null)} themed>
        {confirm && (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Potvrdi kupovinu</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{confirm.title}</p>
              </div>
              <button type="button" aria-label="Zatvori" onClick={() => setConfirm(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cena</span><span className="font-mono">{nf.format(confirm.priceSc)} SC</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Posle kupovine ostaje</span><span className="font-mono">{nf.format(balance - confirm.priceSc)} SC</span></div>
              {confirm.kind === "studio_voucher" && (
                <p className="text-xs text-muted-foreground pt-2">Dobijaš kod vaučera koji važi 60 dana. Navedi ga kad zakazuješ termin.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Otkaži</Button>
              <Button aria-busy={buy.isPending} className={buy.isPending ? "opacity-60 pointer-events-none" : ""} onClick={() => buy.mutate(confirm.id)}>
                {buy.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Kupi za {nf.format(confirm.priceSc)} SC
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Purchase done */}
      <Modal open={!!bought} onClose={() => setBought(null)} themed>
        {bought && (
          <div className="px-6 py-6">
            <p className="text-xs text-muted-foreground">Kupljeno</p>
            <h2 className="text-xl font-semibold mt-1">{bought.title}</h2>
            {bought.voucher && (
              <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">Kod vaučera</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-lg tracking-wider">{bought.voucher.code}</span>
                  <button type="button" aria-label="Kopiraj kod" onClick={() => { navigator.clipboard.writeText(bought.voucher!.code); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Navedi kod kad zakazuješ termin. Važi do <span className="font-mono">{fmtDate(bought.voucher.expiresAt)}</span></p>
              </div>
            )}
            {bought.frameUntil && (
              <p className="text-sm text-muted-foreground mt-4">Zlatni okvir je aktivan do <span className="font-mono text-foreground">{fmtDate(bought.frameUntil)}</span> - vidi se u zajednici i na tvom profilu.</p>
            )}
            <p className="text-sm text-muted-foreground mt-4">U novčaniku ti je ostalo <span className="font-mono text-foreground">{nf.format(bought.balance)} SC</span>.</p>
            <div className="flex flex-wrap justify-end gap-2 mt-6">
              {bought.voucher && <Link href="/kontakt"><Button variant="outline">Zakažite termin</Button></Link>}
              <Button onClick={() => setBought(null)}>U redu</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
