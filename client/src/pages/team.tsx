import { Instagram, Plus, Trash2, ImagePlus, Loader2, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import type { CmsContent } from "@shared/schema";
import leflowImage from "@assets/image_1762303735569.png";
import dicviImage from "@assets/image_1762303783224.png";
import kuleImage from "@assets/image_1762303820348.png";
import culiImage from "@assets/image_1762303853641.png";

const EMPTY_FORM = { name: "", alias: "", role: "", description: "", instagram: "https://instagram.com/", imageUrl: "" };

export default function Team() {
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: cmsContent = [] } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content"],
  });

  const getCmsValue = (section: string, key: string, fallback: string = "") => {
    return cmsContent.find(c => c.section === section && c.contentKey === key)?.contentValue || fallback;
  };

  // Find next available member index
  const getNextMemberIndex = () => {
    const memberKeys = cmsContent.filter(c => c.section === "members" && c.contentKey.includes("_name"));
    const memberNumbers = memberKeys.map(k => {
      const parts = k.contentKey.split("_");
      return parseInt(parts[1] || "0");
    }).filter(n => !isNaN(n));
    return memberNumbers.length > 0 ? Math.max(...memberNumbers) + 1 : 5;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Greška", description: "Izabrani fajl nije slika", variant: "destructive" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Greška", description: "Slika je prevelika (max 4MB)", variant: "destructive" });
      return;
    }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAuthToken();
      const res = await fetch("/api/upload/message-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setForm(f => ({ ...f, imageUrl: url }));
    } catch {
      toast({ title: "Greška", description: "Upload slike nije uspeo", variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const nextIndex = getNextMemberIndex();
      const entries = [
        { page: "team", section: "members", contentKey: `member_${nextIndex}_name`, contentValue: data.name.trim() || "Novo Ime" },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_alias`, contentValue: data.alias.trim() || `Member${nextIndex}` },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_role`, contentValue: data.role.trim() || "Nova Uloga" },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_description`, contentValue: data.description.trim() },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_instagram`, contentValue: data.instagram.trim() || "https://instagram.com/" },
        ...(data.imageUrl ? [{ page: "team", section: "members", contentKey: `member_${nextIndex}_image`, contentValue: data.imageUrl }] : []),
      ];
      const response = await apiRequest("POST", "/api/cms/content", entries);
      if (!response.ok) throw new Error("Greška pri dodavanju člana");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({ title: "Uspešno dodato", description: "Novi član tima je dodat." });
      setAddDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => {
      toast({ title: "Greška", description: "Došlo je do greške pri dodavanju člana", variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberIndex: number) => {
      const response = await apiRequest("DELETE", `/api/cms/team-member/${memberIndex}`);
      if (!response.ok) throw new Error("Greška pri brisanju člana");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({ title: "Uspešno obrisano", description: "Član tima je obrisan" });
    },
    onError: () => {
      toast({ title: "Greška", description: "Došlo je do greške pri brisanju člana", variant: "destructive" });
    },
  });

  // Dynamic member loading from CMS
  const memberImages: Record<number, string> = {
    1: leflowImage,
    2: kuleImage,
    3: dicviImage,
    4: culiImage,
  };

  const memberAliases: Record<number, string> = {
    1: "LeFlow",
    2: "Kule",
    3: "Dicvi",
    4: "Culi",
  };

  // Find all unique member indices from CMS
  const memberIndices = Array.from(new Set(
    cmsContent
      .filter(c => c.section === "members" && c.contentKey.includes("_name"))
      .map(c => parseInt(c.contentKey.split("_")[1] || "0"))
      .filter(n => !isNaN(n))
  )).sort((a, b) => a - b);

  const teamMembers = memberIndices.map(index => {
    const name = getCmsValue("members", `member_${index}_name`, `Član ${index}`);
    const role = getCmsValue("members", `member_${index}_role`, "Team Member");
    const description = getCmsValue("members", `member_${index}_description`, "");
    const instagram = getCmsValue("members", `member_${index}_instagram`, "https://instagram.com/");

    // Extract initials from name
    const nameParts = name.split(" ");
    const initials = nameParts.length >= 2 && nameParts[0] && nameParts[1]
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : name.substring(0, Math.min(2, name.length)).toUpperCase();

    // Extract Instagram handle from URL
    const instagramHandle = instagram.includes("instagram.com/")
      ? "@" + (instagram.split("instagram.com/")[1]?.replace("/", "") || "user")
      : "@user";

    return {
      name,
      alias: getCmsValue("members", `member_${index}_alias`, memberAliases[index] || `Member${index}`),
      role,
      positions: description.split(" • ").filter(p => p.trim()),
      instagram,
      instagramHandle,
      initials,
      image: getCmsValue("members", `member_${index}_image`, memberImages[index] || leflowImage),
      featured: index === 1,
      index,
    };
  });

  const gridClass = teamMembers.length < 3
    ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Naš Tim - Studio LeFlow | Profesionalni Producenti i Inženjeri Zvuka"
        description="Upoznajte tim Studio LeFlow-a. Aleksa Čomor (LeFlow), Matija Kalajdžić (Kule), Mihailo Vidić (Dicvi), Aleksandar Ćulibrk (Culi). Iskusni producenti, tekstopisci i inženjeri zvuka."
        keywords={[
          "tim studio leflow",
          "leflow studio tim",
          "leflow tim",
          "producent muzike beograd",
          "inženjer zvuka beograd",
          "leflow producent",
          "aleksa čomor producent",
          "matija kalajdžić",
          "muzički producenti beograd",
          "tekstopisac beograd",
          "najbolji producent beograd",
        ]}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Studio LeFlow</p>
          <h1 className="heading-xl mb-4" data-testid="text-team-title">Naš Tim</h1>
          <p className="text-muted-foreground text-lg">
            Kreativni tim profesionalaca posvećenih izvrsnosti u muzičkoj produkciji
          </p>
        </div>
      </section>

      {/* Team grid */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="relative">
              {/* Admin add button — top right, outside the grid */}
              {isEditMode && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => setAddDialogOpen(true)}
                    variant="outline"
                    className="border-dashed border-primary/40 hover:border-primary/70 gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    Dodaj člana
                  </Button>
                </div>
              )}

              <div className={gridClass}>
                {teamMembers.map((member) => (
                  <div
                    key={member.index}
                    className="group rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/20 transition-all duration-500"
                    data-testid={`card-team-${member.alias.toLowerCase()}`}
                  >
                    {/* Square image */}
                    <div className="aspect-square overflow-hidden relative">
                      {isEditMode ? (
                        <EditableImage
                          page="team"
                          section="members"
                          contentKey={`member_${member.index}_image`}
                          currentImageUrl={getCmsValue("members", `member_${member.index}_image`, "")}
                          fallbackSrc={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          containerClassName="w-full h-full"
                        />
                      ) : (
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage
                            src={member.image}
                            alt={member.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <AvatarFallback className="rounded-none w-full h-full bg-primary/10 text-primary text-4xl font-bold">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Admin delete overlay */}
                      {isEditMode && (
                        <button
                          onClick={() => {
                            if (confirm(`Da li ste sigurni da želite da obrišete člana "${member.name}"?`)) {
                              deleteMemberMutation.mutate(member.index);
                            }
                          }}
                          disabled={deleteMemberMutation.isPending}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/80 hover:bg-destructive text-white transition-colors cursor-pointer"
                          aria-label={`Obriši ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-5">
                      <EditableText
                        page="team"
                        section="members"
                        contentKey={`member_${member.index}_name`}
                        value={member.name}
                        as="h3"
                        className="text-xl font-bold mb-0.5"
                      />

                      {member.alias && (
                        <p className="text-primary text-sm font-medium mb-2">@{member.alias}</p>
                      )}

                      <EditableText
                        page="team"
                        section="members"
                        contentKey={`member_${member.index}_role`}
                        value={member.role}
                        as="p"
                        className="text-xs text-muted-foreground uppercase tracking-widest mb-3"
                      />

                      {member.positions.length > 0 && (
                        <p
                          className="text-sm text-muted-foreground leading-relaxed"
                          data-testid={`text-positions-${member.alias.toLowerCase()}`}
                        >
                          {member.positions.join(" • ")}
                        </p>
                      )}

                      <a
                        href={member.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        data-testid={`link-instagram-${member.alias.toLowerCase()}`}
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        Instagram
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 bg-background">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Radi sa nama</h2>
          <p className="text-muted-foreground mb-8">
            Uvek smo otvoreni za saradnju sa talentovanim artistima i kreativcima.
          </p>
          <Link href="/kontakt">
            <Button size="lg" className="cursor-pointer">
              Kontaktiraj nas <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Add member dialog */}
      <Dialog open={addDialogOpen} onOpenChange={open => { setAddDialogOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj novog člana tima</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Fotografija</Label>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              <div
                className="relative w-24 h-24 rounded-full border-2 border-dashed border-primary/30 cursor-pointer hover:border-primary/60 transition-colors overflow-hidden bg-muted/40 flex items-center justify-center"
                onClick={() => !imageUploading && imageInputRef.current?.click()}
              >
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : imageUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Dodaj</span>
                  </div>
                )}
                {form.imageUrl && !imageUploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ime i prezime</Label>
              <Input placeholder="npr. Aleksa Čomor" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nadimak / alias</Label>
              <Input placeholder="npr. LeFlow" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Uloga</Label>
              <Input placeholder="npr. Producer & Sound Engineer" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Pozicije <span className="text-muted-foreground text-xs">(odvojene sa " • ")</span></Label>
              <Textarea
                placeholder="npr. Producent • Tekstopisac • Mix Engineer"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input placeholder="https://instagram.com/username" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Otkaži</Button>
            <Button
              onClick={() => addMemberMutation.mutate(form)}
              disabled={addMemberMutation.isPending || imageUploading || !form.name.trim()}
            >
              {addMemberMutation.isPending ? "Dodavanje..." : "Dodaj člana"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
