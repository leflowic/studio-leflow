# Community feed, real-time messaging and notifications

Feature reference split out of CLAUDE.md (2026-11-26). The cross-cutting rules in CLAUDE.md still apply here.

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

**Hardening + paging (2026-11-26):**
- `GET /api/messages/conversation/:userId` returns the newest **50** messages (oldest-first); `?before=<id>` returns the 50 before that id (and doesn't re-mark/broadcast reads). `ChatInterface` keeps the newest page in React Query and older pages in local `older` state (merged by id), loads more when scrolled near the top or via "Starije poruke", and keeps the scroll anchored on prepend. WS edit/reaction/delete events patch `older` too. Each message carries `replyTo` (snippet of the quoted message from the same conversation) so a quote shows even when the quoted message isn't loaded. `inbox.tsx` mounts `ChatInterface` with `key={selectedUserId}` - per-person state (older pages, draft, scroll refs) resets on switch.
- New messages only auto-scroll when the reader is already near the bottom.
- `getUserConversations` is 4 batched queries for the whole list (was 3 per conversation).
- `POST /api/messages/send`: `messageRateLimiter` (30/min **per account**); `imageUrl` must be our own `res.cloudinary.com/.../studioleflow/messages/` upload; `replyToId` must be a message between the same two people.
- `GET /api/link-preview` goes through `safeFetchHtml()` (`server/safe-fetch.ts`): public addresses only (localhost, private ranges, cloud metadata, `.internal` refused), ports 80/443, every redirect hop re-checked, HTML only, max 512KB, 4s. Preview images must be https. Tests: `server/__tests__/safe-fetch.test.ts`.
- Default avatar (no photo) is `attached_assets/avatar_200.png` via `ui/avatar.tsx` - brand anthracite version.

**Block / report / presence (2026-11-26):**
- `user_blocks` (blocker → blocked, unique pair) and `user_reports` (reporter, reported, reason `harassment|spam|inappropriate|scam|other`, optional note ≤500, `resolved_at`); both also in `runMigrations()`.
- `POST/DELETE /api/users/:id/block`; `POST /api/users/:id/report` (`reportRateLimiter` 10/h per account; `block: true` also blocks). Send is refused either way with a neutral message for the blocked side ("Ne možete slati poruke ovom korisniku" - never says who blocked whom).
- `GET /api/users/:id` adds `online` (live WS presence via `getOnlineUsersSnapshot()`, not the old "lastSeen < 3 min" guess - lastSeen is only written on connect/disconnect), `blockedByMe`, `blockedMe`; presence is hidden when blocked either way. The chat refetches it every 60s.
- Chat header "⋮" menu: Prijavi korisnika / Blokiraj (Odblokiraj) / Obriši moje poruke. Blocked → composer replaced by a banner.
- Staff see reports at the top of admin → Poruke (`MessageReportsPanel`, `GET/PATCH /api/admin/reports`, `requireRole("producer")`), with "Banuj" (existing ban route) and the number of distinct reporters.
- Privacy section on /pravila mentions blocks/reports.

**Audio in messages (2026-11-26):**
- `messages.audio_url / audio_name / audio_duration` (also in `runMigrations()`). Audio-only messages store content `"🎵"` (`AUDIO_PLACEHOLDER`), like `"📎"` for images - previews show `<AudioLabel />`, push/browser notifications say "Poslao/la ti je audio", the edit button is hidden for attachment-only messages, forward keeps the attachment.
- Upload: `POST /api/upload/message-audio` (verified, `uploadRateLimiter`, magic-bytes check: MP3/WAV/M4A/AAC/OGG/FLAC, **max 10MB** - the hosting per-file cap) → `uploadAudioWithMeta()` (returns duration) into `studioleflow/messages-audio`. Filename is decoded from multer's latin1. `POST /api/messages/send` only accepts `audioUrl` from that folder (`isOwnMessageAudioUrl`).
- Player: `AudioMessage.tsx`. `<audio preload="none">` (nothing downloads until play); the waveform is the host's generated PNG (`fl_waveform` transformation) used as a CSS mask over a two-tone fill that doubles as the progress bar; falls back to static bars if the picture fails. Click/arrow keys seek, one chat audio plays at a time (`chat-audio-play` window event), download via `fl_attachment`.
