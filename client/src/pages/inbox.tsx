import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, ShieldAlert } from "lucide-react";
import ConversationList from "@/components/messaging/ConversationList";
import ChatInterface from "@/components/messaging/ChatInterface";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";

export default function Inbox() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (!user || !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <SEO title="Poruke - Studio LeFlow" description="Poruke" noIndex />
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Verifikacija potrebna</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Potvrdite email adresu da biste pristupili porukama.
          </p>
          <Link href="/settings">
            <Button size="sm">Podešavanja naloga</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex bg-background">
      <SEO title="Poruke - Studio LeFlow" description="Poruke" noIndex />

      {/* Sidebar */}
      <div className={`
        flex flex-col border-r border-border/60 bg-card
        w-full md:w-80 lg:w-96 flex-shrink-0
        ${selectedUserId ? "hidden md:flex" : "flex"}
      `} data-testid="inbox-sidebar">

        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/40 space-y-3">
          <h1 className="text-lg font-bold" data-testid="text-inbox-title">Poruke</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Pretraži..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:bg-background"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedUserId={selectedUserId}
            onSelectConversation={setSelectedUserId}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedUserId ? "flex" : "hidden md:flex"}`} data-testid="chat-area">
        {selectedUserId ? (
          <ChatInterface
            selectedUserId={selectedUserId}
            onBack={() => setSelectedUserId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-primary/60" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Studio LeFlow Poruke</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Izaberite konverzaciju ili pretražite korisnika da biste započeli chat
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
