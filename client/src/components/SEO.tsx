import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: object;
  noIndex?: boolean;
}

// The organization (MusicRecordingStudio) + WebSite schema is baked statically into
// client/index.html so crawlers see it without executing JS. This component only manages
// page-specific schema (FAQ, services, breadcrumbs…) in its own id-scoped <script> tags -
// it must never touch the static one.

// Visible names for auto-generated BreadcrumbList schema on public subpages
const BREADCRUMB_NAMES: Record<string, string> = {
  "/usluge": "Usluge",
  "/projekti": "Projekti",
  "/faq": "Česta pitanja",
  "/kontakt": "Kontakt",
  "/tim": "Tim",
  "/pravila": "Pravila i uslovi",
};

// Get absolute URL for Open Graph images
function getAbsoluteUrl(path: string): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}${path}`;
  }
  return path;
}

// Get canonical URL - always absolute
function getCanonicalUrl(customUrl?: string): string {
  const base = 'https://studioleflow.com';
  if (customUrl) {
    return customUrl.startsWith('http') ? customUrl : `${base}${customUrl.startsWith('/') ? '' : '/'}${customUrl}`;
  }
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  return base;
}

export function SEO({
  title = "Studio LeFlow - Profesionalni Muzički Studio u Beogradu | Snimanje, Miks, Mastering",
  description = "Vrhunski muzički studio u Beogradu. Snimanje, mix/mastering, instrumentali, video spotovi. WA-47, Apollo Twin X, UAD plugins. Preko 5 godina iskustva.",
  keywords = [
    "muzički studio",
    "muzicki studio",
    "studio za snimanje",
    "studio za snimanje pesama",
    "muzički studio srbija",
    "studio leflow",
    "leflow studio",
    "leflow",
    "leflow beograd",
    "studio leflow beograd",
    "leflow studio beograd",
    "muzički studio beograd",
    "muzicki studio beograd",
    "snimanje pesme beograd",
    "snimanje vokala beograd",
    "miks i mastering",
    "mix mastering beograd",
    "voice over studio",
    "podcast studio beograd",
    "muzička produkcija",
    "audio produkcija beograd",
    "mastering beograd",
    "producent muzike beograd",
    "beatmaker beograd",
    "recording studio belgrade",
    "leflow music studio",
    "najbolji muzički studio beograd",
    "profesionalno snimanje beograd",
    "hip hop producent srbija",
    "trap beat srbija",
    "rap snimanje beograd"
  ],
  ogImage = "/og-image.png",
  ogType = "website",
  canonicalUrl,
  structuredData,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Set document title
    document.title = title;
    
    // Helper to set/update meta tags
    const setMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set link tags
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };
    
    // Standard meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords.join(', '));
    setMetaTag('author', 'Studio LeFlow');
    setMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Geo tags for local SEO (Belgrade, Serbia)
    setMetaTag('geo.region', 'RS-00');
    setMetaTag('geo.placename', 'Beograd');
    setMetaTag('geo.position', '44.8176;20.4633');
    setMetaTag('ICBM', '44.8176, 20.4633');
    
    // Language tags
    setMetaTag('language', 'Serbian');
    setMetaTag('content-language', 'sr-RS');
    
    // Get absolute URL for Open Graph image
    const absoluteOgImage = getAbsoluteUrl(ogImage);
    const canonical = getCanonicalUrl(canonicalUrl);
    
    // Canonical URL
    setLinkTag('canonical', canonical);
    
    // Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', absoluteOgImage, true);
    setMetaTag('og:image:width', '1200', true);
    setMetaTag('og:image:height', '630', true);
    setMetaTag('og:image:alt', 'Studio LeFlow - Profesionalni Muzički Studio Beograd', true);
    setMetaTag('og:image:type', 'image/png', true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:site_name', 'Studio LeFlow', true);
    setMetaTag('og:locale', 'sr_RS', true);
    setMetaTag('og:url', canonical, true);
    
    // Twitter cards
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', absoluteOgImage);
    setMetaTag('twitter:image:alt', 'Studio LeFlow - Profesionalni Muzički Studio Beograd');
    
    // Page-specific structured data - id-scoped script so the static org schema
    // in index.html is never touched. Removed when the page has none.
    const setJsonLd = (id: string, data: object | null) => {
      let script = document.getElementById(id);
      if (!data) {
        script?.remove();
        return;
      }
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('id', id);
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    };

    setJsonLd('seo-page-schema', structuredData ?? null);

    // Auto BreadcrumbList for known public subpages (rich snippet eligibility)
    const path = new URL(canonical).pathname;
    const crumbName = BREADCRUMB_NAMES[path];
    setJsonLd('seo-breadcrumb', !noIndex && crumbName ? {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://studioleflow.com/" },
        { "@type": "ListItem", "position": 2, "name": crumbName, "item": canonical },
      ],
    } : null);

  }, [title, description, keywords, ogImage, ogType, canonicalUrl, structuredData, noIndex]);
  
  return <></>;
}

// Pre-built structured data for specific pages
export const pageStructuredData = {
  services: {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Usluge Studio LeFlow",
    "description": "Profesionalne usluge muzičke produkcije u Beogradu",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Service",
          "name": "Snimanje vokala",
          "description": "Profesionalno snimanje vokala sa vrhunskom opremom",
          "provider": { "@type": "Organization", "name": "Studio LeFlow" },
          "areaServed": "Beograd, Srbija"
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@type": "Service",
          "name": "Mix i Mastering",
          "description": "Profesionalni miks i mastering audio materijala",
          "provider": { "@type": "Organization", "name": "Studio LeFlow" },
          "areaServed": "Beograd, Srbija"
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "item": {
          "@type": "Service",
          "name": "Instrumentalna produkcija",
          "description": "Custom bitovi i instrumentali",
          "provider": { "@type": "Organization", "name": "Studio LeFlow" },
          "areaServed": "Beograd, Srbija"
        }
      },
      {
        "@type": "ListItem",
        "position": 4,
        "item": {
          "@type": "Service",
          "name": "Video produkcija",
          "description": "Profesionalni muzički video spotovi",
          "provider": { "@type": "Organization", "name": "Studio LeFlow" },
          "areaServed": "Beograd, Srbija"
        }
      }
    ]
  },
  
  contact: {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Kontakt - Studio LeFlow",
    "description": "Kontaktirajte Studio LeFlow za profesionalnu muzičku produkciju u Beogradu",
    "mainEntity": {
      "@type": "MusicRecordingStudio",
      "name": "Studio LeFlow",
      "email": "podrska@studioleflow.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Beograd",
        "addressCountry": "RS"
      }
    }
  },
  
  portfolio: {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Portfolio - Studio LeFlow",
    "description": "Pogledajte radove Studio LeFlow - profesionalna muzička produkcija",
    "mainEntity": {
      "@type": "ItemList",
      "name": "Studio LeFlow Portfolio",
      "itemListOrder": "https://schema.org/ItemListOrderDescending"
    }
  },

  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "name": "Česta Pitanja - Studio LeFlow",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Da li moram da dođem sa gotovim tekstom?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Da, obavezno. Sesija snimanja je tu da snimimo ono što si kreirao, ne da pišemo pesmu. Dođi potpuno spreman."
        }
      },
      {
        "@type": "Question",
        "name": "Mogu li da dođem kao potpuni početnik?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tehnički da, ali ne preporučujemo. Studio je opremljen vrhunskom profesionalnom opremom. Ako si početnik, stekni iskustvo na pristupačnijoj opremi, pa kad si spreman - vrata su otvorena."
        }
      },
      {
        "@type": "Question",
        "name": "Šta dobijam na kraju sesije?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zavisi od dogovorene usluge. Za snimanje dobijaš minimalno obrađen demo. Za snimanje + mix/master dobijaš demo spreman za dalju distribuciju."
        }
      },
      {
        "@type": "Question",
        "name": "Koliko revizija je uključeno?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Za sve usluge uključene su 2 besplatne revizije. Dodatne revizije se naplaćuju posebno."
        }
      },
      {
        "@type": "Question",
        "name": "Kako da zakažem termin?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Najbrže putem WhatsApp-a ili Instagram DM-a. Kontakt informacije su dostupne na stranici za kontakt na studioleflow.com/kontakt."
        }
      },
      {
        "@type": "Question",
        "name": "Da li snimate samo vokal ili i instrumente?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Primarno snimamo vokal. Za instrumentale i produkciju radimo custom bitove - žanrovi uključuju Hip-Hop, Pop, R&B, Trap i Balkan muziku."
        }
      }
    ]
  }
};
