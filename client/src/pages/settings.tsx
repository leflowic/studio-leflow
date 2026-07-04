import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User, Mail, Lock, AlertCircle, Camera, Loader2, Trash2,
  ShieldCheck, ShieldX, Calendar, Crown, CheckCircle2, Eye, EyeOff, Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { PanelCard } from "@/components/ui/panel-card";

function PasswordInput({ id, value, onChange, placeholder, autoComplete, disabled }: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function CollabToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [available, setAvailable] = useState((user as any)?.availableForCollab ?? false);

  const toggle = useMutation({
    mutationFn: (val: boolean) => apiRequest("PATCH", "/api/me/collab", { available: val }),
    onSuccess: (_, val) => {
      setAvailable(val);
      toast({ title: val ? "Dostupan si za saradnju 🎵" : "Više nisi prikazan kao dostupan" });
    },
    onError: () => toast({ title: "Greška", variant: "destructive" }),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Dostupan za saradnju</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prikazuješ se u listi kolaboratora na zajednici</p>
          </div>
        </div>
        <button
          onClick={() => toggle.mutate(!available)}
          disabled={toggle.isPending}
          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${available ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${available ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [profileForm, setProfileForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Greška pri upload-u");
      const { url } = await res.json();
      await apiRequest("PUT", "/api/user/avatar", { avatarUrl: url });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar ažuriran", description: "Profilna slika je uspešno promenjena" });
    } catch (error: any) {
      toast({ title: "Greška", description: error.message || "Greška pri upload-u", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const triggerAvatarPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = (e: any) => { const f = e.target?.files?.[0]; if (f) handleAvatarUpload(f); };
    input.click();
  };

  const removeAvatarMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user/avatar"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar uklonjen", description: "Profilna slika je uspešno uklonjena" });
    },
    onError: (e: Error) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { username?: string; email?: string }) => apiRequest("PUT", "/api/user/update-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profil ažuriran", description: "Vaši podaci su uspešno izmenjeni" });
    },
    onError: (e: Error) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => apiRequest("PUT", "/api/user/change-password", data),
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Lozinka promenjena", description: "Vaša lozinka je uspešno promenjena" });
    },
    onError: (e: Error) => toast({ title: "Greška", description: e.message, variant: "destructive" }),
  });

  const handleProfileUpdate = () => {
    const updates: { username?: string; email?: string } = {};
    if (profileForm.username !== user?.username && profileForm.username.trim()) updates.username = profileForm.username.trim();
    if (profileForm.email !== user?.email && profileForm.email.trim()) updates.email = profileForm.email.trim();
    if (!Object.keys(updates).length) {
      toast({ title: "Nema promena", description: "Niste promenili nijedan podatak" });
      return;
    }
    updateProfileMutation.mutate(updates);
  };

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: "Popunite sva polja", description: "Sva polja su obavezna", variant: "destructive" }); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Lozinke se ne poklapaju", variant: "destructive" }); return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Lozinka je prekratka", description: "Minimum 8 karaktera", variant: "destructive" }); return;
    }
    changePasswordMutation.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  const daysSinceUsernameChange = user?.usernameLastChanged
    ? Math.floor((Date.now() - new Date(user.usernameLastChanged).getTime()) / 86400000)
    : null;
  const canChangeUsername = !daysSinceUsernameChange || daysSinceUsernameChange >= 30;

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";
  const isAdmin = user?.role === "admin";
  const isBusy = isUploadingAvatar || removeAvatarMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Podešavanja - Studio LeFlow" description="Upravljajte vašim nalogom" noIndex />

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 space-y-6">

        {/* Profile hero */}
        <FadeInWhenVisible>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
            {/* Gradient top strip */}
            <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />

            <div className="px-6 pb-6 -mt-10 flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar with upload overlay */}
              <div className="relative group w-20 h-20 flex-shrink-0">
                <Avatar className="w-20 h-20 ring-4 ring-background shadow-lg">
                  {user?.avatarUrl
                    ? <AvatarImage src={user.avatarUrl} alt={user?.username} />
                    : <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                  }
                </Avatar>
                <button
                  onClick={triggerAvatarPicker}
                  disabled={isBusy}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                  data-testid="button-upload-avatar"
                  title="Promeni sliku"
                >
                  {isUploadingAvatar
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />
                  }
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{user?.username}</h1>
                  {isAdmin && (
                    <Badge variant="default" className="gap-1 text-xs">
                      <Crown className="w-3 h-3" /> Admin
                    </Badge>
                  )}
                  {user?.emailVerified
                    ? <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-500/30 bg-green-500/10"><ShieldCheck className="w-3 h-3" /> Verifikovano</Badge>
                    : <Badge variant="outline" className="gap-1 text-xs text-red-500 border-red-500/30 bg-red-500/10"><ShieldX className="w-3 h-3" /> Nije verifikovano</Badge>
                  }
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.createdAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Član od {format(new Date(user.createdAt), "dd.MM.yyyy.")}
                  </p>
                )}
              </div>

              {user?.avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 self-start sm:self-auto"
                  disabled={isBusy}
                  onClick={() => removeAvatarMutation.mutate()}
                  data-testid="button-remove-avatar"
                >
                  {removeAvatarMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="ml-1.5 text-xs">Ukloni sliku</span>
                </Button>
              )}
            </div>
          </div>
        </FadeInWhenVisible>

        {/* Profile + Password - side by side on md+ */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Profile form */}
          <FadeInWhenVisible>
            <PanelCard title="Podaci o nalogu" icon={User} iconBg="bg-blue-500/10" iconColor="text-blue-500">
              <div className="space-y-4">
                {!canChangeUsername && daysSinceUsernameChange !== null && (
                  <Alert className="border-amber-500/30 bg-amber-500/5">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-sm">
                      Korisničko ime možete promeniti za još <strong>{30 - daysSinceUsernameChange} dana</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Korisničko ime</Label>
                  <Input
                    id="username"
                    value={profileForm.username}
                    onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                    placeholder="Korisničko ime"
                    disabled={!canChangeUsername || updateProfileMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">Može se menjati jednom mesečno</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email adresa</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="email@primer.com"
                      disabled={updateProfileMutation.isPending}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  disabled={updateProfileMutation.isPending}
                  className="w-full gap-2"
                >
                  {updateProfileMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Čuvanje...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Sačuvaj izmene</>
                  }
                </Button>
              </div>
            </PanelCard>
          </FadeInWhenVisible>

          {/* Password form */}
          <FadeInWhenVisible>
            <PanelCard title="Promena lozinke" icon={Lock} iconBg="bg-purple-500/10" iconColor="text-purple-500">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trenutna lozinka</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={v => setPasswordForm({ ...passwordForm, currentPassword: v })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={changePasswordMutation.isPending}
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nova lozinka</Label>
                  <PasswordInput
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={v => setPasswordForm({ ...passwordForm, newPassword: v })}
                    placeholder="Minimum 8 karaktera"
                    autoComplete="new-password"
                    disabled={changePasswordMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Potvrda lozinke</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={v => setPasswordForm({ ...passwordForm, confirmPassword: v })}
                    placeholder="Ponovi novu lozinku"
                    autoComplete="new-password"
                    disabled={changePasswordMutation.isPending}
                  />
                  {passwordForm.newPassword && passwordForm.confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordForm.newPassword === passwordForm.confirmPassword ? "text-green-500" : "text-red-500"}`}>
                      {passwordForm.newPassword === passwordForm.confirmPassword
                        ? <><CheckCircle2 className="w-3 h-3" /> Lozinke se poklapaju</>
                        : <><AlertCircle className="w-3 h-3" /> Lozinke se ne poklapaju</>
                      }
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {changePasswordMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Promena...</>
                    : <><Lock className="w-4 h-4" /> Promeni lozinku</>
                  }
                </Button>
              </div>
            </PanelCard>
          </FadeInWhenVisible>
        </div>

        {/* Collab toggle */}
        {user?.emailVerified && (
          <FadeInWhenVisible>
            <CollabToggle />
          </FadeInWhenVisible>
        )}

        {/* Account info - info pills */}
        <FadeInWhenVisible>
          <PanelCard title="Informacije o nalogu" icon={ShieldCheck} iconBg="bg-muted" iconColor="text-muted-foreground" bodyClassName="pt-2">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/30 hover-elevate transition-all">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`text-sm font-semibold flex items-center gap-1.5 ${user?.emailVerified ? "text-green-500" : "text-red-500"}`}>
                  {user?.emailVerified
                    ? <><ShieldCheck className="w-4 h-4" /> Verifikovan</>
                    : <><ShieldX className="w-4 h-4" /> Nije verifikovan</>
                  }
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/30 hover-elevate transition-all">
                <span className="text-xs text-muted-foreground">Uloga</span>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {isAdmin ? <><Crown className="w-4 h-4 text-amber-500" /> Administrator</> : <><User className="w-4 h-4 text-blue-500" /> Korisnik</>}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/30 hover-elevate transition-all">
                <span className="text-xs text-muted-foreground">Član od</span>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {user?.createdAt ? format(new Date(user.createdAt), "dd.MM.yyyy.") : "N/A"}
                </span>
              </div>
            </div>
          </PanelCard>
        </FadeInWhenVisible>

      </div>
    </div>
  );
}
