import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Link } from "wouter";

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
  };

  const dismiss = () => {
    localStorage.setItem("cookie-consent", "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-muted-foreground">
          Koristimo kolačiće kako bismo poboljšali vaše iskustvo na sajtu. Nastavkom korišćenja sajta prihvatate njihovu upotrebu.{" "}
          <Link href="/pravila" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Saznajte više
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={accept}>
            Prihvatam
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Zatvori">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
