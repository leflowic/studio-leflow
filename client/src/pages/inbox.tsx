import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, ShieldAlert } from "lucide-react";
import ConversationList from "@/components/messaging/ConversationList";
import ChatInterface from "@/components/messaging/ChatInterface";
import { SEO } from "@/components/SEO";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Inbox() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const search = useSearch();
  const initialSearch = new URLSearchParams(search).get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Update browser tab title with unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user?.emailVerified,
    refetchInterval: 30000,
  });
  useEffect(() => {
    const count = unreadData?.count ?? 0;
    document.title = count > 0 ? `(${count}) Poruke - Studio LeFlow` : "Poruke - Studio LeFlow";
    return () => { document.title = "Studio LeFlow"; };
  }, [unreadData]);

  if (!user || !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <SEO title="Poruke - Studio LeFlow" description="Poruke" noIndex />
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Verifikacija potrebna</h2>
          <p className="text-muted-foreground text-sm mb-4">Potvrdite email adresu da biste pristupili porukama.</p>
          <Link href="/settings"><Button size="sm">Podešavanja naloga</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 md:px-6 pt-0 md:pt-6 pb-0 md:pb-6">
      <SEO title="Poruke - Studio LeFlow" description="Poruke" noIndex />

      <div className="max-w-6xl mx-auto">
        {/* Page header - desktop only; on phones the list/chat use the whole screen */}
        <div className="hidden md:flex items-baseline gap-3 mb-4">
          <h1 className="text-2xl font-semibold">Poruke</h1>
          {(unreadData?.count ?? 0) > 0 && (
            <span className="text-sm text-muted-foreground"><span className="font-mono text-primary">{unreadData!.count}</span> nepročitanih</span>
          )}
        </div>

        <div
          className="md:rounded-2xl md:border border-border/70 bg-card overflow-hidden flex h-[calc(100svh-4rem-env(safe-area-inset-top))] md:h-[calc(100svh-4rem-env(safe-area-inset-top)-6.5rem)] min-h-[480px]"
          data-testid="inbox-card"
        >
          {/* Sidebar */}
          <aside className={`flex flex-col border-r border-border/60 w-full md:w-80 lg:w-[22rem] flex-shrink-0 ${selectedUserId ? "hidden md:flex" : "flex"}`} data-testid="inbox-sidebar">
            <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border/60">
              <div className="flex items-center justify-between md:hidden">
                <h1 className="text-xl font-semibold">Poruke</h1>
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground"><span className="font-mono text-primary">{unreadData!.count}</span> nepročitanih</span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Pretraži razgovore i ljude"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-sm rounded-full bg-muted/60 border-transparent focus-visible:bg-background"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <ConversationList
                selectedUserId={selectedUserId}
                onSelectConversation={id => { setSelectedUserId(id); setSearchQuery(""); }}
                searchQuery={searchQuery}
              />
            </div>
          </aside>

          {/* Chat panel */}
          <section className={`flex-1 flex flex-col min-w-0 ${selectedUserId ? "flex" : "hidden md:flex"}`} data-testid="chat-area">
            {selectedUserId ? (
              <ChatInterface
                key={selectedUserId}
                selectedUserId={selectedUserId}
                onBack={() => setSelectedUserId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Izaberite razgovor</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
                  Ili potražite nekoga po korisničkom imenu i započnite novi.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
