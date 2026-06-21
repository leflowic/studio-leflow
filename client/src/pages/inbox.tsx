import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, ShieldAlert } from "lucide-react";
import ConversationList from "@/components/messaging/ConversationList";
import ChatInterface from "@/components/messaging/ChatInterface";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Inbox() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-6 px-4">
      <SEO title="Poruke - Studio LeFlow" description="Poruke" noIndex />

      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Poruke</h1>
            <p className="text-sm text-muted-foreground">
              {(unreadData?.count ?? 0) > 0
                ? <><span className="text-primary font-semibold">{unreadData!.count}</span> nepročitanih</>
                : "Sve pročitano"
              }
            </p>
          </div>
        </div>

        {/* Main card */}
        <div
          className="rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden flex"
          style={{ height: "calc(100vh - 180px)", minHeight: 500 }}
          data-testid="inbox-card"
        >
          {/* Sidebar */}
          <div className={`
            flex flex-col border-r border-border/50
            w-full md:w-72 lg:w-80 flex-shrink-0
            ${selectedUserId ? "hidden md:flex" : "flex"}
          `} data-testid="inbox-sidebar">

            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Konverzacije</span>
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {unreadData!.count > 99 ? "99+" : unreadData!.count}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Pretraži..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-hidden border-t border-border/30">
              <ConversationList
                selectedUserId={selectedUserId}
                onSelectConversation={setSelectedUserId}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {/* Chat panel */}
          <div className={`flex-1 flex flex-col min-w-0 ${selectedUserId ? "flex" : "hidden md:flex"}`} data-testid="chat-area">
            {selectedUserId ? (
              <ChatInterface
                selectedUserId={selectedUserId}
                onBack={() => setSelectedUserId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 to-transparent text-center px-6">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-primary/50" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-[9px] text-primary-foreground font-bold">✓</span>
                  </div>
                </div>
                <h2 className="text-base font-semibold mb-1">Izaberi konverzaciju</h2>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Klikni na konverzaciju ili pretražite korisnika da počnete chat
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
