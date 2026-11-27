# Vesti (/news portal)

Feature reference split out of CLAUDE.md (2026-11-26). The cross-cutting rules in CLAUDE.md still apply here.

**Vesti (/news portal):**
- Table `news_articles`: `title`, `slug` (unique, `[a-z0-9-]+`), `excerpt`, `content` (rich HTML from `RichTextEditor`/TipTap), `coverImage`, `tags`, `seoTitle`/`seoDescription`/`seoKeywords` (all optional — public page and server SEO meta fall back to title/excerpt/tags when empty), `status` (`"draft"` | `"published"`), `publishedAt`.
- `NewsTab.tsx` (admin, `editor`/`marketing`/admin only) is a list ↔ form view, not inline-expanding — the form has a rich text editor plus an SEO sub-card, too tall for an inline card. Slug auto-derives from the title via `slugify()` (transliterates Serbian Latin diacritics) until the user manually edits the slug field.
- Public pages `client/src/pages/news.tsx` (list, featured-lead + grid) and `news-article.tsx` (detail, renders `content` via `dangerouslySetInnerHTML` — safe here because only trusted staff roles author it, same trust model as the newsletter HTML template).
- **Server-side SEO for `/news/:slug`** is registered in `server/seo-meta.ts` alongside `/l/:slug` — injects title/description/keywords meta *and* a `NewsArticle` JSON-LD block (`headline`, `image`, `datePublished`, `keywords`, etc.) so an article about a specific artist can rank for that artist's name. `/news` (the list page) has a static entry in `STATIC_PAGE_META`.
- Routes under `/api/news` (public, published-only) and `/api/admin/news*` (`editor`/`marketing`), plus `POST /api/upload/news-cover` for the cover image.

**Editorial redesign (2026-11-27, owner: "premium, like a music portal"; public name is "Novosti", the route stays `/news`):**
- `news.tsx` is a magazine front page: masthead (date + big "Novosti" + rubrike tabs, `?rubrika=` in the URL), a lead story with a "Najnovije" rail of the next 4 (numbered, kicker, thumb), then a 3-column "Još novosti" grid. When there's nothing for the rail it shows "Novo iz studija" (featured smart links) instead, so a single article never looks empty.
- `news-article.tsx`: breadcrumb, kicker, big headline + dek, byline row (date, reading time, Kopiraj link / Podeli), wide cover, ~42rem body with tuned `prose` (larger first paragraph, oak blockquote rule), optional "Poslušaj" release card, up to 6 tags, "Pročitajte još" (3 newest others), and an oak reading-progress bar under the header.
- Shared pieces in `components/news/NewsParts.tsx` (`StoryCard`, `Kicker`, `MetaLine`, `formatDateLong` = "8. jula 2026.").
- New columns `category` (rubrika, values in `shared/news.ts` `NEWS_CATEGORIES`; null shows as "Novosti") and `smart_link_slug` (the release card), added in `runMigrations()` too; both are set in the admin form. `GET /api/news?category=` filters; the list no longer sends article bodies, it sends `readingMinutes` instead. `GET /api/news/:slug` adds `readingMinutes` and `release` (public smart link fields).
