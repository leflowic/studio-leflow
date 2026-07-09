import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { MessageSquareHeart, Check, X } from "lucide-react";
import { format } from "date-fns";

type TestimonialEntry = {
  id: number;
  userId: number;
  jobId: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  jobTitle: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Na čekanju",
  approved: "Odobreno",
  rejected: "Odbijeno",
};

export function TestimonialsTab() {
  const { toast } = useToast();

  const { data: testimonials, isLoading } = useQuery<TestimonialEntry[]>({
    queryKey: ["/api/admin/testimonials"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      apiRequest("PATCH", `/api/admin/testimonials/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({ title: "Sačuvano" });
    },
    onError: () => toast({ title: "Greška", description: "Izmena nije sačuvana", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (!testimonials?.length) {
    return <EmptyState icon={MessageSquareHeart} text="Još uvek nema poslatih utisaka" />;
  }

  return (
    <div className="space-y-4" data-testid="content-testimonials">
      {testimonials.map(t => (
        <Card key={t.id} data-testid={`card-testimonial-${t.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <AvatarWithInitials src={t.avatarUrl} name={t.username} userId={t.userId} className="w-9 h-9" />
                <div>
                  <p className="text-sm font-medium">{t.username}</p>
                  <p className="text-xs text-muted-foreground">o poslu: {t.jobTitle}</p>
                </div>
              </div>
              <Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>
                {STATUS_LABEL[t.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{t.text}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{format(new Date(t.createdAt), "dd.MM.yyyy HH:mm")}</p>
              {t.status === "pending" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: t.id, status: "approved" })}
                  >
                    <Check className="w-3.5 h-3.5" /> Odobri
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: t.id, status: "rejected" })}
                  >
                    <X className="w-3.5 h-3.5" /> Odbij
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
