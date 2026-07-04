// Blueprint reference: blueprint:javascript_auth_all_persistance
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken, getAuthToken, clearAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser & { token: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  googleLoginMutation: UseMutationResult<SelectUser & { token: string }, Error, string>;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { rememberMe?: boolean };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setAuthToken(token);
    }
    setIsInitialized(true);
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isInitialized,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: SelectUser & { token: string }) => {
      const { token, ...user } = data;
      setAuthToken(token);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Uspešno logovanje",
        description: `Dobrodošli, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Neuspešno logovanje",
        description: error.message || "Pogrešno korisničko ime ili lozinka",
        variant: "destructive",
      });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { accessToken });
      return await res.json();
    },
    onSuccess: (data: SelectUser & { token: string }) => {
      const { token, ...user } = data;
      setAuthToken(token);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Uspešno logovanje",
        description: `Dobrodošli, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Neuspešna Google prijava",
        description: error.message || "Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      toast({
        title: "Uspešna registracija",
        description: `Proverite email za verifikacioni kod`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Neuspešna registracija",
        description: error.message || "Greška pri registraciji",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      clearAuthToken();
      queryClient.clear();
      toast({
        title: "Uspešno odjavljivanje",
        description: "Doviđenja!",
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

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isLoading || !isInitialized,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        googleLoginMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
