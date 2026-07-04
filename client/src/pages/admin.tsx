import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Music, Heart, MessageCircle, Trash2, Shield, ShieldOff, Settings, Construction, Send, Mail, Eye, Search, Download, UserPlus, FileText, Crown, Trophy, BadgeCheck, LayoutDashboard, Radio, MessagesSquare, Receipt, CalendarDays, Archive, Gamepad2, Link2, FolderOpen, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { lazy, Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Lazy load TipTap editor - only needed in Newsletter tab
const RichTextEditor = lazy(() => 
  import("@/components/RichTextEditor").then(module => ({ default: module.RichTextEditor }))
);
import { Separator } from "@/components/ui/separator";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { ContractsTab } from "@/components/admin/ContractsTab";
import { SmartLinksTab } from "@/components/admin/SmartLinksTab";
import { CalendarTab } from "@/components/admin/CalendarTab";
import { KatastarTab } from "@/components/admin/KatastarTab";
import GameTab from "@/components/admin/GameTab";
import { EmailTab } from "@/components/admin/EmailTab";
import { PortalTab } from "@/components/admin/PortalTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADMIN_NAV: { group: string; items: { value: string; label: string; icon: LucideIcon }[] }[] = [
  {
    group: "Pregled",
    items: [{ value: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Klijenti",
    items: [
      { value: "users", label: "Korisnici", icon: Users },
      { value: "messages", label: "Poruke", icon: MessagesSquare },
      { value: "katastar", label: "Katastar", icon: Archive },
      { value: "portal", label: "Portal", icon: FolderOpen },
    ],
  },
  {
    group: "Sadržaj",
    items: [
      { value: "projects", label: "Projekti", icon: Music },
      { value: "comments", label: "Komentari", icon: MessageCircle },
      { value: "user-songs", label: "Zajednica", icon: Radio },
      { value: "game", label: "Igra", icon: Gamepad2 },
      { value: "smart-links", label: "Smart Links", icon: Link2 },
    ],
  },
  {
    group: "Posao",
    items: [
      { value: "contracts", label: "Ugovori", icon: FileText },
      { value: "invoices", label: "Fakture", icon: Receipt },
      { value: "calendar", label: "Kalendar", icon: CalendarDays },
    ],
  },
  {
    group: "Marketing",
    items: [
      { value: "newsletter", label: "Newsletter", icon: Mail },
      { value: "email", label: "Email", icon: Send },
    ],
  },
  {
    group: "Sistem",
    items: [{ value: "settings", label: "Podešavanja", icon: Settings }],
  },
];

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalVotes: number;
  totalComments: number;
}

interface AnalyticsSummary {
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  approvedSongs: {
    today: number;
    week: number;
    month: number;
  };
  topProjects: Array<{
    id: number;
    title: string;
    username: string;
    votesCount: number;
  }>;
  contracts: {
    total: number;
    byType: Record<string, number>;
  };
  unreadConversations: number;
  activeUsers: number;
}

interface ProjectWithUser {
  id: number;
  title: string;
  description: string;
  genre: string;
  mp3Url: string;
  userId: number;
  uploadDate: string;
  votesCount: number;
  currentMonth: string;
  approved: boolean;
  username: string;
}

interface CommentWithDetails {
  id: number;
  projectId: number;
  projectTitle: string;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
}

interface ConversationWithUsers {
  id: number;
  user1Id: number;
  user2Id: number;
  user1Username: string;
  user2Username: string;
  user1AvatarUrl: string | null;
  user2AvatarUrl: string | null;
  messageCount: number;
  lastMessageAt: string;
  lastMessageContent: string | null;
  lastMessageSenderUsername: string | null;
  lastMessageDeleted: boolean;
}

interface MessageWithSender {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  content: string;
  imageUrl: string | null;
  deleted: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: number;
  adminId: number;
  adminUsername: string;
  viewedUser1Id: number;
  viewedUser2Id: number;
  user1Username: string;
  user2Username: string;
  viewedAt: string;
}

interface MessagingStats {
  totalMessages: number;
  totalConversations: number;
  deletedMessages: number;
  activeConversations: number;
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Persist active tab in sessionStorage to prevent reset on re-render
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin-active-tab') || 'dashboard';
    }
    return 'dashboard';
  });
  
  // Save tab to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('admin-active-tab', activeTab);
  }, [activeTab]);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Greška",
        description: "Nemate admin privilegije",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Skeleton className="h-12 w-64 mb-2" />
          <Skeleton className="h-6 w-full max-w-96 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // If not admin, don't render anything (will redirect)
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2" data-testid="heading-admin-panel">Admin Panel</h1>
          <p className="text-sm md:text-base text-muted-foreground" data-testid="text-admin-description">
            Upravljanje korisnicima, projektima i komentarima
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="tabs-admin">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            <aside className="lg:w-52 shrink-0">
              <nav
                className="lg:sticky lg:top-24 flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0"
                data-testid="tabs-list-admin"
              >
                {ADMIN_NAV.map(({ group, items }) => (
                  <div key={group} className="flex lg:flex-col gap-1 lg:mb-5 shrink-0">
                    <p className="hidden lg:block px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                      {group}
                    </p>
                    {items.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setActiveTab(value)}
                        data-testid={`tab-${value}`}
                        aria-current={activeTab === value ? "page" : undefined}
                        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 lg:w-full text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover-elevate active-elevate-2 ${
                          activeTab === value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            </aside>

            <div className="flex-1 min-w-0">

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsTab />
          </TabsContent>

          <TabsContent value="user-songs">
            <UserSongsTab />
          </TabsContent>

          <TabsContent value="newsletter">
            <NewsletterTab />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="contracts">
            <ContractsTab />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="katastar">
            <KatastarTab />
          </TabsContent>

          <TabsContent value="game" forceMount>
            <GameTab />
          </TabsContent>

          <TabsContent value="smart-links" forceMount>
            <SmartLinksTab />
          </TabsContent>

          <TabsContent value="portal">
            <PortalTab />
          </TabsContent>

          <TabsContent value="email">
            <EmailTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();

  // Fetch maintenance mode status
  const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery<{ maintenanceMode: boolean }>({
    queryKey: ["/api/maintenance"],
  });

  // Toggle maintenance mode mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      return await apiRequest("POST", "/api/maintenance", { maintenanceMode: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Uspeh",
        description: "Status sajta je ažuriran",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri ažuriranju statusa sajta",
        variant: "destructive",
      });
    },
  });

  const handleToggleMaintenanceMode = (checked: boolean) => {
    toggleMaintenanceMutation.mutate(checked);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="w-5 h-5 text-primary" />
            <CardTitle>Aktivnost Sajta</CardTitle>
          </div>
          <CardDescription>
            Kontrolišite dostupnost sajta za korisnike
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance-mode" className="text-base">
                Maintenance Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Kada je aktivno, samo administratori mogu pristupiti sajtu. Ostali korisnici će videti poruku da je sajt u pripremi.
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceData?.maintenanceMode || false}
              onCheckedChange={handleToggleMaintenanceMode}
              disabled={maintenanceLoading || toggleMaintenanceMutation.isPending}
            />
          </div>

          {maintenanceData?.maintenanceMode && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950 p-4">
              <div className="flex items-start gap-3">
                <Construction className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">
                    Sajt je trenutno u Maintenance Modu
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                    Samo administratori mogu pristupiti sajtu. Ostali korisnici vide stranicu "Sajt je u pripremi".
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle>Email</CardTitle>
          </div>
          <CardDescription>
            Pristupite poslovnom email nalogu Studio LeFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">podrska@studioleflow.com</p>
                <p className="text-xs text-muted-foreground">Zoho Mail — Studio LeFlow</p>
              </div>
            </div>
            <Button
              onClick={() => window.open("https://accounts.zoho.eu/signin", "_blank")}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Otvori Inbox
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle>Giveaway Podešavanja</CardTitle>
          </div>
          <CardDescription>
            Kontrolišite aktivnost mesečnog giveaway sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GiveawaySettingsSection />
        </CardContent>
      </Card>
    </div>
  );
}

function NewsletterTab() {
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery({
    queryKey: ["/api/newsletter/subscribers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/newsletter/subscribers");
      return await response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/newsletter/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/newsletter/stats");
      return await response.json();
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/newsletter/subscribers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/stats"] });
      toast({
        title: "Uspeh",
        description: "Pretplatnik je uspešno uklonjen",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju pretplatnika",
        variant: "destructive",
      });
    },
  });

  const handleSendNewsletter = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast({
        title: "Greška",
        description: "Subject i sadržaj su obavezni",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await apiRequest("POST", "/api/newsletter/send", { subject, htmlContent });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send newsletter");
      }

      const result = await response.json();
      toast({
        title: "Uspeh",
        description: result.message,
      });
      setSubject("");
      setHtmlContent("");
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri slanju newslettera",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast({
      title: "Kopirano!",
      description: `Email ${email} je kopiran u clipboard`,
    });
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCopyAll = () => {
    const confirmedEmails = subscribers
      .filter((s: any) => s.status === 'confirmed')
      .map((s: any) => s.email)
      .join(', ');
    navigator.clipboard.writeText(confirmedEmails);
    toast({
      title: "Kopirano!",
      description: `${subscribers.filter((s: any) => s.status === 'confirmed').length} email adresa kopirano`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Potvrđeno</Badge>;
      case "pending":
        return <Badge variant="outline">Na čekanju</Badge>;
      case "unsubscribed":
        return <Badge variant="destructive">Odjavljeno</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ukupno Pretplatnika</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Potvrđeno</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-green-600">{stats?.confirmed || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-orange-600">{stats?.pending || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Pošalji Newsletter</CardTitle>
              <CardDescription>Kreirajte i pošaljite email kampanju svim potvrđenim pretplatnicima</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newsletter-subject">Subject</Label>
            <Input
              id="newsletter-subject"
              placeholder="Naslov newsletter poruke..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="newsletter-content">Sadržaj</Label>
            <div className="mt-2">
              <Suspense fallback={
                <div className="border rounded-md p-4 min-h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              }>
                <RichTextEditor
                  content={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="Unesite sadržaj newsletter poruke..."
                />
              </Suspense>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              Newsletter će biti poslat na {stats?.confirmed || 0} potvrđenih email adresa
            </p>
            <Button 
              onClick={handleSendNewsletter} 
              disabled={isSending || !subject.trim() || !htmlContent.trim()}
              className="gap-2 w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
              {isSending ? "Slanje..." : "Pošalji Newsletter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Pretplatnici</CardTitle>
              <CardDescription>Lista svih email pretplatnika</CardDescription>
            </div>
            <Button onClick={handleCopyAll} variant="outline" size="sm" className="w-full sm:w-auto">
              <span className="hidden sm:inline">Kopiraj sve potvrđene email adrese</span>
              <span className="sm:hidden">Kopiraj sve</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subscribersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : subscribers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nema pretplatnika
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum prijave</TableHead>
                    <TableHead>Datum potvrde</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber: any) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                      <TableCell>{formatDate(subscriber.subscribedAt)}</TableCell>
                      <TableCell>{formatDate(subscriber.confirmedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyEmail(subscriber.email)}
                          >
                            {copiedEmail === subscriber.email ? "Kopirano!" : "Kopiraj"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                aria-label="Obriši pretplatnika"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ukloni pretplatnika</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Da li ste sigurni da želite da uklonite <strong>{subscriber.email}</strong> sa newsletter liste?
                                  Ova akcija se ne može poništiti.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSubscriberMutation.mutate(subscriber.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Ukloni
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessagesTab() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUsers | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithUsers[]>({
    queryKey: ["/api/admin/messages/conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/messages/conversations");
      return await response.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/admin/messages/conversation", selectedConversation?.user1Id, selectedConversation?.user2Id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await apiRequest("GET", `/api/admin/messages/conversation/${selectedConversation.user1Id}/${selectedConversation.user2Id}`);
      return await response.json();
    },
    enabled: !!selectedConversation,
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/messages/audit-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/messages/audit-logs");
      return await response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<MessagingStats>({
    queryKey: ["/api/admin/messages/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/messages/stats");
      return await response.json();
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/messages/${messageId}`);
      if (!response.ok) throw new Error("Failed to delete message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/conversation"] });
      refetchMessages();
      toast({
        title: "Uspeh",
        description: "Poruka je obrisana",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju poruke",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy HH:mm");
  };

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    return (
      conv.user1Username.toLowerCase().includes(query) ||
      conv.user2Username.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Poruka</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Konverzacija</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivne (30 dana)</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeConversations || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obrisane Poruke</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{stats?.deletedMessages || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <CardTitle>Konverzacije</CardTitle>
            </div>
            <CardDescription>
              Lista svih konverzacija između korisnika
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pretraži po korisničkim imenima..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>
            {conversationsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nema konverzacija
              </p>
            ) : filteredConversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nema rezultata pretrage
              </p>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedConversation?.id === conversation.id ? "bg-accent border-primary" : ""
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                      data-testid={`card-conversation-${conversation.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center -space-x-2">
                              <AvatarWithInitials
                                userId={conversation.user1Id}
                                name={conversation.user1Username}
                                src={conversation.user1AvatarUrl}
                                className="w-8 h-8"
                              />
                              <AvatarWithInitials
                                userId={conversation.user2Id}
                                name={conversation.user2Username}
                                src={conversation.user2AvatarUrl}
                                className="w-8 h-8"
                              />
                            </div>
                            <span className="font-medium">
                              {conversation.user1Username} ↔ {conversation.user2Username}
                            </span>
                          </div>
                          <Badge variant="secondary">{conversation.messageCount}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Poslednja poruka: {formatDate(conversation.lastMessageAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <CardTitle>
                  {selectedConversation
                    ? `${selectedConversation.user1Username} i ${selectedConversation.user2Username} - Konverzacija`
                    : "Pregled Poruka"}
                </CardTitle>
              </div>
              {selectedConversation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const url = `/api/admin/messages/export/${selectedConversation.user1Id}/${selectedConversation.user2Id}`;
                    const token = localStorage.getItem('auth_token');
                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) {
                      toast({ title: "Greška", description: "Izvoz konverzacije nije uspeo", variant: "destructive" });
                      return;
                    }
                    const blob = await res.blob();
                    const disposition = res.headers.get('Content-Disposition') || '';
                    const match = disposition.match(/filename="([^"]+)"/);
                    const filename = match?.[1] ?? 'konverzacija.txt';
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  data-testid="button-export-conversation"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Izvezi
                </Button>
              )}
            </div>
            {selectedConversation ? (
              <CardDescription>
                {selectedConversation.lastMessageContent ? (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">
                        {selectedConversation.lastMessageSenderUsername}:
                      </span>{' '}
                      {selectedConversation.lastMessageDeleted ? (
                        <span className="italic text-destructive">Poruka obrisana</span>
                      ) : (
                        selectedConversation.lastMessageContent.length > 80
                          ? selectedConversation.lastMessageContent.substring(0, 80) + '...'
                          : selectedConversation.lastMessageContent
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kliknite na poruku da biste je obrisali
                    </p>
                  </div>
                ) : (
                  "Izaberite poruku da biste je obrisali"
                )}
              </CardDescription>
            ) : (
              <CardDescription>Izaberite konverzaciju da biste videli poruke</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Izaberite konverzaciju
                </p>
              </div>
            ) : messagesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nema poruka u ovoj konverzaciji
              </p>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <Card key={message.id} className={message.deleted ? "border-destructive/50 bg-destructive/5" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-sm text-foreground">
                                {message.senderUsername}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            {message.deleted ? (
                              <p className="text-sm text-destructive italic">
                                Poruka obrisana
                              </p>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                            {message.imageUrl && !message.deleted && (
                              <img
                                src={message.imageUrl}
                                alt="Message attachment"
                                className="mt-2 max-w-xs rounded-lg"
                              />
                            )}
                          </div>
                          {!message.deleted && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  aria-label="Obriši poruku"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Obriši poruku</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Da li ste sigurni da želite da obrišete ovu poruku? Poruka će biti označena kao obrisana i njen sadržaj će biti sakriven.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMessageMutation.mutate(message.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Obriši
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle>Audit Log - Pregled Poruka</CardTitle>
          </div>
          <CardDescription>
            Evidencija svih administratorskih pregleda privatnih konverzacija
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nema audit log zapisa
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Pregledane Konverzacije</TableHead>
                    <TableHead>Vreme Pregleda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.adminUsername}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{log.user1Username} ↔ {log.user2Username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(log.viewedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GiveawaySettingsSection() {
  const { toast } = useToast();

  // Fetch giveaway settings
  const { data: giveawaySettings, isLoading: settingsLoading } = useQuery<{ isActive: boolean }>({
    queryKey: ["/api/giveaway/settings"],
  });

  // Toggle giveaway mutation
  const toggleGiveawayMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      await apiRequest("POST", "/api/admin/giveaway/toggle", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/settings"] });
      toast({
        title: "Uspeh",
        description: "Giveaway status je ažuriran",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri ažuriranju giveaway statusa",
        variant: "destructive",
      });
    },
  });

  const handleToggleGiveaway = (checked: boolean) => {
    toggleGiveawayMutation.mutate(checked);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="giveaway-active" className="text-base">
          Aktiviraj Giveaway
        </Label>
        <p className="text-sm text-muted-foreground">
          Omogućite korisnicima da uploaduju projekte i učestvuju u glasanju
        </p>
      </div>
      <Switch
        id="giveaway-active"
        checked={giveawaySettings?.isActive || false}
        onCheckedChange={handleToggleGiveaway}
        disabled={settingsLoading || toggleGiveawayMutation.isPending}
      />
    </div>
  );
}

function SiteAnnouncementCard() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");

  const { data: announcement, isLoading } = useQuery<{ isActive: boolean; message: string }>({
    queryKey: ['/api/announcement'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { isActive: boolean; message: string }) => {
      return await apiRequest("PATCH", "/api/announcement", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcement'] });
      toast({
        title: "Uspeh",
        description: "Obaveštenje je sačuvano",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri čuvanju obaveštenja",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (announcement) {
      setIsActive(announcement.isActive || false);
      setMessage(announcement.message || "");
    }
  }, [announcement]);

  const handleSave = () => {
    updateMutation.mutate({ isActive, message });
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card data-testid="card-site-announcement">
      <CardHeader>
        <CardTitle>Obaveštenje na Sajtu</CardTitle>
        <CardDescription>Prikažite važne informacije na početnoj strani</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="announcement-active" className="text-base">
              Aktiviraj obaveštenje
            </Label>
            <p className="text-sm text-muted-foreground">
              Prikaži obaveštenje na početnoj strani
            </p>
          </div>
          <Switch
            id="announcement-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={updateMutation.isPending}
            data-testid="switch-announcement"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-message">Poruka obaveštenja</Label>
          <Textarea
            id="announcement-message"
            placeholder="Unesite poruku obaveštenja..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={updateMutation.isPending}
            data-testid="textarea-announcement"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !message.trim()}
          className="w-full"
          data-testid="button-save-announcement"
        >
          {updateMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardTab() {
  const { toast } = useToast();

  // Fetch analytics summary
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics/summary"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch old stats for backward compatibility
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch giveaway settings
  const { data: giveawaySettings, isLoading: settingsLoading } = useQuery<{ isActive: boolean }>({
    queryKey: ["/api/giveaway/settings"],
  });

  // Toggle giveaway mutation
  const toggleGiveawayMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      await apiRequest("POST", "/api/admin/giveaway/toggle", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/settings"] });
      toast({
        title: "Uspeh",
        description: "Giveaway status je ažuriran",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju giveaway statusa",
        variant: "destructive",
      });
    },
  });

  if (analyticsLoading || settingsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-stat-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="content-dashboard">
      <Card data-testid="card-giveaway-toggle">
        <CardHeader>
          <CardTitle>Giveaway Kontrola</CardTitle>
          <CardDescription>Uključite ili isključite giveaway</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Switch
              id="giveaway-toggle"
              checked={giveawaySettings?.isActive || false}
              onCheckedChange={(checked) => toggleGiveawayMutation.mutate(checked)}
              disabled={toggleGiveawayMutation.isPending}
              data-testid="switch-giveaway"
            />
            <Label htmlFor="giveaway-toggle" data-testid="label-giveaway">
              Giveaway aktivan
            </Label>
          </div>
        </CardContent>
      </Card>

      <SiteAnnouncementCard />

      <div>
        <h3 className="text-lg font-semibold mb-4">Aktivnost</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-stat-active-users">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivni Korisnici</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-users">
                {analytics?.activeUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Trenutno online</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-new-users">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nove Registracije</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-new-users-today">
                {analytics?.newUsers.today || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Danas • {analytics?.newUsers.week || 0} ove nedelje • {analytics?.newUsers.month || 0} ovog meseca
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-approved-songs">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Odobrene Pesme</CardTitle>
              <Music className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-approved-songs-today">
                {analytics?.approvedSongs.today || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Danas • {analytics?.approvedSongs.week || 0} ove nedelje • {analytics?.approvedSongs.month || 0} ovog meseca
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-unread-messages">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nepročitane Poruke</CardTitle>
              <MessageCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-unread-conversations">
                {analytics?.unreadConversations || 0}
              </div>
              <p className="text-xs text-muted-foreground">Konverzacija sa nepročitanim porukama</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Ukupno</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total-users">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno Korisnika</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-projects">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno Projekata</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-projects">
                {stats?.totalProjects || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-contracts">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno Ugovora</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-contracts">
                {analytics?.contracts.total || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-votes">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno Glasova</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-votes">
                {stats?.totalVotes || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card data-testid="card-top-projects">
        <CardHeader>
          <CardTitle>Top 5 Projekata</CardTitle>
          <CardDescription>Projekti sa najviše glasova</CardDescription>
        </CardHeader>
        <CardContent>
          {!analytics?.topProjects || analytics.topProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-projects">
              Nema projekata za prikaz
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-md bg-card hover-elevate"
                  data-testid={`project-${project.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`project-title-${project.id}`}>
                        {project.title}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`project-username-${project.id}`}>
                        {project.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="font-semibold" data-testid={`project-votes-${project.id}`}>
                      {project.votesCount}
                    </span>
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

function UsersTab() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const banMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je banovan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri banovanju korisnika",
        variant: "destructive",
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/unban`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je odbanovan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri odbanovanju korisnika",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je obrisan",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju korisnika",
        variant: "destructive",
      });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/toggle-admin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Admin privilegije su ažurirane",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju admin privilegija",
        variant: "destructive",
      });
    },
  });

  const verifiedMutation = useMutation({
    mutationFn: async ({ userId, value }: { userId: number; value: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/verified`, { verified: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Uspeh", description: "Verifikacija ažurirana" });
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri verifikaciji", variant: "destructive" });
    },
  });

  const updateRankMutation = useMutation({
    mutationFn: async ({ userId, rank }: { userId: number; rank: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/rank`, { rank });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Rank je uspešno ažuriran",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju rank-a",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16" data-testid={`skeleton-user-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="content-users">
      <Card>
        <CardHeader>
          <CardTitle>Upravljanje Korisnicima</CardTitle>
          <CardDescription>Pregled i upravljanje svim korisnicima</CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="table-users">
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-username">Korisničko Ime</TableHead>
                <TableHead data-testid="header-email">Email</TableHead>
                <TableHead data-testid="header-role">Uloga</TableHead>
                <TableHead data-testid="header-rank">Rank</TableHead>
                <TableHead data-testid="header-status">Status</TableHead>
                <TableHead data-testid="header-created">Kreiran</TableHead>
                <TableHead data-testid="header-actions">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell data-testid={`cell-username-${user.id}`}>{user.username}</TableCell>
                  <TableCell data-testid={`cell-email-${user.id}`}>{user.email}</TableCell>
                  <TableCell data-testid={`cell-role-${user.id}`}>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} data-testid={`badge-role-${user.id}`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-rank-${user.id}`}>
                    <Select
                      value={user.rank}
                      onValueChange={(rank) => updateRankMutation.mutate({ userId: user.id, rank })}
                      disabled={updateRankMutation.isPending}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-rank-${user.id}`}>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {user.rank === 'legend' && <Trophy className="h-3 w-3 text-yellow-500" />}
                            {user.rank === 'vip' && <Crown className="h-3 w-3 text-blue-500" />}
                            {user.rank === 'admin' && <Shield className="h-3 w-3 text-destructive" />}
                            <span className={
                              user.rank === 'vip' ? 'text-blue-500' :
                              user.rank === 'legend' ? 'text-yellow-500' :
                              user.rank === 'admin' ? 'text-destructive' :
                              'text-muted-foreground'
                            }>
                              {user.rank === 'user' ? 'User' : 
                               user.rank === 'vip' ? 'VIP' : 
                               user.rank === 'legend' ? 'Legend' : 
                               'Admin'}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="vip">
                          <div className="flex items-center gap-2">
                            <Crown className="h-3 w-3 text-blue-500" />
                            <span className="text-blue-500">VIP</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="legend">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-3 w-3 text-yellow-500" />
                            <span className="text-yellow-500">Legend</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell data-testid={`cell-status-${user.id}`}>
                    {user.banned && (
                      <Badge variant="destructive" data-testid={`badge-banned-${user.id}`}>
                        Banned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`cell-created-${user.id}`}>
                    {format(new Date(user.createdAt), "dd.MM.yyyy")}
                  </TableCell>
                  <TableCell data-testid={`cell-actions-${user.id}`}>
                    <div className="flex items-center gap-2">
                      {user.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unbanMutation.mutate(user.id)}
                          disabled={unbanMutation.isPending}
                          data-testid={`button-unban-${user.id}`}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => banMutation.mutate(user.id)}
                          disabled={banMutation.isPending}
                          data-testid={`button-ban-${user.id}`}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAdminMutation.mutate(user.id)}
                        disabled={toggleAdminMutation.isPending}
                        data-testid={`button-toggle-admin-${user.id}`}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button
                        size="sm"
                        variant={user.isVerifiedArtist ? "default" : "outline"}
                        onClick={() => verifiedMutation.mutate({ userId: user.id, value: !user.isVerifiedArtist })}
                        disabled={verifiedMutation.isPending}
                        title={user.isVerifiedArtist ? "Ukloni verifikaciju" : "Verifikuj"}
                      >
                        <BadgeCheck className="h-4 w-4 mr-1" />
                        {user.isVerifiedArtist ? "Verifikovan" : "Verifikuj"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Obriši
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-user-${user.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ova akcija ne može biti poništena. Korisnik "{user.username}" i svi njegovi podaci (projekti, glasovi, komentari) će biti trajno obrisani.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-user-${user.id}`}>
                              Otkaži
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              data-testid={`button-confirm-delete-user-${user.id}`}
                            >
                              Obriši
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectsTab() {
  const { toast } = useToast();

  const { data: approvedProjects, isLoading: approvedLoading } = useQuery<ProjectWithUser[]>({
    queryKey: ["/api/giveaway/projects"],
  });

  const { data: pendingProjects, isLoading: pendingLoading } = useQuery<ProjectWithUser[]>({
    queryKey: ["/api/admin/pending-projects"],
  });

  const approveMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("POST", `/api/admin/projects/${projectId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-projects"] });
      toast({
        title: "Uspeh",
        description: "Projekat je odobren i sada je vidljiv korisnicima",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri odobravanju projekta",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/admin/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-projects"] });
      toast({
        title: "Uspeh",
        description: "Projekat je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju projekta",
        variant: "destructive",
      });
    },
  });

  if (pendingLoading || approvedLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-project-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="content-projects" className="space-y-8">
      {/* Pending Projects Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Projekti na Čekanju</h2>
        <p className="text-muted-foreground mb-6">
          Projekti koje korisnici uploaduju moraju biti odobreni pre nego što budu vidljivi ostalim korisnicima.
        </p>
        {pendingProjects && pendingProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingProjects.map((project) => (
              <Card key={project.id} data-testid={`card-pending-project-${project.id}`} className="border-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500">
                      Na čekanju
                    </Badge>
                  </div>
                  <CardTitle className="text-lg" data-testid={`title-pending-project-${project.id}`}>
                    {project.title}
                  </CardTitle>
                  <CardDescription data-testid={`author-pending-project-${project.id}`}>
                    by {project.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Žanr:</span>
                      <Badge variant="secondary" data-testid={`genre-pending-project-${project.id}`}>
                        {project.genre}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Opis:</span>
                      <span className="text-sm text-right line-clamp-2">{project.description}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Music className="h-4 w-4" />
                      <span>Preslušaj pesmu:</span>
                    </div>
                    <audio
                      controls
                      className="w-full"
                      preload="metadata"
                      data-testid={`audio-player-${project.id}`}
                    >
                      <source src={project.mp3Url} type="audio/mpeg" />
                      Vaš browser ne podržava audio player.
                    </audio>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(project.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-project-${project.id}`}
                    >
                      Odobri Projekat
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          data-testid={`button-reject-project-${project.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Odbij i Obriši
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-testid={`dialog-reject-project-${project.id}`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Projekat "{project.title}" će biti trajno odbijen i obrisan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid={`button-cancel-reject-project-${project.id}`}>
                            Otkaži
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(project.id)}
                            data-testid={`button-confirm-reject-project-${project.id}`}
                          >
                            Odbij i Obriši
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-pending-projects">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-pending-projects">
                Nema projekata na čekanju
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approved Projects Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Odobreni Projekti</h2>
        <p className="text-muted-foreground mb-6">
          Projekti koji su odobreni i vidljivi svim korisnicima.
        </p>
        {approvedProjects && approvedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProjects.map((project) => (
              <Card key={project.id} data-testid={`card-approved-project-${project.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                      Odobreno
                    </Badge>
                  </div>
                  <CardTitle className="text-lg" data-testid={`title-approved-project-${project.id}`}>
                    {project.title}
                  </CardTitle>
                  <CardDescription data-testid={`author-approved-project-${project.id}`}>
                    by {project.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Žanr:</span>
                      <Badge variant="secondary" data-testid={`genre-approved-project-${project.id}`}>
                        {project.genre}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Glasovi:</span>
                      <span className="font-medium" data-testid={`votes-approved-project-${project.id}`}>
                        {project.votesCount}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        data-testid={`button-delete-approved-project-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši Projekat
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid={`dialog-delete-approved-project-${project.id}`}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ova akcija ne može biti poništena. Projekat "{project.title}" će biti trajno obrisan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid={`button-cancel-delete-approved-project-${project.id}`}>
                          Otkaži
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(project.id)}
                          data-testid={`button-confirm-delete-approved-project-${project.id}`}
                        >
                          Obriši
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-approved-projects">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-approved-projects">
                Nema odobrenih projekata
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface UserSongWithDetails {
  id: number;
  userId: number;
  username: string;
  songTitle: string;
  artistName: string;
  youtubeUrl: string;
  submittedAt: string;
  approved: boolean;
  votesCount: number;
}

function UserSongsTab() {
  const { toast } = useToast();

  const { data: songs, isLoading } = useQuery<UserSongWithDetails[]>({
    queryKey: ["/api/user-songs/all"],
  });

  const approveMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/user-songs/${songId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs/all"] });
      toast({
        title: "Uspeh",
        description: "Pesma je odobrena",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri odobravanju pesme",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("DELETE", `/api/user-songs/${songId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs/all"] });
      toast({
        title: "Uspeh",
        description: "Pesma je obrisana",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju pesme",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40" data-testid={`skeleton-song-${i}`} />
        ))}
      </div>
    );
  }

  const pendingSongs = songs?.filter(s => !s.approved) || [];
  const approvedSongs = songs?.filter(s => s.approved) || [];

  return (
    <div className="space-y-6" data-testid="content-user-songs">
      {/* Pending Songs Section */}
      {pendingSongs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-pending-songs">
            Pesme na Čekanju ({pendingSongs.length})
          </h3>
          <div className="space-y-4">
            {pendingSongs.map((song) => (
              <Card key={song.id} data-testid={`card-song-${song.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base" data-testid={`title-song-${song.id}`}>
                          {song.songTitle}
                        </CardTitle>
                        <Badge variant="secondary" data-testid={`status-song-${song.id}`}>
                          Na čekanju
                        </Badge>
                      </div>
                      <CardDescription data-testid={`artist-song-${song.id}`}>
                        {song.artistName}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground" data-testid={`user-song-${song.id}`}>
                        Poslao: {song.username}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => approveMutation.mutate(song.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-song-${song.id}`}
                      >
                        Odobri
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(song.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-song-${song.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a
                      href={song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={`link-youtube-${song.id}`}
                    >
                      <Music className="h-3 w-3" />
                      Otvori na YouTube
                    </a>
                    <p className="text-xs text-muted-foreground" data-testid={`time-song-${song.id}`}>
                      Poslato: {format(new Date(song.submittedAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Songs Section */}
      {approvedSongs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-approved-songs">
            Odobrene Pesme ({approvedSongs.length})
          </h3>
          <div className="space-y-4">
            {approvedSongs.map((song) => (
              <Card key={song.id} data-testid={`card-approved-song-${song.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base" data-testid={`title-approved-song-${song.id}`}>
                          {song.songTitle}
                        </CardTitle>
                        <Badge variant="default" data-testid={`status-approved-song-${song.id}`}>
                          Odobreno
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1" data-testid={`votes-song-${song.id}`}>
                          <Heart className="h-3 w-3" />
                          {song.votesCount} glasova
                        </Badge>
                      </div>
                      <CardDescription data-testid={`artist-approved-song-${song.id}`}>
                        {song.artistName}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground" data-testid={`user-approved-song-${song.id}`}>
                        Poslao: {song.username}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(song.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-approved-song-${song.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a
                      href={song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={`link-youtube-approved-${song.id}`}
                    >
                      <Music className="h-3 w-3" />
                      Otvori na YouTube
                    </a>
                    <p className="text-xs text-muted-foreground" data-testid={`time-approved-song-${song.id}`}>
                      Poslato: {format(new Date(song.submittedAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Songs */}
      {songs?.length === 0 && (
        <Card data-testid="card-no-songs">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-songs">
              Nema poslanih pesama
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CommentsTab() {
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<CommentWithDetails[]>({
    queryKey: ["/api/admin/comments"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/admin/comments/${commentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Uspeh",
        description: "Komentar je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju komentara",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" data-testid={`skeleton-comment-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="content-comments">
      {comments?.map((comment) => (
        <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base" data-testid={`username-comment-${comment.id}`}>
                  {comment.username}
                </CardTitle>
                <CardDescription data-testid={`project-comment-${comment.id}`}>
                  na projektu: {comment.projectTitle}
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(comment.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-comment-${comment.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2" data-testid={`text-comment-${comment.id}`}>
              {comment.text}
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`time-comment-${comment.id}`}>
              {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
            </p>
          </CardContent>
        </Card>
      ))}

      {comments?.length === 0 && (
        <Card data-testid="card-no-comments">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-comments">
              Nema komentara
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// INVOICES TAB
// ============================================================================

function InvoicesTab() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch all invoices
  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
  });

  // Fetch all users for dropdown
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: "Uspeh",
        description: "Faktura uspešno kreirana",
      });
      setShowCreateForm(false);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri kreiranju fakture",
        variant: "destructive",
      });
    },
  });

  // Update invoice status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/invoices/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: "Uspeh",
        description: "Status fakture ažuriran",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju statusa",
        variant: "destructive",
      });
    },
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/invoices/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: "Uspeh",
        description: "Faktura obrisana",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju fakture",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      userId: parseInt(formData.get("userId") as string),
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string || "RSD",
      description: formData.get("description") as string,
      dueDate: formData.get("dueDate") as string,
      notes: formData.get("notes") as string || "",
    };
    createInvoiceMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-invoices">Fakture</h2>
          <p className="text-muted-foreground">Kreiranje i upravljanje fakturama</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          data-testid="button-toggle-invoice-form"
        >
          {showCreateForm ? "Zatvori Formu" : "Kreiraj Fakturu"}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Faktura</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userId">Korisnik *</Label>
                  <select
                    id="userId"
                    name="userId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="select-invoice-user"
                  >
                    <option value="">Izaberite korisnika</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="amount">Iznos *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    data-testid="input-invoice-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Valuta *</Label>
                  <select
                    id="currency"
                    name="currency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="select-invoice-currency"
                  >
                    <option value="RSD">RSD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Rok Plaćanja *</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    required
                    data-testid="input-invoice-due-date"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Opis *</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  data-testid="textarea-invoice-description"
                />
              </div>
              <div>
                <Label htmlFor="notes">Napomene</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  data-testid="textarea-invoice-notes"
                />
              </div>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending}
                data-testid="button-submit-invoice"
              >
                {createInvoiceMutation.isPending ? "Kreiranje..." : "Kreiraj Fakturu"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista Faktura ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Broj</th>
                  <th className="text-left p-2">Korisnik</th>
                  <th className="text-left p-2">Iznos</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Rok</th>
                  <th className="text-left p-2">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted-foreground">
                      Nema faktura
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="border-b" data-testid={`row-invoice-${invoice.id}`}>
                      <td className="p-2">{invoice.invoiceNumber}</td>
                      <td className="p-2">ID: {invoice.userId}</td>
                      <td className="p-2">
                        {invoice.amount} {invoice.currency}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "overdue"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-invoice-status-${invoice.id}`}
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {new Date(invoice.dueDate).toLocaleDateString("sr-RS")}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {invoice.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: invoice.id, status: "paid" })
                              }
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-mark-paid-${invoice.id}`}
                            >
                              Označi kao Plaćeno
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Da li ste sigurni?")) {
                                deleteInvoiceMutation.mutate(invoice.id);
                              }
                            }}
                            disabled={deleteInvoiceMutation.isPending}
                            data-testid={`button-delete-invoice-${invoice.id}`}
                          >
                            Obriši
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
