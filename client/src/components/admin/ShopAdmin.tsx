import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Coins, Loader2 } from "lucide-react";

// Admin pieces for the Studio Coins shop, used by the "Prodavnica" tab
// (VouchersTab.tsx). Catalogue edits and coin grants are Super Admin only
// (routes are requireAdmin); producers see the catalogue read-only.

type AdminShopItem = {
  id: number; kind: "studio_voucher" | "avatar_frame"; title: string; description: string | null;
  priceSc: number; percentOff: number | null; durationDays: number | null; monthlyStock: number | null;
  active: boolean; sortOrder: number; soldThisMonth: number;
};

const KEY = ["/api/admin/shop/items"];
const nf = new Intl.NumberFormat("sr-RS");
const toInt = (v: string) => (v.trim() === "" ? null : Math.max(0, parseInt(v, 10) || 0));

function ItemRow({ item, canEdit }: { item: AdminShopItem; canEdit: boolean }) {
  const { toast } = useToast();
  const [price, setPrice] = useState(String(item.priceSc));
  const [stock, setStock] = useState(item.monthlyStock == null ? "" : String(item.monthlyStock));
  const dirty = price !== String(item.priceSc) || stock !== (item.monthlyStock == null ? "" : String(item.monthlyStock));

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => apiRequest("PATCH", `/api/admin/shop/items/${item.id}`, patch),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); queryClient.invalidateQueries({ queryKey: ["/api/shop"] }); toast({ title: "Artikal sačuvan" }); },
    onError: (e: any) => toast({ title: "Izmena nije sačuvana", description: e?.message, variant: "destructive" }),
  });

  return (
    <li className={`flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 ${item.active ? "" : "opacity-60"}`}>
      <div className="flex-1 min-w-[14rem]">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.kind === "studio_voucher" ? `Vaučer ${item.percentOff}%` : `Okvir avatara, ${item.durationDays} dana`}
          {" · "}prodato ovog meseca <span className="font-mono">{item.soldThisMonth}</span>
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Cena
        <Input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))} disabled={!canEdit} className="h-8 w-24 font-mono" inputMode="numeric" />
        SC
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Prazno = bez ograničenja">
        Mesečno
        <Input value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ""))} disabled={!canEdit} placeholder="∞" className="h-8 w-16 font-mono" inputMode="numeric" />
        kom
      </label>
      {canEdit && dirty && (
        <Button size="sm" className={save.isPending ? "opacity-60 pointer-events-none" : ""}
          onClick={() => save.mutate({ priceSc: Math.max(1, parseInt(price, 10) || 1), monthlyStock: toInt(stock) })}>
          Sačuvaj
        </Button>
      )}
      <Switch checked={item.active} disabled={!canEdit || save.isPending} onCheckedChange={v => save.mutate({ active: v })} aria-label={`${item.title} u ponudi`} />
    </li>
  );
}

function NewItemForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"studio_voucher" | "avatar_frame">("studio_voucher");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [percent, setPercent] = useState("");
  const [days, setDays] = useState("30");
  const [stock, setStock] = useState("");

  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/shop/items", {
      kind, title: title.trim(), description: description.trim() || null,
      priceSc: parseInt(price, 10) || 0,
      percentOff: kind === "studio_voucher" ? parseInt(percent, 10) || null : null,
      durationDays: kind === "avatar_frame" ? parseInt(days, 10) || 30 : null,
      monthlyStock: toInt(stock),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); queryClient.invalidateQueries({ queryKey: ["/api/shop"] }); toast({ title: "Artikal dodat" }); onDone(); },
    onError: (e: any) => toast({ title: "Artikal nije dodat", description: e?.message, variant: "destructive" }),
  });

  const valid = title.trim().length >= 3 && parseInt(price, 10) > 0 && (kind !== "studio_voucher" || parseInt(percent, 10) > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1.5 text-xs text-muted-foreground">Vrsta
          <Select value={kind} onValueChange={v => setKind(v as typeof kind)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="studio_voucher">Popust u studiju (vaučer)</SelectItem>
              <SelectItem value="avatar_frame">Okvir za avatar</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">Naziv
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === "studio_voucher" ? "30% popusta na master" : "Zlatni okvir za avatar"} className="h-9" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground sm:col-span-2">Opis (opciono)
          <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">Cena (SC)
          <Input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))} className="h-9 font-mono" inputMode="numeric" />
        </label>
        {kind === "studio_voucher" ? (
          <label className="space-y-1.5 text-xs text-muted-foreground">Popust (%)
            <Input value={percent} onChange={e => setPercent(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-9 font-mono" inputMode="numeric" />
          </label>
        ) : (
          <label className="space-y-1.5 text-xs text-muted-foreground">Trajanje (dana)
            <Input value={days} onChange={e => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-9 font-mono" inputMode="numeric" />
          </label>
        )}
        <label className="space-y-1.5 text-xs text-muted-foreground">Mesečna količina (prazno = bez ograničenja)
          <Input value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ""))} placeholder="∞" className="h-9 font-mono" inputMode="numeric" />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Otkaži</Button>
        <Button className={!valid || create.isPending ? "opacity-50 pointer-events-none" : ""} onClick={() => valid && create.mutate()}>
          {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Dodaj artikal
        </Button>
      </div>
    </div>
  );
}

export function ShopCatalogue({ canEdit }: { canEdit: boolean }) {
  const { data } = useQuery<AdminShopItem[]>({ queryKey: KEY });
  const [adding, setAdding] = useState(false);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Artikli</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Igrač zaradi otprilike 300-450 SC mesečno (ploča + tačni odgovori). "Mesečno" je ukupan broj komada za ceo sajt, resetuje se prvog u mesecu.
          </p>
        </div>
        {canEdit && !adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Novi artikal</Button>}
      </div>
      {adding && <NewItemForm onDone={() => setAdding(false)} />}
      {data && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {data.map(item => <ItemRow key={`${item.id}-${item.priceSc}-${item.monthlyStock}`} item={item} canEdit={canEdit} />)}
          </ul>
        </div>
      )}
      {!canEdit && <p className="text-xs text-muted-foreground">Cene i artikle menja samo Super Admin.</p>}
    </section>
  );
}

export function CoinGrant() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const grant = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/coins/grant", { username: username.trim(), amount: parseInt(amount, 10), note: note.trim() || null })).json(),
    onSuccess: (r: { username: string; balance: number }) => {
      toast({ title: "Coini su dodeljeni", description: `${r.username} sada ima ${nf.format(r.balance)} SC.` });
      setAmount(""); setNote("");
    },
    onError: (e: any) => toast({ title: "Dodela nije uspela", description: e?.message, variant: "destructive" }),
  });
  const valid = username.trim() && /^-?\d+$/.test(amount.trim()) && parseInt(amount, 10) !== 0;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Coins className="w-4 h-4 text-primary" /> Dodeli coine</h3>
        <p className="text-xs text-muted-foreground mt-1">Npr. nagrada za izazov meseca. Negativan broj oduzima coine. Korisnik vidi napomenu u istoriji coina.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5 text-xs text-muted-foreground">Korisničko ime
          <Input value={username} onChange={e => setUsername(e.target.value)} className="h-9 w-44" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">Iznos (SC)
          <Input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d-]/g, ""))} className="h-9 w-28 font-mono" inputMode="numeric" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground flex-1 min-w-[12rem]">Napomena (vidi je korisnik)
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Pobednik izazova meseca" className="h-9" />
        </label>
        <Button className={!valid || grant.isPending ? "opacity-50 pointer-events-none" : ""} onClick={() => valid && grant.mutate()}>
          {grant.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Dodeli
        </Button>
      </div>
    </section>
  );
}

// ─── Economy overview ─────────────────────────────────────────────────────────
// Is the shop costing more than it brings? Coins issued vs spent this month,
// vouchers bought vs actually redeemed (= real studio work), referrals.

type EconomyStats = {
  month: string;
  issuedByReason: Record<string, number>;
  spentMonth: number;
  outstanding: number;
  holders: number;
  purchasesMonth: Array<{ title: string; count: number; sc: number }>;
  vouchers: { issuedMonth: number; redeemedMonth: number; issuedAll: number; redeemedAll: number; open: number; expired: number };
  referrals: Record<string, number>;
};

const REASON_LABEL: Record<string, string> = {
  spin: "Ploča dana", spin_streak: "Bonus za niz", game: "Tačni odgovori", leaderboard: "Nedeljna tabela",
  testimonial: "Utisci", referral_inviter: "Pozivi (pozivalac)", referral_invitee: "Pozivi (novi član)", admin: "Ručno dodeljeno",
};

export function EconomyOverview() {
  const { data } = useQuery<EconomyStats>({ queryKey: ["/api/admin/shop/stats"], refetchInterval: 5 * 60_000 });
  if (!data) return null;
  const issued = Object.values(data.issuedByReason).reduce((a, b) => a + b, 0);
  const v = data.vouchers;
  const tiles = [
    { label: "Podeljeno ovog meseca", value: `${nf.format(issued)} SC` },
    { label: "Potrošeno ovog meseca", value: `${nf.format(data.spentMonth)} SC` },
    { label: "U novčanicima ukupno", value: `${nf.format(data.outstanding)} SC`, sub: `${data.holders} korisnika` },
    { label: "Vaučeri iskorišćeni", value: `${v.redeemedAll} / ${v.issuedAll}`, sub: `${v.open} čeka · ${v.expired} istekao` },
  ];
  const monthLabel = data.month.split("-").reverse().join(".");
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold">Pregled za {monthLabel}.</h3>
        <p className="text-xs text-muted-foreground mt-1">"Iskorišćen" vaučer znači da je klijent došao u studio - to je stvarni posao koji je prodavnica donela.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-border bg-card divide-x divide-y lg:divide-y-0 divide-border overflow-hidden">
        {tiles.map(t => (
          <div key={t.label} className="px-5 py-4">
            <p className="font-mono text-xl font-semibold">{t.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
            {t.sub && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{t.sub}</p>}
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium mb-3">Odakle su coini ovog meseca</p>
          {issued === 0 ? <p className="text-xs text-muted-foreground">Još ništa.</p> : (
            <ul className="space-y-2">
              {Object.entries(data.issuedByReason).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <li key={k} className="grid grid-cols-[9rem_minmax(0,1fr)_5rem] items-center gap-3 text-xs">
                  <span className="truncate">{REASON_LABEL[k] ?? k}</span>
                  <span className="h-1.5 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-primary rounded-full" style={{ width: `${(n / issued) * 100}%` }} /></span>
                  <span className="font-mono text-right">{nf.format(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium mb-3">Kupljeno ovog meseca</p>
          {!data.purchasesMonth.length ? <p className="text-xs text-muted-foreground">Još ništa.</p> : (
            <ul className="space-y-2 text-xs">
              {data.purchasesMonth.map(p => (
                <li key={p.title} className="flex justify-between gap-3">
                  <span className="truncate">{p.title}</span>
                  <span className="font-mono shrink-0">{p.count} × · {nf.format(p.sc)} SC</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Pozivi: <span className="font-mono text-foreground">{(data.referrals.rewarded ?? 0) + (data.referrals.capped ?? 0)}</span> nagrađeno
            {" · "}<span className="font-mono text-foreground">{data.referrals.pending ?? 0}</span> čeka
            {" · "}<span className="font-mono text-foreground">{data.referrals.blocked ?? 0}</span> blokirano (ista mreža)
          </p>
        </div>
      </div>
    </section>
  );
}
