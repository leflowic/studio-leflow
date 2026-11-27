// Rubrike (sections) for the /news portal. Stored as the `value` in
// news_articles.category; null/unknown falls back to "Novosti".
export const NEWS_CATEGORIES = [
  { value: "izdanja", label: "Izdanja" },
  { value: "studio", label: "Iz studija" },
  { value: "scena", label: "Scena" },
  { value: "intervju", label: "Intervju" },
  { value: "saveti", label: "Saveti" },
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]["value"];

export function newsCategoryLabel(value: string | null | undefined): string {
  return NEWS_CATEGORIES.find(c => c.value === value)?.label ?? "Novosti";
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return NEWS_CATEGORIES.some(c => c.value === value);
}

// ~200 words a minute; works on the stored rich HTML
export function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
