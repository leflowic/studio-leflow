import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Heart, Upload, MessageCircle, Send, Music, Trophy } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProjectWithUser = {
  id: number;
  title: string;
  description: string;
  genre: string;
  mp3Url: string;
  userId: number;
  uploadDate: string;
  votesCount: number;
  currentMonth: string;
  username: string;
};

type CommentWithUser = {
  id: number;
  projectId: number;
  userId: number;
  text: string;
  createdAt: string;
  username: string;
};

export default function Giveaway() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    genre: "",
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("audioUploader", {
    onClientUploadComplete: async (files) => {
      if (files && files.length > 0) {
        const file = files[0];
        if (!file) return;
        
        // Save project metadata to database
        const response = await apiRequest("POST", "/api/giveaway/projects", {
          title: uploadForm.title.trim(),
          description: uploadForm.description.trim(),
          genre: uploadForm.genre,
          mp3Url: file.url,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
        setUploadDialogOpen(false);
        setUploadForm({
          title: "",
          description: "",
          genre: "",
          file: null,
        });
        setIsUploading(false);
        
        toast({
          title: "Projekat uploadovan",
          description: "Vaš projekat je uspešno dodat u konkurs!",
        });
      }
    },
    onUploadError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Greška pri upload-u",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: settings } = useQuery<{ isActive: boolean }>({
    queryKey: ["/api/giveaway/settings"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithUser[]>({
    queryKey: ["/api/giveaway/projects"],
  });

  useEffect(() => {
    if (user && !user.termsAccepted) {
      setShowTermsDialog(true);
    }
  }, [user]);

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/accept-terms");
    },
    onSuccess: async () => {
      // Refetch user data to get updated termsAccepted status
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/user"] });
      setShowTermsDialog(false);
      toast({
        title: "Pravila prihvaćena",
        description: "Sada možete učestvovati u giveaway-u!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", "/api/giveaway/vote", { projectId });
      return await response.json() as { action: 'added' | 'removed' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
      if (data.action === 'added') {
        toast({
          title: "Glas dodat",
          description: "Uspešno ste glasali za projekat!",
        });
      } else {
        toast({
          title: "Glas uklonjen",
          description: "Uspešno ste uklonili glas",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ projectId, text }: { projectId: number; text: string }) => {
      await apiRequest("POST", "/api/giveaway/comments", { projectId, text });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects", variables.projectId, "comments"] });
      setCommentTexts({ ...commentTexts, [variables.projectId]: "" });
      toast({
        title: "Komentar dodat",
        description: "Vaš komentar je uspešno dodat!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUploadSubmit = async () => {
    if (!user?.termsAccepted) {
      toast({
        title: "Morate prihvatiti pravila",
        description: "Pre upload-a morate prihvatiti pravila korišćenja",
        variant: "destructive",
      });
      return;
    }

    if (!uploadForm.file || !uploadForm.title.trim() || !uploadForm.genre) {
      toast({
        title: "Popunite sva polja",
        description: "Sva polja su obavezna",
        variant: "destructive",
      });
      return;
    }

    if (uploadForm.title.trim().length < 3) {
      toast({
        title: "Naslov je prekratak",
        description: "Naslov mora imati najmanje 3 karaktera",
        variant: "destructive",
      });
      return;
    }

    if (!uploadForm.file.type.startsWith('audio/')) {
      toast({
        title: "Nevažeći fajl",
        description: "Fajl mora biti audio format (MP3, WAV, itd.)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (uploadForm.file.size > maxSize) {
      toast({
        title: "Fajl je prevelik",
        description: "Maksimalna veličina je 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      await startUpload([uploadForm.file]);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Greška",
        description: "Došlo je do greške pri upload-u",
        variant: "destructive",
      });
    }
  };

  const handleAcceptTerms = () => {
    if (termsAccepted) {
      acceptTermsMutation.mutate();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadForm({ ...uploadForm, file });
  };

  const handleVote = (projectId: number) => {
    if (!user?.termsAccepted) {
      toast({
        title: "Morate prihvatiti pravila",
        description: "Pre glasanja morate prihvatiti pravila korišćenja",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate(projectId);
  };

  const handleComment = (projectId: number) => {
    const text = commentTexts[projectId]?.trim();
    if (!text) return;

    if (!user?.termsAccepted) {
      toast({
        title: "Morate prihvatiti pravila",
        description: "Pre komentarisanja morate prihvatiti pravila korišćenja",
        variant: "destructive",
      });
      return;
    }

    commentMutation.mutate({ projectId, text });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Giveaway - Studio LeFlow | Glasaj za Najbolje Pesme"
        description="Učestvuj u mesečnom giveaway-u Studio LeFlow-a! Podeli svoju pesmu, glasaj za omiljene pesme, osvoji nagrade. Besplatno snimanje, miks i mastering za najbolje projekte."
        keywords={[
          "studio leflow giveaway",
          "leflow studio giveaway",
          "leflow giveaway",
          "muzički giveaway beograd",
          "besplatno snimanje pesme",
          "glasanje za pesme",
          "muzički konkurs beograd",
          "pobedi snimanje pesme",
          "mesečni muzički konkurs"
        ]}
      />
      <AlertDialog open={showTermsDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-terms">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold" data-testid="text-terms-title">
              Pravila Korišćenja Giveaway Platforme
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Pre nego što nastavite, morate prihvatiti pravila:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3" data-testid="text-rule-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Zabranjeno je downloadovanje MP3 fajlova drugih korisnika</span>
              </li>
              <li className="flex items-start gap-3" data-testid="text-rule-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Zabranjeno je deljenje projekata izvan platforme</span>
              </li>
              <li className="flex items-start gap-3" data-testid="text-rule-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Kršenje pravila dovodi do permanentnog bana</span>
              </li>
              <li className="flex items-start gap-3" data-testid="text-rule-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Vaši upload-ovani projekti će biti dostupni 30 dana</span>
              </li>
            </ul>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">
                Za detaljne informacije pročitajte:{" "}
                <Link href="/uslovi-koriscenja" data-testid="link-full-terms">
                  <span className="text-primary hover:underline font-medium cursor-pointer">
                    Kompletne Uslove Korišćenja
                  </span>
                </Link>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                data-testid="checkbox-accept-terms"
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Prihvatam pravila i uslove
              </label>
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              onClick={handleAcceptTerms}
              disabled={!termsAccepted || acceptTermsMutation.isPending}
              data-testid="button-accept-terms"
            >
              {acceptTermsMutation.isPending ? "Prihvatanje..." : "Prihvati"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium" data-testid="text-contest-badge">Mesečni Konkurs</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight font-[Montserrat]" data-testid="text-hero-title">
            Mesečni Giveaway
          </h1>

          <p className="text-xl md:text-2xl mb-4 text-muted-foreground max-w-3xl mx-auto">
            Pobedi Besplatnu Produkciju!
          </p>

          <p className="text-lg mb-12 text-muted-foreground max-w-2xl mx-auto">
            Uploaduj svoj projekat, glasaj za najbolje, i osvoji profesionalnu produkciju u Studio LeFlow
          </p>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                disabled={!settings?.isActive || !user}
                className="text-lg px-8"
                data-testid="button-upload-project"
              >
                <Upload className="mr-2 w-5 h-5" />
                {!user 
                  ? "Prijavite se da upload-ujete"
                  : settings?.isActive 
                    ? "Uploaduj Projekat" 
                    : "Giveaway Trenutno Neaktivan"
                }
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" data-testid="dialog-upload">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" data-testid="text-upload-title">
                  Uploaduj Projekat
                </DialogTitle>
                <DialogDescription>
                  Popunite formu da dodate vaš projekat u mesečni konkurs.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file" className="text-sm font-medium">
                    MP3 Fajl <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="file"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    data-testid="input-upload-file"
                  />
                  {uploadForm.file && (
                    <p className="text-xs text-muted-foreground" data-testid="text-file-name">
                      {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Naslov Projekta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Unesite naslov..."
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    disabled={isUploading}
                    data-testid="input-upload-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Opis (opciono)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Kratko opišite svoj projekat..."
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    disabled={isUploading}
                    className="resize-none min-h-[100px]"
                    data-testid="input-upload-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre" className="text-sm font-medium">
                    Žanr <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={uploadForm.genre}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, genre: value })}
                    disabled={isUploading}
                  >
                    <SelectTrigger id="genre" data-testid="select-upload-genre">
                      <SelectValue placeholder="Izaberite žanr..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hip Hop" data-testid="genre-option-hiphop">Hip Hop</SelectItem>
                      <SelectItem value="Trap" data-testid="genre-option-trap">Trap</SelectItem>
                      <SelectItem value="R&B" data-testid="genre-option-rnb">R&B</SelectItem>
                      <SelectItem value="Pop" data-testid="genre-option-pop">Pop</SelectItem>
                      <SelectItem value="Rock" data-testid="genre-option-rock">Rock</SelectItem>
                      <SelectItem value="Electronic" data-testid="genre-option-electronic">Electronic</SelectItem>
                      <SelectItem value="Ostalo" data-testid="genre-option-other">Ostalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  disabled={isUploading}
                  data-testid="button-upload-cancel"
                >
                  Otkaži
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !uploadForm.file || !uploadForm.title.trim() || !uploadForm.genre}
                  data-testid="button-upload-submit"
                >
                  {isUploading ? "Upload..." : "Upload Projekat"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!settings?.isActive && (
            <p className="text-sm text-muted-foreground mt-4" data-testid="text-inactive-notice">
              Upload projekata je trenutno onemogućen. Pratite nas za najave sledećeg konkursa!
            </p>
          )}
          
          {!user && (
            <p className="text-sm text-muted-foreground mt-4" data-testid="text-login-notice">
              Prijavite se ili registrujte da učestvujete u giveaway-u.
            </p>
          )}
        </div>
      </section>

      <section className="py-20 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight" data-testid="text-projects-title">
              Konkursni Projekti
            </h2>
            <p className="text-muted-foreground">
              Slušajte i glasajte za vaše omiljene projekte. Projekat sa najviše glasova osvaja!
            </p>
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <FadeInWhenVisible key={i} delay={i * 0.1}>
                  <Card className="animate-pulse">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                </FadeInWhenVisible>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground" data-testid="text-no-projects">
                  Još nema projekata. Budite prvi koji će uploadovati!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {projects.map((project, index) => (
                <FadeInWhenVisible key={project.id} delay={index * 0.1}>
                  <ProjectCard
                    project={project}
                    onVote={handleVote}
                    onComment={handleComment}
                    commentText={commentTexts[project.id] || ""}
                    onCommentChange={(text) => setCommentTexts({ ...commentTexts, [project.id]: text })}
                    currentUserId={user?.id}
                  />
                </FadeInWhenVisible>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectCard({
  project,
  onVote,
  onComment,
  commentText,
  onCommentChange,
  currentUserId,
}: {
  project: ProjectWithUser;
  onVote: (id: number) => void;
  onComment: (id: number) => void;
  commentText: string;
  onCommentChange: (text: string) => void;
  currentUserId?: number;
}) {
  const [showComments, setShowComments] = useState(false);

  const { data: comments = [], isLoading: commentsLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/giveaway/projects", project.id, "comments"],
    enabled: showComments,
  });

  return (
    <Card className="overflow-visible hover-elevate active-elevate-2" data-testid={`card-project-${project.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2" data-testid={`text-project-title-${project.id}`}>
              {project.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span data-testid={`text-project-author-${project.id}`}>
                od <span className="font-semibold">{project.username}</span>
              </span>
              <span className="text-muted-foreground">•</span>
              <span data-testid={`text-project-date-${project.id}`}>
                {format(new Date(project.uploadDate), "dd.MM.yyyy")}
              </span>
            </CardDescription>
          </div>
          <Badge variant="secondary" data-testid={`badge-genre-${project.id}`}>
            {project.genre}
          </Badge>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2" data-testid={`text-project-description-${project.id}`}>
            {project.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 
          NOTE: controlsList="nodownload" provides basic download prevention,
          but technical users can still inspect network requests to access MP3 URLs.
          Real enforcement relies on:
          1. Legal terms that users must accept before accessing giveaway
          2. Social accountability (usernames are public)
          3. Ban consequences for violations
          Future: Implement proxy streaming with signed URLs for stronger protection
        */}
        <div className="bg-muted/30 rounded-lg p-4">
          <audio
            controls
            controlsList="nodownload"
            preload="metadata"
            className="w-full h-12"
            style={{ outline: 'none' }}
            src={project.mp3Url}
            data-testid={`audio-player-${project.id}`}
          />
        </div>

        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant="outline"
              size="default"
              onClick={() => onVote(project.id)}
              className="gap-2"
              data-testid={`button-vote-${project.id}`}
            >
              <Heart className="w-4 h-4" />
              <span data-testid={`text-votes-count-${project.id}`}>{project.votesCount}</span>
            </Button>
          </motion.div>

          <Button
            variant="ghost"
            size="default"
            onClick={() => setShowComments(!showComments)}
            className="gap-2"
            data-testid={`button-toggle-comments-${project.id}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Komentari ({comments.length})</span>
          </Button>
        </div>

        {showComments && (
          <div className="space-y-4">
            <Separator />

            {commentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg bg-muted/30"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" data-testid={`text-comment-author-${comment.id}`}>
                        {comment.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm" data-testid={`text-comment-text-${comment.id}`}>
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid={`text-no-comments-${project.id}`}>
                Još nema komentara. Budite prvi!
              </p>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Dodajte komentar..."
                value={commentText}
                onChange={(e) => onCommentChange(e.target.value)}
                className="resize-none min-h-[80px]"
                data-testid={`input-comment-${project.id}`}
              />
              <Button
                size="icon"
                onClick={() => onComment(project.id)}
                disabled={!commentText.trim()}
                data-testid={`button-submit-comment-${project.id}`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
