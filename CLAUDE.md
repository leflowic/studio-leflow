# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Studio LeFlow is a Serbian-language website and client platform for a music production studio in Belgrade — public marketing pages plus an authenticated dashboard, admin panel, real-time messaging, and a handful of engagement features (community feed, daily game, giveaways). Full-stack TypeScript: React SPA + Express API + PostgreSQL, deployed to Railway.

`README.md`, `DEPLOYMENT_GUIDE.md`, and `replit.md` are stale artifacts from the project's original Replit-hosted version (UploadThing instead of Cloudinary, Replit Deploy instead of Railway, and at least one described feature — the EVLFRQ audio analyzer — no longer exists in the code). Don't treat them as current; this file supersedes them.

## Commands

```bash
# Development (runs Express server; Vite dev server is proxied through it)
npm run dev

# Type-check only (no emit)
npm run check

# Production build (Vite frontend → dist/public, esbuild server → dist/index.js)
npm run build

# Production start
npm run start

# Push schema changes to the database
npm run db:push

# Seed the database
npm run seed
```

Tests: `npm test` runs `server/__tests__/*.test.ts` with Node's built-in test runner (via `tsx`, no test framework installed). Single file: `node --import tsx --test server/__tests__/spin.test.ts`. They cover pure server logic only (spin draw, trusted client IP, coin refs, report email, game clip slicing) - there are no DB or frontend tests, so DB-enforced rules (ledger uniqueness, shop locks) are still verified by hand.

## Architecture

**Monorepo layout:**
- `client/` — React 18 SPA (Vite root). Alias `@` → `client/src`, `@shared` → `shared/`, `@assets` → `attached_assets/`.
- `server/` — Express + TypeScript backend, run with `tsx` in dev and compiled with `esbuild` for prod.
- `shared/` — Schema and types shared between client and server. `shared/schema.ts` is the single source of truth for all DB tables (Drizzle ORM, PostgreSQL).
- `attached_assets/` — Static files (MP3 sounds, etc.) bundled by Vite via `@assets` alias.
- `dist/public/` — Built frontend output served by Express in production.

**Request flow:**
1. All HTTP traffic hits the Express server (`server/index.ts`).
2. In dev, Vite middleware serves the SPA and handles HMR. In prod, Express serves `dist/public/` as static files.
3. API routes are registered in `server/routes.ts` under `/api/*`.
4. Auth is dual: Passport sessions (legacy) + JWT (`Authorization: Bearer <token>`, stored in `localStorage` as `auth_token`). New routes use JWT middleware from `server/jwt-auth.ts`. The authenticated user is available on routes as `req.jwtUser`.
5. WebSocket server (`/api/ws`) runs alongside HTTP on the same port. Auth is validated on the WS `auth` message using `verifyToken()` from `server/jwt-auth.ts` — never trust client-sent user IDs. No cookie check on WS connection — auth is purely JWT via the `auth` message.

**Database:**
- Schema defined in `shared/schema.ts`, consumed by both Drizzle ORM queries (server) and Zod validators.
- `db:push` via `drizzle-kit` is the migration strategy. Additionally, `runMigrations()` in `server/index.ts` runs raw `ALTER TABLE / CREATE TABLE IF NOT EXISTS` on every server startup for additive changes that don't need a full push.
- **`drizzle-kit push --force` will NOT drop `NOT NULL` columns** — it skips destructive column removal silently. Use `runMigrations()` with `ALTER TABLE ... DROP COLUMN IF EXISTS` for any column removal. Make all such statements idempotent (`IF EXISTS` / `IF NOT EXISTS`).
- All DB access goes through `server/storage.ts` (implements a `IStorage` interface). Import `storage` from there; never query `db` directly in routes.

**Frontend state:**
- React Query (`@tanstack/react-query`) for all server state. The query client is at `client/src/lib/queryClient.ts`.
- `useAuth()` hook (`client/src/hooks/use-auth.tsx`) — current user, login/logout.
- `WebSocketContext` (`client/src/contexts/WebSocketContext.tsx`) — single shared WS connection with subscribe/send API. Handles browser notifications and sound on `new_message` events.
- `EditModeContext` (`client/src/contexts/EditModeContext.tsx`) — CMS in-place editing toggle (admin only).
- All pages are lazy-loaded via `React.lazy`. Routes are defined in `client/src/App.tsx` using `wouter`.

**Standalone layouts:**
- The `music.studioleflow.com` subdomain (Smart Links), legacy `/l/:slug`, `/portal/:token` (Client Portal) and the auth pages (`/prijava`, `/registracija`, `/auth` - `AUTH_PATHS`) skip the main header/footer entirely. They are matched in `App.tsx`'s `Router()` before the main layout (hostname check first, then path prefixes; the auth branch sits after the maintenance check) and rendered in their own `<Suspense>` wrappers.
- `WhatsAppButton` and similar global UI components must check `useLocation()` and return `null` on these routes.

**Admin panel tabs:**
- Each tab is its own component, either defined inline in `client/src/pages/admin.tsx` or as a separate file in `client/src/components/admin/`.
- Separate-file tabs: `ContractsTab`, `CalendarTab`, `KatastarTab`, `GameTab`, `SmartLinksTab`, `EmailTab`, `PortalTab`, `JobsBoard`, `NewsTab`, `RightsProtectionTab`, `TestimonialsTab`, `AntiAbuseTab` ("Zaštita igara"), `VouchersTab` ("Prodavnica", with `ShopAdmin.tsx`).
- **The tab menu is NOT a Radix `TabsList`** — it's a grouped sidebar driven by the `ADMIN_NAV` config array in `admin.tsx` (groups: Pregled / Klijenti / Sadržaj / Posao / Marketing / Sistem). Plain `<button>`s call `setActiveTab(value)`; the Radix `<Tabs value>` + `<TabsContent>` state machine is unchanged. To add a tab: add an entry (value, label, Lucide icon, optional `roles`) to `ADMIN_NAV` and a `<TabsContent>` pair. Desktop: sticky vertical sidebar; mobile: horizontally scrollable icon bar (same markup, flex direction switch at `lg`).
- **`ADMIN_NAV` items filter by role** via `getVisibleAdminNav(role)` — a "Super Admin" (`role === "admin"`) sees every item; restricted roles (`producer`/`editor`/`marketing`) only see items whose `roles` array includes their role. Keep each item's `roles` in sync with whatever `requireRole(...)` guards the matching API route(s) — see "Auth middleware hierarchy" below. Items with no `roles` (Dashboard, Podešavanja) are Super Admin-only.
- Restricted roles land on the first tab their role can see (not "dashboard") via an effect that corrects `activeTab` if the session-stored value isn't in their visible set.
- `GET /api/admin/katastar/:userId` returns `{ user, projects, contracts, invoices }` for the Katastar (client registry) tab.
- Table search (e.g. `UsersTab`'s username/email filter) is plain client-side `Array.filter` on the already-fetched query data — no server-side search/pagination exists yet for any admin table. Fine at current scale; revisit if a table's dataset grows into the thousands.
- **Tabs with forms must use `forceMount`** on their `<TabsContent>` to prevent React state loss on tab switch. Radix UI unmounts `TabsContent` by default — any local form state (dates, inputs, uploads) is wiped when the user navigates to another tab and back. `tabs.tsx` has `data-[state=inactive]:hidden` so forceMount content is still visually hidden when inactive. `GameTab`, `SmartLinksTab`, and `NewsTab` all use this.
- **Rule for new tabs:** add `forceMount` only if the tab holds local component state that would be lost on unmount and is annoying to lose — an open modal/form with typed input, a multi-step upload, a date picker mid-edit. A tab that's purely a read-only list/table driven by a query (no local draft state) does not need it — React Query's cache means remounting just re-renders the same data instantly.

**Avoiding Radix Dialog FocusTrap bugs:**
- Radix `<Dialog>` closes itself when the focused element becomes `disabled` mid-operation (e.g. a "Search" button that becomes disabled during an async fetch). This is caused by the FocusTrap moving focus to `document.body`, firing `onFocusOutside`.
- The fix: use `createPortal` from `react-dom` directly instead of Radix Dialog. **`Modal` in `client/src/components/admin/AdminModal.tsx`** is the shared, canonical implementation — it's a pure React portal with no FocusTrap, so it only closes when you explicitly call `onClose`. `SmartLinksTab`, `RightsProtectionTab`, and `ContractsTab`'s `AssignUserDialog`/`SendEmailDialog` all import it from there — don't re-declare a local copy, and don't reach for Radix `<Dialog>` in any new admin modal.
- Additionally, persist any form state that must survive a component remount to `sessionStorage`. `SmartLinksTab` does this for `showForm`, `form`, and `editingId` so that even if a toast dispatch causes `AdminPage` to remount the tab, the form state is restored. Key pattern: `useState(() => ssGet("sl_form", emptyForm))` with a setter that writes to `sessionStorage` before calling the React setter.
- `PortalTab`'s one remaining Radix `<Dialog>` (create-portal form) is not a FocusTrap risk today because its submit button's `disabled` only depends on form-field validity, never on `mutation.isPending` (it uses `aria-busy` + opacity instead) — if you ever add a `disabled={mutation.isPending}` there, migrate it to `AdminModal`'s `Modal` at the same time.
- **`Select`/`DropdownMenu`/`Popover` (`client/src/components/ui/*.tsx`) portal their content at `z-[300]`, not the shadcn default `z-50`** — bumped because `AdminModal`'s backdrop sits at `z-[200]`; at `z-50` a `<Select>` opened inside a Modal (e.g. the "Dodeli vlasnika"/"Dodeli korisniku" user pickers) rendered behind the blurred backdrop and looked washed out. Keep new popover-style components at `z-[300]` or higher if they might ever open inside a Modal.

**Authenticated requests:**
- Always use `apiRequest()` from `client/src/lib/queryClient.ts` for mutating routes that need auth. Raw `fetch()` with `credentials: "include"` does **not** send the JWT — it only sends cookies, which are not used for auth in this project. This is the most common source of 401 bugs on the frontend.
- For React Query `useQuery`, the default `queryFn` (via `getQueryFn`) already adds the JWT header — no extra work needed for GET requests.

**Authenticated file downloads (admin or user-facing):**
- Never use `window.open(url)` or a plain `<a href>` for any endpoint that requires a JWT — neither sends the `Authorization` header. Use `fetch()` with `Authorization: Bearer <token>` header, then create a blob URL and trigger download via a temporary `<a>` element. See `ContractsTab.tsx`'s `handleDownload` and `dashboard.tsx`'s `handleDownloadContract` for the reference pattern (both hit a PDF-regenerating endpoint, see "Contract PDFs" in `docs/features/studio-workflow.md`).

**Error messages:**
- All user-facing error messages must be in Serbian and friendly — never expose raw JS errors, stack traces, or English strings like "Unauthorized" / "Forbidden".
- Server: return `res.status(N).json({ error: "Serbian message" })`. Middleware in `server/jwt-auth.ts` already does this for auth errors.
- Client: `throwIfResNotOk` in `queryClient.ts` has a `STATUS_MESSAGES` fallback map for common HTTP codes. When the server sends `{ error: "..." }`, that message is used directly.

**Deployment:**
- Railway auto-deploys from GitHub `main` branch.
- `railway.toml`: build = `npm run build`, deploy = `npx drizzle-kit push --force`, start = `npm run start`.
- `nixpacks.toml` must use `npm ci --include=dev` so devDependencies (esbuild, tsc, etc.) are available at build time.
- `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` env vars must be set in Railway. Optional: `VITE_GA_MEASUREMENT_ID` (GA4 — analytics silently disabled without it).
- **Two custom domains point at the same Railway service**: `studioleflow.com` (main site) and `music.studioleflow.com` (Smart Links, see that section) — both need a Custom Domain entry in Railway plus a matching DNS CNAME record. There is no separate deployment for the subdomain; hostname-based branching happens entirely in app code (`App.tsx`, `server/routes.ts`, `server/seo-meta.ts`).
- The `drizzle-kit push --force` deploy step can prompt interactively for destructive-looking changes (e.g. adding a new unique constraint to a table with existing rows) and has, at least once, appeared to stall/skip later schema changes in the same run — don't rely on it alone for a brand-new table or column that other code depends on existing; add a matching idempotent block to `runMigrations()` in `server/index.ts` as a safety net (see the "Database" note above on `drizzle-kit push --force` not dropping columns — the same caution applies to it not reliably *adding* everything either).

**Routes must get a stable component:** `<ProtectedRoute path="/x" component={XPage} />`, never `component={() => <XPage />}`. The inline arrow is a new component type on every App render, so React remounted the whole page and wiped its state (open chat, typed forms) e.g. whenever a toast appeared - that was the real cause behind the SmartLinksTab "remount on toast" workaround below. Fixed for all routes 2026-11-26.

**Chunk loading / error boundary:**
- `ChunkErrorBoundary` in `App.tsx` wraps all lazy-loaded routes. On a chunk load error it auto-reloads once per pathname using a `sessionStorage` key `chunk-reload-${pathname}` — each route gets its own reload attempt so navigating between pages after a deploy doesn't get stuck showing the error UI.

**Security notes:**
- Admin 2FA: one-time token emailed on admin login (`adminLoginToken` / `adminLoginExpiry` fields on user).
- Rate limiters on login (5/15 min), registration (3/hr), uploads (30/hr), contact (10/hr). All upload routes have `uploadRateLimiter` applied.
- `GET /api/admin/users` strips `passwordHash`, `adminLoginToken`, `adminLoginExpiry` before sending the response.
- Logout calls `queryClient.clear()` to wipe all cached private data, not just the user query.
- Production build disables React DevTools and blocks F12/DevTools keyboard shortcuts via `client/src/main.tsx`.
- JWT expiry: 7 days. Secret: `SESSION_SECRET` env var.

**UI/Design rules — forbidden patterns ("AI slop"):**
The owner explicitly dislikes these patterns. Never introduce them:
- **Badge/pill above H1** — `rounded-full` tag with icon pinned above a page heading
- **Full `bg-primary` CTA sections** — entire `<section className="bg-primary text-primary-foreground">` at page bottom
- **Gradient hero backgrounds** — `bg-gradient-to-b from-primary/10 to-background` on page heroes
- **Icon-topped card grids** — 3 identical cards each starting with an icon in `w-10 h-10 rounded-lg bg-primary/10`
- **CheckCircle2 "why us" lists** — bullet lists where every item has a checkmark icon
- **Fake testimonials** — hardcoded quotes with names like "Marko M." or "Ana S." with no photos or links. Use a real Google Reviews CTA instead
- **Generic filler phrases** — "od ideje do finalnog", "razgovarajmo o vašoj viziji", "sve na jednom mestu", "Vaša satisfakcija je naš prioritet", "profesionalan pristup"
- **Per-element FadeInWhenVisible** — wrapping every individual `<li>` or small element in its own animation. Animate sections, not atoms
- **Stat banner rows** — horizontal row of abstract numbers/metrics that don't mean anything concrete
- **Emoji as icons** — use Lucide icon components, never emoji characters as UI icons
- **Title Case in headings/buttons/labels** ("Zakažite Termin", "Naše Usluge", "Kontakt Informacije") - an English-language habit Serbian orthography doesn't use, and a top "AI template" tell. Use sentence case: "Zakažite termin", "Usluge". Proper nouns and product names (Apollo Twin X, Pogodi Pesmu) keep their capitals. SEO `<title>` strings were left as-is (they must stay in sync with `server/seo-meta.ts`).
- **Fake "live" status** - e.g. a pulsing green dot with "Dostupni smo odmah" shown 24/7. Don't claim availability the page can't know.
- **3D tilt / spring / hover-lift on content cards** (`Parallax3DCard`, `whileHover={{ y: -8, scale: 1.02 }}`, rotateX entrance springs) - removed from home/team; keep motion to one subtle `FadeInWhenVisible` per section (its defaults were cut to 12px / 0.4s for this reason).
- **Repeated CTAs** - one primary CTA per block. Service cards use a text link ("Pošaljite upit"), not three identical full-width buttons. The footer's top CTA strip is hidden on pages that already end with their own booking CTA (`PAGES_WITH_OWN_CTA` in `footer.tsx`: `/`, `/usluge`, `/kontakt`, `/tim`) - add a page there if you give it its own closing CTA.
- **Everything centered** - section headers on home/usluge/tim/pravila/projekti are left-aligned; `WaveDivider` takes `align="start"` for that. Keep centered layout for the hero and the single closing CTA only.
- **Em-dash (—) in user-facing copy** — the owner considers it an AI-slop marker. Use a plain hyphen "-" instead, everywhere: page copy, titles/meta, toasts, server error messages, email templates, PDFs. (A 2026-07 sweep replaced all 123 occurrences — don't reintroduce them.)

**Design system (2026-07 premium pass):**
- **Brand palette (2026-11): anthracite + natural oak.** Owner's studio colors. Dark theme: background `210 5% 9%` (anthracite, near-black), cards a step lighter, `--primary` = oak `32 42% 62%` (#c9a27a) with near-black text on it. Light theme uses a darker oak `30 38% 36%` so white button text keeps contrast. The old indigo (`241 90% 61%`, Tailwind's default-looking purple) is gone - don't reintroduce indigo/violet as a brand accent. Email templates (`server/email-templates.ts`) were recolored to match (oak `#c9a27a` buttons/links, `#1b1c1e` header). Homepage photos are lit with saturated blue LEDs, so they're rendered with `saturate-[0.25]` (hero in `ParallaxHero.tsx`, service/equipment images in `home.tsx`) to sit with the palette.
- **Icons and share image (2026-11-26):** favicon/app icons, `apple-touch-icon`, `maskable-*` (full-bleed, Android crops them) and `og-image.png` are anthracite with a white FJ and an oak accent - the old blue circle / navy preview are gone. They're referenced with `?v=2` (index.html, `SEO.tsx`, `seo-meta.ts`); bump it if you regenerate them, social apps cache hard. Social profile pictures in the same style are in `brand/`. `AvatarWithInitials` uses 8 muted studio tones, not bright blue/purple.
- **Dark theme is the default** (`theme-provider.tsx` `defaultTheme="dark"`); the user's manual toggle choice (localStorage `theme`) still wins. All pages must render correctly dark-first — never hardcode light-only colors (`bg-white`, `text-black`, light grays); use theme tokens.
- **Fonts (2026-11):** **Geist** for everything (headings + body) and **Geist Mono** (`font-mono`) for numbers, codes and timestamps - a free (OFL) stand-in for Cloudflare's actual pairing, STK Bureau Sans + Apercu Mono, which are commercial and not licensed here. Loaded via the Google Fonts `<link>` in `client/index.html`; set as Tailwind's `fontFamily.sans`/`mono` in `tailwind.config.ts` and in the `body`/`h1-h6` base rules in `index.css`. Headings use `letter-spacing: -0.025em` and **never go heavier than 600** - an unlayered rule at the end of `index.css` caps `h1-h3` with `font-bold/extrabold/black` at semibold, so old classes don't need touching. Figtree, Inter and Montserrat were removed - don't reintroduce them or `font-[Figtree]`. Canvas drawings (story cards) must `document.fonts.load(...)` the exact Geist face first, or the canvas silently falls back. Emails keep a system font stack on purpose (web fonts are unreliable in mail clients).
- **Buttons are pills** (`rounded-full` in `ui/button.tsx`, semibold, press-scale, primary shadow). Don't add `rounded-md/lg/xl` overrides to `<Button>` on public pages — the pill shape is the brand.
- **`WaveDivider`** (`client/src/components/WaveDivider.tsx`) — waveform-bar section divider, the audio brand motif. Used above homepage section headings; reuse it rather than inventing new dividers.
- **Shared dashboard/admin primitives** (`client/src/components/ui/stat-tile.tsx`, `panel-card.tsx`, `empty-state.tsx`) — `StatTile` (icon badge + big number + label), `PanelCard` (header strip + content), and `EmptyState` (icon + text + optional action). These replaced near-duplicate local components that used to be hand-rolled separately in `dashboard.tsx`, `settings.tsx`, and `admin.tsx`. Reuse these for any new stat grid or bordered content panel instead of re-inlining the `rounded-2xl border border-border/60 bg-card` pattern.
- **GuestBanner** (home.tsx) shows at most once per session (`sessionStorage guest_banner_shown`), only after 20s on page or 60% scroll depth. Keep overlays disciplined: nothing may cover a CTA.
- Hero copy is CMS-backed (`EditableText`) — changing code fallbacks does not change production text if a CMS value exists in `cms_content`; update via admin edit mode.
- **Inline-styled colors don't get dark-mode variants for free** — Tailwind's `dark:` prefix only works on className-based styles, not on inline `style={{ color: ... }}`. `AvatarWithInitials` (`client/src/components/ui/avatar-with-initials.tsx`) picks per-user colors and switches between light/dark HSL pairs by reading `resolvedTheme` from `next-themes`' `useTheme()` — follow this pattern for any other component that sets colors via inline style.
- **PWA safe-area (iOS notch/home indicator):** the site is installable as a standalone PWA (`display: standalone` + `viewport-fit=cover`), where content renders under the status bar and home indicator. Every `fixed` element touching a screen edge must respect `env(safe-area-inset-*)`: the header uses `pt-[env(safe-area-inset-top)]` (and `<main>` in `App.tsx` compensates with `pt-[calc(4rem+env(safe-area-inset-top))]`); bottom-fixed elements (`WhatsAppButton`, `CookieConsent`, `InstallPrompt`) add `safe-area-inset-bottom` to their bottom offset. Follow this for any new fixed/floating UI. Note: full-screen overlays that must beat the header need `z-[60]` — the header itself is `z-50` and wins DOM order against other `z-50` elements.

**Polish rules (2026-11-26 pass):**
- **Dates: always `srLatn` from `date-fns/locale`, never `sr`** - `sr` is Cyrillic and rendered "пре преко 1 годину" on profiles/feed/notifications. Same for `toLocaleString`: use `sr-Latn`. Month names in sentences take the genitive ("30. novembra"), weekdays "u nedelju" - see `NextGameBanner` in `home.tsx`.
- The route `ChunkErrorBoundary` shows the raw JS error only in dev (`import.meta.env.DEV`); visitors get a plain Serbian message.
- Decorative accents use theme tokens (`primary`, `muted-foreground`), not Tailwind blue/violet/emerald. Green/amber/red stay only where they carry meaning (verified, pending, error).
- UI text is sentence case. A one-off script lowercased ~125 Title Case JSX strings; keep new strings sentence case (proper nouns: Studio LeFlow, Pogodi Pesmu, Ploča dana, brand names).
- **Admin tabs use theme tokens too** (2026-11-26): no `zinc-*`, `text-white`, `bg-white/x`, `#6352ff`/indigo or inline `rgba(255,255,255,…)` styles - those broke the light theme. Every `Modal` from `AdminModal.tsx` is opened with `themed` (the unthemed dark panel is legacy; don't add new callers). Status colors (green approved / amber pending / red error) stay.
- forceMount'ed admin tabs (Prodavnica's `EconomyOverview`, `ShopCatalogue`, JobsBoard's `BottleneckPanel`) render even while another tab is open, so they must guard against a malformed response (`Array.isArray`, optional fields) - one bad payload otherwise takes the whole admin panel down through the error boundary.
- Founding year is **2020** (owner, 2026-11-26): hero "Od 2020.", footer, and `foundingDate` in the org JSON-LD in `client/index.html`; matches `/zastita-brenda`.

**Discretion rule (owner, 2026-11-26) - say WHAT, never HOW:**
- Public copy (pages, rules, toasts, server error messages, emails) states what the user gets and what is allowed. It never explains how the site works internally: no vendor names (Railway, Cloudinary, Resend, Google Analytics...), no anti-abuse mechanics (IP / "same network" / VPN detection, thresholds like account age or active days, how referrals are verified), no odds or algorithms. "Više naloga iste osobe se ne računa" - yes; "jedan po IP adresi" - no. A blocked user gets a neutral message ("Ploča je za danas već iskorišćena").
- Exceptions: game rules players need (1 second clip, number of listens), honest "the wheel's sectors don't show the odds" disclaimer, and the privacy section, which names data *categories* (not vendors). The internal mechanics stay documented only in CLAUDE.md / `docs/features/`.

**Copy rules (owner decisions — hard constraints):**
- **Never show prices anywhere.** Pricing questions are answered with "pošaljite upit — tačna ponuda u roku od 24h."
- **Revision policy is exactly 2 free revisions for every service** — home, usluge, team, FAQ, terms, and the FAQPage structured data in `SEO.tsx` must all agree. Never claim unlimited revisions.

**Auth middleware hierarchy:**
- `requireAdmin` — JWT valid + `role === "admin"` (Super Admin) exactly. Use this only for routes that must stay Super Admin-only (site settings/maintenance, CMS content, granting/revoking the `admin` role itself).
- `requireRole(...allowedRoles)` — JWT valid + (`role === "admin"` **or** `role` is in `allowedRoles`). This is the one to reach for on any admin-panel route scoped to a specific section (`requireRole("producer")`, `requireRole("editor", "marketing")`, etc.) — `admin` always passes every `requireRole(...)` call implicitly, so Super Admin never needs to be listed explicitly.
- **4 admin-panel staff roles** live in the same `users.role` column as `"user"`/`"admin"`: `"admin"` (Super Admin, full access), `"producer"` (day-to-day client/production tabs), `"editor"` (Vesti only), `"marketing"` (Newsletter/Email/Smart Links/Vesti). See the `ADMIN_NAV` comment in `admin.tsx` for the exact tab↔role mapping — keep server `requireRole(...)` calls and client `roles` arrays in sync; the client filtering is only a UX convenience; the server is what actually enforces it.
- Granting/revoking these roles is itself Super Admin-only: `PATCH /api/admin/users/:id/staff-role` (`requireAdmin`) sets `producer`/`editor`/`marketing`/`user`; the pre-existing `POST /api/admin/users/:id/toggle-admin` (`requireAdmin`) is the separate, single path for granting/revoking `"admin"` itself. Never let a `requireRole(...)`-gated route assign roles — that would let a restricted role escalate itself or others.
- `requireVerifiedEmail` — JWT valid + `emailVerified === true`. Used for community/giveaway/song features.
- `requireNotBanned` — JWT valid + `banned !== true` (allows unverified accounts). Game routes no longer use it - they are `requireVerifiedEmail` since the 2026-11 anti-cheat pass. Note `requireVerifiedEmail` also rejects banned users.
- Routes that need no login but check auth optionally: pass `getQueryFn` on the client, which always sends JWT if present.

**MCP tools available:**
- **Playwright** — browser automation (navigate, screenshot, click, scroll). Use to visually verify UI changes before reporting done. Configured in local MCP settings (`~/.claude/settings.json`, command: `playwright-mcp`).
- **Production kills automated browsers:** `disable-devtool` in `main.tsx` (PROD only) false-positives on Playwright's console instrumentation and navigates the page to `about:blank` within ~1–2s. Workaround before any production navigation: `page.addInitScript(() => { ['log','table','clear','warn','info','debug','dir','dirxml'].forEach(k => { console[k] = () => {}; }); })`. Add `localStorage.setItem('maintenance_bypass','1')` in the same init script if maintenance mode is on.
- **Programmatic `window.scrollTo` breaks the parallax homepage** — sections render blank/displaced. Scroll with `page.mouse.wheel(0, 140)` in small increments and wait ~1s before screenshots so `whileInView` animations fire.
- Local visual checks without the DB: `npx vite --port 5199 --strictPort` serves the SPA alone (API calls fail gracefully to fallbacks; `import.meta.env.PROD` is false so devtools protection is off).

## Feature reference (read before changing a feature)

Detailed per-feature notes live in `docs/features/`. They are not loaded automatically - **read the matching file before touching that area**:

| File | Covers |
|---|---|
| `docs/features/game-spin-coins.md` | Pogodi Pesmu (clip slicing, server-side listens, anti-cheat, archive), Ploča dana, Studio Coins ledger, shop `/prodavnica`, vouchers, referrals, coin payouts, admin Zaštita igara / Prodavnica |
| `docs/features/engagement.md` | Web Push + categories, background jobs, earned rank, game streak, artist pages, monthly challenge, "Za tebe danas", dashboard layout, Prvi koraci, notification preferences, weekly smart link report |
| `docs/features/smart-links.md` | Smart Links, `music.studioleflow.com` hostname branching, owner assignment, click stats, story generator |
| `docs/features/studio-workflow.md` | Korisnici tab, Radna tabla (jobs, briefs, bottlenecks, testimonials), licence PDFs, client portal, Zaštita prava, DebugConsole, desktop admin app |
| `docs/features/community-messaging.md` | Real-time messaging (WS), community feed, notification bell, wavesurfer, image crop |
| `docs/features/content-seo.md` | Homepage sections, CMS, SEO (static + server meta), navbar, /pravila, video spots, newsletter, giveaway, Moje pesme, announcement, maintenance mode, verify license, /zastita-brenda |
| `docs/features/news.md` | Vesti (/news portal) |
| `docs/features/platform.md` | File uploads (every endpoint + Cloudinary limits), email (Resend, templates, Railway SMTP block), Google OAuth |

When you add or change a feature, update its doc file (or add one and list it here); keep this file for rules that apply everywhere.

**Gotchas that bite across features (details in the docs above):**
- Railway blocks outbound SMTP - email only through the Resend SDK (`sendEmail()` takes camelCase options).
- Cloudinary account has a hard ~10MB per-file limit. `POST /api/upload/avatar` is for avatars only (fixed public_id) - every other upload has its own endpoint.
- `checkMaintenanceMode` has a hand-maintained allowlist - a new public endpoint that must work during maintenance has to be added there.
- Any IP-based limit uses `getTrustedClientIp()` (`server/client-ip.ts`), and `req.ip` is overridden with it in `index.ts`, so express-rate-limit uses it too. **Railway's edge rewrites X-Forwarded-For to `<who connected>, <Railway edge>`** (verified in prod 2026-11-26): the visitor is the hop *left of the last*, never the rightmost (that's Railway's edge - the old rule lumped everyone together). Behind Cloudflare (domain proxied since 2026-11-26) the connecting hop is a Cloudflare edge and the visitor comes from `CF-Connecting-IP`, trusted only when the connecting hop is in Cloudflare's ranges. A whole-API ceiling (300 req/min per visitor) sits in front of all `/api` routes in `registerRoutes()`.
- Every Studio Coins payout needs a stable `refId` (unique `(reason, ref_id)`), and every push needs a `category`.
- **Error log / admin "Greške"** (`server/error-log.ts`, `ErrorsTab.tsx`, Super Admin only): records every 5xx response (route pattern + status), every `console.error(...)` that includes an `Error` object (with stack), uncaught errors, and browser errors (`lib/error-reporting.ts` → public, rate-limited `POST /api/client-errors`; max 5 per page load; route error boundary reports too). Grouped by fingerprint into `error_logs`, buffered and flushed every 10s; a resolved error that recurs re-opens itself; old rows purged daily. When you catch an error in a route, `console.error("[Area] ...", err)` with the Error object - that is what gives the admin a stack trace. The final Express error handler returns Serbian `{ error }` messages, never `err.message`.
- **Performance** (measured 2026-11-26, mobile 4x CPU: home LCP 2.7s, CLS 0): `<main>` in `App.tsx` stays `min-h-screen` (shorter let the footer flash up and jump - CLS 0.24 sitewide); `GoogleOAuthProvider` wraps only the auth pages (it injects a ~105KB script); the `<link rel="preload">` in `client/index.html` applies to **every** page, so only preload tiny assets there (it points at the 18/32KB hero WebPs). New large images go in as WebP with a `srcset`, not as multi-hundred-KB JPGs.
- **Privacy** (`/pravila#privatnost`, 2026-11-26): the privacy section describes what the code actually stores - update it when you start storing a new kind of personal data. Anti-abuse IPs (spins, game answers, resolved referrals, registration attempts) are purged after 90 days by the `purgeOldIps` job in `engagement-jobs.ts`. Google Analytics loads **only after "Prihvatam"** in `CookieConsent` (`hasAnalyticsConsent()` in `lib/analytics.ts`); declining or closing = no GA. Never re-introduce "continuing to browse means consent" copy.
