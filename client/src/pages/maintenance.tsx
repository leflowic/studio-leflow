import { Lock, User, KeyRound, MessageCircle, Phone, Mail, Instagram, ArrowUpRight } from "lucide-react";
import leflowLogo from "@/assets/leflow-logo.png";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, setAuthToken } from "@/lib/queryClient";
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
  const [showBypassDialog, setShowBypassDialog] = useState(false);
  const [bypassCode, setBypassCode] = useState("");
  const [bypassError, setBypassError] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const logoTapTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const handleLogoTap = () => {
    const newCount = logoTaps + 1;
    setLogoTaps(newCount);
    if (logoTapTimer[0]) clearTimeout(logoTapTimer[0]);
    logoTapTimer[0] = setTimeout(() => setLogoTaps(0), 2000);
    if (newCount >= 5) {
      setLogoTaps(0);
      setShowBypassDialog(true);
      setBypassCode("");
      setBypassError(false);
    }
  };

  const handleBypassSubmit = () => {
    if (bypassCode === "14881312") {
      localStorage.setItem("maintenance_bypass", "1");
      window.location.reload();
    } else {
      setBypassError(true);
      setBypassCode("");
    }
  };

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

      setAuthToken(result.token);
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

  // Status-page style: plain, factual, what works and how to reach us.
  const status: Array<{ label: string; note: string; ok: boolean; href?: string }> = [
    { label: "Studio i termini", note: "Radi normalno", ok: true },
    { label: "Upiti i dogovori", note: "WhatsApp, telefon, email", ok: true },
    { label: "Pesme iz studija", note: "music.studioleflow.com", ok: true, href: "https://music.studioleflow.com" },
    { label: "Sajt i korisnički nalozi", note: "Održavanje u toku", ok: false },
  ];
  const contacts = [
    { icon: MessageCircle, label: "WhatsApp", value: "+381 63 734 7023", href: "https://wa.me/381637347023", external: true },
    { icon: Phone, label: "Telefon", value: "+381 63 734 7023", href: "tel:+381637347023", external: false },
    { icon: Mail, label: "Email", value: "info@studioleflow.com", href: "mailto:info@studioleflow.com", external: false },
    { icon: Instagram, label: "Instagram", value: "@studioleflow", href: "https://instagram.com/studioleflow", external: true },
  ];

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col">
      {/* thin indeterminate bar: work in progress, nothing more */}
      <div className="h-px w-full overflow-hidden bg-border" aria-hidden="true">
        <div className="maint-slide h-full w-1/3 bg-primary" />
      </div>
      <style>{`@keyframes maint-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .maint-slide { animation: maint-slide 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .maint-slide { animation: none; } }`}</style>

      <header className="border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button type="button" onClick={handleLogoTap} className="flex items-center gap-3 select-none" aria-label="Studio LeFlow">
            <img src={leflowLogo} alt="" draggable={false} className="h-7 w-auto dark:invert" />
            <span className="font-semibold tracking-tight">Studio LeFlow</span>
          </button>
          <button
            onClick={() => setShowLoginDialog(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin prijava
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <motion.div
          className="max-w-6xl w-full mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-14 lg:gap-20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <section>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Planirano održavanje
            </p>
            <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.05]">
              Sajt je trenutno u održavanju
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              Radimo planirane izmene i uskoro se vraćamo. Studio radi normalno - za termine, upite i dogovore javite nam se direktno.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/381637347023"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Pišite nam na WhatsApp
              </a>
              <a
                href="tel:+381637347023"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                <Phone className="w-4 h-4" /> Pozovite
              </a>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold">Status</h2>
                <span className="font-mono text-[11px] text-muted-foreground">studioleflow.com</span>
              </div>
              <ul className="divide-y divide-border">
                {status.map(s => {
                  const body = (
                    <>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{s.label}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{s.note}</span>
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${s.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {s.ok ? "Dostupno" : "Održavanje"}
                      </span>
                    </>
                  );
                  return (
                    <li key={s.label}>
                      {s.href ? (
                        <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">{body}</a>
                      ) : (
                        <div className="flex items-center justify-between gap-4 px-5 py-3.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Kontakt</h2>
              </div>
              <ul className="divide-y divide-border">
                {contacts.map(c => (
                  <li key={c.label}>
                    <a
                      href={c.href}
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <c.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground w-20 shrink-0">{c.label}</span>
                      <span className="text-sm font-medium truncate flex-1">{c.value}</span>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </motion.div>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Studio LeFlow</span>
          <span>Beograd, Srbija</span>
        </div>
      </footer>

      <Dialog open={showBypassDialog} onOpenChange={(open) => { setShowBypassDialog(open); setBypassCode(""); setBypassError(false); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Pristupni kod
            </DialogTitle>
            <DialogDescription>
              Unesite kod za privremeni pristup sajtu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Kod..."
              value={bypassCode}
              onChange={(e) => { setBypassCode(e.target.value); setBypassError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleBypassSubmit()}
              autoFocus
            />
            {bypassError && <p className="text-sm text-destructive">Neispravan kod.</p>}
            <Button className="w-full" onClick={handleBypassSubmit}>Potvrdi</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoginDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          {dialogView === "credentials" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Admin prijava
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
                        <FormLabel>Korisničko ime ili email</FormLabel>
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
                  Verifikacioni kod
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
                            <InputOTP maxLength={6} {...field} disabled={isLoading} autoComplete="one-time-code">
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
