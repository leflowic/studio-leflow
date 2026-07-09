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

There are no automated tests in this project.

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
- The `music.studioleflow.com` subdomain (Smart Links), legacy `/l/:slug`, and `/portal/:token` (Client Portal) skip the main header/footer entirely. They are matched before the main Router in `App.tsx` (hostname check first, then path prefixes) and rendered in their own `<Suspense>` wrappers.
- `WhatsAppButton` and similar global UI components must check `useLocation()` and return `null` on these routes.

**Admin panel tabs:**
- Each tab is its own component, either defined inline in `client/src/pages/admin.tsx` or as a separate file in `client/src/components/admin/`.
- Separate-file tabs: `ContractsTab`, `CalendarTab`, `KatastarTab`, `GameTab`, `SmartLinksTab`, `EmailTab`, `PortalTab`, `JobsBoard`, `NewsTab`, `RightsProtectionTab`, `TestimonialsTab`.
- **The tab menu is NOT a Radix `TabsList`** — it's a grouped sidebar driven by the `ADMIN_NAV` config array in `admin.tsx` (groups: Pregled / Klijenti / Sadržaj / Posao / Marketing / Sistem). Plain `<button>`s call `setActiveTab(value)`; the Radix `<Tabs value>` + `<TabsContent>` state machine is unchanged. To add a tab: add an entry (value, label, Lucide icon, optional `roles`) to `ADMIN_NAV` and a `<TabsContent>` pair. Desktop: sticky vertical sidebar; mobile: horizontally scrollable icon bar (same markup, flex direction switch at `lg`).
- **`ADMIN_NAV` items filter by role** via `getVisibleAdminNav(role)` — a "Super Admin" (`role === "admin"`) sees every item; restricted roles (`producer`/`editor`/`marketing`) only see items whose `roles` array includes their role. Keep each item's `roles` in sync with whatever `requireRole(...)` guards the matching API route(s) — see "Auth middleware hierarchy" below. Items with no `roles` (Dashboard, Podešavanja) are Super Admin-only.
- Restricted roles land on the first tab their role can see (not "dashboard") via an effect that corrects `activeTab` if the session-stored value isn't in their visible set.
- `GET /api/admin/katastar/:userId` returns `{ user, projects, contracts, invoices }` for the Katastar (client registry) tab.
- Table search (e.g. `UsersTab`'s username/email filter) is plain client-side `Array.filter` on the already-fetched query data — no server-side search/pagination exists yet for any admin table. Fine at current scale; revisit if a table's dataset grows into the thousands.
- **Tabs with forms must use `forceMount`** on their `<TabsContent>` to prevent React state loss on tab switch. Radix UI unmounts `TabsContent` by default — any local form state (dates, inputs, uploads) is wiped when the user navigates to another tab and back. `tabs.tsx` has `data-[state=inactive]:hidden` so forceMount content is still visually hidden when inactive. `GameTab`, `SmartLinksTab`, and `NewsTab` all use this.
- **Rule for new tabs:** add `forceMount` only if the tab holds local component state that would be lost on unmount and is annoying to lose — an open modal/form with typed input, a multi-step upload, a date picker mid-edit. A tab that's purely a read-only list/table driven by a query (no local draft state) does not need it — React Query's cache means remounting just re-renders the same data instantly.

**Korisnici (Users) tab:**
- `UsersTab` in `admin.tsx` is a two-level view: a searchable/filterable card grid, and (on clicking a card) `UserDetailPanel` — a profile header plus three Radix tabs: **Pregled** (read-only info), **Dozvole** (rank select, staff-role select, admin toggle, verified-artist toggle), **Bezbednost** (ban/unban, delete account).
- The staff-role `<Select>` in Dozvole (Korisnik/Producent/Urednik/Marketing) and the "Administratorske privilegije" (admin) toggle are both gated to render only when the viewing user (`useAuth()`) is `role === "admin"` — a Producent can see and act on the rest of the Korisnici tab but can't grant panel access or promote anyone.
- `RankBadge`/`rankMeta` (site rank: user/vip/legend/admin) is a separate concept from the admin staff role — don't conflate the `rank` column with `role`.

**Radna tabla (Studio Jobs — producer pipeline board):**
- Table `studio_jobs`: `title`, `userId` (client), `stage` (plain `text`, not a pg enum — see `JOB_STAGES` in `shared/schema.ts`: `novi_upit → snimanje → mix → mastering → revizija → isporuceno`), optional `contractId`/`invoiceId`/`portalId` links, `notes`, `deliveryDate`, `reviewRequestedAt` (nullable — see "Auto review-request" below).
- `JobsBoard.tsx` renders one horizontally-scrolling column per stage (`flex gap-4 overflow-x-auto`, not a wrapping grid — a kanban board's columns must stay in a single row). Each card supports native HTML5 drag-and-drop between columns *and* a `<Select>` dropdown (the reliable/mobile-safe path) to change stage.
- Routes under `/api/admin/jobs*`, gated `requireRole("producer")`.
- Stage labels shared between `JobsBoard.tsx` and the client-facing panel below live in `client/src/lib/job-stages.ts` (`JOB_STAGES` export, `{value, label}[]`) — don't hand-roll the label list a second time, import from there.
- **Client-facing status ("gde mi je pesma")**: `GET /api/user/jobs` (`requireVerifiedEmail`) returns the caller's own jobs via `storage.getUserJobs()` — a narrower shape than the admin `getAllJobs()` (no `notes`, no `createdBy`/`username`/`avatarUrl`). Rendered as a stepper in `client/src/components/dashboard/MyJobsPanel.tsx` on the Dashboard, hidden entirely if the user has no jobs (same "hide, don't show empty state" pattern as `MySmartLinkPanel`).
- **Auto review-request**: the first time `PATCH /api/admin/jobs/:id/stage` moves a job to `isporuceno`, the client automatically gets an email (`reviewRequestEmail()` in `server/email-templates.ts`, Google review CTA — currently the same generic `google.com/search?q=Studio+LeFlow+Beograd` link used on `home.tsx`'s Recenzije section, not a real Place-ID "write a review" deep link) plus an in-app `notifyUser()` toast. Guarded by `reviewRequestedAt` so moving a job back out of `isporuceno` and delivering it again doesn't re-send. The route fetches the job via `storage.getJob(id)` *before* calling `updateJobStage` specifically to read the old stage for this comparison.
- **Testimonials**: table `testimonials` (`userId`, `jobId`, `text`, `status`: `pending`|`approved`|`rejected`, `createdAt`) — clients can submit one short testimonial per delivered job directly from `MyJobsPanel` (`POST /api/user/testimonials`, ownership-checked against the job, 409 if one already exists for that job). This is the real, sourced replacement for the fake hardcoded testimonials the "AI slop" rules forbid. Admin moderation in `TestimonialsTab.tsx` (`GET`/`PATCH /api/admin/testimonials*`, `requireRole("producer", "marketing")`) — approve/reject, no public display wired up yet (approved testimonials aren't surfaced anywhere on the public site yet; that's the natural next step once there are some).
- **Bottleneck analytics**: table `job_stage_history` (`jobId`, `stage`, `enteredAt`) — one row per stage a job has ever entered, written by both `storage.createJob()` (initial stage) and `storage.updateJobStage()` (every transition); a single `stage` column can't answer "how long do jobs sit in Mix" since it's overwritten each move. `storage.getJobStageAnalytics()` (`GET /api/admin/jobs/analytics`, `requireRole("producer")`) computes, in JS after fetching all history rows (fine at this scale, no window-function SQL): average days per stage from *completed* transitions only, plus a "stuck jobs" list - jobs whose current stage has already run longer than that stage's average (excludes `isporuceno`, a terminal stage with nothing to measure against). Rendered as a horizontal bar list + amber warning list (`BottleneckPanel` in `JobsBoard.tsx`), hidden entirely if there's no data yet. A one-time backfill in `runMigrations()` synthesizes a history row from `createdAt`/`stage` for any pre-existing job that has none, so analytics isn't empty right after this feature's deploy.
- **Pre-session brief**: table `job_briefs` (`jobId` unique FK, `userId`, `description`, `referenceLinks` — JSON `string[]`, free-form URLs). One per job, upserted via `storage.upsertJobBrief()` (`POST /api/user/jobs/:id/brief`, ownership-checked, `requireVerifiedEmail`) — the client describes the sound/vibe they want and pastes reference tracks *before* the session, so the producer isn't spending studio time on "what are you going for". Editable by the client any time before `isporuceno` (`BriefPrompt` in `MyJobsPanel.tsx`). Both `getAllJobs()` and `getUserJobs()` left-join `job_briefs` and return `brief: {description, referenceLinks} | null` inline (no separate fetch needed) — producer sees it as a collapsible "Klijent je poslao brief" section per card in `JobsBoard.tsx` (`JobBriefSection`).

**Vesti (/news portal):**
- Table `news_articles`: `title`, `slug` (unique, `[a-z0-9-]+`), `excerpt`, `content` (rich HTML from `RichTextEditor`/TipTap), `coverImage`, `tags`, `seoTitle`/`seoDescription`/`seoKeywords` (all optional — public page and server SEO meta fall back to title/excerpt/tags when empty), `status` (`"draft"` | `"published"`), `publishedAt`.
- `NewsTab.tsx` (admin, `editor`/`marketing`/admin only) is a list ↔ form view, not inline-expanding — the form has a rich text editor plus an SEO sub-card, too tall for an inline card. Slug auto-derives from the title via `slugify()` (transliterates Serbian Latin diacritics) until the user manually edits the slug field.
- Public pages `client/src/pages/news.tsx` (list, featured-lead + grid) and `news-article.tsx` (detail, renders `content` via `dangerouslySetInnerHTML` — safe here because only trusted staff roles author it, same trust model as the newsletter HTML template).
- **Server-side SEO for `/news/:slug`** is registered in `server/seo-meta.ts` alongside `/l/:slug` — injects title/description/keywords meta *and* a `NewsArticle` JSON-LD block (`headline`, `image`, `datePublished`, `keywords`, etc.) so an article about a specific artist can rank for that artist's name. `/news` (the list page) has a static entry in `STATIC_PAGE_META`.
- Routes under `/api/news` (public, published-only) and `/api/admin/news*` (`editor`/`marketing`), plus `POST /api/upload/news-cover` for the cover image.

**`/zastita-brenda` (public brand protection notice):**
- Static public page (`client/src/pages/zastita-brenda.tsx`, no DB-backed content) — a public, dated notice claiming first use of the "Studio LeFlow"/"LeFlow" name and logo since 2020, distinct from the internal `rights_protections` admin tool above. Explicitly **not** a substitute for formal trademark (žig) registration with Zavod za intelektualnu svojinu — the copy says so directly, don't soften that into implying legal certainty it doesn't have.
- Linked from the footer bottom bar (`footer.tsx`, next to "Proveri Licencu"), registered in `BREADCRUMB_NAMES` (`SEO.tsx`), `STATIC_PAGE_META` (`server/seo-meta.ts`), and `sitemap.xml` — same 4-place wiring required for any new public page (see the SEO section below).

**Zaštita prava (Rights Protection — internal evidence tool):**
- Table `rights_protections`: `assetType` (`"audio"` | `"image"`), `title`, `creatorName`, optional `clientName`/`notes`/`claimedCreationDate`, `fileUrl` (Cloudinary), `originalFilename`, `fileSizeBytes`, `mimeType`, `fileHash` (SHA-256 hex of the exact bytes received, computed **before** the Cloudinary upload), `fingerprint` (nullable JSON `number[]`, audio only), `certificateNumber` (`ZP-<year>-00000001`, via `storage.getNextRightsProtectionNumber()`), `verificationHash` (HMAC, same pattern as license `verificationHash`).
- **This is NOT an official copyright registration (SOKOJ)** — it's an internal, timestamped proof-of-existence tool for producer/admin use when a client doesn't pay and releases a song anyway, or to evidence brand assets (e.g. the logo). `claimedCreationDate` is the uploader's own assertion (e.g. "logo posted to Facebook in 2020") — it is NOT proven by the hash, which only proves the file existed at upload time. This disclaimer must stay on the generated certificate and in the admin UI — never let this feature's copy imply legal certainty it doesn't have.
- `server/audio-fingerprint.ts` — `computeFingerprint()` decodes MP3 to mono PCM via `ffmpeg-static` + `fluent-ffmpeg` (in-memory stream, no disk writes) and computes a coarse per-frame dominant-frequency-band sequence using `fft.js`. This is a heuristic similarity tool for manual review (handles re-encoded/trimmed clips via `compareFingerprint()`'s sliding offset alignment), **not** chromaprint/AcoustID-grade forensic fingerprinting. Only computed for `assetType: "audio"`; failures return `null` and don't fail the upload (the SHA-256 hash still stands on its own).
- `POST /api/upload/rights-protection-file` does hashing + Cloudinary upload + fingerprinting synchronously in one request (no background job/polling) — decoding a short MP3 is fast enough to stay within a normal request. `POST /api/admin/rights-protection/compare` accepts an ad-hoc "suspect" MP3 (not persisted), checks exact `fileHash` match first, then `compareFingerprint()` against every stored audio entry.
- `generateRightsProtectionCertificatePDF()` in `server/pdf-generators.ts` follows the same pdfkit/logo/`DejaVuSans` pattern as the license generators, regenerated on-the-fly per download (never read from disk) — see `GET /api/admin/rights-protection/:id/certificate`.
- `RightsProtectionTab.tsx` follows the `SmartLinksTab.tsx` pattern (portal-based `Modal`, `sessionStorage`-persisted form state, `forceMount` on its `TabsContent`). Routes gated `requireRole("producer")`.

**Avoiding Radix Dialog FocusTrap bugs:**
- Radix `<Dialog>` closes itself when the focused element becomes `disabled` mid-operation (e.g. a "Search" button that becomes disabled during an async fetch). This is caused by the FocusTrap moving focus to `document.body`, firing `onFocusOutside`.
- The fix: use `createPortal` from `react-dom` directly instead of Radix Dialog. **`Modal` in `client/src/components/admin/AdminModal.tsx`** is the shared, canonical implementation — it's a pure React portal with no FocusTrap, so it only closes when you explicitly call `onClose`. `SmartLinksTab`, `RightsProtectionTab`, and `ContractsTab`'s `AssignUserDialog`/`SendEmailDialog` all import it from there — don't re-declare a local copy, and don't reach for Radix `<Dialog>` in any new admin modal.
- Additionally, persist any form state that must survive a component remount to `sessionStorage`. `SmartLinksTab` does this for `showForm`, `form`, and `editingId` so that even if a toast dispatch causes `AdminPage` to remount the tab, the form state is restored. Key pattern: `useState(() => ssGet("sl_form", emptyForm))` with a setter that writes to `sessionStorage` before calling the React setter.
- `PortalTab`'s one remaining Radix `<Dialog>` (create-portal form) is not a FocusTrap risk today because its submit button's `disabled` only depends on form-field validity, never on `mutation.isPending` (it uses `aria-busy` + opacity instead) — if you ever add a `disabled={mutation.isPending}` there, migrate it to `AdminModal`'s `Modal` at the same time.
- **`Select`/`DropdownMenu`/`Popover` (`client/src/components/ui/*.tsx`) portal their content at `z-[300]`, not the shadcn default `z-50`** — bumped because `AdminModal`'s backdrop sits at `z-[200]`; at `z-50` a `<Select>` opened inside a Modal (e.g. the "Dodeli vlasnika"/"Dodeli korisniku" user pickers) rendered behind the blurred backdrop and looked washed out. Keep new popover-style components at `z-[300]` or higher if they might ever open inside a Modal.

**Real-time messaging:**
- `WebSocketContext` is the single shared WS connection (app-level). `ChatInterface` and `ConversationList` subscribe to it via `useWebSocketContext()`. Reconnect uses exponential backoff: 3s → 6s → 12s → 30s max, reset on successful open.
- When a `new_message` WS event arrives, `ChatInterface` calls `queryClient.setQueryData` to inject the message directly into the cache — no network round-trip. `invalidateQueries` is also called afterward to sync server state (read receipts etc). This is the correct pattern for instant real-time UI updates; do **not** rely on `invalidateQueries` alone for real-time features since `staleTime: Infinity` means it triggers a fetch, not an instant update.
- `GET /api/messages/conversation/:userId` auto-marks messages as read and broadcasts `message_read` to **both** parties (sender and reader). The header invalidates `/api/messages/unread-count` on `message_read`. `ChatInterface` also invalidates it on messages load.
- Notification sound: `attached_assets/universfield-new-notification-035-485894.mp3`, imported via `@assets` alias in `WebSocketContext.tsx`.
- When adding new badge-like counters, follow this pattern: server broadcasts to both parties, client uses `setQueryData` for instant update + `invalidateQueries` for sync.
- **The raw WS message handler (`server/index.ts`) must never accept a message type from the client that causes a `broadcastToUser`/`notifyUser` call using client-supplied sender identity or payload content.** `new_message` and `message_read` used to be accepted as inbound WS frame types and blindly rebroadcast their `messageData`/`senderId` to whoever the client claimed as the target — any authenticated WS connection could spoof a fake message appearing to come from another user (including staff) without ever persisting a real DB row. Both were removed; the legitimate flows (`POST /api/messages/send`, `GET /api/messages/conversation/:userId`) already derive sender/receiver from the authenticated session server-side before broadcasting. `typing_start`/`typing_stop` remain accepted from the client because the server derives `userId` from the WS auth session, not from the message body.
- Messages support: reply-to (`replyToId` FK → `messages.id`), image attachments (`imageUrl`), emoji picker, reactions, editing. `DELETE /api/messages/conversation/:userId` soft-deletes the caller's side.
- Chat image uploads go to `POST /api/upload/message-image` (NOT `/api/upload/avatar`). Avatar uses a fixed `user_${id}` public_id with overwrite — sending chat images there would wipe the user's profile picture.
- `GET /api/users/:id` returns only public fields — **no email**. Never expose email through user-lookup endpoints.
- **Message reactions:** `message_reactions` table (`id, messageId, userId, emoji, createdAt`, UNIQUE on `(messageId, userId, emoji)`). `storage.toggleReaction()` inserts or deletes. `POST /api/messages/:id/react` validates emoji against allowlist `["❤️","👍","😂","😮","😢","🔥","👎","🎉"]` and broadcasts `message_reaction` WS event to both parties.
- **Message editing:** `editedAt` column on `messages` table. `storage.editMessage()` checks ownership. `PATCH /api/messages/:id` broadcasts `message_edited` WS event to both parties.
- **Link preview:** `GET /api/link-preview?url=...` fetches OG meta server-side with a 4s `AbortController` timeout, returns `{ title, description, image, siteName, url }`. Used in `ChatInterface` to render preview cards for URLs in message content.
- **EnrichedMessage type** (exported from `server/storage.ts`): the return type of `getConversationMessages` — includes `isRead`, `reactions: ReactionGroup[]`, and `editedAt`. `ReactionGroup` is `{ emoji, count, userReacted }`.
- WS message union in `WebSocketContext.tsx` includes `message_edited: { message: any }` and `message_reaction: { messageId, userId, emoji, added: boolean }` in addition to the base types.

**Authenticated requests:**
- Always use `apiRequest()` from `client/src/lib/queryClient.ts` for mutating routes that need auth. Raw `fetch()` with `credentials: "include"` does **not** send the JWT — it only sends cookies, which are not used for auth in this project. This is the most common source of 401 bugs on the frontend.
- For React Query `useQuery`, the default `queryFn` (via `getQueryFn`) already adds the JWT header — no extra work needed for GET requests.

**Authenticated file downloads (admin or user-facing):**
- Never use `window.open(url)` or a plain `<a href>` for any endpoint that requires a JWT — neither sends the `Authorization` header. Use `fetch()` with `Authorization: Bearer <token>` header, then create a blob URL and trigger download via a temporary `<a>` element. See `ContractsTab.tsx`'s `handleDownload` and `dashboard.tsx`'s `handleDownloadContract` for the reference pattern (both hit a PDF-regenerating endpoint, see "Contract PDFs" above).

**Error messages:**
- All user-facing error messages must be in Serbian and friendly — never expose raw JS errors, stack traces, or English strings like "Unauthorized" / "Forbidden".
- Server: return `res.status(N).json({ error: "Serbian message" })`. Middleware in `server/jwt-auth.ts` already does this for auth errors.
- Client: `throwIfResNotOk` in `queryClient.ts` has a `STATUS_MESSAGES` fallback map for common HTTP codes. When the server sends `{ error: "..." }`, that message is used directly.

**Contract PDFs ("Licence"):**
- Internally called "contracts" (`contracts` table, `contractType`, `/api/admin/contracts/*` routes, `pdf-generators.ts`) but **every user-facing string must say "Licenca"/"Licence", never "Ugovor"** — this includes toasts, admin labels, server error messages, and the PDF body text itself (`Član 1. Predmet licence`, not `Predmet ugovora`).
- **Generated license PDFs must never include pricing or payment info** (total amount, advance/remaining payment, payment method, installment schedules) — same "no prices anywhere" rule as the public site, enforced inside the documents themselves. The corresponding fields (`totalAmount`, `advancePayment`, `remainingPayment`, `paymentMethod`, `firstPayment`/`secondPayment`) were removed entirely from the Zod schemas in `shared/schema.ts` and the admin creation forms in `ContractsTab.tsx` — don't re-add them. Revenue-split percentages (`authorPercentage`/`buyerPercentage` on Copyright Transfer / Instrumental Sale) are fine to keep — that's a rights/royalty division, not a price.
- PDFs are **never** read from the local filesystem — Railway's filesystem is ephemeral and files are lost on redeploy, so `contract.pdfPath` is not a reliable link even though the column exists.
- **Every** download/email endpoint (admin and user-facing) must regenerate the PDF on-the-fly from `contract.contractData` (JSON stored in PostgreSQL) using `generateMixMasterPDF`, `generateCopyrightTransferPDF`, or `generateInstrumentalSalePDF` from `server/pdf-generators.ts`, matched on `contract.contractType` — never link straight to `pdfPath`. Reference implementations: `GET /api/admin/contracts/:id/download` (requireAdmin) and `GET /api/user/contracts/:id/download` (requireVerifiedEmail, ownership-checked via `contract.userId === req.jwtUser.id`). Client side, both use `fetch()` with the `Authorization` header + blob download (see "Authenticated file downloads" above) — a plain `<a href={pdfPath} download>` will 404/blank-page once the original file is gone.

**CMS:**
- `EditableText` and `EditableImage` components let admins edit content in-place when edit mode is on.
- CMS values stored in `cms_content` table. Media stored in `cms_media` table.
- `EditableImage` uses a separate `fallbackSrc` prop for the local image to show when the stored CMS URL is broken.

**Daily game ("Pogodi Pesmu"):**
- Schema: `daily_challenges` table — `challengeDate` (unique), `clipUrl` (Cloudinary MP3), `correctAnswers` (comma-separated variants), `clipStartSeconds`, `openHour`, `openMinute` (Belgrade time, UTC+2).
- Audio playback uses the Web `AudioContext` API in `client/src/pages/igra.tsx` — fetch the Cloudinary MP3, decode via `ctx.decodeAudioData`, play a 2s slice with `source.start(0, clipStartSeconds, 2)`. No YouTube IFrame API. The `useEffect` that loads the clip uses a `cancelled` flag to discard stale async callbacks when `clipUrl` changes.
- Open-time check uses DST-safe Belgrade time — **never** hardcode `(utcHour + 2) % 24`. Use `new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))` for hour/minute, and `new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(new Date())` for date strings. `getTodayDateString()` in `storage.ts` uses this pattern.
- Parsing hour/minute: **never** use `Number(x) || fallback` when x can be 0 — use `x != null ? parseInt(String(x), 10) : fallback`. The admin form uses `<Input type="time">` which returns `"HH:MM"`.
- Game clip upload: `POST /api/upload/game-clip` (requireAdmin) → `server/cloudinary.ts` `uploadAudioToCloudinary()`. Each upload gets a unique public_id (`basename_timestamp`) to avoid Cloudinary duplicate-key errors.
- User-facing game routes use `requireNotBanned` (not `requireAuth`, which doesn't exist).
- `submitGuess()` returns `{ correct, points }` where points = correct ? 10 : 0. The correct answer is **not** exposed in the response.
- Anti-cheat: `GET /api/game/today` strips `clipUrl` from the response — only `hasClip: boolean` is sent to the client. The actual Cloudinary URL is only used server-side via the `/api/game/clip` proxy. `clipFetchCounts` (in-memory Map) limits each user to 6 clip fetches per day; returns 429 on exceeded. Client persists `playsLeft` in localStorage under key `igra_plays_${userId}_${challengeDate}`.
- `getWeekStart()` in both `routes.ts` and `storage.ts` must use Belgrade time (same as `getTodayDateString()`). Using UTC causes the wrong week bucket near Sunday/Monday midnight Belgrade time.
- **`GET /api/game/leaderboard` returns an object, not an array:** `{ weekStart: string, leaderboard: LeaderboardEntry[], prize: any }`. Always extract `data?.leaderboard ?? []` — calling `.slice()` or `.map()` directly on `data` throws `TypeError: e.slice is not a function`.

**Smart Links:**
- Canonical public URL is **`music.studioleflow.com/:slug`** (no `/l/` prefix) — a separate Railway custom domain pointed at the same service. The legacy `studioleflow.com/l/:slug` path now 301-redirects to it (`server/routes.ts`, gated `req.hostname !== "music.studioleflow.com"` to avoid a loop); update both places if the canonical domain ever changes again.
- `App.tsx`'s `Router()` checks `window.location.hostname === "music.studioleflow.com"` **first**, before any path-based branch — on that host, `/` renders `MusicHubPage` and `/:slug` renders `SmartLinkPage`, both standalone (no header/footer). The old `<Route path="/l/:slug">` branch is kept only as a client-side fallback in case a request ever reaches the SPA without hitting the server redirect.
- Tables: `smart_links` (slug, title, artist, coverUrl, 6 platform URLs, nullable `userId` — see "Owner assignment" below) and `smart_link_clicks` (smartLinkId, platform, nullable `ipAddress`, clickedAt — `ipAddress` was added later, so pre-existing rows are `null` and excluded from unique-click counts rather than miscounted as one).
- Public single-link page: `client/src/pages/l.tsx`. Fetches `/api/l/:slug`, tracks platform clicks via `POST /api/l/:slug/click` (records `getClientIp(req)` server-side), then opens the target URL.
- **Public hub page**: `client/src/pages/music-hub.tsx` renders at `music.studioleflow.com/` — a "tracklist" list (numbered by release order, ambient per-track ✕ hover-reactive waveform bars reusing `WaveDivider`'s visual language) fed by public `GET /api/smart-links` (title/artist/coverUrl only, no click stats — those stay admin/owner-only). Distinguish `isError` from a genuinely empty list in any new query here; don't let a fetch failure silently render as "no songs yet".
- **Instagram story generator** in `l.tsx`: `generateStoryBlob()` draws a 1080×1920 PNG on a `<canvas>` (blurred cover background, cover art, title, artist, QR code via `qrcode` npm package pointing at `music.studioleflow.com/:slug`). Then `shareToStory()` tries `navigator.share({ files: [file] })` (Web Share API — works on iOS Safari 15+ and Android Chrome, opens native share sheet). Falls back to direct PNG download on desktop. Button label adapts: `canNativeShare ? "Okači na Instagram story" : "Sačuvaj story sliku"`.
- When loading Cloudinary images onto canvas, append `?_dc=1` as a cache-buster and set `img.crossOrigin = "anonymous"` to avoid tainted-canvas CORS errors from cached non-CORS responses.
- Admin: `SmartLinksTab.tsx` — CRUD with the custom portal modal (see "Avoiding Radix Dialog FocusTrap bugs" above). `POST /api/admin/smart-links/fetch-meta` calls the Odesli API (`api.song.link/v1-alpha.1/links`) with an 8s timeout to auto-fill platform URLs from any music link. Shows both total clicks and unique (per-IP) clicks, per-link and aggregated.
- Cover image upload: `POST /api/upload/smart-link-cover` → Cloudinary `studioleflow/smart-links` folder. Gated `requireVerifiedEmail` (not staff-only) because an assigned owner can also upload their own cover — the actual DB write is ownership-checked separately, so the loose upload gate is safe.
- **Owner assignment ("Moj Smart Link")**: admin/producer/marketing can assign a smart link to a user via the generic `PATCH /api/admin/smart-links/:id` with `{ userId }` (dropdown fed by `GET /api/admin/smart-links/assignable-users` — a minimal `{id, username}` list, deliberately not the full `/api/admin/users`, which is producer-only and would 403 for marketing role). Assignment fires a `notifyUser()` WS toast to the new owner. The owner then sees a "Moj Smart Link" panel on their Dashboard (`client/src/components/dashboard/MySmartLinkPanel.tsx`, hidden entirely if they own nothing) where they can edit cover/title/artist/platform URLs via `PATCH /api/user/smart-links/:id` — ownership-checked (`link.userId === req.jwtUser.id`) and field-whitelisted server-side (slug and userId are never accepted from this route even if sent). The owner-facing `coverUrl` write additionally requires the value come from `res.cloudinary.com` (staff/admin keep the freedom to set any URL; a regular owner does not, since this feeds a public brand page). `smart_links.userId` uses `onDelete: "set null"` so deleting a user never blocks on a link they own.
- **Unique click tracking**: `storage.getAllSmartLinks()` / `getSmartLinksByUserId()` both return a `uniqueClicks` count (distinct non-null `ipAddress` per link) alongside the raw `totalClicks`. Admin sees both; the owner-facing dashboard panel intentionally shows only `uniqueClicks` (owner's explicit preference — a less gameable number than raw clicks).
- Maintenance mode allowlist in `server/routes.ts` includes `'/l/'` and `'/smart-links'` so both the legacy redirect and the public hub/list stay reachable during maintenance — add any new public smart-link-adjacent endpoint to that list too, it's easy to forget (this exact gap shipped once and broke the hub page silently).
- Social-share previews (title/artist/cover in og tags) are injected server-side in **two places** that must be kept in sync: the crawler-UA-gated HTML handler in `server/routes.ts` (`app.get("/:slug", ...)`, gated `req.hostname === "music.studioleflow.com"`) and the real-visitor meta-rewrite in `server/seo-meta.ts` (same hostname gate, production-only). If you add fields that should appear in link previews, update both, not just `l.tsx`.

**Client Portal:**
- Tables: `client_portals` (name, clientName, shareToken), `portal_versions` (portalId, versionName, audioUrl, approved), `portal_comments` (versionId, authorName, authorType, timestampSeconds, text, resolved).
- Access is token-based — no auth required. `GET /api/portal/:token` returns the portal with versions.
- **Any route taking both `:token` and a nested `:versionId`/`:commentId` must verify the nested resource actually belongs to the portal resolved from the token**, not just that the token itself is valid — version/comment IDs are sequential integers, so skipping this check lets one client's valid link enumerate and read/write another client's portal data. This was a real IDOR found in `/api/portal/:token/versions/:versionId/comments`; the fix pattern is `storage.getPortalVersions(portal.id)` then check `.some(v => v.id === versionId)` before proceeding.
- Clients can add timestamped comments and approve versions. Producers (admin) can add comments, upload versions, and mark comments resolved.
- Route `/portal/:token` uses a standalone layout (no header/footer), same as smart links.

**DebugConsole:**
- `client/src/components/admin/DebugConsole.tsx` — mounted globally in `App.tsx`, visible only to admin role.
- **Hidden by default.** Toggle via `window.dispatchEvent(new CustomEvent("toggle-debug-console"))`. The Terminal icon button in the navbar header (admin-only, desktop) dispatches this event.
- Console and fetch patching (`patchConsole()`, `patchFetch()`) run at module level immediately on mount regardless of visibility — so all logs/requests are captured even before opening the panel.
- Three tabs: Console (intercepts `console.log/warn/error/info` + uncaught errors/rejections), Network (intercepts all `fetch()` with method/URL/status/duration/body), Storage (localStorage + sessionStorage viewer/editor with delete support).

**File uploads:**
- Avatar/image uploads: `POST /api/upload/avatar` → Cloudinary (`server/cloudinary.ts`), fixed `user_${id}` public_id with face-crop transformation.
- Message images: `POST /api/upload/message-image` → Cloudinary `studioleflow/messages` folder, unique `msg_${userId}_${timestamp}` public_id (no overwrite, no crop).
- Audio uploads: `POST /api/upload/audio` → Cloudinary, with `fileTypeFromBuffer` magic-bytes validation.
- Game clip: `POST /api/upload/game-clip` (admin) → Cloudinary `studioleflow/game-clips` folder.
- Smart link cover: `POST /api/upload/smart-link-cover` (`requireVerifiedEmail` — staff or an assigned link owner, see "Smart Links") → Cloudinary `studioleflow/smart-links` folder.
- Post images: `POST /api/upload/post-image` → `uploadRawImageToCloudinary()` (no face-crop, no overwrite), `studioleflow/posts` folder. Use `uploadRawImageToCloudinary` not `uploadImageToCloudinary` — the latter applies face-crop and would corrupt post images.
- Post audio: `POST /api/upload/post-audio` → `uploadAudioToCloudinary()`, `studioleflow/posts` folder.
- CMS media: multer to `attached_assets/temp/`, then moved to `attached_assets/`. **Note:** this path is ephemeral on Railway — CMS media uploads are lost on redeploy. Only `attached_assets/` files bundled at build time persist (they're baked into `dist/public/`). If persistent CMS media is needed, route through Cloudinary instead.
- All upload routes have `uploadRateLimiter` applied (30/hr). Avatar and message-image routes also validate magic bytes via `fileTypeFromBuffer`.
- **Any `multer.diskStorage` config must generate its own filename server-side** (e.g. `` `${Date.now()}-${randomBytes(8).toString('hex')}${ext}` ``) — never build it from the client-supplied `file.originalname` directly, even with a timestamp prefix. The CMS upload config (`multerUpload` in `routes.ts`) used to do exactly that, which is a path-traversal write (a crafted `originalname` containing `../` escapes the destination directory). It's also worth re-verifying actual file bytes via `fileTypeFromBuffer` after the disk write, since `fileFilter` only sees the client-claimed MIME type.

**Email:**
- Transactional: Resend SDK (`server/resend-client.ts`), from `noreply@mail.studioleflow.com`.
- Templates in `server/email-templates.ts` — all use white logo at `${BASE_URL}/leflow-logo-white.png`.
- Business inbox: Zoho Mail at `podrska@studioleflow.com`.
- License auto-email: when admin assigns a user to a contract (`PATCH /api/admin/contracts/:id/assign-user`), the PDF is fetched and emailed automatically to the user's registered email. Email failure does not fail the request.
- **Railway blocks all outbound SMTP ports (25, 465, 587)** — Nodemailer/Zoho SMTP will always `ETIMEDOUT`. Never attempt direct SMTP from Railway; always use the Resend SDK. `server/zoho-client.ts` exists but is unused for this reason.
- Admin email composer: `POST /api/admin/send-email` (requireAdmin) uses `sendEmail()` from `resend-client.ts` with `replyTo: podrska@studioleflow.com`. Frontend: `client/src/components/admin/EmailTab.tsx`. The `customEmail()` template in `email-templates.ts` wraps plain text in the branded HTML layout.

**Deployment:**
- Railway auto-deploys from GitHub `main` branch.
- `railway.toml`: build = `npm run build`, deploy = `npx drizzle-kit push --force`, start = `npm run start`.
- `nixpacks.toml` must use `npm ci --include=dev` so devDependencies (esbuild, tsc, etc.) are available at build time.
- `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` env vars must be set in Railway. Optional: `VITE_GA_MEASUREMENT_ID` (GA4 — analytics silently disabled without it).
- **Two custom domains point at the same Railway service**: `studioleflow.com` (main site) and `music.studioleflow.com` (Smart Links, see that section) — both need a Custom Domain entry in Railway plus a matching DNS CNAME record. There is no separate deployment for the subdomain; hostname-based branching happens entirely in app code (`App.tsx`, `server/routes.ts`, `server/seo-meta.ts`).
- The `drizzle-kit push --force` deploy step can prompt interactively for destructive-looking changes (e.g. adding a new unique constraint to a table with existing rows) and has, at least once, appeared to stall/skip later schema changes in the same run — don't rely on it alone for a brand-new table or column that other code depends on existing; add a matching idempotent block to `runMigrations()` in `server/index.ts` as a safety net (see the "Database" note above on `drizzle-kit push --force` not dropping columns — the same caution applies to it not reliably *adding* everything either).

**SEO:**
- **The org schema (`MusicRecordingStudio` + `WebSite`, `@graph` format) is baked statically into `client/index.html`** so crawlers see it without executing JS — it is NOT injected by React. Keep business facts (phone, address, hours, services) in sync there.
- `client/src/components/SEO.tsx` — sets `<title>`, meta tags, og/twitter tags, canonical URL via `useEffect`. Add `<SEO>` to every public page. It manages page-specific JSON-LD only, in **id-scoped scripts** (`#seo-page-schema`, `#seo-breadcrumb`) — never query ld+json scripts by `type` alone, that would clobber the static org schema in `index.html`.
- BreadcrumbList schema is auto-generated for paths listed in `BREADCRUMB_NAMES` in `SEO.tsx` (`/usluge`, `/projekti`, `/faq`, `/kontakt`, `/tim`, `/pravila`, `/news`) — add new public pages to that map, no per-page code needed.
- Pre-built page schemas exported as `pageStructuredData`: `services`, `contact`, `portfolio`, `faq` (FAQPage schema — enables Google rich snippets). Pass via `structuredData={pageStructuredData.faq}` etc.
- **Server-side og/twitter meta (`server/seo-meta.ts`)** — social crawlers don't execute JS, so React-set meta is invisible to them. In production, `registerHtmlMetaRoutes` (called just before `serveStatic` in `server/index.ts`) rewrites title/description/og/twitter/canonical in the served `index.html` for the static public pages and for smart links (see "Smart Links" above for the `music.studioleflow.com` hostname-gated handling, split across this file and `server/routes.ts`). `STATIC_PAGE_META` in that file must stay in sync with each page's `<SEO>` props — update both when changing page titles/descriptions. Dev mode is untouched (crawlers only hit production).
- **Analytics (GA4):** `client/src/lib/analytics.ts` — loads gtag only when `import.meta.env.PROD && VITE_GA_MEASUREMENT_ID`. Auto page_view is disabled (`send_page_view: false`); the Router in `App.tsx` reports page views on every wouter location change instead (SPA navigation doesn't reload the page). CSP allowlists `www.googletagmanager.com` (script-src, connect-src) and `*.google-analytics.com` (connect-src).
- Business email in structured data is `podrska@studioleflow.com` — never `leflowbusiness@gmail.com`.
- `canonicalUrl` prop accepts relative paths (e.g. `"/faq"`) — the component converts to absolute automatically. Defaults to `window.location.href` (minus query/hash) if omitted.
- Pages that must use `<SEO noIndex={true}>`: `/uslovi-koriscenja`, `/prijava`, `/registracija`. Protected/private pages (`/admin`, `/settings`, `/dashboard`, `/inbox`, `/igra`, `/zajednica`, `/moje-pesme`) don't need `noIndex` — they are already Disallowed in `robots.txt` and behind auth.
- `client/public/sitemap.xml` — only public, indexable pages: `/`, `/usluge`, `/projekti`, `/faq`, `/kontakt`, `/tim`, `/pravila`, `/news`. Do not add noIndex pages, auth pages, or individual `/news/:slug` articles (dynamic, not worth hand-maintaining here).
- `client/public/robots.txt` — Disallow list includes: `/admin`, `/dashboard`, `/inbox`, `/moje-pesme`, `/igra`, `/zajednica`, `/giveaway`, `/settings`, `/u/`, `/api/`. Keep Allow list minimal (only `/` needed — everything not disallowed is allowed by default).

**Default avatar and favicons:**
- `AvatarFallback` in `client/src/components/ui/avatar.tsx` renders `avatar_200.png` (from `@assets`) as the default avatar image — global override, affects all `<AvatarFallback>` instances.
- Favicon source is also `avatar_200.png`. Sizes in `client/public/`: `favicon.ico` (16/32/48px embedded), `favicon-16x16.png`, `favicon-32x32.png`, `favicon.png` (48px), `apple-touch-icon.png` (180px), `favicon-192x192.png`, `favicon-512x512.png`.
- OG image: `client/public/og-image.png` — 1200×630px PNG. Referenced as `https://studioleflow.com/og-image.png` in `index.html` and `SEO.tsx`.

**Chunk loading / error boundary:**
- `ChunkErrorBoundary` in `App.tsx` wraps all lazy-loaded routes. On a chunk load error it auto-reloads once per pathname using a `sessionStorage` key `chunk-reload-${pathname}` — each route gets its own reload attempt so navigating between pages after a deploy doesn't get stuck showing the error UI.

**Pravila i Česta Pitanja (`/pravila`):**
- `client/src/pages/terms.tsx` is a single merged page: two `Accordion` groups, "Pravila i Uslovi Saradnje" (business policy — avans/cancellation/payment/copyright/licenses/revisions) followed by "Česta Pitanja" (former standalone FAQ). Both accordions share the clean bordered-item style (no `CheckCircle2` lists, no gradient cards, no per-item `FadeInWhenVisible` — see the AI-slop rules below); `FadeInWhenVisible` wraps each of the two accordion sections and the closing CTA as whole units.
- `/faq` no longer has its own page — it's a `<Redirect to="/pravila" />` in `App.tsx` for old links/bookmarks. `client/src/pages/faq.tsx` was deleted; don't recreate it. `structuredData={pageStructuredData.faq}` (the `FAQPage` JSON-LD block in `SEO.tsx`) is passed on `/pravila` since the FAQ content now lives there.
- Nav: header `moreNav` only ever linked "Pravila" → `/pravila` (FAQ was footer-only before the merge); footer's link list and bottom bar both say "Pravila i Česta Pitanja" now, one link instead of two.

**Video Spots:**
- Table: `video_spots` (title, description, youtubeUrl, createdAt). Route: `/video-spots` → `client/src/pages/video-spots.tsx`.
- Embeds YouTube videos via extracted video ID (`extractYouTubeVideoId()` handles `watch?v=`, `youtu.be/`, and `/embed/` URL forms).
- Admin CRUD via Radix `<Dialog>` (not portal-based — no async search buttons so FocusTrap is safe here).
- Uses `useEditMode()` to conditionally show add/edit/delete controls for admins.

**Parallax components:**
- `client/src/components/parallax/ParallaxHero.tsx` exports `ParallaxHero`, `ParallaxSection`, and `Parallax3DCard`.
- Used on the homepage (`home.tsx`) for the hero section and animated sections.
- Built with `framer-motion`. `ParallaxHero` uses `useScroll` + `useTransform` for scroll-driven parallax. `Parallax3DCard` uses mouse position for tilt effect.

**UI/UX Pro Max skill:**
- Installed at `.claude/skills/ui-ux-pro-max/`. Provides design system recommendations (67 styles, 96 palettes, 57 font pairings, shadcn/ui stack support).
- Usage: run the Python search engine before implementing UI: `python .claude/skills/ui-ux-pro-max/scripts/search.py "music studio dark" --design-system`
- Stack flag for this project: `--stack shadcn` (React + shadcn/ui + Tailwind).

**Navbar architecture (`client/src/components/layout/header.tsx`):**
- Three nav arrays: `desktopNav` (3 primary links shown inline), `moreNav` (secondary links in a "Još ▾" Radix dropdown), `mobileNav` = `[...desktopNav, ...moreNav]` (all links in the slide-out panel).
- Current composition (business-first, deliberate): `desktopNav` = Usluge (`/usluge`), Projekti, Zajednica; `moreNav` = Giveaway, Vesti, Tim, Pravila. Usluge is a real link to the `/usluge` page (the old `scrollToServices` homepage-scroll button was removed). Do not promote Zajednica/Giveaway/Vesti back to the front — acquisition pages come first.
- The "Još" dropdown uses `DropdownMenu` from Radix and highlights its trigger when any `moreNav` route is active: `moreNav.some(i => isActive(i.href))`.
- To add a new nav link: decide if it's primary (→ `desktopNav`) or secondary (→ `moreNav`). `mobileNav` is derived automatically.
- Logo text uses `hidden sm:inline` — visible from 640px up. Desktop nav shows at `lg` (1024px). Keep `desktopNav` to ≤4 items to prevent overflow at 1024px.
- `WhatsAppButton`: drag toward the top of the viewport → a full-width drop zone appears under the top edge ("Prevuci ovde da skloniš", turns red within the top 96px) → release hides the button. Hidden state is plain React state (`useState`, no storage) — it survives route changes because the component is mounted at App level, and resets on refresh. The drop-zone overlay is `z-[60]` so it renders above the `z-50` header.

**Community feed (/zajednica):**
- Tables: `posts` (userId, type, content, audioUrl, imageUrl, collabTag, createdAt), `post_likes` (postId, userId, UNIQUE), `post_comments` (postId, userId, content, createdAt), `notifications` (userId, fromUserId, type, postId, message, read, createdAt).
- User fields added for the feed: `isVerifiedArtist boolean DEFAULT false`, `availableForCollab boolean DEFAULT false`.
- Post types: `status`, `audio`, `image`, `collab`. Collab tags are artist-to-artist only (beatmakers, rappers, features) — never studio services.
- `GET /api/posts?limit=N&offset=N` — paginated feed (JWT optional, affects `hasLiked`). `GET /api/posts/user/:userId` — all posts by a user.
- Feed pagination uses **local state accumulation** (not React Query cache pagination). `CommunityFeed` keeps a `posts` state array and appends on infinite scroll. Do **not** use `useQuery` pagination for this — `staleTime: Infinity` means `invalidateQueries` triggers a fetch not an instant update, and offset-based RQ pagination has cache collision issues with prepended new posts.
- Infinite scroll: `IntersectionObserver` on a sentinel `<div>` at the bottom with `rootMargin: "200px"`. Sentinel effect depends on `[offset, hasMore, loadingMore]`.
- `renderTextWithMentions(text)` in `CommunityFeed.tsx` splits on `/@(\w+)/g` and renders `<Link href="/u/username">` for each mention.
- `GET /api/users/by-username/:username` — case-insensitive username lookup, returns public fields only (no email).
- User profile route: `/u/:username` → `client/src/pages/user-profile.tsx`. Protected route, uses `GET /api/users/by-username/:username` then `GET /api/posts/user/:userId`.
- When a post is liked, the server creates a notification AND calls `broadcastToUser(post.userId, { type: "feed_notification", notification: {...} })`. Same for comments and @mentions.
- `PATCH /api/admin/users/:id/verified` (requireAdmin) — sets `isVerifiedArtist`. `PATCH /api/me/collab` — sets `availableForCollab`. `GET /api/collab-users` — returns users with `availableForCollab: true`.

**WS broadcast vs. notification:**
- `notifyUser(userId, title, description?)` from `server/websocket-helpers.ts` — sends a toast string to the client. Used for simple alerts.
- `broadcastToUser(userId, message)` from `server/websocket-helpers.ts` — sends an arbitrary object. Used for structured events like `feed_notification` and `message_reaction`. Both are registered in `server/websocket.ts` via `setBroadcastFunction` / `setNotificationFunction`.
- When adding new WS event types, add them to the `WebSocketMessage` union in `client/src/contexts/WebSocketContext.tsx`.

**Notification bell:**
- `client/src/components/NotificationBell.tsx` — shows unread count badge, dropdown list on click.
- On open: calls `POST /api/notifications/mark-read` to clear badge.
- WS subscription: on `feed_notification` event, increments count +1 and invalidates `/api/notifications/unread-count`.
- Rendered in the header (`client/src/components/layout/header.tsx`) only for `emailVerified` users.

**Audio waveform (wavesurfer.js):**
- Use **dynamic import** to avoid SSR/bundle issues: `import("wavesurfer.js").then(({ default: WaveSurfer }) => { ... })`.
- Always use a `cancelled` flag in the `useEffect` to discard stale callbacks when `url` changes or the component unmounts.
- Cleanup: `wsRef.current?.destroy(); wsRef.current = null` in the effect return.
- The `AudioPlayer` component in `CommunityFeed.tsx` is the canonical implementation.

**Image crop modal:**
- `ImageCropModal` in `CommunityFeed.tsx` — portal-based (same pattern as SmartLinksTab modal, using `createPortal`).
- Drag to reposition (pointer events with `setPointerCapture`), zoom slider (min zoom fills the 300×300 container, max = 5×).
- Canvas output is always 800×800 JPEG at 0.92 quality, regardless of display size.
- Source rect math: `srcX = natural.w/2 - CROP/2/zoom - pos.x/zoom`, `srcSize = CROP/zoom`. This correctly handles pan+zoom combinations.
- After `onApply(blob)`, convert to `File` with `new File([blob], "slika.jpg", { type: "image/jpeg" })` before setting state.
- Reset `input.value = ""` after each file pick so the same file can be re-selected after cropping.

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
- **Em-dash (—) in user-facing copy** — the owner considers it an AI-slop marker. Use a plain hyphen "-" instead, everywhere: page copy, titles/meta, toasts, server error messages, email templates, PDFs. (A 2026-07 sweep replaced all 123 occurrences — don't reintroduce them.)

**Design system (2026-07 premium pass):**
- **Dark theme is the default** (`theme-provider.tsx` `defaultTheme="dark"`); the user's manual toggle choice (localStorage `theme`) still wins. All pages must render correctly dark-first — never hardcode light-only colors (`bg-white`, `text-black`, light grays); use theme tokens.
- **Fonts:** Figtree for all headings (base-layer rule on `h1–h6` in `index.css` + `font-[Figtree]` arbitrary classes), Inter for body (explicit `body` rule in `index.css` — Tailwind's default `font-sans` does NOT pick up the `--font-sans` var, so without this rule the site renders the OS system font). Both loaded via Google Fonts `<link>` in `client/index.html`. Montserrat was removed — don't reintroduce it.
- **Buttons are pills** (`rounded-full` in `ui/button.tsx`, semibold, press-scale, primary shadow). Don't add `rounded-md/lg/xl` overrides to `<Button>` on public pages — the pill shape is the brand.
- **`WaveDivider`** (`client/src/components/WaveDivider.tsx`) — waveform-bar section divider, the audio brand motif. Used above homepage section headings; reuse it rather than inventing new dividers.
- **Shared dashboard/admin primitives** (`client/src/components/ui/stat-tile.tsx`, `panel-card.tsx`, `empty-state.tsx`) — `StatTile` (icon badge + big number + label), `PanelCard` (header strip + content), and `EmptyState` (icon + text + optional action). These replaced near-duplicate local components that used to be hand-rolled separately in `dashboard.tsx`, `settings.tsx`, and `admin.tsx`. Reuse these for any new stat grid or bordered content panel instead of re-inlining the `rounded-2xl border border-border/60 bg-card` pattern.
- **GuestBanner** (home.tsx) shows at most once per session (`sessionStorage guest_banner_shown`), only after 20s on page or 60% scroll depth. Keep overlays disciplined: nothing may cover a CTA.
- Hero copy is CMS-backed (`EditableText`) — changing code fallbacks does not change production text if a CMS value exists in `cms_content`; update via admin edit mode.
- **Inline-styled colors don't get dark-mode variants for free** — Tailwind's `dark:` prefix only works on className-based styles, not on inline `style={{ color: ... }}`. `AvatarWithInitials` (`client/src/components/ui/avatar-with-initials.tsx`) picks per-user colors and switches between light/dark HSL pairs by reading `resolvedTheme` from `next-themes`' `useTheme()` — follow this pattern for any other component that sets colors via inline style.
- **PWA safe-area (iOS notch/home indicator):** the site is installable as a standalone PWA (`display: standalone` + `viewport-fit=cover`), where content renders under the status bar and home indicator. Every `fixed` element touching a screen edge must respect `env(safe-area-inset-*)`: the header uses `pt-[env(safe-area-inset-top)]` (and `<main>` in `App.tsx` compensates with `pt-[calc(4rem+env(safe-area-inset-top))]`); bottom-fixed elements (`WhatsAppButton`, `CookieConsent`, `InstallPrompt`) add `safe-area-inset-bottom` to their bottom offset. Follow this for any new fixed/floating UI. Note: full-screen overlays that must beat the header need `z-[60]` — the header itself is `z-50` and wins DOM order against other `z-50` elements.

**Copy rules (owner decisions — hard constraints):**
- **Never show prices anywhere.** Pricing questions are answered with "pošaljite upit — tačna ponuda u roku od 24h."
- **Revision policy is exactly 2 free revisions for every service** — home, usluge, team, FAQ, terms, and the FAQPage structured data in `SEO.tsx` must all agree. Never claim unlimited revisions.

**Auth middleware hierarchy:**
- `requireAdmin` — JWT valid + `role === "admin"` (Super Admin) exactly. Use this only for routes that must stay Super Admin-only (site settings/maintenance, CMS content, granting/revoking the `admin` role itself).
- `requireRole(...allowedRoles)` — JWT valid + (`role === "admin"` **or** `role` is in `allowedRoles`). This is the one to reach for on any admin-panel route scoped to a specific section (`requireRole("producer")`, `requireRole("editor", "marketing")`, etc.) — `admin` always passes every `requireRole(...)` call implicitly, so Super Admin never needs to be listed explicitly.
- **4 admin-panel staff roles** live in the same `users.role` column as `"user"`/`"admin"`: `"admin"` (Super Admin, full access), `"producer"` (day-to-day client/production tabs), `"editor"` (Vesti only), `"marketing"` (Newsletter/Email/Smart Links/Vesti). See the `ADMIN_NAV` comment in `admin.tsx` for the exact tab↔role mapping — keep server `requireRole(...)` calls and client `roles` arrays in sync; the client filtering is only a UX convenience; the server is what actually enforces it.
- Granting/revoking these roles is itself Super Admin-only: `PATCH /api/admin/users/:id/staff-role` (`requireAdmin`) sets `producer`/`editor`/`marketing`/`user`; the pre-existing `POST /api/admin/users/:id/toggle-admin` (`requireAdmin`) is the separate, single path for granting/revoking `"admin"` itself. Never let a `requireRole(...)`-gated route assign roles — that would let a restricted role escalate itself or others.
- `requireVerifiedEmail` — JWT valid + `emailVerified === true`. Used for community/giveaway/song features.
- `requireNotBanned` — JWT valid + `isBanned !== true`. Used for game routes (allows unverified but non-banned users).
- Routes that need no login but check auth optionally: pass `getQueryFn` on the client, which always sends JWT if present.

**Google OAuth login/register:**
- `users.googleId` (nullable, unique) links an account to a Google `sub`. Password stays `NOT NULL` for Google-only accounts — `storage.createGoogleUser()` fills it with an unusable scrypt hash of random bytes (same `hash.salt` format as `hashPassword()`, kept local to `storage.ts` to avoid a circular import with `auth.ts`) so the column constraint holds without enabling password login until the user runs "forgot password".
- Flow: frontend uses `useGoogleLogin` from `@react-oauth/google` (implicit flow, popup) to get a Google `access_token` — **not** the GIS ID-token/credential flow, so the button can be fully custom-styled instead of Google's constrained iframe button. `GoogleAuthButton` in `auth-page.tsx` is the reference implementation (site's pill `Button`, `variant="outline"`, official multi-color G logo SVG).
- Backend `POST /api/auth/google` (`server/auth.ts`) takes `{ accessToken }` and **must** validate it before trusting it: call `https://oauth2.googleapis.com/tokeninfo?access_token=` and check `aud === process.env.GOOGLE_CLIENT_ID` (prevents an access token minted for a different Google app being replayed against this endpoint), then fetch profile from `https://www.googleapis.com/oauth2/v3/userinfo`. Never skip the `aud` check.
- Find-or-create order: `getUserByGoogleId(sub)` → if found, log in. Else `getUserByEmail` → if an existing password-based account matches, `linkGoogleAccount()` attaches the `googleId` and sets `emailVerified = true` (Google already verified the email, so this bypasses the normal pending-user verification flow). Else `createGoogleUser()` makes a brand-new user with a username auto-derived from the email local-part (`generateUniqueUsernameFromEmail`, collision-checked via `getUserByUsername`) and `termsAccepted: true` (clicking the Google button during registration is treated as acceptance).
- Response shape matches `/api/login` exactly (`{ ...userWithoutPassword, token }`) so `use-auth.tsx`'s `googleLoginMutation` reuses the same `setAuthToken` + `queryClient.setQueryData(["/api/user"], user)` pattern as `loginMutation`.
- Required env vars: `GOOGLE_CLIENT_ID` (server, for the `aud` check) and `VITE_GOOGLE_CLIENT_ID` (client, same value — Google client IDs are public by design) from a Google Cloud Console OAuth 2.0 Web client. No client secret is needed anywhere in this flow since it never exchanges an auth code.
- `App.tsx` wraps the tree in `MaybeGoogleOAuthProvider` — it renders `GoogleOAuthProvider` only when `VITE_GOOGLE_CLIENT_ID` is set, because `@react-oauth/google` **throws synchronously on mount with an empty clientId and crashes the whole app**. Same reason `GoogleAuthButton` is split into Configured/Unconfigured components: `useGoogleLogin` must never be called at all when unconfigured (it calls `initTokenClient` as soon as the GSI script loads, which throws on empty ID) — the unconfigured variant just shows a Serbian toast.
- **The server CSP must allowlist `https://accounts.google.com`** in `script-src`, `connect-src`, and `frame-src` (`server/index.ts` security-headers middleware). Without it the GSI script silently fails to load and clicking the Google button does nothing — no visible error, only a CSP violation in the console. This was a real production bug; don't remove those entries when touching the CSP.

**Newsletter:**
- Tables: `newsletter_subscribers` (email, confirmationToken, confirmedAt).
- Double opt-in: `POST /api/newsletter/subscribe` creates subscriber + sends confirmation email. `GET /api/newsletter/confirm/:token` activates. Page: `/newsletter/potvrda/:token`.
- Admin sends campaigns via the Emails tab (`EmailTab.tsx`) using `POST /api/admin/send-email` to a manually entered list — there's no bulk-send-to-subscribers endpoint yet.

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
- Route: `/verify-license` — public. Users enter a contract number; `GET /api/contracts/verify/:licenseNumber` returns sanitized contract info (no personal data beyond what's on the license itself).

**Admin panel — PortalTab:**
- `PortalTab` (`client/src/components/admin/PortalTab.tsx`) is a separate-file tab in the admin panel. Manages client portals: create portal, upload versions (`POST /api/upload/portal-audio`), view comments, mark comments resolved.
- Uses `forceMount` on its `<TabsContent>` like other stateful tabs.

**MCP tools available:**
- **Playwright** — browser automation (navigate, screenshot, click, scroll). Use to visually verify UI changes before reporting done. Configured in local MCP settings (`~/.claude/settings.json`, command: `playwright-mcp`).
- **Production kills automated browsers:** `disable-devtool` in `main.tsx` (PROD only) false-positives on Playwright's console instrumentation and navigates the page to `about:blank` within ~1–2s. Workaround before any production navigation: `page.addInitScript(() => { ['log','table','clear','warn','info','debug','dir','dirxml'].forEach(k => { console[k] = () => {}; }); })`. Add `localStorage.setItem('maintenance_bypass','1')` in the same init script if maintenance mode is on.
- **Programmatic `window.scrollTo` breaks the parallax homepage** — sections render blank/displaced. Scroll with `page.mouse.wheel(0, 140)` in small increments and wait ~1s before screenshots so `whileInView` animations fire.
- Local visual checks without the DB: `npx vite --port 5199 --strictPort` serves the SPA alone (API calls fail gracefully to fallbacks; `import.meta.env.PROD` is false so devtools protection is off).

**Desktop Admin App (`desktop-admin/`):**
- A **separate Electron project**, not part of the main npm workspace/build — has its own `package.json`, `node_modules`, and `npm start`/`npm run dist` scripts. Wraps `https://studioleflow.com/admin` for staff who want a native-feeling desktop shell instead of a browser tab. Never referenced by the main site's build or deploy — safe to ignore unless a task explicitly touches it.
- **Architecture:** `src/main.js` creates a frameless `BrowserWindow` (custom titlebar, no OS chrome) plus a `BrowserView` that loads the real `/admin` page. `src/shell.html`/`shell.js` render a native-feeling "launcher" (search + grouped list of the admin sections, mirroring `ADMIN_NAV` from `client/src/pages/admin.tsx` — **keep the two in sync by hand**, including per-item `roles`). Clicking a launcher row sends IPC (`shell:goto`) to the main process, which clicks the real page's hidden `[data-testid="tab-<value>"]` button via `executeJavaScript` — the actual page still drives all real functionality, the launcher is just a native-feeling front door.
- **Role detection:** the JWT in `localStorage` only carries `userId`, not `role` — the main process fetches `/api/user` with the token (via `executeJavaScript` inside the `BrowserView`) to get the real role/username, then pushes it to the shell via `role-state`/`user-state` IPC. Polled every 700ms (`pollPageState`) alongside the active-tab value (`sessionStorage.getItem("admin-active-tab")`) so the native launcher stays in sync with whatever the real page is doing.
- **Visual reskin is CSS-injection only** (`src/admin-theme.css`, `insertCSS`'d into the `BrowserView` on every `dom-ready`) — it overrides the site's own shadcn/Tailwind CSS variables (`--background`, `--card`, etc.) and strips marketing chrome (header/footer/WhatsApp button/cookie banner) so the loaded page reads as "app content," not "website in a frame." This never touches the real site's source — same design tokens, different values, scoped to this Electron `BrowserView` only. The color/spacing values here are intentionally kept in sync with `shell.html`'s own hardcoded palette (`#0a0a0c` background, `rgba(16,16,20,0.92)` cards, etc.) for a seamless look between the native launcher and the real page content.
- **Known Windows/Electron gotchas hit while building this** (fixes already applied, don't reintroduce):
  - `extract-zip` (used by Electron's own postinstall) silently fails to unzip the Electron binary on this Node version — `scripts/fix-electron.js` runs as a `postinstall` and re-extracts via PowerShell's `Expand-Archive` if `node_modules/electron/dist/electron.exe` is missing.
  - Native `mainWindow.maximize()` on a `frame: false` window overshoots the monitor's work area by the invisible resize-border margin on Windows — `main.js`'s `maximize` handler immediately corrects the bounds via `screen.getDisplayMatching(...).workArea` right after calling `maximize()`, so it keeps the true OS-maximized state (square corners, correct Alt+Tab/taskbar behavior) without the overshoot. This fix is independent of `roundedCorners` (currently `true` — Windows 11 native rounded window corners; only the maximize *bounds* needed correcting, not the corner style). Verifying this visually requires `DwmGetWindowAttribute(hwnd, 9, ...)` (`DWMWA_EXTENDED_FRAME_BOUNDS`) — raw Win32 `GetWindowRect` reports a misleading ~8px-larger box on a maximized frameless window and will make a correctly-rendered window look "cut off" in a screenshot.
  - Building an installer (`npm run dist`) requires a 256×256+ `build/icon.png` (`client/public/favicon-512x512.png` is the source used) and can fail on `winCodeSign` extraction (`Cannot create symbolic link`) unless Windows Developer Mode is on or the command runs elevated — this is a permissions issue with the electron-builder cache, not the project config.
  - This directory needed its own `.gitignore` carve-out (`!desktop-admin/build/`, `desktop-admin/release/`) since the repo root ignores `build/` globally but `build/icon.png` here needs to be tracked.
  - **Not-a-browser hardening (`main.js`):** `Menu.setApplicationMenu(null)` (removes the hidden default menu reachable via Alt), `suppressBrowserShortcuts()` blocks F5/Ctrl+R/Ctrl+F/Ctrl+P/Ctrl+N/T/W/zoom keys/Alt+arrows and mouse back/forward side buttons on both the shell window and the content `BrowserView`, the default Chromium right-click menu (Back/Forward/Reload/Inspect/"Save page as...") is replaced with a minimal Cut/Copy/Paste-only menu, and `will-navigate` on the content view redirects any off-origin navigation to the system browser instead of navigating in-app. Without these, Electron's Chromium defaults make the "app" behave like a browser tab (reloadable, zoomable, back-navigable) — the whole point of this shell is that it doesn't.
