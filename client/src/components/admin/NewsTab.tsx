import { lazy, Suspense, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Trash2, Upload, X, Loader2, Newspaper, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";

const RichTextEditor = lazy(() =>
  import("@/components/RichTextEditor").then(module => ({ default: module.RichTextEditor }))
);

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorUsername: string;
}

const SR_MAP: Record<string, string> = { š: "s", đ: "dj", č: "c", ć: "c", ž: "z", Š: "s", Đ: "dj", Č: "c", Ć: "c", Ž: "z" };

function slugify(text: string): string {
  const transliterated = text.split("").map(ch => SR_MAP[ch] ?? ch).join("");
  return transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  status: "draft" as "draft" | "published",
};

type FormState = typeof emptyForm;

function statusBadge(status: string) {
  return status === "published"
    ? <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Objavljeno</Badge>
    : <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 text-xs">Nacrt</Badge>;
}

export function NewsTab() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: articles, isLoading } = useQuery<Article[]>({ queryKey: ["/api/admin/news"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        coverImage: form.coverImage || null,
        tags: form.tags || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        seoKeywords: form.seoKeywords || null,
      };
      if (editingId !== null) {
        await apiRequest("PATCH", `/api/admin/news/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/news", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      toast({ title: "Uspeh", description: editingId !== null ? "Vest je ažurirana" : "Vest je kreirana" });
      setView("list");
    },
    onError: (error: Error) => {
      toast({ title: "Greška", description: error.message || "Greška pri čuvanju vesti", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/news/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      toast({ title: "Uspeh", description: "Vest je obrisana" });
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri brisanju vesti", variant: "destructive" });
    },
  });

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setSlugTouched(false);
    setView("form");
  }

  function openEdit(article: Article) {
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      coverImage: article.coverImage ?? "",
      tags: article.tags ?? "",
      seoTitle: article.seoTitle ?? "",
      seoDescription: article.seoDescription ?? "",
      seoKeywords: article.seoKeywords ?? "",
      status: article.status,
    });
    setEditingId(article.id);
    setSlugTouched(true);
    setView("form");
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/upload/news-cover", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setForm(f => ({ ...f, coverImage: data.url }));
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  if (view === "form") {
    const canSave = form.title.trim() && form.slug.trim() && form.excerpt.trim() && form.content.trim();
    return (
      <div className="space-y-6" data-testid="content-news-form">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("list")} className="shrink-0" data-testid="button-back-news">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">{editingId !== null ? "Uredi vest" : "Nova vest"}</h2>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6 space-y-5">
            <div className="flex gap-4 items-start">
              <div
                role="button"
                tabIndex={0}
                aria-label="Promeni naslovnu sliku"
                className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 cursor-pointer group border border-zinc-800 bg-zinc-950"
                onClick={() => fileRef.current?.click()}
              >
                {form.coverImage ? (
                  <>
                    <img src={form.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, coverImage: "" })); }}
                      aria-label="Ukloni sliku"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/80"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Newspaper className="w-5 h-5" /><span className="text-[10px]">Slika</span></>}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />

              <div className="flex-1 space-y-3 min-w-0">
                <div className="space-y-1.5">
                  <Label>Naslov</Label>
                  <Input
                    value={form.title}
                    onChange={e => {
                      const title = e.target.value;
                      setForm(f => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                    }}
                    placeholder="npr. Novi singl iz Studio LeFlow-a"
                    data-testid="input-news-title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug (URL)</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0">/news/</span>
                    <Input
                      value={form.slug}
                      onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                      placeholder="novi-singl"
                      className="text-sm"
                      data-testid="input-news-slug"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Kratak opis (excerpt)</Label>
              <Textarea
                value={form.excerpt}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                placeholder="Kratak opis koji se prikazuje na listi vesti..."
                rows={2}
                data-testid="textarea-news-excerpt"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sadržaj</Label>
              <Suspense fallback={
                <div className="border rounded-md p-4 min-h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              }>
                <RichTextEditor
                  content={form.content}
                  onChange={content => setForm(f => ({ ...f, content }))}
                  placeholder="Unesite tekst vesti..."
                />
              </Suspense>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tagovi (odvojeni zarezom)</Label>
                <Input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="npr. izdanje, mix, saradnja"
                  data-testid="input-news-tags"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(status: "draft" | "published") => setForm(f => ({ ...f, status }))}>
                  <SelectTrigger data-testid="select-news-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nacrt</SelectItem>
                    <SelectItem value="published">Objavljeno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">SEO (opciono)</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Ako ostaviš prazno, koriste se naslov / opis / tagovi sa vrha forme.
            </p>
            <div className="space-y-1.5">
              <Label>SEO naslov</Label>
              <Input
                value={form.seoTitle}
                onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))}
                placeholder={form.title || "SEO naslov za Google"}
                data-testid="input-news-seo-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SEO opis</Label>
              <Textarea
                value={form.seoDescription}
                onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))}
                placeholder={form.excerpt || "SEO opis za Google"}
                rows={2}
                data-testid="textarea-news-seo-description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SEO ključne reči (npr. ime izvođača, odvojeno zarezom)</Label>
              <Input
                value={form.seoKeywords}
                onChange={e => setForm(f => ({ ...f, seoKeywords: e.target.value }))}
                placeholder={form.tags || "npr. Ime Izvođača, novi singl"}
                data-testid="input-news-seo-keywords"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView("list")}>Otkaži</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            data-testid="button-save-news"
          >
            Sačuvaj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="content-news">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Vesti</h2>
          <p className="text-sm text-muted-foreground">Upravljanje člancima na /news portalu</p>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="button-new-news">
          <Plus className="w-4 h-4 mr-1" />
          Nova vest
        </Button>
      </div>

      {(articles ?? []).length === 0 ? (
        <EmptyState icon={Newspaper} text="Još uvek nema vesti" compact />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {(articles ?? []).map(article => (
            <Card
              key={article.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 transition-all cursor-pointer"
              onClick={() => openEdit(article)}
              data-testid={`card-news-${article.id}`}
            >
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{article.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {article.status === "published" && (
                      <a
                        href={`/news/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground p-1"
                        data-testid={`link-view-news-${article.id}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={e => e.stopPropagation()}
                          data-testid={`button-delete-news-${article.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={e => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vest "{article.title}" će biti trajno obrisana.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(article.id)}>
                            Obriši
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                <Separator className="bg-zinc-800/70" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{article.authorUsername}</span>
                  {statusBadge(article.status)}
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  {article.publishedAt
                    ? `Objavljeno ${format(new Date(article.publishedAt), "dd.MM.yyyy")}`
                    : `Izmenjeno ${format(new Date(article.updatedAt), "dd.MM.yyyy")}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
