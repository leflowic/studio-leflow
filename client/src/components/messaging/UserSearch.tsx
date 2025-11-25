import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  email: string;
}

interface UserSearchProps {
  onSelectUser: (userId: number) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: searchResults, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSelectUser = (userId: number) => {
    onSelectUser(userId);
    setQuery("");
    setShowResults(false);
  };

  return (
    <div className="relative" ref={searchRef} data-testid="user-search-container">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pretraži korisnike..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
          data-testid="input-user-search"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" data-testid="loader-search" />
        )}
      </div>

      {showResults && searchResults && searchResults.length > 0 && (
        <Card className="absolute top-full mt-1 w-full z-50 max-h-64 overflow-y-auto" data-testid="search-results">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
              )}
              data-testid={`user-result-${user.id}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {showResults && debouncedQuery.length >= 2 && searchResults?.length === 0 && !isLoading && (
        <Card className="absolute top-full mt-1 w-full z-50 p-4 text-center text-sm text-muted-foreground" data-testid="no-results">
          Nema rezultata
        </Card>
      )}

      {showResults && debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
        <Card className="absolute top-full mt-1 w-full z-50 p-4 text-center text-sm text-muted-foreground" data-testid="search-hint">
          Unesite najmanje 2 karaktera
        </Card>
      )}
    </div>
  );
}
