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

// Default LocalBusiness structured data for Studio LeFlow
const defaultStructuredData = {
  "@context": "https://schema.org",
  "@type": "MusicRecordingStudio",
  "@id": "https://studioleflow.com/#organization",
  "name": "Studio LeFlow",
  "alternateName": ["LeFlow Studio", "LeFlow", "Studio Le Flow"],
  "url": "https://studioleflow.com",
  "logo": "https://studioleflow.com/favicon-512x512.png",
  "image": "https://studioleflow.com/og-image.png",
  "description": "Vrhunski muzički studio u Beogradu. Profesionalno snimanje, mix/mastering, instrumentalna produkcija i video spotovi.",
  "telephone": "+381637347023",
  "email": "podrska@studioleflow.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Beograd",
    "addressRegion": "Beograd",
    "addressCountry": "RS",
    "postalCode": "11000"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "44.8176",
    "longitude": "20.4633"
  },
  "areaServed": [
    {
      "@type": "City",
      "name": "Beograd",
      "sameAs": "https://en.wikipedia.org/wiki/Belgrade"
    },
    {
      "@type": "Country",
      "name": "Srbija",
      "sameAs": "https://en.wikipedia.org/wiki/Serbia"
    }
  ],
  "priceRange": "$$",
  "currenciesAccepted": "RSD, EUR",
  "paymentAccepted": "Cash, Bank Transfer",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "10:00",
      "closes": "22:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday", "Sunday"],
      "opens": "12:00",
      "closes": "20:00"
    }
  ],
  "sameAs": [
    "https://www.instagram.com/studioleflow",
    "https://www.youtube.com/@studioleflow"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Usluge Studio LeFlow",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Snimanje vokala",
          "description": "Profesionalno snimanje vokala sa WA-47 mikrofonom i Apollo Twin X interfejsom"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Mix i Mastering",
          "description": "Profesionalni miks i mastering sa UAD plugins"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Instrumentalna produkcija",
          "description": "Custom bitovi i instrumentali za sve žanrove"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Video spotovi",
          "description": "Profesionalna produkcija muzičkih video spotova"
        }
      }
    ]
  }
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

// Get canonical URL — always absolute
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
    
    // Structured data - use provided or default LocalBusiness
    const schemaData = structuredData || defaultStructuredData;
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);

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
    "name": "Česta Pitanja — Studio LeFlow",
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
          "text": "Tehnički da, ali ne preporučujemo. Studio je opremljen vrhunskom profesionalnom opremom. Ako si početnik, stekni iskustvo na pristupačnijoj opremi, pa kad si spreman — vrata su otvorena."
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
          "text": "Za snimanje i mix uključene su 3 besplatne revizije. Za produkciju beata uključena je 1 revizija. Za video produkciju uključene su 2 revizije montaže."
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
          "text": "Primarno snimamo vokal. Za instrumentale i produkciju radimo custom bitove — žanrovi uključuju Hip-Hop, Pop, R&B, Trap i Balkan muziku."
        }
      }
    ]
  }
};
