import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Search, User, Music, FileText, Receipt, Calendar, Mail, Crown, Trophy, Star } from "lucide-react";
import { format } from "date-fns";

interface ClientUser {
  id: number;
  username: string;
  email: string;
  rank: string;
  role: string;
  banned: boolean;
  emailVerified: boolean;
  createdAt: string;
  avatarUrl: string | null;
  lastSeen: string | null;
}

interface Project {
  id: number;
  title: string;
  genre: string;
  approved: boolean;
  uploadDate: string;
  votesCount: number;
}

interface Contract {
  id: number;
  contractNumber: string;
  contractType: string;
  contractData: Record<string, any>;
  createdAt: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  amount: string;
  dueDate: string | null;
  createdAt: string;
  contractNumber: string | null;
}

interface ClientProfile {
  user: ClientUser;
  projects: Project[];
  contracts: Contract[];
  invoices: Invoice[];
}

function rankBadge(rank: string) {
  const map: Record<string, { label: string; className: string; icon: JSX.Element }> = {
    admin:   { label: "Admin",   className: "bg-red-500/20 text-red-400 border-red-500/30",    icon: <Crown className="w-3 h-3" /> },
    legend:  { label: "Legend",  className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Trophy className="w-3 h-3" /> },
    vip:     { label: "VIP",     className: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Star className="w-3 h-3" /> },
    user:    { label: "User",    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",  icon: <User className="w-3 h-3" /> },
  };
  const r = map[rank] ?? map.user;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${r.className}`}>
      {r.icon}{r.label}
    </span>
  );
}

function projectStatusBadge(approved: boolean) {
  return approved
    ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Odobren</Badge>
    : <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Na čekanju</Badge>;
}

function contractTypeBadge(type: string) {
  const map: Record<string, { label: string; cls: string }> = {
    mix_master:           { label: "Mix & Master",         cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    copyright_transfer:   { label: "Prenos autorskih prava", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    instrumental_sale:    { label: "Prodaja instrumentala", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  };
  const r = map[type] ?? { label: type, cls: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
  return <Badge className={`${r.cls} text-xs`}>{r.label}</Badge>;
}

function invoiceStatusBadge(status: string) {
  const map: Record<string, string> = {
    paid:      "bg-green-500/20 text-green-400 border-green-500/30",
    pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    overdue:   "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  const cls = map[status] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  return <Badge className={`${cls} text-xs`}>{status}</Badge>;
}

function ClientDetail({ userId, onBack }: { userId: number; onBack: () => void }) {
  const { data, isLoading } = useQuery<ClientProfile>({
    queryKey: ["/api/admin/katastar", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/katastar/${userId}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const { user, projects, contracts, invoices } = data;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold">Profil klijenta</h2>
      </div>

      {/* Client info card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AvatarWithInitials
              src={user.avatarUrl}
              username={user.username}
              className="w-16 h-16 text-xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold">{user.username}</h3>
                {rankBadge(user.rank)}
                {user.banned && <Badge variant="destructive" className="text-xs">Banovan</Badge>}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                Registrovan: {format(new Date(user.createdAt), "dd.MM.yyyy")}
              </div>
            </div>
            {/* Summary stats */}
            <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-violet-400">{projects.length}</div>
                <div className="text-xs text-muted-foreground">Projekata</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{contracts.length}</div>
                <div className="text-xs text-muted-foreground">Ugovora</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{totalPaid.toFixed(0)}€</div>
                <div className="text-xs text-muted-foreground">Plaćeno</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="w-4 h-4 text-violet-400" />
              Projekti ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nema projekata</p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.genre} · {format(new Date(p.uploadDate), "dd.MM.yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">♥ {p.votesCount}</span>
                        {projectStatusBadge(p.approved)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Ugovori ({contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nema ugovora</p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {contracts.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "dd.MM.yyyy")}</p>
                      </div>
                      <div className="shrink-0 ml-2">
                        {contractTypeBadge(c.contractType)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-yellow-400" />
              Fakture ({invoices.length})
            </CardTitle>
            {invoices.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Ukupno: <span className="text-foreground font-medium">{totalInvoiced.toFixed(2)}€</span>
                {" · "}
                Plaćeno: <span className="text-green-400 font-medium">{totalPaid.toFixed(2)}€</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nema faktura</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.contractNumber && `${inv.contractNumber} · `}
                      {format(new Date(inv.createdAt), "dd.MM.yyyy")}
                      {inv.dueDate && ` · Rok: ${format(new Date(inv.dueDate), "dd.MM.yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-medium">{parseFloat(inv.amount).toFixed(2)}€</span>
                    {invoiceStatusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KatastarTab() {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [rankFilter, setRankFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery<ClientUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  if (selectedUserId !== null) {
    return <ClientDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  const filtered = (users ?? []).filter(u => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRank = rankFilter === "all" || u.rank === rankFilter;
    return matchSearch && matchRank;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Katastar klijenata</h2>
        <p className="text-sm text-muted-foreground">Registar svih klijenata sa istorijom projekata i ugovora</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži po imenu ili emailu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "admin", "legend", "vip", "user"].map(r => (
            <Button
              key={r}
              size="sm"
              variant={rankFilter === r ? "default" : "outline"}
              onClick={() => setRankFilter(r)}
              className="capitalize"
            >
              {r === "all" ? "Svi" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nema pronađenih klijenata
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(u => (
            <Card
              key={u.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all cursor-pointer"
              onClick={() => setSelectedUserId(u.id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <AvatarWithInitials
                    src={u.avatarUrl}
                    username={u.username}
                    className="w-10 h-10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{u.username}</span>
                      {rankBadge(u.rank)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Od: {format(new Date(u.createdAt), "dd.MM.yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
