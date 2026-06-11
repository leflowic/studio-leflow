import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
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
const MaintenancePage = lazy(() => import("@/pages/maintenance"));
const NewsletterConfirmationPage = lazy(() => import("@/pages/newsletter-confirmation"));
function Router() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  useScrollToTop();
  usePWARedirect(); // Auto-redirect in PWA standalone mode

  // Check if maintenance mode is active
  const { data: maintenanceData } = useQuery<{ maintenanceMode: boolean }>({
    queryKey: ["/api/maintenance"],
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // If maintenance mode is active and user is not admin, show maintenance page
  const isMaintenanceMode = maintenanceData?.maintenanceMode && user?.role !== "admin";
  
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
      <main className="min-h-[calc(100vh-200px)]">
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
                <Route path="/newsletter/potvrda/:token"><NewsletterConfirmationPage /></Route>
                <Route path="/uslovi-koriscenja"><TermsOfUsePage /></Route>
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
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <WebSocketProvider>
              <EditModeProvider>
                <TooltipProvider>
                  <Toaster />
                  <InstallPrompt />
                  <Router />
                </TooltipProvider>
              </EditModeProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
