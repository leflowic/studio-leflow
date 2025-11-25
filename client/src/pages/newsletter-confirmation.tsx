import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewsletterConfirmation() {
  const [, params] = useRoute("/newsletter/potvrda/:token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!params?.token) {
        setStatus("error");
        setMessage("Link za potvrdu je nevažeći");
        return;
      }

      try {
        const response = await fetch(`/api/newsletter/confirm/${params.token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email uspešno potvrđen!");
        } else {
          setStatus("error");
          setMessage(data.error || "Greška pri potvrđivanju email-a");
        }
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus("error");
        setMessage("Greška pri potvrđivanju email-a");
      }
    };

    confirmSubscription();
  }, [params?.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="max-w-md w-full p-8">
          <div className="text-center space-y-6">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                <h1 className="text-2xl font-bold">Potvrđujemo vašu prijavu...</h1>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <h1 className="text-2xl font-bold">Uspešno!</h1>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Hvala što ste se prijavili na Studio LeFlow newsletter. Bićete obavešteni o najnovijim projektima, promocijama i novostima.
                </p>
                <Button asChild className="w-full">
                  <a href="/">Nazad na početnu</a>
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive" />
                <h1 className="text-2xl font-bold">Greška</h1>
                <p className="text-muted-foreground">{message}</p>
                <Button asChild variant="outline" className="w-full">
                  <a href="/">Nazad na početnu</a>
                </Button>
              </>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
