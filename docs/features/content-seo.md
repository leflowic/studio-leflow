# Public content, CMS, SEO, navbar and the smaller public features

Feature reference split out of CLAUDE.md (2026-11-26). The cross-cutting rules in CLAUDE.md still apply here.

**Homepage sections added 2026-11:**
- `BeforeAfterSection` (`client/src/components/home/BeforeAfterPlayer.tsx`) - A/B player, up to 3 pairs stored in `cms_content` (page `home`, section `beforeafter`, keys `ba_<n>_title|artist|before|after`; `beforeafter` was added to `cmsSections` in `shared/schema.ts`). Super Admin uploads MP3s in edit mode (via `/api/upload/audio`). Both `<audio>` elements play simultaneously and switching only flips `muted`, which keeps the switch gapless; drift >80ms is corrected on `timeupdate`. Section is hidden until at least one pair has both URLs.
- `PlatformMarquee` (`client/src/components/home/PlatformMarquee.tsx`) - infinite single-color logo marquee of streaming platforms under the hero. Icons are path data in `client/src/lib/platform-icons.ts`, taken from Simple Icons (CC0; Amazon Music and TuneIn from simple-icons v11, removed upstream later). Only platforms with a real, accurate monochrome mark are included (15). Qobuz, Anghami, JioSaavn, Gaana, QQ Music, KuGou, Yandex Music, Boomplay, Melon, Bugs!, Line Music, AWA, KKBOX, SiriusXM, Idagio have no free monochrome SVG - don't hand-draw lookalikes; add them only from official brand kits. Animation is the `marquee-x` keyframe in `index.css` (list rendered twice, track slides -50%, pauses on hover).
- `ProcessSection` (`client/src/components/home/ProcessSection.tsx`) - "Kako izgleda saradnja": publicizes the client account features (brief, job status, timestamped portal comments). The right-hand stepper is an illustration built from `JOB_STAGES`, labeled "Primer prikaza iz korisničkog naloga" - keep that label, it's not real client data.
- Contact form has an optional `demoUrl` (`contact_submissions.demo_url`, added in `runMigrations()`), validated as an http(s) link and included in the notification email. The email also reformats `preferredDate` from ISO to `dd.mm.yyyy.`.

**`/zastita-brenda` (public brand protection notice):**
- Static public page (`client/src/pages/zastita-brenda.tsx`, no DB-backed content) — a public, dated notice claiming first use of the "Studio LeFlow"/"LeFlow" name and logo since 2020, distinct from the internal `rights_protections` admin tool above. Explicitly **not** a substitute for formal trademark (žig) registration with Zavod za intelektualnu svojinu — the copy says so directly, don't soften that into implying legal certainty it doesn't have.
- Linked from the footer bottom bar (`footer.tsx`, next to "Proveri licencu"), registered in `BREADCRUMB_NAMES` (`SEO.tsx`), `STATIC_PAGE_META` (`server/seo-meta.ts`), and `sitemap.xml` — same 4-place wiring required for any new public page (see the SEO section below).

**CMS:**
- `EditableText` and `EditableImage` components let admins edit content in-place when edit mode is on.
- CMS values stored in `cms_content` table. Media stored in `cms_media` table.
- `EditableImage` uses a separate `fallbackSrc` prop for the local image to show when the stored CMS URL is broken.

**SEO:**
- **The org schema (`MusicRecordingStudio` + `WebSite`, `@graph` format) is baked statically into `client/index.html`** so crawlers see it without executing JS — it is NOT injected by React. Keep business facts (phone, address, hours, services) in sync there.
- `client/src/components/SEO.tsx` — sets `<title>`, meta tags, og/twitter tags, canonical URL via `useEffect`. Add `<SEO>` to every public page. It manages page-specific JSON-LD only, in **id-scoped scripts** (`#seo-page-schema`, `#seo-breadcrumb`) — never query ld+json scripts by `type` alone, that would clobber the static org schema in `index.html`.
- BreadcrumbList schema is auto-generated for paths listed in `BREADCRUMB_NAMES` in `SEO.tsx` (`/usluge`, `/projekti`, `/faq`, `/kontakt`, `/tim`, `/pravila`, `/news`) — add new public pages to that map, no per-page code needed.
- Pre-built page schemas exported as `pageStructuredData`: `services`, `contact`, `portfolio`, `faq` (FAQPage schema — enables Google rich snippets). Pass via `structuredData={pageStructuredData.faq}` etc.
- **Server-side og/twitter meta (`server/seo-meta.ts`)** — social crawlers don't execute JS, so React-set meta is invisible to them. In production, `registerHtmlMetaRoutes` (called just before `serveStatic` in `server/index.ts`) rewrites title/description/og/twitter/canonical in the served `index.html` for the static public pages and for smart links (see `docs/features/smart-links.md` for the `music.studioleflow.com` hostname-gated handling, split across this file and `server/routes.ts`). `STATIC_PAGE_META` in that file must stay in sync with each page's `<SEO>` props — update both when changing page titles/descriptions. Dev mode is untouched (crawlers only hit production).
- **Analytics (GA4):** `client/src/lib/analytics.ts` — loads gtag only when `import.meta.env.PROD && VITE_GA_MEASUREMENT_ID`. Auto page_view is disabled (`send_page_view: false`); the Router in `App.tsx` reports page views on every wouter location change instead (SPA navigation doesn't reload the page). CSP allowlists `www.googletagmanager.com` (script-src, connect-src) and `*.google-analytics.com` (connect-src).
- Business email in structured data is `podrska@studioleflow.com` — never `leflowbusiness@gmail.com`.
- `canonicalUrl` prop accepts relative paths (e.g. `"/faq"`) — the component converts to absolute automatically. Defaults to `window.location.href` (minus query/hash) if omitted.
- Pages that must use `<SEO noIndex={true}>`: `/uslovi-koriscenja`, `/prijava`, `/registracija`. Protected/private pages (`/admin`, `/settings`, `/dashboard`, `/inbox`, `/igra`, `/zajednica`, `/moje-pesme`) don't need `noIndex` — they are already Disallowed in `robots.txt` and behind auth.
- `client/public/sitemap.xml` — only public, indexable pages: `/`, `/usluge`, `/projekti`, `/faq`, `/kontakt`, `/tim`, `/pravila`, `/news`. Do not add noIndex pages, auth pages, or individual `/news/:slug` articles (dynamic, not worth hand-maintaining here). Served as a plain static file - don't add an Express `/sitemap.xml` or `/robots.txt` route; one used to exist in `routes.ts`, registered before `serveStatic`, and silently shadowed these files with a stale list.
- `client/public/robots.txt` — Disallow list includes: `/admin`, `/dashboard`, `/inbox`, `/moje-pesme`, `/igra`, `/zajednica`, `/giveaway`, `/settings`, `/u/`, `/api/`. Keep Allow list minimal (only `/` needed — everything not disallowed is allowed by default).

**Default avatar and favicons:**
- `AvatarFallback` in `client/src/components/ui/avatar.tsx` renders `avatar_200.png` (from `@assets`) as the default avatar image — global override, affects all `<AvatarFallback>` instances.
- Favicon source is also `avatar_200.png`. Sizes in `client/public/`: `favicon.ico` (16/32/48px embedded), `favicon-16x16.png`, `favicon-32x32.png`, `favicon.png` (48px), `apple-touch-icon.png` (180px), `favicon-192x192.png`, `favicon-512x512.png`.
- OG image: `client/public/og-image.png` — 1200×630px PNG. Referenced as `https://studioleflow.com/og-image.png` in `index.html` and `SEO.tsx`.

**Pravila i Česta Pitanja (`/pravila`):**
- `client/src/pages/terms.tsx` is a single merged page: two `Accordion` groups, "Pravila i Uslovi Saradnje" (business policy — avans/cancellation/payment/copyright/licenses/revisions) followed by "Česta Pitanja" (former standalone FAQ). Both accordions share the clean bordered-item style (no `CheckCircle2` lists, no gradient cards, no per-item `FadeInWhenVisible` — see the AI-slop rules below); `FadeInWhenVisible` wraps each of the two accordion sections and the closing CTA as whole units.
- `/faq` no longer has its own page — it's a `<Redirect to="/pravila" />` in `App.tsx` for old links/bookmarks. `client/src/pages/faq.tsx` was deleted; don't recreate it. `structuredData={pageStructuredData.faq}` (the `FAQPage` JSON-LD block in `SEO.tsx`) is passed on `/pravila` since the FAQ content now lives there.
- Nav: "Pravila i česta pitanja" lives in the header's Studio mega menu and in the footer (link list + bottom bar), one link each - there is no separate FAQ link.

**Video Spots:**
- Table: `video_spots` (title, description, youtubeUrl, createdAt). Public route is **`/projekti`** (the "Projekti" page) → `client/src/pages/video-spots.tsx`; there is no `/video-spots` route.
- Embeds YouTube videos via extracted video ID (`extractYouTubeVideoId()` handles `watch?v=`, `youtu.be/`, and `/embed/` URL forms).
- Admin CRUD via Radix `<Dialog>` (not portal-based — no async search buttons so FocusTrap is safe here).
- Uses `useEditMode()` to conditionally show add/edit/delete controls for admins.

**Parallax components:**
- `client/src/components/parallax/ParallaxHero.tsx` exports `ParallaxHero`, `ParallaxSection`, and `Parallax3DCard`. Only `ParallaxHero` is still used (the homepage hero, rendered as an inset rounded card); `ParallaxSection`/`Parallax3DCard` were removed from every page in the 2026-11 de-template pass (3D tilt on content cards is on the AI-slop list) - don't reintroduce them.
- Built with `framer-motion`; `ParallaxHero` uses `useScroll` + `useTransform` for scroll-driven fade/scale of the hero content.

**Navbar architecture (`client/src/components/layout/header.tsx`, redesigned 2026-11, Cloudflare-style):**
- Nav is a single `buildMenus(loggedIn)` config of **three mega-menu groups**: **Usluge** (services, links to `/usluge#snimanje|instrumentali|video|dodatne`), **Studio** (Projekti, music.studioleflow.com, Vesti, Tim, Pravila, Kontakt), **Zajednica** (feed, Pogodi Pesmu, Giveaway, Moje pesme). Order is deliberate and business-first - don't move Zajednica ahead of Usluge. Each group = labeled columns of `{title, desc, href, icon}` items (Lucide icon in a bordered 36px tile that turns oak on hover) + a right-hand `featured` card (`consult` = studio photo + free consultation, `release` = newest smart link cover/title from public `GET /api/smart-links`, fetched only when that panel opens, `game` = Pogodi Pesmu) + a footer strip (accent CTA left, small links right). The panel is centered on the viewport by a static `fixed inset-x-0 flex justify-center` wrapper - don't put `-translate-x-1/2` on the framer-motion element, its `y` animation overwrites `transform`. Desktop and the mobile slide-out are both rendered from this one config; to add a link, add an item there.
- Desktop panels open on hover with intent (open immediately, close after 140ms so the pointer can travel into the panel; a transparent `pt-3` bridge sits between trigger row and panel), toggle on click (touch/keyboard), close on Escape, outside click and route change. Triggers are pill buttons that get a hairline border + muted fill when open or when the current route is inside that group.
- Hash links (`/usluge#video`) use `scrollToHash()` (retries while the lazy page mounts) because wouter doesn't scroll to anchors; the target cards on `/usluge` carry matching `id`s and `scroll-mt-*`.
- Right side: theme toggle, bell, user menu (outline pill with avatar) or "Prijava" outline pill, then the primary "Zakažite termin" pill. Header is a solid `bg-background/90` bar with a hairline bottom border at all times (no scroll-state change).
- The homepage hero (`ParallaxHero`) is an inset rounded card (`mx-2 mt-2 rounded-2xl border`), not full-bleed - also part of the Cloudflare-inspired pass. Its outline button pins `[border-color:rgba(255,255,255,0.3)]` because the hero is always dark, whatever the theme.
- **Auth pages are standalone**: `/prijava`, `/registracija`, `/auth` render `AuthPage` without the site header/footer (`AUTH_PATHS` branch in `App.tsx`, placed after the maintenance check); `WhatsAppButton` also hides there. `AuthPage` draws its own `AuthShell`: left half = logo top-left, one outline pill top-right, 380px centered column (Google button first, then an "ili" divider, then the form); right half (desktop) = `AuthBrandPanel`, the animated logo panel (rotating rings, glow, particles, frequency lines). **The owner explicitly wants that animated panel kept** (2026-11-25) even though it breaks the general "no decorative motion" rule - don't strip it. Which form shows is derived from the URL, so switching sign in/sign up navigates between the two paths.
- `WhatsAppButton`: drag toward the top of the viewport → a full-width drop zone appears under the top edge ("Prevuci ovde da skloniš", turns red within the top 96px) → release hides the button. Hidden state is plain React state (`useState`, no storage) — it survives route changes because the component is mounted at App level, and resets on refresh. The drop-zone overlay is `z-[60]` so it renders above the `z-50` header.

**Newsletter:**
- Tables: `newsletter_subscribers` (email, confirmationToken, confirmedAt).
- Double opt-in: `POST /api/newsletter/subscribe` creates subscriber + sends confirmation email. `GET /api/newsletter/confirm/:token` activates. Page: `/newsletter/potvrda/:token`.
- Campaigns to all confirmed subscribers go through the admin Newsletter tab (rich text editor in `admin.tsx`) → `POST /api/newsletter/send` (`requireRole("marketing")`), which wraps each email in `newsletterCampaignEmail()` with a signed per-subscriber unsubscribe link + `List-Unsubscribe` headers (see "Email" in `docs/features/platform.md`). The separate Email tab (`EmailTab.tsx`, `POST /api/admin/send-email`) is for one-off emails to a single typed address.

**Giveaway (Beat Upload):**
- Despite the feature name, the underlying tables are named generically (pre-date the "giveaway" framing): `projects` (title, description, genre, mp3Url, userId, uploadDate, votesCount, currentMonth, approved, status enum) and `votes` (userId, projectId, ipAddress — unique on both `(userId, projectId)` and `(ipAddress, projectId)`, so voting is rate-limited by account and by IP). `comments` (projectId, userId, text) also hangs off `projects` for per-beat discussion. Don't confuse these with `client_portals`/`portal_versions` or the `/projekti` portfolio page — unrelated features that happen to share the word "project".
- Route: `/giveaway` — protected (`requireVerifiedEmail`). Users upload MP3 beats; admin approves; public votes and comments.
- Upload: `POST /api/upload/audio` → Cloudinary. Submission: `POST /api/giveaway/projects` (requires `termsAccepted: true` in body). Voting: `POST /api/giveaway/vote`. Comments: `GET /api/giveaway/projects/:id/comments`, `POST /api/giveaway/comments`.
- Per-user concurrency lock (`giveawayUploadLocks` Set in routes.ts) prevents bypassing monthly upload limit via concurrent requests.
- Admin toggles giveaway on/off via `POST /api/admin/giveaway/toggle` (stored as `giveaway_active` setting). Approval: `POST /api/admin/projects/:id/approve`.

**User Songs ("Moje Pesme"):**
- Tables: `user_songs` (userId, `songTitle`, `artistName`, `youtubeUrl` — unique, for duplicate protection — `submittedAt`, `approved`, `votesCount`), `user_song_votes` (userId, songId, UNIQUE). **Not an audio upload feature** — despite living next to the Giveaway (MP3 upload) feature, this is a YouTube link submission: users paste a link to their own already-released song rather than uploading a file.
- Route: `/moje-pesme` — protected (`requireVerifiedEmail`). `POST /api/user-songs` (rate-limited per user) to submit, `GET /api/user-songs` for the caller's own submissions, `DELETE /api/user-songs/:id` to remove their own; admin approves; public can vote.
- `GET /api/user-songs/public` — approved songs with `hasVoted` for the caller. `POST /api/user-songs/:id/vote` toggles vote.
- Admin: `GET /api/user-songs/all` and `POST /api/user-songs/:id/approve`, both `requireRole("producer")` — all songs with usernames.

**Site Announcement banner:**
- `PATCH /api/announcement` (requireAdmin) — upserts `{ isActive, message }` in `site_announcements` table.
- `GET /api/announcement` — public. Managed via `SiteAnnouncementCard` inline in `admin.tsx`.
- Client must poll or invalidate this query to pick up live changes.

**Maintenance mode:**
- Toggled via `POST /api/maintenance` (requireAdmin), stored as `maintenance_mode` setting.
- `checkMaintenanceMode` in `server/routes.ts` blocks `/api/*` routes not matching its `allowedPaths` prefix list (paths there are relative to the `/api` mount, so no `/api` prefix) — currently includes auth/account routes, `/admin`, `/portal`, `/l/`, `/smart-links`, `/messages`, `/ws`. **This list is not self-updating** — any new public endpoint meant to work during maintenance (a new smart-link-adjacent route, a new public portal-style feature, etc.) must be added here explicitly, or it silently 503s and the frontend can misreport a real outage as "no data yet" if the caller doesn't distinguish `isError` from an empty result.
- Client (`App.tsx`): if `GET /api/maintenance` returns `{ maintenanceMode: true }` and user is not admin, renders `<MaintenancePage>`. Bypass: `localStorage.setItem("maintenance_bypass", "1")` (admin use only). The `music.studioleflow.com`/`/l/`/`/portal/` branches in `Router()` return before this check even runs, so those standalone pages are never gated by it client-side either.

**Verify License page:**
- Route: `/verify-license` — public. Users enter a contract number; `GET /api/verify/:hash` (license `verificationHash`) returns sanitized contract info (no personal data beyond what's on the license itself).

## Motion accents (2026-11-27)

- `HeroSpectrum` (`components/home/HeroSpectrum.tsx`): a slow CSS level meter along the bottom of the homepage hero, oak bars, faded edges.
- `ProcessSection` stepper plays once when 50% in view: stages tick off up to "Mix", a 3-bar meter sits next to "u toku", then the timestamped comment slides in.
- Header Studio menu, Pogodi Pesmu card: its bars animate only while hovered (`.eq-paused`). Same on the music.studioleflow.com hub: a track row's number turns into a 3-bar meter on hover. The 404 waveform keeps stuttering after its reveal.
- All use `.eq-bar` / `@keyframes eq-bounce` in `index.css` (transform-only, per-bar `--eq-dur/--eq-delay/--eq-min`), and all stop under `prefers-reduced-motion`. Keep new motion to this kind of audio motif, one per section.
