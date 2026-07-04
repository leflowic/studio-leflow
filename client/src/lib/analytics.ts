// Google Analytics 4 - loads only in production and only when VITE_GA_MEASUREMENT_ID
// is set (Railway build-time env var). Without it this module is a no-op, so local
// dev and preview builds never send events.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function enabled(): boolean {
  return Boolean(import.meta.env.PROD && GA_ID);
}

export function initAnalytics() {
  if (!enabled()) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // send_page_view: false - the SPA router reports page views itself on every
  // location change (see trackPageView), so the automatic initial hit would double-count.
  window.gtag("config", GA_ID, { send_page_view: false });
}

export function trackPageView(path: string) {
  if (!enabled() || !window.gtag) return;
  // Defer one tick so the page's <SEO> effect has set document.title first
  setTimeout(() => {
    window.gtag!("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, 0);
}
