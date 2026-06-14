import { QueryClient, QueryFunction } from "@tanstack/react-query";

const TOKEN_KEY = "auth_token";

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Proverite unete podatke i pokušajte ponovo.",
  401: "Niste prijavljeni. Osvežite stranicu i prijavite se ponovo.",
  403: "Nemate dozvolu za ovu akciju.",
  404: "Traženi sadržaj nije pronađen.",
  409: "Došlo je do konflikta. Pokušajte ponovo.",
  413: "Fajl je prevelik.",
  429: "Previše pokušaja. Sačekajte malo i pokušajte ponovo.",
  500: "Greška na serveru. Pokušajte ponovo.",
  502: "Servis trenutno nije dostupan. Pokušajte malo kasnije.",
  503: "Servis trenutno nije dostupan. Pokušajte malo kasnije.",
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.error) throw new Error(errorData.error);
        if (errorData.message) throw new Error(errorData.message);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== text) throw parseError;
      }
    }

    // Fall back to friendly status-based message instead of raw server text
    throw new Error(STATUS_MESSAGES[res.status] ?? "Došlo je do greške. Pokušajte ponovo.");
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
