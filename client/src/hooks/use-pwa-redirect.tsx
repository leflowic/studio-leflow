import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook that automatically redirects users when PWA is opened in standalone mode:
 * - Logged in users → / (home page)
 * - Not logged in users → /auth (authentication page)
 * 
 * Redirect happens only once per session to prevent infinite loops.
 */
export function usePWARedirect() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Check if we're in PWA standalone mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true; // iOS Safari

    if (!isPWA) {
      return; // Not a PWA, skip redirect
    }

    // Check if we've already done the initial redirect this session
    const hasRedirected = sessionStorage.getItem('pwa_initial_redirect');
    
    if (hasRedirected) {
      return; // Already redirected, don't redirect again
    }

    // Wait for auth to load
    if (isLoading) {
      return;
    }

    // Mark that we've done the initial redirect
    sessionStorage.setItem('pwa_initial_redirect', 'true');

    // Perform redirect based on auth status
    if (user) {
      // User is logged in → redirect to home page
      if (location !== '/') {
        console.log('[PWA] Redirecting logged in user to home page');
        setLocation('/');
      }
    } else {
      // User is not logged in → redirect to auth page
      if (location !== '/auth') {
        console.log('[PWA] Redirecting guest user to auth page');
        setLocation('/auth');
      }
    }
  }, [user, isLoading, location, setLocation]);
}
