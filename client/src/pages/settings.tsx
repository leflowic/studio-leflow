import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Lock, AlertCircle, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { startUpload: startAvatarUpload } = useUploadThing("avatarUploader", {
    onClientUploadComplete: async (files) => {
      if (files && files.length > 0) {
        const file = files[0];
        if (!file) return;
        
        try {
          await apiRequest("PUT", "/api/user/avatar", {
            avatarUrl: file.url,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          setIsUploadingAvatar(false);
          
          toast({
            title: "Avatar ažuriran",
            description: "Vaša profilna slika je uspešno promenjena",
          });
        } catch (error: any) {
          setIsUploadingAvatar(false);
          toast({
            title: "Greška",
            description: error.message || "Greška pri čuvanju avatara",
            variant: "destructive",
          });
        }
      }
    },
    onUploadError: (error: Error) => {
      setIsUploadingAvatar(false);
      toast({
        title: "Greška",
        description: error.message || "Greška pri upload-u slike",
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploadingAvatar(true);
    await startAvatarUpload([file]);
  };

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/user/avatar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Avatar uklonjen",
        description: "Vaša profilna slika je uspešno uklonjena",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri uklanjanju avatara",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; email?: string }) => {
      return await apiRequest("PUT", "/api/user/update-profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profil ažuriran",
        description: "Vaši podaci su uspešno izmenjeni",
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

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("PUT", "/api/user/change-password", data);
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Lozinka promenjena",
        description: "Vaša lozinka je uspešno promenjena",
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

  const handleProfileUpdate = () => {
    const updates: { username?: string; email?: string } = {};
    
    if (profileForm.username !== user?.username && profileForm.username.trim()) {
      updates.username = profileForm.username.trim();
    }
    
    if (profileForm.email !== user?.email && profileForm.email.trim()) {
      updates.email = profileForm.email.trim();
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "Nema promena",
        description: "Niste promenili nijedan podatak",
        variant: "default",
      });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Popunite sva polja",
        description: "Sva polja za promenu lozinke su obavezna",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Lozinke se ne poklapaju",
        description: "Nova lozinka i potvrda lozinke moraju biti iste",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Lozinka je prekratka",
        description: "Nova lozinka mora imati najmanje 6 karaktera",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const daysSinceUsernameChange = user?.usernameLastChanged 
    ? Math.floor((Date.now() - new Date(user.usernameLastChanged).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const canChangeUsername = !daysSinceUsernameChange || daysSinceUsernameChange >= 30;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Podešavanja</h1>
          <p className="text-muted-foreground">
            Upravljajte vašim nalogom i podacima
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Profilna slika
              </CardTitle>
              <CardDescription>
                Postavite ili promenite vašu profilnu sliku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                  ) : (
                    <AvatarFallback className="text-2xl bg-primary/10">
                      <User className="w-12 h-12 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Preporučena veličina: 400x400px. Max: 4MB
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      disabled={isUploadingAvatar || removeAvatarMutation.isPending}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/png,image/jpeg,image/webp';
                        input.onchange = (e: any) => {
                          const file = e.target?.files?.[0];
                          if (file) handleAvatarUpload(file);
                        };
                        input.click();
                      }}
                      data-testid="button-upload-avatar"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Upload u toku...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload slike
                        </>
                      )}
                    </Button>
                    {user?.avatarUrl && (
                      <Button
                        variant="outline"
                        disabled={isUploadingAvatar || removeAvatarMutation.isPending}
                        onClick={() => removeAvatarMutation.mutate()}
                        data-testid="button-remove-avatar"
                      >
                        {removeAvatarMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uklanjanje...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Ukloni sliku
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Podaci o nalogu
              </CardTitle>
              <CardDescription>
                Promenite svoje korisničko ime ili email adresu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canChangeUsername && daysSinceUsernameChange !== null && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Možete promeniti korisničko ime tek za {30 - daysSinceUsernameChange} dana
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Korisničko ime</Label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  placeholder="Unesite korisničko ime"
                  disabled={!canChangeUsername || updateProfileMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Korisničko ime možete menjati samo jednom mesečno
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email adresa
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="Unesite email adresu"
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <Button 
                onClick={handleProfileUpdate}
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateProfileMutation.isPending ? "Čuvanje..." : "Sačuvaj izmene"}
              </Button>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Promena lozinke
              </CardTitle>
              <CardDescription>
                Promenite lozinku vašeg naloga
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Trenutna lozinka</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Unesite trenutnu lozinku"
                  autoComplete="current-password"
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova lozinka</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Unesite novu lozinku"
                  autoComplete="new-password"
                  disabled={changePasswordMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Lozinka mora imati najmanje 6 karaktera
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potvrdite novu lozinku</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Potvrdite novu lozinku"
                  autoComplete="new-password"
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <Button 
                onClick={handlePasswordChange}
                disabled={changePasswordMutation.isPending}
                className="w-full sm:w-auto"
                variant="default"
              >
                {changePasswordMutation.isPending ? "Promena..." : "Promeni lozinku"}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacije o nalogu</CardTitle>
              <CardDescription>
                Osnovne informacije o vašem nalogu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Status verifikacije:</span>
                <span className="font-medium">
                  {user?.emailVerified ? "✅ Verifikovano" : "❌ Nije verifikovano"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Uloga:</span>
                <span className="font-medium capitalize">{user?.role}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Nalog kreiran:</span>
                <span className="font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('sr-RS') : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
