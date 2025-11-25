import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isIOS, shouldShowInstallPrompt } from "@/lib/registerServiceWorker";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if on iOS and not installed
    const timer = setTimeout(() => {
      if (shouldShowInstallPrompt()) {
        // Check if user hasn't dismissed the prompt in the last 7 days
        const dismissedAt = localStorage.getItem('pwa-install-prompt-dismissed');
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        
        if (!dismissedAt || Date.now() - parseInt(dismissedAt) > weekInMs) {
          setShowPrompt(true);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || !isIOS()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5" data-testid="pwa-install-prompt">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-2">
                Instaliraj Studio LeFlow aplikaciju
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Dodaj aplikaciju na početni ekran za brz pristup i pun ekran režim.
              </p>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                    1
                  </span>
                  <span>Pritisni <Share className="w-3 h-3 inline mx-1" /> <strong>Share</strong> dugme ispod</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                    2
                  </span>
                  <span>Scroll dole i izaberi <strong>"Add to Home Screen"</strong> <Plus className="w-3 h-3 inline ml-1" /></span>
                </div>
              </div>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0"
              data-testid="button-dismiss-install-prompt"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
