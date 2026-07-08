import { lazy, Suspense, Component, ReactNode, useEffect } from "react";
import { trackPageView } from "./lib/analytics";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { usePWARedirect } from "@/hooks/use-pwa-redirect";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieConsent } from "@/components/CookieConsent";
import { DebugConsole } from "@/components/admin/DebugConsole";

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; errorMsg: string }> {
  state = { failed: false, errorMsg: "" };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    const msg = `${error?.name}: ${error?.message}`;
    this.setState({ errorMsg: msg });

    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.message?.includes("Loading chunk") ||
      error?.name === "ChunkLoadError";

    if (isChunkError) {
      const key = `chunk-reload-${window.location.pathname}`;
      const attempts = parseInt(sessionStorage.getItem(key) ?? "0", 10);
      if (attempts < 2) {
        sessionStorage.setItem(key, String(attempts + 1));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4">
          <p className="text-muted-foreground">Došlo je do greške pri učitavanju stranice.</p>
          {this.state.errorMsg && (
            <p className="text-xs text-red-400 font-mono max-w-md break-all bg-zinc-900 px-3 py-2 rounded">
              {this.state.errorMsg}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <button
              className="text-primary underline text-sm"
              onClick={() => {
                sessionStorage.removeItem(`chunk-reload-${window.location.pathname}`);
                window.location.reload();
              }}
            >
              Pokušaj ponovo
            </button>
            <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
            <a href="/" className="text-primary underline text-sm">
              Nazad na početnu
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const HomePage = lazy(() => import("@/pages/home"));
const TermsPage = lazy(() => import("@/pages/terms"));
const TeamPage = lazy(() => import("@/pages/team"));
const ContactPage = lazy(() => import("@/pages/contact"));
const AuthPageComponent = lazy(() => import("@/pages/auth-page"));
const VerifyEmailPageComponent = lazy(() => import("@/pages/verify-email"));
const GiveawayPage = lazy(() => import("@/pages/giveaway"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AdminPageComponent = lazy(() => import("@/pages/admin"));
const TermsOfUsePage = lazy(() => import("@/pages/terms-of-use"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const VideoSpotsPage = lazy(() => import("@/pages/video-spots"));
const InboxPage = lazy(() => import("@/pages/inbox"));
const MojePesmePage = lazy(() => import("@/pages/moje-pesme"));
const ZajednicaPage = lazy(() => import("@/pages/zajednica"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const IgraPage = lazy(() => import("@/pages/igra"));
const VerifyLicensePage = lazy(() => import("@/pages/verify-license"));
const MaintenancePage = lazy(() => import("@/pages/maintenance"));
const NewsletterConfirmationPage = lazy(() => import("@/pages/newsletter-confirmation"));
const UslugePage = lazy(() => import("@/pages/usluge"));
const FAQPage = lazy(() => import("@/pages/faq"));
const PortalPage = lazy(() => import("@/pages/portal"));
const SmartLinkPage = lazy(() => import("@/pages/l"));
const UserProfilePage = lazy(() => import("@/pages/user-profile"));
const NewsPage = lazy(() => import("@/pages/news"));
const NewsArticlePage = lazy(() => import("@/pages/news-article"));
function Router() {
  const [location] = useLocation();
  const { user } = useAuth();

  useScrollToTop();
  usePWARedirect(); // Auto-redirect in PWA standalone mode

  // GA4 page views - SPA navigation doesn't reload the page, so each location
  // change must be reported manually (initial load included; auto page_view is off)
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  // Smart Link pages - standalone layout (no header/footer)
  if (location.startsWith("/l/")) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-[#080808] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
          <Switch location={location}>
            <Route path="/l/:slug"><SmartLinkPage /></Route>
          </Switch>
        </Suspense>
      </ChunkErrorBoundary>
    );
  }

  // Portal pages get their own standalone layout (no main nav/footer)
  if (location.startsWith("/portal/")) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" /></div>}>
          <Switch location={location}>
            <Route path="/portal/:token"><PortalPage /></Route>
          </Switch>
        </Suspense>
      </ChunkErrorBoundary>
    );
  }

  // Check if maintenance mode is active
  const { data: maintenanceData } = useQuery<{ maintenanceMode: boolean }>({
    queryKey: ["/api/maintenance"],
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // If maintenance mode is active and user is not admin, show maintenance page
  const isMaintenanceMode = maintenanceData?.maintenanceMode && user?.role !== "admin" && !localStorage.getItem("maintenance_bypass");
  
  if (isMaintenanceMode) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <MaintenancePage />
      </Suspense>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-200px)] pt-[calc(4rem+env(safe-area-inset-top))]">
        <ChunkErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <div key={location} className="w-full page-transition">
            <Switch location={location}>
                <Route path="/"><HomePage /></Route>
                <Route path="/terms"><TermsPage /></Route>
                <Route path="/pravila"><TermsPage /></Route>
                <Route path="/tim"><TeamPage /></Route>
                <Route path="/kontakt"><ContactPage /></Route>
                <Route path="/projekti"><VideoSpotsPage /></Route>
                <Route path="/auth"><AuthPageComponent /></Route>
                <Route path="/prijava"><AuthPageComponent /></Route>
                <Route path="/registracija"><AuthPageComponent /></Route>
                <Route path="/verify-email"><VerifyEmailPageComponent /></Route>
                <Route path="/proveri/:hash"><VerifyLicensePage /></Route>
                <Route path="/proveri"><VerifyLicensePage /></Route>
                <Route path="/newsletter/potvrda/:token"><NewsletterConfirmationPage /></Route>
                <Route path="/uslovi-koriscenja"><TermsOfUsePage /></Route>
                <Route path="/usluge"><UslugePage /></Route>
                <Route path="/faq"><FAQPage /></Route>
                <Route path="/news"><NewsPage /></Route>
                <Route path="/news/:slug"><NewsArticlePage /></Route>
                <ProtectedRoute path="/u/:username" component={() => <UserProfilePage />} />
                <ProtectedRoute path="/igra" component={() => <IgraPage />} />
                <ProtectedRoute path="/zajednica" component={() => <ZajednicaPage />} />
                <ProtectedRoute path="/giveaway" component={() => <GiveawayPage />} />
                <ProtectedRoute path="/moje-pesme" component={() => <MojePesmePage />} />
                <ProtectedRoute path="/inbox" component={() => <InboxPage />} />
                <ProtectedRoute path="/dashboard" component={() => <DashboardPage />} />
                <ProtectedRoute path="/admin" component={() => <AdminPageComponent />} />
                <ProtectedRoute path="/settings" component={() => <SettingsPage />} />
                <Route><NotFoundPage /></Route>
            </Switch>
          </div>
        </Suspense>
        </ChunkErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

// @react-oauth/google throws synchronously on mount if clientId is empty, which would
// crash the entire app tree. Only wrap with the real provider when it's configured.
function MaybeGoogleOAuthProvider({ children }: { children: ReactNode }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MaybeGoogleOAuthProvider>
          <ThemeProvider>
            <AuthProvider>
              <WebSocketProvider>
                <EditModeProvider>
                  <TooltipProvider>
                    <Toaster />
                    <InstallPrompt />
                    <WhatsAppButton />
                    <CookieConsent />
                    <DebugConsole />
                    <Router />
                  </TooltipProvider>
                </EditModeProvider>
              </WebSocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </MaybeGoogleOAuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
