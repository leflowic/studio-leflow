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
5. WebSocket server (`/api/ws`) runs alongside HTTP on the same port. Auth is validated on the WS `auth` message using `verifyToken()` from `server/jwt-auth.ts` — never trust client-sent user IDs.

**Database:**
- Schema defined in `shared/schema.ts`, consumed by both Drizzle ORM queries (server) and Zod validators.
- `db:push` via `drizzle-kit` is the migration strategy. Additionally, `runMigrations()` in `server/index.ts` runs raw `ALTER TABLE / CREATE TABLE IF NOT EXISTS` on every server startup for additive changes that don't need a full push.
- All DB access goes through `server/storage.ts` (implements a `IStorage` interface). Import `storage` from there; never query `db` directly in routes.

**Frontend state:**
- React Query (`@tanstack/react-query`) for all server state. The query client is at `client/src/lib/queryClient.ts`.
- `useAuth()` hook (`client/src/hooks/use-auth.tsx`) — current user, login/logout.
- `WebSocketContext` (`client/src/contexts/WebSocketContext.tsx`) — single shared WS connection with subscribe/send API. Handles browser notifications and sound on `new_message` events.
- `EditModeContext` (`client/src/contexts/EditModeContext.tsx`) — CMS in-place editing toggle (admin only).
- All pages are lazy-loaded via `React.lazy`. Routes are defined in `client/src/App.tsx` using `wouter`.

**Admin panel tabs:**
- Each tab is its own component, either defined inline in `client/src/pages/admin.tsx` or as a separate file in `client/src/components/admin/`.
- Separate-file tabs: `ContractsTab`, `CalendarTab`, `KatastarTab` — import and add a `<TabsTrigger>` + `<TabsContent>` pair in `admin.tsx`.
- Admin-only API routes go in `server/routes.ts` under `requireAdmin` middleware. Always use `requireAdmin`, never trust `req.jwtUser?.role` manually in route handlers.
- `GET /api/admin/katastar/:userId` returns `{ user, projects, contracts, invoices }` for the Katastar (client registry) tab.

**Unread message badge:**
- `GET /api/messages/conversation/:userId` auto-marks messages as read server-side and broadcasts `message_read` to **both** the sender and the reader via WebSocket.
- The header subscribes to `message_read` and invalidates `/api/messages/unread-count`. `ChatInterface` also invalidates it via `useEffect` on messages load as a safety net.
- When adding new badge-like counters, follow this same pattern: server broadcasts to both parties, client invalidates the count query.

**Admin file downloads:**
- Never use `window.open(url)` for admin-only endpoints — it doesn't send `Authorization` headers. Use `fetch()` with `Authorization: Bearer <token>` header, then create a blob URL and trigger download via a temporary `<a>` element.

**CMS:**
- `EditableText` and `EditableImage` components let admins edit content in-place when edit mode is on.
- CMS values stored in `cms_content` table. Media stored in `cms_media` table.
- `EditableImage` uses a separate `fallbackSrc` prop for the local image to show when the stored CMS URL is broken.

**File uploads:**
- Avatar/image uploads: `POST /api/upload/avatar` → Cloudinary (`server/cloudinary.ts`).
- Audio uploads: `POST /api/upload/audio` → Cloudinary, with `fileTypeFromBuffer` magic-bytes validation.
- CMS media: multer to `attached_assets/temp/`, then moved to `attached_assets/`.

**Email:**
- Transactional: Resend SDK (`server/resend-client.ts`), from `noreply@mail.studioleflow.com`.
- Templates in `server/email-templates.ts` — all use white logo at `${BASE_URL}/leflow-logo-white.png`.
- Business inbox: Zoho Mail at `podrska@studioleflow.com`.

**Deployment:**
- Railway auto-deploys from GitHub `main` branch.
- `railway.toml`: build = `npm run build`, deploy = `npx drizzle-kit push --force`, start = `npm run start`.
- `nixpacks.toml` must use `npm ci --include=dev` so devDependencies (esbuild, tsc, etc.) are available at build time.
- `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*` env vars must be set in Railway.

**Security notes:**
- Admin 2FA: one-time token emailed on admin login (`adminLoginToken` / `adminLoginExpiry` fields on user).
- Rate limiters on login (5/15 min), registration (3/hr), uploads (30/hr), contact (10/hr).
- Production build disables React DevTools and blocks F12/DevTools keyboard shortcuts via `client/src/main.tsx`.
- JWT expiry: 7 days. Secret: `SESSION_SECRET` env var.
