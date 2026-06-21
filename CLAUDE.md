# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Admin panel tabs:**
- Each tab is its own component, either defined inline in `client/src/pages/admin.tsx` or as a separate file in `client/src/components/admin/`.
- Separate-file tabs: `ContractsTab`, `CalendarTab`, `KatastarTab`, `GameTab` — import and add a `<TabsTrigger>` + `<TabsContent>` pair in `admin.tsx`.
- Admin-only API routes go in `server/routes.ts` under `requireAdmin` middleware. Always use `requireAdmin`, never trust `req.jwtUser?.role` manually in route handlers.
- `GET /api/admin/katastar/:userId` returns `{ user, projects, contracts, invoices }` for the Katastar (client registry) tab.
- **Tabs with forms must use `forceMount`** on their `<TabsContent>` to prevent React state loss on tab switch. Radix UI unmounts `TabsContent` by default — any local form state (dates, inputs, uploads) is wiped when the user navigates to another tab and back. `tabs.tsx` has `data-[state=inactive]:hidden` so forceMount content is still visually hidden when inactive. Currently `GameTab` uses this.

**Real-time messaging:**
- `WebSocketContext` is the single shared WS connection (app-level). `ChatInterface` and `ConversationList` subscribe to it via `useWebSocketContext()`. Reconnect uses exponential backoff: 3s → 6s → 12s → 30s max, reset on successful open.
- When a `new_message` WS event arrives, `ChatInterface` calls `queryClient.setQueryData` to inject the message directly into the cache — no network round-trip. `invalidateQueries` is also called afterward to sync server state (read receipts etc). This is the correct pattern for instant real-time UI updates; do **not** rely on `invalidateQueries` alone for real-time features since `staleTime: Infinity` means it triggers a fetch, not an instant update.
- `GET /api/messages/conversation/:userId` auto-marks messages as read and broadcasts `message_read` to **both** parties (sender and reader). The header invalidates `/api/messages/unread-count` on `message_read`. `ChatInterface` also invalidates it on messages load.
- Notification sound: `attached_assets/universfield-new-notification-035-485894.mp3`, imported via `@assets` alias in `WebSocketContext.tsx`.
- When adding new badge-like counters, follow this pattern: server broadcasts to both parties, client uses `setQueryData` for instant update + `invalidateQueries` for sync.
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

**Admin file downloads:**
- Never use `window.open(url)` for admin-only endpoints — it doesn't send `Authorization` headers. Use `fetch()` with `Authorization: Bearer <token>` header, then create a blob URL and trigger download via a temporary `<a>` element.

**Error messages:**
- All user-facing error messages must be in Serbian and friendly — never expose raw JS errors, stack traces, or English strings like "Unauthorized" / "Forbidden".
- Server: return `res.status(N).json({ error: "Serbian message" })`. Middleware in `server/jwt-auth.ts` already does this for auth errors.
- Client: `throwIfResNotOk` in `queryClient.ts` has a `STATUS_MESSAGES` fallback map for common HTTP codes. When the server sends `{ error: "..." }`, that message is used directly.

**Contract PDFs:**
- PDFs are **never** read from the local filesystem — Railway's filesystem is ephemeral and files are lost on redeploy.
- All contract download/email endpoints regenerate the PDF on-the-fly from `contract.contractData` (JSON stored in PostgreSQL) using `generateMixMasterPDF`, `generateCopyrightTransferPDF`, or `generateInstrumentalSalePDF` from `server/pdf-generator.ts`. Match on `contract.contractType`.

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

**File uploads:**
- Avatar/image uploads: `POST /api/upload/avatar` → Cloudinary (`server/cloudinary.ts`), fixed `user_${id}` public_id with face-crop transformation.
- Message images: `POST /api/upload/message-image` → Cloudinary `studioleflow/messages` folder, unique `msg_${userId}_${timestamp}` public_id (no overwrite, no crop).
- Audio uploads: `POST /api/upload/audio` → Cloudinary, with `fileTypeFromBuffer` magic-bytes validation.
- Game clip: `POST /api/upload/game-clip` (admin) → Cloudinary `studioleflow/game-clips` folder.
- CMS media: multer to `attached_assets/temp/`, then moved to `attached_assets/`. **Note:** this path is ephemeral on Railway — CMS media uploads are lost on redeploy. Only `attached_assets/` files bundled at build time persist (they're baked into `dist/public/`). If persistent CMS media is needed, route through Cloudinary instead.
- All upload routes have `uploadRateLimiter` applied (30/hr). Avatar and message-image routes also validate magic bytes via `fileTypeFromBuffer`.

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
- `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*` env vars must be set in Railway.

**SEO:**
- `client/src/components/SEO.tsx` — sets `<title>`, meta tags, og/twitter tags, canonical URL, and JSON-LD structured data via `useEffect`. Add `<SEO>` to every public page.
- `defaultStructuredData` in `SEO.tsx` is a `RecordingStudio` schema used on pages that don't pass `structuredData`. Pre-built schemas for specific pages are exported as `pageStructuredData` (`services`, `contact`, `portfolio`).
- `client/public/sitemap.xml` and `robots.txt` — only list real routes that exist in `App.tsx`. Disallow protected routes (`/admin`, `/dashboard`, `/igra`, `/zajednica`, `/moje-pesme`).
- Private/giveaway-only pages (`/uslovi-koriscenja`) should use `<SEO noIndex={true}>`.

**Chunk loading / error boundary:**
- `ChunkErrorBoundary` in `App.tsx` wraps all lazy-loaded routes. On a chunk load error it auto-reloads once per pathname using a `sessionStorage` key `chunk-reload-${pathname}` — each route gets its own reload attempt so navigating between pages after a deploy doesn't get stuck showing the error UI.

**FAQ page:**
- Route `/faq` — accordion component at `client/src/pages/faq.tsx`. Linked from the footer only (was removed from the main nav). Listed in `sitemap.xml`.

**Security notes:**
- Admin 2FA: one-time token emailed on admin login (`adminLoginToken` / `adminLoginExpiry` fields on user).
- Rate limiters on login (5/15 min), registration (3/hr), uploads (30/hr), contact (10/hr). All upload routes have `uploadRateLimiter` applied.
- `GET /api/admin/users` strips `passwordHash`, `adminLoginToken`, `adminLoginExpiry` before sending the response.
- Logout calls `queryClient.clear()` to wipe all cached private data, not just the user query.
- Production build disables React DevTools and blocks F12/DevTools keyboard shortcuts via `client/src/main.tsx`.
- JWT expiry: 7 days. Secret: `SESSION_SECRET` env var.
