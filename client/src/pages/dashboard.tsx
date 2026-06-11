import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { 
  FolderOpen, 
  FileText, 
  Receipt, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  LayoutDashboard,
  Download,
  AlertCircle,
  Loader2
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
  waiting: { label: "Čekanje", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" },
  in_progress: { label: "U toku", icon: Loader2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-500" },
  completed: { label: "Završeno", icon: CheckCircle2, color: "bg-green-500/10 text-green-600 dark:text-green-500" },
  cancelled: { label: "Otkazano", icon: XCircle, color: "bg-red-500/10 text-red-600 dark:text-red-500" },
};

const invoiceStatusConfig = {
  pending: { label: "Na čekanju", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" },
  paid: { label: "Plaćeno", color: "bg-green-500/10 text-green-600 dark:text-green-500" },
  overdue: { label: "Prekoračeno", color: "bg-red-500/10 text-red-600 dark:text-red-500" },
  cancelled: { label: "Otkazano", color: "bg-gray-500/10 text-gray-600 dark:text-gray-500" },
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: overview, isLoading: overviewLoading } = useQuery<DashboardOverview>({
    queryKey: ["/api/dashboard/overview"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/user/projects"],
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/user/contracts"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/user/invoices"],
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <SEO title="Dashboard - Studio LeFlow" description="Klijent dashboard" />
        <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Pristup Odbijen</h2>
        <p className="text-muted-foreground">Morate biti ulogovani da pristupite dashboard-u.</p>
        <Link href="/auth">
          <Button className="mt-4" data-testid="button-go-to-login">Prijavi se</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <SEO title="Dashboard - Studio LeFlow" description="Klijent dashboard sa preglednom projekata, ugovora i faktura" />
      
      {/* Hero Section */}
      <FadeInWhenVisible>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
            Dobrodošli, {user.username}!
          </h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Ovde možete pratiti sve svoje projekte, ugovore i fakture sa Studio LeFlow
          </p>
        </div>
      </FadeInWhenVisible>

      {/* Quick Stats */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overview && (
        <FadeInWhenVisible>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card data-testid="card-stat-projects">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projekti</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-projects">{overview.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {overview.projectsByStatus.in_progress || 0} u toku
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-contracts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ugovori</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-contracts">{overview.totalContracts}</div>
                <p className="text-xs text-muted-foreground">
                  Ukupno ugovora
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-invoices">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fakture</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-invoices">{overview.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  {overview.pendingInvoices} na čekanju
                  {overview.overdueInvoices > 0 && (
                    <span className="text-red-500"> • {overview.overdueInvoices} prekoračeno</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-messages">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Poruke</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unread-messages">{overview.unreadMessages}</div>
                <p className="text-xs text-muted-foreground">
                  Nepročitane poruke
                </p>
              </CardContent>
            </Card>
          </div>
        </FadeInWhenVisible>
      )}

      {/* Projects Section */}
      <FadeInWhenVisible>
        <Card className="mb-8" data-testid="card-projects">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Moji Projekti
            </CardTitle>
            <CardDescription>
              Pregled svih vaših projekata i njihovih statusa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => {
                  const status = statusConfig[project.status];
                  const StatusIcon = status.icon;
                  
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`project-item-${project.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium" data-testid={`text-project-title-${project.id}`}>
                          {project.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {project.genre} • Uploadovano {format(new Date(project.uploadDate), "dd.MM.yyyy.")}
                        </p>
                      </div>
                      <Badge className={`${status.color} flex items-center gap-1`} variant="outline" data-testid={`badge-status-${project.id}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nemate još uvek nijedan projekat.</p>
                <Link href="/giveaway">
                  <Button variant="outline" className="mt-4" data-testid="button-upload-project">
                    Upload projekat
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInWhenVisible>

      {/* Contracts Section */}
      <FadeInWhenVisible>
        <Card className="mb-8" data-testid="card-contracts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ugovori
            </CardTitle>
            <CardDescription>
              Vaši ugovori sa Studio LeFlow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contractsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                ))}
              </div>
            ) : contracts && contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                    data-testid={`contract-item-${contract.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium" data-testid={`text-contract-number-${contract.id}`}>
                        Ugovor #{contract.contractNumber}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {contract.contractType === "mix_master" && "Mix & Master"}
                        {contract.contractType === "copyright_transfer" && "Prenos autorskih prava"}
                        {contract.contractType === "instrumental_sale" && "Prodaja instrumentala"}
                        {" • "}
                        {format(new Date(contract.createdAt), "dd.MM.yyyy.")}
                      </p>
                    </div>
                    {contract.pdfPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid={`button-download-contract-${contract.id}`}
                      >
                        <a href={contract.pdfPath} download>
                          <Download className="w-4 h-4 mr-2" />
                          Preuzmi PDF
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nemate nijedan ugovor.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInWhenVisible>

      {/* Invoices Section */}
      <FadeInWhenVisible>
        <Card className="mb-8" data-testid="card-invoices">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Fakture
            </CardTitle>
            <CardDescription>
              Pregled svih faktura i njihovih statusa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-6 w-24 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => {
                  const status = invoiceStatusConfig[invoice.status];
                  const dueDate = new Date(invoice.dueDate);
                  const isOverdue = invoice.status === "pending" && dueDate < new Date();
                  const displayStatus = isOverdue ? "overdue" : invoice.status;
                  const displayStatusConfig = invoiceStatusConfig[displayStatus];

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`invoice-item-${invoice.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                            Faktura #{invoice.invoiceNumber}
                          </h4>
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invoice.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rok: {format(dueDate, "dd.MM.yyyy.")}
                          {invoice.paidDate && (
                            <span className="ml-2">
                              • Plaćeno: {format(new Date(invoice.paidDate), "dd.MM.yyyy.")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg mb-1" data-testid={`text-invoice-amount-${invoice.id}`}>
                          {parseFloat(invoice.amount).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {invoice.currency}
                        </div>
                        <Badge className={displayStatusConfig.color} variant="outline" data-testid={`badge-invoice-status-${invoice.id}`}>
                          {displayStatusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nemate nijednu fakturu.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInWhenVisible>

      {/* Messages Quick Access */}
      <FadeInWhenVisible>
        <Card data-testid="card-messages">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Poruke
            </CardTitle>
            <CardDescription>
              Brz pristup vašim porukama
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {overview ? (
                    overview.unreadMessages > 0 ? (
                      <>Imate <span className="font-semibold text-foreground">{overview.unreadMessages}</span> {overview.unreadMessages === 1 ? "nepročitanu poruku" : overview.unreadMessages < 5 ? "nepročitane poruke" : "nepročitanih poruka"}</>
                    ) : (
                      "Nemate nepročitanih poruka"
                    )
                  ) : (
                    "Učitavanje..."
                  )}
                </p>
              </div>
              <Link href="/inbox">
                <Button variant="outline" data-testid="button-go-to-inbox">
                  Otvori Inbox
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </FadeInWhenVisible>

    </div>
  );
}
