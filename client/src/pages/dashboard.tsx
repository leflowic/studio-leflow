import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { PanelCard } from "@/components/ui/panel-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  FolderOpen,
  FileText,
  Receipt,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Music2,
  Settings,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { WaveDivider } from "@/components/WaveDivider";
import { MySmartLinkPanel } from "@/components/dashboard/MySmartLinkPanel";
import { MyJobsPanel } from "@/components/dashboard/MyJobsPanel";

type Project = {
  id: number;
  title: string;
  description: string;
  genre: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  uploadDate: string;
  approved: boolean;
  username: string;
};

type Contract = {
  id: number;
  contractNumber: string;
  contractType: string;
  pdfPath: string | null;
  verificationHash: string | null;
  createdAt: string;
  username: string;
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  description: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  contractNumber: string | null;
  contractType: string | null;
};

type DashboardOverview = {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  totalContracts: number;
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalAmountPending: string;
  unreadMessages: number;
};

const statusConfig = {
  waiting:     { label: "Čekanje",  Icon: Clock,        bg: "bg-yellow-500/10", text: "text-yellow-500", dot: "bg-yellow-500" },
  in_progress: { label: "U toku",   Icon: Loader2,      bg: "bg-blue-500/10",   text: "text-blue-500",   dot: "bg-blue-500" },
  completed:   { label: "Završeno", Icon: CheckCircle2, bg: "bg-green-500/10",  text: "text-green-500",  dot: "bg-green-500" },
  cancelled:   { label: "Otkazano", Icon: XCircle,      bg: "bg-red-500/10",    text: "text-red-500",    dot: "bg-red-500" },
};

const invoiceStatusConfig = {
  pending:   { label: "Na čekanju",  bg: "bg-yellow-500/10", text: "text-yellow-500" },
  paid:      { label: "Plaćeno",     bg: "bg-green-500/10",  text: "text-green-500" },
  overdue:   { label: "Prekoračeno", bg: "bg-red-500/10",    text: "text-red-500" },
  cancelled: { label: "Otkazano",    bg: "bg-zinc-500/10",   text: "text-zinc-400" },
};

const contractTypeLabel: Record<string, string> = {
  mix_master: "Mix & Master",
  copyright_transfer: "Prenos autorskih prava",
  instrumental_sale: "Prodaja instrumentala",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery<DashboardOverview>({ queryKey: ["/api/dashboard/overview"] });
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/user/projects"] });
  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({ queryKey: ["/api/user/contracts"] });
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({ queryKey: ["/api/user/invoices"] });

  const handleDownloadContract = async (contractId: number, contractNumber: string) => {
    setDownloadingId(contractId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/user/contracts/${contractId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Preuzimanje nije uspelo");
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `licenca_${contractNumber.replace(/[\/\\]/g, "_")}.pdf`;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "Greška", description: "Greška pri preuzimanju licence" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <SEO title="Dashboard - Studio LeFlow" description="Klijent dashboard" />
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Music2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pristup Odbijen</h2>
        <p className="text-muted-foreground mb-4">Morate biti ulogovani da pristupite dashboard-u.</p>
        <Link href="/auth"><Button>Prijavi se</Button></Link>
      </div>
    );
  }

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Dashboard - Studio LeFlow" description="Klijent dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">

        {/* Hero banner */}
        <FadeInWhenVisible>
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border/60 p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="w-14 h-14 ring-2 ring-primary/30 shadow-lg flex-shrink-0">
                {user.avatarUrl
                  ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                  : <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
                }
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">Dobrodošli</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold truncate">{user.username}</h1>
                <p className="text-sm text-muted-foreground mt-1">Pratite projekte, licence i fakture sa Studio LeFlow</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <Link href="/inbox">
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <MessageCircle className="w-4 h-4" />
                    {(overview?.unreadMessages ?? 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {overview!.unreadMessages}
                      </span>
                    )}
                    Inbox
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="gap-2 h-9 text-muted-foreground hover:text-foreground">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Podešavanja</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mt-5 pt-4">
              <WaveDivider className="opacity-60 mb-4" />
              <div className="flex flex-wrap gap-2">
                <Link href="/kontakt">
                  <Button size="sm" className="h-8 gap-1.5 text-xs">
                    <CalendarDays className="w-3.5 h-3.5" /> Zakaži termin
                  </Button>
                </Link>
                <Link href="/inbox">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <MessageCircle className="w-3.5 h-3.5" /> Pošalji poruku
                  </Button>
                </Link>
                <Link href="/giveaway">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <FolderOpen className="w-3.5 h-3.5" /> Prijavi projekat
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        {/* Stats grid */}
        <FadeInWhenVisible>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={FolderOpen} iconBg="bg-blue-500/10" iconColor="text-blue-500"
              label="Projekti" value={overview?.totalProjects ?? 0}
              sub={`${overview?.projectsByStatus?.in_progress ?? 0} u toku`}
              loading={overviewLoading}
            />
            <StatTile
              icon={FileText} iconBg="bg-purple-500/10" iconColor="text-purple-500"
              label="Licence" value={overview?.totalContracts ?? 0}
              sub="Ukupno licenci" loading={overviewLoading}
            />
            <StatTile
              icon={Receipt} iconBg="bg-amber-500/10" iconColor="text-amber-500"
              label="Fakture" value={overview?.totalInvoices ?? 0}
              sub={`${overview?.pendingInvoices ?? 0} na čekanju`}
              loading={overviewLoading}
            />
            <StatTile
              icon={MessageCircle} iconBg="bg-green-500/10" iconColor="text-green-500"
              label="Poruke" value={overview?.unreadMessages ?? 0}
              sub="Nepročitane" loading={overviewLoading}
            />
          </div>
        </FadeInWhenVisible>

        {/* Projects */}
        <FadeInWhenVisible>
          <PanelCard icon={FolderOpen} iconBg="bg-blue-500/10" iconColor="text-blue-500" title="Moji Projekti" desc="Status svih vaših projekata">
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40">
                    <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1"><Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-28" /></div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map(project => {
                  const s = statusConfig[project.status];
                  return (
                    <div key={project.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                        <s.Icon className={`w-5 h-5 ${s.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{project.genre} · {format(new Date(project.uploadDate), "dd.MM.yyyy.")}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={FolderOpen} text="Nemate još uvek nijedan projekat." action={
                <Link href="/giveaway"><Button variant="outline" size="sm">Uploaduj projekat</Button></Link>
              } />
            )}
          </PanelCard>
        </FadeInWhenVisible>

        {/* Contracts + Invoices side by side on large screens */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contracts */}
          <FadeInWhenVisible>
            <PanelCard icon={FileText} iconBg="bg-purple-500/10" iconColor="text-purple-500" title="Licence" desc="Vaše licence od Studio LeFlow" className="h-full">
              {contractsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border/40"><Skeleton className="w-9 h-9 rounded-xl" /><div className="flex-1"><Skeleton className="h-4 w-32 mb-1.5" /><Skeleton className="h-3 w-24" /></div></div>)}
                </div>
              ) : contracts && contracts.length > 0 ? (
                <div className="space-y-2">
                  {contracts.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Licenca #{c.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{contractTypeLabel[c.contractType] ?? c.contractType} · {format(new Date(c.createdAt), "dd.MM.yyyy.")}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {c.verificationHash && (
                          <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
                            <a href={`/proveri/${c.verificationHash}`} target="_blank" rel="noopener noreferrer" title="Proveri autentičnost">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          title="Preuzmi PDF"
                          disabled={downloadingId === c.id}
                          onClick={() => handleDownloadContract(c.id, c.contractNumber)}
                        >
                          {downloadingId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={FileText} text="Nemate nijednu licencu." />}
            </PanelCard>
          </FadeInWhenVisible>

          {/* Invoices */}
          <FadeInWhenVisible>
            <PanelCard icon={Receipt} iconBg="bg-amber-500/10" iconColor="text-amber-500" title="Fakture" desc="Pregled svih faktura" className="h-full">
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border/40"><Skeleton className="w-9 h-9 rounded-xl" /><div className="flex-1"><Skeleton className="h-4 w-32 mb-1.5" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-6 w-16" /></div>)}
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map(inv => {
                    const isOverdue = inv.status === "pending" && new Date(inv.dueDate) < new Date();
                    const key = isOverdue ? "overdue" : inv.status;
                    const s = invoiceStatusConfig[key];
                    return (
                      <div key={inv.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                          {isOverdue ? <AlertCircle className={`w-4 h-4 ${s.text}`} /> : <Receipt className={`w-4 h-4 ${s.text}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Faktura #{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">Rok: {format(new Date(inv.dueDate), "dd.MM.yyyy.")}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{parseFloat(inv.amount).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} {inv.currency}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState icon={Receipt} text="Nemate nijednu fakturu." />}
            </PanelCard>
          </FadeInWhenVisible>
        </div>

        <FadeInWhenVisible>
          <MyJobsPanel />
        </FadeInWhenVisible>

        <FadeInWhenVisible>
          <MySmartLinkPanel />
        </FadeInWhenVisible>

        {/* Bottom row: messages + settings shortcuts */}
        <FadeInWhenVisible>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/inbox">
              <div className="group rounded-2xl border border-border/60 bg-card hover:border-green-500/30 hover:bg-green-500/5 transition-all p-4 flex items-center gap-4 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Poruke</p>
                  <p className="text-xs text-muted-foreground">
                    {overviewLoading ? "Učitavanje..." : (overview?.unreadMessages ?? 0) > 0
                      ? <><span className="font-semibold text-foreground">{overview!.unreadMessages}</span> nepročitanih</>
                      : "Nema novih poruka"
                    }
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
            <Link href="/settings">
              <div className="group rounded-2xl border border-border/60 bg-card hover:border-blue-500/30 hover:bg-blue-500/5 transition-all p-4 flex items-center gap-4 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Podešavanja</p>
                  <p className="text-xs text-muted-foreground">Profil, avatar, lozinka</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
        </FadeInWhenVisible>

      </div>
    </div>
  );
}
