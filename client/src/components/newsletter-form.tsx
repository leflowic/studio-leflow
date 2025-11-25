import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface NewsletterFormProps {
  variant?: "default" | "footer";
  className?: string;
}

export function NewsletterForm({ variant = "default", className = "" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast({
        title: "Greška",
        description: "Unesite validnu email adresu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Uspešno!",
          description: data.message || "Proverite email za link za potvrdu",
        });
        setEmail("");
      } else {
        toast({
          title: "Greška",
          description: data.error || "Došlo je do greške",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Newsletter subscribe error:", error);
      toast({
        title: "Greška",
        description: "Greška na serveru. Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "footer") {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder="Vaša email adresa"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading} size="icon">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
        </Button>
      </form>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className={`max-w-md mx-auto ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Unesite vašu email adresu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Prijavi se"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Prijavom na newsletter prihvatate našu politiku privatnosti
      </p>
    </motion.form>
  );
}
