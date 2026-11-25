import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Eye, EyeOff, Music, Zap, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import leflowLogo from "@/assets/leflow-logo.png";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { VerificationModal } from "@/components/VerificationModal";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12C3.25 21.3 7.31 24 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.61H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.12Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4 3.12C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

// Shared look for every auth view (sign in / sign up / password reset):
// a standalone page - small logo top-left, one secondary action top-right,
// a narrow centered column, with the animated brand panel as the right half
// on desktop. No site header/footer (see AUTH_PATHS in App.tsx).
const FIELD = "h-11";
const SUBMIT = "w-full h-11 font-semibold";
const LINK = "text-foreground font-medium underline underline-offset-4 decoration-border hover:decoration-foreground";

// Right half on desktop: the studio's animated brand panel (photo, floating
// logo with rotating rings and glow, frequency lines, particles). The owner
// asked to keep this - it's part of the brand, not decoration to strip.
function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white bg-black">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-cover bg-center saturate-[0.25]"
        style={{ backgroundImage: "url('/equipment/midi-workstation.jpg')" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 150% 100% at 100% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 40%, transparent 70%)" }}
      />

      {/* Frequency lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{ top: `${20 + i * 15}%`, width: "100%" }}
            animate={{ x: ["-100%", "100%"], opacity: [0, 0.5, 0] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.8, ease: "linear" }}
          />
        ))}
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{ left: `${10 + (i * 7) % 80}%`, top: `${20 + (i * 11) % 60}%` }}
            animate={{ y: [0, -30, 0], x: [0, Math.sin(i) * 10, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 w-full gap-8">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="relative"
        >
          <motion.div
            className="absolute inset-0 -m-8 border border-primary/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ width: "calc(100% + 4rem)", height: "calc(100% + 4rem)" }}
          />
          <motion.div
            className="absolute inset-0 -m-12 border border-primary/10 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            style={{ width: "calc(100% + 6rem)", height: "calc(100% + 6rem)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150"
          />
          <motion.img
            src={leflowLogo}
            alt="Studio LeFlow"
            className="w-32 h-auto relative z-10 invert object-contain"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-3"
        >
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight">Studio LeFlow</h2>
          <p className="text-lg text-white/70">Muzička produkcija, Beograd</p>
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-lg max-w-md mx-auto leading-relaxed text-white/75"
        >
          Pratite svoju pesmu od snimanja do isporuke i budite deo zajednice izvođača.
        </motion.p>

        <div className="grid grid-cols-1 gap-3 max-w-sm w-full mt-2">
          {[
            { icon: Music, title: "Status pesme", desc: "Snimanje, mix, mastering, isporuka" },
            { icon: Zap, title: "Pogodi Pesmu", desc: "Dnevna igra i nedeljna rang lista" },
            { icon: CheckCircle2, title: "Zajednica", desc: "Objave, saradnje i giveaway" },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 + index * 0.15, ease: "easeOut" }}
              className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-white">{feature.title}</p>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthShell({ children, topAction }: { children: ReactNode; topAction: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-5 sm:px-8 h-16 mt-[env(safe-area-inset-top)]">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Studio LeFlow - početna">
            <img src={leflowLogo} alt="" draggable={false} className="h-7 w-auto dark:invert select-none" />
            <span className="text-sm font-semibold hidden sm:inline">Studio LeFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {topAction}
          </div>
        </header>
        <main className="flex-1 flex justify-center px-5 pt-8 sm:pt-14 pb-16">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
        <footer className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Studio LeFlow
          <span className="mx-2">&middot;</span>
          <Link href="/pravila" className="hover:text-foreground">Pravila</Link>
          <span className="mx-2">&middot;</span>
          <Link href="/uslovi-koriscenja" className="hover:text-foreground">Uslovi korišćenja</Link>
        </footer>
      </div>
      <AuthBrandPanel />
    </div>
  );
}

function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-6" aria-hidden="true">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">ili</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// useGoogleLogin calls window.google.accounts.oauth2.initTokenClient with the client ID as soon as
// the GSI script loads, and that call throws synchronously if the ID is empty - crashing the tree
// via React's error boundary. So the hook must never be called at all when unconfigured, not just
// gated behind a click handler. Hence two separate components instead of one conditional branch.
function GoogleAuthButtonUnconfigured({ label }: { label: string }) {
  const { toast } = useToast();
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-medium gap-2.5"
        onClick={() => {
          toast({
            title: "Google prijava nedostupna",
            description: "Google prijava trenutno nije podešena. Pokušajte ponovo kasnije.",
            variant: "destructive",
          });
        }}
        data-testid="button-google-auth"
      >
        <GoogleIcon className="w-4 h-4" />
        {label}
      </Button>
    </>
  );
}

function GoogleAuthButtonConfigured({ label }: { label: string }) {
  const { googleLoginMutation } = useAuth();
  const { toast } = useToast();

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      googleLoginMutation.mutate(tokenResponse.access_token);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Google prijava nije uspela. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-medium gap-2.5"
        disabled={googleLoginMutation.isPending}
        onClick={() => login()}
        data-testid="button-google-auth"
      >
        <GoogleIcon className="w-4 h-4" />
        {googleLoginMutation.isPending ? "Povezivanje..." : label}
      </Button>
    </>
  );
}

function GoogleAuthButton({ label }: { label: string }) {
  const clientIdConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return clientIdConfigured
    ? <GoogleAuthButtonConfigured label={label} />
    : <GoogleAuthButtonUnconfigured label={label} />;
}

function PasswordInput({ placeholder, autoComplete, disabled, "data-testid": dataTestId, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { "data-testid"?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="h-11 pr-10"
        data-testid={dataTestId}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Sakrij lozinku" : "Prikaži lozinku"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

const loginSchema = z.object({
  username: z.string().min(1, "Unesite korisničko ime ili email adresu"),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
  rememberMe: z.boolean().optional().default(false),
});

const registerSchema = insertUserSchema.extend({
  passwordConfirm: z.string(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Morate prihvatiti uslove korišćenja",
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Lozinke se ne poklapaju",
  path: ["passwordConfirm"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Unesite validnu email adresu"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Unesite validnu email adresu"),
  token: z.string().length(6, "Kod mora imati tačno 6 cifara"),
  newPassword: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lozinke se ne poklapaju",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type ViewMode = "auth" | "forgot-password" | "reset-password" | "reset-success";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  
  // Which form shows is driven by the URL, so /prijava and /registracija are
  // real, shareable addresses and the browser back button works.
  const activeTab = location === "/registracija" ? "register" : "login";
  const [viewMode, setViewMode] = useState<ViewMode>("auth");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{ id: number; email: string } | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState("");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      passwordConfirm: "",
      termsAccepted: false,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user !== null) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = async (data: LoginFormData) => {
    await loginMutation.mutateAsync(data);
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    const { passwordConfirm, ...registerData } = data;
    try {
      const result = await registerMutation.mutateAsync(registerData);
      setRegisteredUser({ id: result.id, email: result.email });
      setShowVerificationModal(true);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const handleVerificationSuccess = () => {
    setShowVerificationModal(false);
    setRegisteredUser(null);
    setLocation("/");
  };

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      return await apiRequest("POST", "/api/forgot-password", data);
    },
    onSuccess: () => {
      const email = forgotPasswordForm.getValues("email");
      setResetUserEmail(email);
      // Pre-fill email in reset password form
      resetPasswordForm.setValue("email", email);
      setViewMode("reset-password");
      toast({
        title: "Email poslat",
        description: "Kod za resetovanje lozinke je poslat na vašu email adresu.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Došlo je do greške. Molimo pokušajte ponovo.",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      return await apiRequest("POST", "/api/reset-password", {
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setViewMode("reset-success");
      toast({
        title: "Uspešno!",
        description: "Lozinka je uspešno promenjena. Sada se možete prijaviti.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Došlo je do greške. Molimo pokušajte ponovo.",
      });
    },
  });

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    await forgotPasswordMutation.mutateAsync(data);
  };

  const onResetPasswordSubmit = async (data: ResetPasswordFormData) => {
    await resetPasswordMutation.mutateAsync(data);
  };

  const handleBackToLogin = () => {
    setViewMode("auth");
    setLocation("/prijava");
    forgotPasswordForm.reset();
    resetPasswordForm.reset();
  };

  const goTo = (tab: "login" | "register") => {
    setViewMode("auth");
    setLocation(tab === "register" ? "/registracija" : "/prijava");
  };

  // Forgot Password View
  if (viewMode === "forgot-password") {
    return (
      <AuthShell topAction={<Button variant="outline" size="sm" className="h-9 px-4" onClick={handleBackToLogin}>Prijava</Button>}>
        <SEO title="Zaboravljena lozinka - Studio LeFlow" description="Promena lozinke za Studio LeFlow nalog." noIndex={true} />
        <AuthHeading title="Zaboravljena lozinka" subtitle="Unesite email adresu naloga. Poslaćemo vam kod za promenu lozinke." />
        <Form {...forgotPasswordForm}>
          <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-5">
            <FormField
              control={forgotPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" className={FIELD} data-testid="input-forgot-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className={SUBMIT} disabled={forgotPasswordMutation.isPending} data-testid="button-send-code">
              {forgotPasswordMutation.isPending ? "Slanje..." : "Pošalji kod"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Setili ste se?{" "}
          <button type="button" onClick={handleBackToLogin} className={LINK} data-testid="button-back-login">Nazad na prijavu</button>
        </p>
      </AuthShell>
    );
  }

  // Reset Password View
  if (viewMode === "reset-password") {
    return (
      <AuthShell topAction={<Button variant="outline" size="sm" className="h-9 px-4" onClick={handleBackToLogin}>Prijava</Button>}>
        <SEO title="Nova lozinka - Studio LeFlow" description="Promena lozinke za Studio LeFlow nalog." noIndex={true} />
        <AuthHeading
          title="Nova lozinka"
          subtitle={resetUserEmail ? <>Kod smo poslali na <span className="text-foreground font-medium">{resetUserEmail}</span>.</> : "Unesite kod iz emaila i novu lozinku."}
        />
        <Form {...resetPasswordForm}>
          <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-5">
            <FormField
              control={resetPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sr-only">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" readOnly tabIndex={-1} data-testid="input-reset-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetPasswordForm.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod iz emaila</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className={cn(FIELD, "font-mono text-lg tracking-[0.4em]")}
                      data-testid="input-reset-token"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetPasswordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova lozinka</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" data-testid="input-new-password" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Najmanje 8 karaktera.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetPasswordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponovite lozinku</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" data-testid="input-confirm-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className={SUBMIT} disabled={resetPasswordMutation.isPending} data-testid="button-reset-password">
              {resetPasswordMutation.isPending ? "Čuvanje..." : "Sačuvaj novu lozinku"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Kod nije stigao?{" "}
          <button type="button" onClick={() => setViewMode("forgot-password")} className={LINK} data-testid="button-resend-code">Pošalji ponovo</button>
        </p>
      </AuthShell>
    );
  }

  // Reset Success View
  if (viewMode === "reset-success") {
    return (
      <AuthShell topAction={null}>
        <SEO title="Lozinka promenjena - Studio LeFlow" description="Lozinka je promenjena." noIndex={true} />
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto mb-6">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <AuthHeading title="Lozinka je promenjena" subtitle="Sada se možete prijaviti sa novom lozinkom." />
          <Button className={SUBMIT} onClick={handleBackToLogin} data-testid="button-go-to-login">
            Prijavite se
          </Button>
        </div>
      </AuthShell>
    );
  }

  const isLogin = activeTab === "login";

  // Main Auth View (Login & Register)
  return (
    <AuthShell
      topAction={
        <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => goTo(isLogin ? "register" : "login")} data-testid={isLogin ? "tab-register" : "tab-login"}>
          {isLogin ? "Registracija" : "Prijava"}
        </Button>
      }
    >
      <SEO
        title={isLogin ? "Prijava - Studio LeFlow" : "Registracija - Studio LeFlow"}
        description="Prijavite se ili napravite nalog na Studio LeFlow."
        noIndex={true}
      />

      {isLogin ? (
        <>
          <AuthHeading title="Prijavite se na Studio LeFlow" />
          <GoogleAuthButton label="Nastavi sa Google nalogom" />
          <OrDivider />
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ili korisničko ime</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" className={FIELD} data-testid="input-username" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Lozinka</FormLabel>
                      <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                        onClick={() => setViewMode("forgot-password")}
                        data-testid="link-forgot-password"
                      >
                        Zaboravljena lozinka?
                      </button>
                    </div>
                    <FormControl>
                      <PasswordInput autoComplete="current-password" data-testid="input-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-remember-me" />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">Zapamti me na ovom uređaju</FormLabel>
                  </FormItem>
                )}
              />
              <Button type="submit" className={SUBMIT} disabled={loginMutation.isPending} data-testid="button-login">
                {loginMutation.isPending ? "Prijavljivanje..." : "Prijavi se"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nemate nalog?{" "}
            <button type="button" onClick={() => goTo("register")} className={LINK}>Napravite ga besplatno</button>
          </p>
        </>
      ) : (
        <>
          <AuthHeading
            title="Napravite nalog"
            subtitle="Besplatno. Pratite status svoje pesme, igrajte Pogodi Pesmu i budite deo zajednice."
          />
          <GoogleAuthButton label="Nastavi sa Google nalogom" />
          <OrDivider />
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" className={FIELD} data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Korisničko ime</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" className={FIELD} data-testid="input-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lozinka</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" data-testid="input-password" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Najmanje 8 karaktera.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponovite lozinku</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" data-testid="input-password-confirm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-2.5 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" data-testid="checkbox-terms" />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-normal cursor-pointer leading-snug">
                        Prihvatam{" "}
                        <Link href="/uslovi-koriscenja" className={LINK} data-testid="link-terms">uslove korišćenja</Link>
                        {" "}i{" "}
                        <Link href="/pravila" className={LINK}>pravila saradnje</Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className={SUBMIT} disabled={registerMutation.isPending} data-testid="button-register">
                {registerMutation.isPending ? "Pravljenje naloga..." : "Napravi nalog"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Već imate nalog?{" "}
            <button type="button" onClick={() => goTo("login")} className={LINK}>Prijavite se</button>
          </p>
        </>
      )}

      {registeredUser && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          userId={registeredUser.id}
          email={registeredUser.email}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </AuthShell>
  );
}
