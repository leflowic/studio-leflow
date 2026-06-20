import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  TrendingUp,
  Sparkles,
  Music2,
} from "lucide-react";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";

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

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, loading }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  label: string; value: string | number; sub: string; loading?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </>
      ) : (
        <>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </>
      )}
      <p className="text-xs font-medium text-muted-foreground/70 mt-3 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, iconBg, iconColor, title, desc }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; desc?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, action }: { icon: React.ElementType; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: overview, isLoading: overviewLoading } = useQuery<DashboardOverview>({ queryKey: ["/api/dashboard/overview"] });
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/user/projects"] });
  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({ queryKey: ["/api/user/contracts"] });
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({ queryKey: ["/api/user/invoices"] });

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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6 md:p-8">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_70%)]" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold flex-shrink-0 shadow-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">Dobrodošli</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold truncate">{user.username}</h1>
                <p className="text-sm text-muted-foreground mt-1">Pratite projekte, ugovore i fakture sa Studio LeFlow</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/inbox">
                  <Button variant="outline" size="sm" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {(overview?.unreadMessages ?? 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {overview!.unreadMessages}
                      </span>
                    )}
                    Inbox
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        {/* Stats grid */}
        <FadeInWhenVisible>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={FolderOpen} iconBg="bg-blue-500/10" iconColor="text-blue-500"
              label="Projekti" value={overview?.totalProjects ?? 0}
              sub={`${overview?.projectsByStatus?.in_progress ?? 0} u toku`}
              loading={overviewLoading}
            />
            <StatCard
              icon={FileText} iconBg="bg-purple-500/10" iconColor="text-purple-500"
              label="Licence" value={overview?.totalContracts ?? 0}
              sub="Ukupno licenci" loading={overviewLoading}
            />
            <StatCard
              icon={Receipt} iconBg="bg-amber-500/10" iconColor="text-amber-500"
              label="Fakture" value={overview?.totalInvoices ?? 0}
              sub={`${overview?.pendingInvoices ?? 0} na čekanju`}
              loading={overviewLoading}
            />
            <StatCard
              icon={MessageCircle} iconBg="bg-green-500/10" iconColor="text-green-500"
              label="Poruke" value={overview?.unreadMessages ?? 0}
              sub="Nepročitane" loading={overviewLoading}
            />
          </div>
        </FadeInWhenVisible>

        {/* Projects */}
        <FadeInWhenVisible>
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
            <SectionHeader icon={FolderOpen} iconBg="bg-blue-500/10" iconColor="text-blue-500" title="Moji Projekti" desc="Status svih vaših projekata" />
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
          </div>
        </FadeInWhenVisible>

        {/* Contracts + Invoices side by side on large screens */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contracts */}
          <FadeInWhenVisible>
            <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 h-full">
              <SectionHeader icon={FileText} iconBg="bg-purple-500/10" iconColor="text-purple-500" title="Licence" desc="Vaše licence od Studio LeFlow" />
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
                        {c.pdfPath && (
                          <Button variant="ghost" size="icon" className="w-8 h-8" asChild title="Preuzmi PDF">
                            <a href={c.pdfPath} download><Download className="w-3.5 h-3.5" /></a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={FileText} text="Nemate nijednu licencu." />}
            </div>
          </FadeInWhenVisible>

          {/* Invoices */}
          <FadeInWhenVisible>
            <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 h-full">
              <SectionHeader icon={Receipt} iconBg="bg-amber-500/10" iconColor="text-amber-500" title="Fakture" desc="Pregled svih faktura" />
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
            </div>
          </FadeInWhenVisible>
        </div>

        {/* Messages quick access */}
        <FadeInWhenVisible>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-green-500/5 to-transparent p-5 md:p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Poruke</p>
                <p className="text-sm text-muted-foreground">
                  {overviewLoading ? "Učitavanje..." : overview?.unreadMessages ?? 0 > 0
                    ? <>Imate <span className="font-semibold text-foreground">{overview!.unreadMessages}</span> nepročitanih poruka</>
                    : "Nemate nepročitanih poruka"}
                </p>
              </div>
            </div>
            <Link href="/inbox">
              <Button size="sm" className="gap-2 flex-shrink-0">
                <MessageCircle className="w-4 h-4" />
                Otvori Inbox
              </Button>
            </Link>
          </div>
        </FadeInWhenVisible>

      </div>
    </div>
  );
}
