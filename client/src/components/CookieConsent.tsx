import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { startAnalyticsAfterConsent } from "@/lib/analytics";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
    startAnalyticsAfterConsent();
  };

  // Declining (or closing) = no analytics cookies. Only necessary storage
  // (login, theme, preferences) is used, which needs no consent.
  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-muted-foreground">
          Uz vašu dozvolu koristimo Google Analytics kolačiće da vidimo koje se stranice posećuju. Kolačići potrebni za prijavu i podešavanja rade i bez toga.{" "}
          <Link href="/pravila#privatnost" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Privatnost i podaci
          </Link>
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={decline}>
            Odbijam
          </Button>
          <Button size="sm" onClick={accept}>
            Prihvatam
          </Button>
        </div>
      </div>
    </div>
  );
}
