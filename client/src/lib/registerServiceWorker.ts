// Service Worker Registration for PWA Support
export function registerServiceWorker() {
  // Only register in production and if service workers are supported
  if (
    import.meta.env.PROD &&
    'serviceWorker' in navigator &&
    window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  ) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, show update notification
                console.log('Nova verzija aplikacije je dostupna! Refresh-uj stranicu.');
              }
            });
          }
        });

        console.log('✅ PWA Service Worker registrovan uspešno');
      } catch (error) {
        console.error('❌ Service Worker registracija neuspešna:', error);
      }
    });
  }
}

// Detect if app is running in standalone mode (installed as PWA)
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Detect iOS device
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Check if PWA installation prompt should be shown
export function shouldShowInstallPrompt(): boolean {
  return isIOS() && !isStandalone();
}
