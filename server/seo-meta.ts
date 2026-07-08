import { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { log } from "./vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Social crawlers (Facebook, WhatsApp, Instagram, Twitter…) do NOT execute JS, so the
// og/twitter tags that the React SEO component sets at runtime are invisible to them -
// every shared link would preview with the homepage meta from the static index.html.
// This module rewrites those tags server-side for smart links and public pages.

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  ogType?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://studioleflow.com";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

// Must stay in sync with the <SEO> props on each page component
const STATIC_PAGE_META: Record<string, PageMeta> = {
  "/usluge": {
    title: "Usluge - Studio LeFlow | Snimanje, Mix/Mastering, Instrumentali, Video Spotovi Beograd",
    description: "Profesionalne usluge muzičke produkcije u Beogradu: snimanje vokala, miks i mastering, custom instrumentali, video spotovi. Studio LeFlow - WA-47, Apollo Twin X, UAD plugins.",
    canonical: `${BASE_URL}/usluge`,
  },
  "/projekti": {
    title: "Projekti - Studio LeFlow",
    description: "Projekti u kojima je naš tim učestvovao - video spotovi, pesme i muzička produkcija. Profesionalni muzički studio u Beogradu.",
    canonical: `${BASE_URL}/projekti`,
  },
  "/kontakt": {
    title: "Kontakt - Studio LeFlow | Rezervišite Termin za Snimanje",
    description: "Kontaktirajte Studio LeFlow za rezervaciju termina. Snimanje pesama, miks i mastering, voice over, podcast produkcija. Beograd, Srbija.",
    canonical: `${BASE_URL}/kontakt`,
  },
  "/tim": {
    title: "Naš Tim - Studio LeFlow | Profesionalni Producenti i Inženjeri Zvuka",
    description: "Upoznajte tim Studio LeFlow-a. Iskusni producenti, tekstopisci i inženjeri zvuka.",
    canonical: `${BASE_URL}/tim`,
  },
  "/pravila": {
    title: "Pravila i Česta Pitanja - Studio LeFlow",
    description: "Uslovi saradnje Studio LeFlow (politika avansa, otkazivanje termina, autorska prava) i odgovori na najčešća pitanja o snimanju, mix/masteru i rezervaciji termina.",
    canonical: `${BASE_URL}/pravila`,
  },
  "/news": {
    title: "Vesti - Studio LeFlow | Muzičke Novosti iz Beograda",
    description: "Najnovije vesti o izdanjima, saradnjama i dešavanjima u muzičkoj sceni - iz Studio LeFlow-a u Beogradu.",
    canonical: `${BASE_URL}/news`,
  },
  "/zastita-brenda": {
    title: "Zaštita brenda - Studio LeFlow",
    description: "Javna izjava o vlasništvu i prvoj upotrebi naziva Studio LeFlow, LeFlow i pripadajućeg vizuelnog identiteta (logo).",
    canonical: `${BASE_URL}/zastita-brenda`,
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Replace whole tags rather than attribute values - the source tags in index.html
// span multiple lines, so each pattern tolerates any attribute order/whitespace.
function injectMeta(html: string, meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);
  const image = escapeHtml(meta.image || DEFAULT_IMAGE);
  const ogType = escapeHtml(meta.ogType || "website");

  const replaceTag = (input: string, pattern: RegExp, replacement: string) =>
    pattern.test(input) ? input.replace(pattern, replacement) : input;

  let out = html;
  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = replaceTag(out, /<meta[^>]*name="description"[^>]*\/>/, `<meta name="description" content="${description}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:title"[^>]*\/>/, `<meta property="og:title" content="${title}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:description"[^>]*\/>/, `<meta property="og:description" content="${description}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:type"[^>]*\/>/, `<meta property="og:type" content="${ogType}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:url"[^>]*\/>/, `<meta property="og:url" content="${canonical}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:image"[^>]*\/>/, `<meta property="og:image" content="${image}" />`);
  out = replaceTag(out, /<meta[^>]*property="og:image:alt"[^>]*\/>/, `<meta property="og:image:alt" content="${title}" />`);
  out = replaceTag(out, /<meta[^>]*name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${title}" />`);
  out = replaceTag(out, /<meta[^>]*name="twitter:description"[^>]*\/>/, `<meta name="twitter:description" content="${description}" />`);
  out = replaceTag(out, /<meta[^>]*name="twitter:image"[^>]*\/>/, `<meta name="twitter:image" content="${image}" />`);
  out = replaceTag(out, /<link[^>]*rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${canonical}" />`);
  if (meta.keywords) {
    out = replaceTag(out, /<meta[^>]*name="keywords"[^>]*\/>/, `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`);
  }
  if (meta.jsonLd) {
    // Social/search crawlers read this on first parse - appended once per response, never persisted to disk.
    const script = `<script type="application/ld+json" id="seo-news-article">${JSON.stringify(meta.jsonLd)}</script>\n</head>`;
    out = out.replace(/<\/head>/, script);
  }
  return out;
}

// Production only: register BEFORE serveStatic so these routes win over the SPA catch-all.
export function registerHtmlMetaRoutes(app: Express) {
  const indexPath = path.resolve(__dirname, "public", "index.html");
  let cachedTemplate: string | null = null;

  const getTemplate = (): string | null => {
    if (cachedTemplate) return cachedTemplate;
    try {
      cachedTemplate = fs.readFileSync(indexPath, "utf-8");
      return cachedTemplate;
    } catch (err: any) {
      log(`[SEO meta] Could not read index.html: ${err.message}`, "express");
      return null;
    }
  };

  const sendWithMeta = (res: any, meta: PageMeta) => {
    const template = getTemplate();
    if (!template) return false;
    res.status(200).set({ "Content-Type": "text/html" }).send(injectMeta(template, meta));
    return true;
  };

  app.get(Object.keys(STATIC_PAGE_META), (req, res, next) => {
    const meta = STATIC_PAGE_META[req.path];
    if (!meta || !sendWithMeta(res, meta)) return next();
  });

  // Smart links now live on the music.studioleflow.com subdomain (no /l/ prefix).
  // The old /l/:slug path on the main domain is handled by a 301 redirect
  // registered earlier in server/routes.ts, so it never reaches this handler.
  app.get("/:slug", async (req, res, next) => {
    if (req.hostname !== "music.studioleflow.com") return next();
    try {
      const link = await storage.getSmartLinkBySlug(req.params.slug);
      if (!link) return next(); // SPA renders its own not-found state
      const meta: PageMeta = {
        title: `${link.title} - ${link.artist}`,
        description: `Slušaj "${link.title}" od ${link.artist} na Spotify, YouTube, Apple Music i drugim platformama.`,
        canonical: `https://music.studioleflow.com/${link.slug}`,
        image: link.coverUrl || undefined,
        ogType: "music.song",
      };
      if (!sendWithMeta(res, meta)) return next();
    } catch (err: any) {
      log(`[SEO meta] Smart link lookup failed: ${err.message}`, "express");
      next();
    }
  });

  app.get("/news/:slug", async (req, res, next) => {
    try {
      const article = await storage.getArticleBySlugPublic(req.params.slug);
      if (!article) return next(); // SPA renders its own not-found state
      const title = article.seoTitle || `${article.title} - Studio LeFlow Vesti`;
      const description = article.seoDescription || article.excerpt;
      const canonical = `${BASE_URL}/news/${article.slug}`;
      const keywords = article.seoKeywords || article.tags || undefined;
      const meta: PageMeta = {
        title,
        description,
        canonical,
        image: article.coverImage || undefined,
        ogType: "article",
        keywords,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title,
          description,
          image: article.coverImage ? [article.coverImage] : [DEFAULT_IMAGE],
          datePublished: article.publishedAt ?? article.createdAt,
          dateModified: article.updatedAt,
          keywords: keywords || undefined,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          author: { "@type": "Organization", name: "Studio LeFlow" },
          publisher: {
            "@type": "Organization",
            name: "Studio LeFlow",
            logo: { "@type": "ImageObject", url: `${BASE_URL}/leflow-logo-white.png` },
          },
        },
      };
      if (!sendWithMeta(res, meta)) return next();
    } catch (err: any) {
      log(`[SEO meta] News article lookup failed: ${err.message}`, "express");
      next();
    }
  });
}
