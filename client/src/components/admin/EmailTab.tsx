import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, RotateCcw } from "lucide-react";

const EMPTY = { to: "", subject: "", body: "" };

export function EmailTab() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/send-email", form);
    },
    onSuccess: () => {
      toast({ title: "Poslato!", description: `Email je uspešno poslat na ${form.to}.` });
      setForm(EMPTY);
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const canSend = form.to.trim() && form.subject.trim() && form.body.trim();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pošalji Email
          </CardTitle>
          <CardDescription>
            Šalje se iz <strong>podrska@studioleflow.com</strong> sa LeFlow dizajnom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email-to">Primalac</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="korisnik@gmail.com"
              value={form.to}
              onChange={set("to")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Naslov</Label>
            <Input
              id="email-subject"
              placeholder="Studio LeFlow - ..."
              value={form.subject}
              onChange={set("subject")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Tekst poruke</Label>
            <Textarea
              id="email-body"
              placeholder="Pozdrav,&#10;&#10;Pišemo vam u vezi..."
              rows={12}
              value={form.body}
              onChange={set("body")}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Novi redovi se čuvaju. Tekst se automatski ubacuje u LeFlow email template.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!canSend || sendMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {sendMutation.isPending ? "Slanje..." : "Pošalji"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setForm(EMPTY)}
              disabled={sendMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Obriši
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Email se šalje direktno sa Zoho naloga (<strong>podrska@studioleflow.com</strong>).
            Odgovori korisnika stižu u Zoho inbox.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
