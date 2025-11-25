import { Construction, Lock, User, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera"),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
});

const codeSchema = z.object({
  code: z.string().length(6, "Kod mora imati tačno 6 cifara"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type CodeFormData = z.infer<typeof codeSchema>;

type DialogView = "credentials" | "verification";

export default function MaintenancePage() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [dialogView, setDialogView] = useState<DialogView>("credentials");
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onCredentialsSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-login-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Greška pri slanju koda");
      }

      setUserId(result.userId);
      setDialogView("verification");
      toast({
        title: "Kod poslat!",
        description: "Proverite svoj email za verifikacioni kod.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Neispravno korisničko ime ili lozinka.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCodeSubmit = async (data: CodeFormData) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Neispravan session. Pokušajte ponovo.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: data.code }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Neispravan kod");
      }

      queryClient.setQueryData(["/api/user"], result.user);
      setShowLoginDialog(false);
      resetDialog();
      toast({
        title: "Uspešno!",
        description: "Prijavili ste se kao admin.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška pri verifikaciji",
        description: error.message || "Neispravan ili istekao kod.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setDialogView("credentials");
    setUserId(null);
    loginForm.reset();
    codeForm.reset();
  };

  const handleDialogClose = (open: boolean) => {
    setShowLoginDialog(open);
    if (!open) {
      resetDialog();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-8">
            <img
              src="/attached_assets/logo/studioleflow-transparent.png"
              alt="Studio LeFlow"
              className="h-32 w-auto filter invert"
            />
          </div>

          <Construction className="w-24 h-24 text-primary mx-auto mb-6" />
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-[Montserrat]">
            Sajt je u pripremi
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Trenutno radimo na unapređenju naših servisa. Uskoro se vraćamo!
          </p>

          <div className="bg-muted rounded-lg p-6 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              Možete nas kontaktirati putem:
            </p>
            <div className="mt-4 space-y-2">
              <p className="font-medium">
                Email: <a href="mailto:info@studioleflow.com" className="text-primary hover:underline">info@studioleflow.com</a>
              </p>
              <p className="font-medium">
                Telefon: <a href="tel:+381637347023" className="text-primary hover:underline">+381 63 734 7023</a>
              </p>
              <p className="font-medium">
                Instagram: <a href="https://instagram.com/studioleflow" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@studioleflow</a>
              </p>
            </div>
          </div>

          <div className="mt-12">
            <button
              onClick={() => setShowLoginDialog(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Admin Prijava
            </button>
          </div>
        </motion.div>
      </div>

      <Dialog open={showLoginDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          {dialogView === "credentials" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Admin Prijava
                </DialogTitle>
                <DialogDescription>
                  Unesite kredencijale. Verifikacioni kod će biti poslat na vaš email.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onCredentialsSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Korisničko ime ili Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Unesite korisničko ime ili email"
                              {...field}
                              className="pl-10"
                              autoComplete="username"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lozinka</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              placeholder="Unesite lozinku"
                              {...field}
                              className="pl-10"
                              autoComplete="current-password"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Slanje koda..." : "Pošalji verifikacioni kod"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {dialogView === "verification" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Verifikacioni Kod
                </DialogTitle>
                <DialogDescription>
                  Unesite 6-cifreni kod koji smo poslali na vaš email.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-6">
                  <FormField
                    control={codeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verifikacioni kod</FormLabel>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} {...field} disabled={isLoading}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setDialogView("credentials")}
                      disabled={isLoading}
                    >
                      Nazad
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? "Verifikacija..." : "Verifikuj"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
