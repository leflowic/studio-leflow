import { Users, Instagram, Mic2, Headphones, Video, Zap, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import type { CmsContent } from "@shared/schema";
import leflowImage from "@assets/image_1762303735569.png";
import dicviImage from "@assets/image_1762303783224.png";
import kuleImage from "@assets/image_1762303820348.png";
import culiImage from "@assets/image_1762303853641.png";

export default function Team() {
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: cmsContent = [] } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content"],
    queryFn: () => fetch("/api/cms/content").then(r => r.json()),
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

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const nextIndex = getNextMemberIndex();
      const newMemberData = [
        { page: "team", section: "members", contentKey: `member_${nextIndex}_name`, contentValue: "Novo Ime" },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_role`, contentValue: "Nova Uloga" },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_description`, contentValue: "" },
        { page: "team", section: "members", contentKey: `member_${nextIndex}_instagram`, contentValue: "https://instagram.com/" },
      ];

      const response = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberData),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Greška pri dodavanju člana");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({
        title: "Uspešno dodato",
        description: "Novi član tima je dodat. Kliknite na tekst da ga izmenite.",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri dodavanju člana",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberIndex: number) => {
      const response = await fetch(`/api/cms/team-member/${memberIndex}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Greška pri brisanju člana");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({
        title: "Uspešno obrisano",
        description: "Član tima je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju člana",
        variant: "destructive",
      });
    },
  });
  // Dynamic member loading from CMS
  const memberImages: Record<number, string> = {
    1: leflowImage,
    2: kuleImage,
    3: dicviImage,
    4: culiImage
  };

  const memberAliases: Record<number, string> = {
    1: "LeFlow",
    2: "Kule",
    3: "Dicvi",
    4: "Culi"
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
      ? "@" + instagram.split("instagram.com/")[1]?.replace("/", "") || "@user"
      : "@user";

    return {
      name,
      alias: memberAliases[index] || `Member${index}`,
      role,
      positions: description.split(" • ").filter(p => p.trim()),
      instagram,
      instagramHandle,
      initials,
      image: getCmsValue("members", `member_${index}_image`, memberImages[index] || leflowImage),
      featured: index === 1,
      index
    };
  });


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
          "najbolji producent beograd"
        ]}
      />
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="mb-6 inline-flex items-center gap-2 flex-wrap px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Upoznajte Nas</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight font-[Montserrat]" data-testid="text-team-title">
              Naš Tim
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kreativni tim profesionalaca posvećenih izvrsnosti u muzičkoj i video produkciji
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {teamMembers.map((member, mapIndex) => (
              <FadeInWhenVisible 
                key={member.index}
                delay={mapIndex * 0.15}
                className={member.featured ? 'md:col-span-2' : ''}
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card 
                    className="overflow-visible h-full hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`card-team-${member.alias.toLowerCase()}`}
                  >
                <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap space-y-0 pb-4">
                  <div className="flex items-start gap-4 flex-wrap flex-1">
                    {isEditMode ? (
                      <EditableImage
                        page="team"
                        section="members"
                        contentKey={`member_${member.index}_image`}
                        currentImageUrl={getCmsValue("members", `member_${member.index}_image`, "")}
                        fallbackSrc={member.image}
                        alt={member.name}
                        className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover"
                        containerClassName="w-16 h-16 flex-shrink-0"
                      />
                    ) : (
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={member.image} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <EditableText
                          page="team"
                          section="members"
                          contentKey={`member_${member.index}_name`}
                          value={member.name}
                          as="h3"
                          className="text-2xl font-bold"
                        />
                        <Badge variant="secondary" className="text-sm" data-testid={`badge-alias-${member.alias.toLowerCase()}`}>
                          {member.alias}
                        </Badge>
                      </div>
                      
                      <EditableText
                        page="team"
                        section="members"
                        contentKey={`member_${member.index}_role`}
                        value={member.role}
                        as="p"
                        className="text-primary font-semibold mb-1"
                      />
                      
                      {member.positions.length > 0 && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-positions-${member.alias.toLowerCase()}`}>
                          {member.positions.join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Da li ste sigurni da želite da obrišete člana "${member.name}"?`)) {
                            deleteMemberMutation.mutate(member.index);
                          }
                        }}
                        disabled={deleteMemberMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={member.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 flex-wrap"
                        data-testid={`link-instagram-${member.alias.toLowerCase()}`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Instagram className="w-4 h-4" />
                        </motion.div>
                        <span className="hidden sm:inline text-sm">{member.instagramHandle}</span>
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                  </Card>
                </motion.div>
              </FadeInWhenVisible>
            ))}
            
            {isEditMode && (
              <FadeInWhenVisible delay={teamMembers.length * 0.15} className="md:col-span-2">
                <Button
                  onClick={() => addMemberMutation.mutate()}
                  disabled={addMemberMutation.isPending}
                  className="w-full h-full min-h-[120px] border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="w-8 h-8 text-primary" />
                    <span className="text-lg font-semibold">Dodaj Novog Člana Tima</span>
                  </div>
                </Button>
              </FadeInWhenVisible>
            )}
          </div>

          <div className="mt-20 text-center">
            <Card className="max-w-3xl mx-auto bg-primary/5 border-primary/20 hover-elevate">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Pridružite Se Našoj Kreativnoj Porodici</h2>
                <p className="text-muted-foreground mb-6">
                  Radimo sa talentovanim artistima iz cele Srbije i regiona. Vaša vizija, naša ekspertiza.
                </p>
                <div className="flex flex-wrap gap-3 justify-center text-sm">
                  <Badge variant="outline">
                    <Mic2 className="w-3 h-3 mr-1.5" />
                    Profesionalan pristup
                  </Badge>
                  <Badge variant="outline">
                    <Headphones className="w-3 h-3 mr-1.5" />
                    Vrhunska oprema
                  </Badge>
                  <Badge variant="outline">
                    <Video className="w-3 h-3 mr-1.5" />
                    Kompletna produkcija
                  </Badge>
                  <Badge variant="outline">
                    <Zap className="w-3 h-3 mr-1.5" />
                    Brza realizacija
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
