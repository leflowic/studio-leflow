import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/panel-card";
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
  Music2,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { MySmartLinkPanel } from "@/components/dashboard/MySmartLinkPanel";
import { MyJobsPanel } from "@/components/dashboard/MyJobsPanel";
import { RankPanel } from "@/components/dashboard/RankPanel";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { MyVouchersPanel } from "@/components/dashboard/MyVouchersPanel";
import { useForYouItems } from "@/components/home/ForYouToday";

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

  const { data: overview } = useQuery<DashboardOverview>({ queryKey: ["/api/dashboard/overview"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/user/projects"] });
  const { data: contracts } = useQuery<Contract[]>({ queryKey: ["/api/user/contracts"] });
  const { data: invoices } = useQuery<Invoice[]>({ queryKey: ["/api/user/invoices"] });
  const { data: gameData } = useQuery<any>({
    queryKey: ["/api/game/today"],
    queryFn: async () => (await apiRequest("GET", "/api/game/today")).json(),
    enabled: !!user && user.emailVerified === true,
    refetchInterval: 60000,
    staleTime: 30000,
  });
  // The job stepper is right below, so the job item would just repeat it.
  const { items: today } = useForYouItems(gameData, { includeJob: false });

  // Deep links like /dashboard#<section> - wouter doesn't scroll to anchors.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 30) { clearInterval(t); el?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }, 100);
    return () => clearInterval(t);
  }, []);

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
        <h2 className="text-2xl font-semibold mb-2">Morate biti prijavljeni</h2>
        <p className="text-muted-foreground mb-4">Prijavite se da biste videli svoj nalog.</p>
        <Link href="/prijava"><Button>Prijavite se</Button></Link>
      </div>
    );
  }

  const initials = user.username.slice(0, 2).toUpperCase();
  const unread = overview?.unreadMessages ?? 0;
  const hasContracts = !!contracts?.length;
  const hasInvoices = !!invoices?.length;
  const memberSince = (user as any).createdAt ? format(new Date((user as any).createdAt), "dd.MM.yyyy.") : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Dashboard - Studio LeFlow" description="Klijent dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <Link href="/settings" aria-label="Promenite profilnu sliku" className="shrink-0 self-start sm:self-auto">
            <Avatar className="w-16 h-16 border border-border">
              {user.avatarUrl
                ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                : <AvatarFallback className="bg-muted text-foreground text-lg font-semibold">{initials}</AvatarFallback>
              }
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold truncate">Zdravo, {user.username}</h1>
            {memberSince && <p className="text-sm text-muted-foreground mt-1">Na sajtu od <span className="font-mono">{memberSince}</span></p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/inbox">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Poruke
                {unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-[11px] font-mono rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">{unread}</span>
                )}
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="icon" className="w-9 h-9" aria-label="Podešavanja" title="Podešavanja">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        <GettingStarted gameData={gameData} />

        {/* What's live today */}
        {today.length > 0 && (
          <section aria-labelledby="today-title">
            <h2 id="today-title" className="text-sm font-medium text-muted-foreground mb-3">Danas</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {today.map(({ key, href, icon: Icon, title, detail, highlight }) => (
                <Link key={key} href={href}>
                  <div className={`group flex items-center gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${highlight ? "border-primary/40 bg-primary/5 hover:bg-primary/10" : "border-border/60 bg-card hover:border-primary/30"}`}>
                    <Icon className={`w-5 h-5 shrink-0 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{title}</p>
                      <p className="text-xs text-muted-foreground truncate">{detail}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <MyVouchersPanel />

        {/* Live panels - each hides itself when it has nothing */}
        <FadeInWhenVisible>
          <MyJobsPanel />
        </FadeInWhenVisible>

        <FadeInWhenVisible>
          <MySmartLinkPanel />
        </FadeInWhenVisible>

        <FadeInWhenVisible>
          <RankPanel />
        </FadeInWhenVisible>

        {/* Client paperwork - only for people who actually have some */}
        {(hasContracts || hasInvoices) && (
          <FadeInWhenVisible>
            <div className={`grid gap-6 ${hasContracts && hasInvoices ? "md:grid-cols-2" : ""}`}>
              {hasContracts && (
                <PanelCard icon={FileText} iconBg="bg-primary/10" iconColor="text-primary" title="Licence" desc="Preuzmite PDF ili proverite autentičnost" className="h-full">
                  <div className="space-y-2">
                    {contracts!.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Licenca <span className="font-mono">#{c.contractNumber}</span></p>
                          <p className="text-xs text-muted-foreground">{contractTypeLabel[c.contractType] ?? c.contractType} · <span className="font-mono">{format(new Date(c.createdAt), "dd.MM.yyyy.")}</span></p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {c.verificationHash && (
                            <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
                              <a href={`/proveri/${c.verificationHash}`} target="_blank" rel="noopener noreferrer" title="Proveri autentičnost" aria-label="Proveri autentičnost">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="w-8 h-8" title="Preuzmi PDF" aria-label="Preuzmi PDF"
                            disabled={downloadingId === c.id}
                            onClick={() => handleDownloadContract(c.id, c.contractNumber)}
                          >
                            {downloadingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelCard>
              )}

              {hasInvoices && (
                <PanelCard icon={Receipt} iconBg="bg-primary/10" iconColor="text-primary" title="Fakture" desc="Status vaših faktura" className="h-full">
                  <div className="space-y-2">
                    {invoices!.map(inv => {
                      const isOverdue = inv.status === "pending" && new Date(inv.dueDate) < new Date();
                      const key = isOverdue ? "overdue" : inv.status;
                      const s = invoiceStatusConfig[key];
                      return (
                        <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-colors">
                          {isOverdue && <AlertCircle className={`w-4 h-4 shrink-0 ${s.text}`} />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Faktura <span className="font-mono">#{inv.invoiceNumber}</span></p>
                            <p className="text-xs text-muted-foreground">Rok: <span className="font-mono">{format(new Date(inv.dueDate), "dd.MM.yyyy.")}</span></p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold font-mono">{parseFloat(inv.amount).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} {inv.currency}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PanelCard>
              )}
            </div>
          </FadeInWhenVisible>
        )}

        {/* Giveaway submissions (the `projects` table) - only if the user has entered */}
        {!!projects?.length && (
          <FadeInWhenVisible>
            <PanelCard
              icon={FolderOpen} iconBg="bg-primary/10" iconColor="text-primary"
              title="Moje prijave na giveaway" desc="Beatovi koje ste poslali"
              action={<Link href="/giveaway" className="text-xs text-primary hover:underline underline-offset-4">Giveaway</Link>}
            >
              <div className="space-y-2">
                {projects.map(project => {
                  const s = statusConfig[project.status];
                  return (
                    <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{project.genre} · <span className="font-mono">{format(new Date(project.uploadDate), "dd.MM.yyyy.")}</span></p>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </FadeInWhenVisible>
        )}

      </div>
    </div>
  );
}
