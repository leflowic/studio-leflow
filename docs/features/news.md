# Vesti (/news portal)

Feature reference split out of CLAUDE.md (2026-11-26). The cross-cutting rules in CLAUDE.md still apply here.

**Vesti (/news portal):**
- Table `news_articles`: `title`, `slug` (unique, `[a-z0-9-]+`), `excerpt`, `content` (rich HTML from `RichTextEditor`/TipTap), `coverImage`, `tags`, `seoTitle`/`seoDescription`/`seoKeywords` (all optional — public page and server SEO meta fall back to title/excerpt/tags when empty), `status` (`"draft"` | `"published"`), `publishedAt`.
- `NewsTab.tsx` (admin, `editor`/`marketing`/admin only) is a list ↔ form view, not inline-expanding — the form has a rich text editor plus an SEO sub-card, too tall for an inline card. Slug auto-derives from the title via `slugify()` (transliterates Serbian Latin diacritics) until the user manually edits the slug field.
- Public pages `client/src/pages/news.tsx` (list, featured-lead + grid) and `news-article.tsx` (detail, renders `content` via `dangerouslySetInnerHTML` — safe here because only trusted staff roles author it, same trust model as the newsletter HTML template).
- **Server-side SEO for `/news/:slug`** is registered in `server/seo-meta.ts` alongside `/l/:slug` — injects title/description/keywords meta *and* a `NewsArticle` JSON-LD block (`headline`, `image`, `datePublished`, `keywords`, etc.) so an article about a specific artist can rank for that artist's name. `/news` (the list page) has a static entry in `STATIC_PAGE_META`.
- Routes under `/api/news` (public, published-only) and `/api/admin/news*` (`editor`/`marketing`), plus `POST /api/upload/news-cover` for the cover image.
