import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Search } from "lucide-react";
import ConversationList from "@/components/messaging/ConversationList";
import ChatInterface from "@/components/messaging/ChatInterface";

export default function Inbox() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (!user || !user.emailVerified) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Helmet>
          <title>Poruke - Studio LeFlow</title>
        </Helmet>
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Pristup Odbijen</h2>
        <p className="text-muted-foreground">
          Morate prvo verifikovati email adresu da biste pristupili porukama.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)]">
      <Helmet>
        <title>Poruke - Studio LeFlow</title>
        <meta name="description" content="Privatne poruke - Studio LeFlow" />
      </Helmet>

      <div className="h-full flex flex-col md:flex-row">
        {/* Inbox sidebar - visible on mobile when no conversation selected */}
        <Card 
          className={`w-full md:w-96 md:rounded-none md:rounded-l-lg border-0 md:border-r ${selectedUserId ? 'hidden md:flex' : 'flex'} flex-col`}
          data-testid="inbox-sidebar"
        >
          <div className="p-4 border-b space-y-3">
            <h2 className="text-xl font-bold" data-testid="text-inbox-title">Poruke</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pretraži konverzacije..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-conversations"
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              selectedUserId={selectedUserId}
              onSelectConversation={setSelectedUserId}
              searchQuery={searchQuery}
            />
          </div>
        </Card>

        <Separator orientation="vertical" className="hidden md:block" />

        {/* Chat area - visible on mobile when conversation is selected */}
        <div 
          className={`flex-1 flex flex-col bg-muted/20 ${selectedUserId ? 'flex' : 'hidden md:flex'}`}
          data-testid="chat-area"
        >
          {selectedUserId ? (
            <ChatInterface
              selectedUserId={selectedUserId}
              onBack={() => setSelectedUserId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Izaberite konverzaciju da započnete chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
