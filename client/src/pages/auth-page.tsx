import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Music, ArrowLeft, Mail, Lock, CheckCircle2, Zap, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import leflowLogo from "@/assets/leflow-logo.png";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function PasswordInput({ placeholder, autoComplete, disabled, "data-testid": dataTestId, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { "data-testid"?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pr-10"
        data-testid={dataTestId}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
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
  
  const initialTab = location === "/registracija" ? "register" : "login";
  const [activeTab, setActiveTab] = useState(initialTab);
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
    setActiveTab("login");
    forgotPasswordForm.reset();
    resetPasswordForm.reset();
  };

  // Forgot Password View
  if (viewMode === "forgot-password") {
    return (
      <div className="min-h-screen flex">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Music className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-[Figtree]">Studio LeFlow</h1>
              </div>
              <p className="text-muted-foreground">
                Zaboravili ste lozinku?
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Resetovanje Lozinke
                </CardTitle>
                <CardDescription>
                  Unesite vašu email adresu i poslaćemo vam kod za resetovanje lozinke.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email adresa</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="vas@email.com"
                              autoComplete="email"
                              data-testid="input-forgot-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={forgotPasswordMutation.isPending}
                      data-testid="button-send-code"
                    >
                      {forgotPasswordMutation.isPending ? "Slanje..." : "Pošalji Kod"}
                    </Button>

                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        className="gap-2" 
                        onClick={handleBackToLogin}
                        data-testid="button-back-login"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Nazad na Prijavu
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-50 grayscale"
            style={{ backgroundImage: "url('/equipment/midi-workstation.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 w-full gap-6">
            <div>
              <Mail className="w-24 h-24 mx-auto" />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight font-[Figtree] max-w-2xl mx-auto">
              Resetovanje Lozinke
            </h2>
            
            <p className="text-xl lg:text-2xl max-w-lg mx-auto leading-relaxed text-white/90">
              Brzo i sigurno vratite pristup svom nalogu pomoću verifikacionog koda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Reset Password View
  if (viewMode === "reset-password") {
    return (
      <div className="min-h-screen flex">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Music className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-[Figtree]">Studio LeFlow</h1>
              </div>
              <p className="text-muted-foreground">
                Kreirajte novu lozinku
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Nova Lozinka
                </CardTitle>
                <CardDescription>
                  {resetUserEmail && (
                    <span>
                      Proverite email <strong>{resetUserEmail}</strong> za 6-cifreni kod.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email adresa</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="vas@email.com"
                              autoComplete="email"
                              readOnly
                              disabled
                              className="bg-muted"
                              data-testid="input-reset-email"
                              {...field}
                            />
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
                          <FormLabel>Verifikacioni Kod</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123456"
                              maxLength={6}
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
                          <FormLabel>Nova Lozinka</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Unesite novu lozinku"
                              autoComplete="new-password"
                              data-testid="input-new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Potvrda Lozinke</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Ponovite novu lozinku"
                              autoComplete="new-password"
                              data-testid="input-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={resetPasswordMutation.isPending}
                      data-testid="button-reset-password"
                    >
                      {resetPasswordMutation.isPending ? "Čuvanje..." : "Resetuj Lozinku"}
                    </Button>

                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        className="gap-2" 
                        onClick={() => setViewMode("forgot-password")}
                        data-testid="button-resend-code"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Pošalji Ponovo Kod
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-50 grayscale"
            style={{ backgroundImage: "url('/equipment/midi-workstation.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 w-full gap-6">
            <div>
              <Lock className="w-24 h-24 mx-auto" />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight font-[Figtree] max-w-2xl mx-auto">
              Sigurno Resetovanje
            </h2>
            
            <p className="text-xl lg:text-2xl max-w-lg mx-auto leading-relaxed text-white/90">
              Vaša nova lozinka će biti sigurno šifrovana i zaštićena.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Reset Success View
  if (viewMode === "reset-success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader>
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center" data-testid="text-reset-success">
              Lozinka Promenjena!
            </CardTitle>
            <CardDescription className="text-center">
              Vaša lozinka je uspešno resetovana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Sada se možete prijaviti koristeći novu lozinku.
            </p>

            <Button 
              className="w-full" 
              onClick={handleBackToLogin}
              data-testid="button-go-to-login"
            >
              Prijavite se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Auth View (Login & Register)
  return (
    <>
      <SEO
        title="Prijava i Registracija — Studio LeFlow"
        description="Prijavite se ili kreirajte nalog na Studio LeFlow platformi."
        noIndex={true}
      />
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-black/90" />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-7">
          {/* Logo & title */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 mb-3">
              <Music className="w-7 h-7 text-primary" />
              <h1 className="text-2xl font-bold font-[Figtree]">Studio LeFlow</h1>
            </div>
            <h2 className="text-2xl font-bold">
              {activeTab === "login" ? "Dobro došli nazad" : "Kreiraj nalog"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "login"
                ? <>Nemaš nalog? <button onClick={() => setActiveTab("register")} className="text-primary hover:underline font-medium" data-testid="tab-register">Registruj se</button></>
                : <>Već imaš nalog? <button onClick={() => setActiveTab("login")} className="text-primary hover:underline font-medium" data-testid="tab-login">Prijavi se</button></>
              }
            </p>
          </div>

          {/* Login form */}
          {activeTab === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Korisničko ime ili email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Korisničko ime ili email adresa"
                            autoComplete="username"
                            data-testid="input-username"
                            {...field}
                          />
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
                            className="text-xs text-primary hover:underline"
                            onClick={() => setViewMode("forgot-password")}
                            data-testid="link-forgot-password"
                          >
                            Zaboravili ste lozinku?
                          </button>
                        </div>
                        <FormControl>
                          <PasswordInput
                            placeholder="Unesite lozinku"
                            autoComplete="current-password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-remember-me"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Zapamti me
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Prijavljivanje..." : "Prijavite se"}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {/* Register form */}
          {activeTab === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email adresa</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="vas@email.com"
                            autoComplete="email"
                            data-testid="input-email"
                            {...field}
                          />
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
                          <Input
                            placeholder="Odaberite korisničko ime"
                            autoComplete="username"
                            data-testid="input-username"
                            {...field}
                          />
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
                          <PasswordInput
                            placeholder="Minimum 8 karaktera"
                            autoComplete="new-password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrda lozinke</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Ponovite lozinku"
                            autoComplete="new-password"
                            data-testid="input-password-confirm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Prihvatam{" "}
                            <Link href="/terms" className="text-primary underline hover:text-primary/80" data-testid="link-terms">
                              Uslove korišćenja
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Registracija..." : "Kreiraj nalog"}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/equipment/midi-workstation.jpg')" }}
        />
        {/* Curved gradient overlay for smooth blend */}
        <div 
          className="absolute inset-0" 
          style={{
            background: 'radial-gradient(ellipse 150% 100% at 100% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 40%, transparent 70%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-80" />
        
        {/* Animated frequency lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
              style={{ 
                top: `${20 + i * 15}%`,
                width: '100%',
              }}
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              style={{
                left: `${10 + (i * 7) % 80}%`,
                top: `${20 + (i * 11) % 60}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.sin(i) * 10, 0],
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
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
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 -m-8 border border-primary/20 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ width: 'calc(100% + 4rem)', height: 'calc(100% + 4rem)' }}
            />
            
            {/* Second rotating ring - opposite direction */}
            <motion.div
              className="absolute inset-0 -m-12 border border-primary/10 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              style={{ width: 'calc(100% + 6rem)', height: 'calc(100% + 6rem)' }}
            />
            
            {/* Pulsating glow */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.35, 0.15]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" 
            />
            
            {/* Floating logo */}
            <motion.img
              src={leflowLogo}
              alt="Studio LeFlow"
              className="w-32 h-auto relative z-10 dark:invert object-contain"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight font-[Figtree] max-w-2xl mx-auto">
              Studio LeFlow
            </h2>
            <p className="text-lg text-white/70 font-medium">
              Profesionalna Muzička Produkcija
            </p>
          </motion.div>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-xl max-w-md mx-auto leading-relaxed text-white/80"
          >
            Registruj se i postani deo zajednice producenata u Studiju LeFlow.
          </motion.p>

          <div className="grid grid-cols-1 gap-4 max-w-sm w-full mt-4">
            {[
              { icon: Music, title: "Snimanje & Mix", desc: "Profesionalna audio produkcija" },
              { icon: Zap, title: "Brza Produkcija", desc: "Efikasna izrada instrumentala" },
              { icon: CheckCircle2, title: "Ekskluzivni Sadržaj", desc: "Giveaway i zajednica za producente" }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 + index * 0.15, ease: "easeOut" }}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 cursor-default"
              >
                <motion.div 
                  whileHover={{ rotate: 10 }}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <feature.icon className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="text-left">
                  <p className="font-medium text-white">{feature.title}</p>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {registeredUser && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          userId={registeredUser.id}
          email={registeredUser.email}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
    </>
  );
}
