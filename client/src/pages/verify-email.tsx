import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Music, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Get userId and email from URL params (passed after registration)
  // Use useEffect to safely access window.location after component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setUserId(params.get("userId"));
      setEmail(params.get("email"));
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Greška",
        description: "UserId nije pronađen. Molimo registrujte se ponovo.",
        variant: "destructive",
      });
      return;
    }

    if (verificationCode.length !== 6) {
      toast({
        title: "Greška",
        description: "Verifikacioni kod mora imati 6 cifara",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      await apiRequest("POST", "/api/verify-email", { 
        userId: parseInt(userId), 
        code: verificationCode 
      });
      
      toast({
        title: "Uspešno!",
        description: "Vaš email je verifikovan. Dobrodošli u Studio LeFlow!",
      });
      
      // Redirect to home or dashboard after successful verification
      setTimeout(() => setLocation("/"), 1500);
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nevažeći verifikacioni kod",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Greška",
        description: "Email nije pronađen",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      await apiRequest("POST", "/api/resend-verification", { email });
      toast({
        title: "Uspešno!",
        description: "Novi verifikacioni kod je poslat na Vaš email",
      });
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju koda",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            Studio LeFlow
          </CardTitle>
          <CardDescription className="text-base">
            Verifikujte Vašu Email Adresu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2 mb-6">
            <p className="text-sm text-muted-foreground">
              Poslali smo 6-cifreni verifikacioni kod na:
            </p>
            <p className="font-semibold text-base">{email}</p>
            <p className="text-xs text-muted-foreground">
              Proverite inbox i spam folder
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verifikacioni Kod</label>
              <Input
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-bold"
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? "Verifikujem..." : "Potvrdi Email"}
            </Button>
          </form>

          <div className="pt-4 border-t">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Niste dobili kod?
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? "animate-spin" : ""}`} />
                {isResending ? "Šaljem..." : "Pošalji Novi Kod"}
              </Button>
            </div>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={() => setLocation("/auth")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Nazad na prijavu
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
