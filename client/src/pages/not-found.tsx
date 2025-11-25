import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, AlertCircle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export default function NotFound() {
  return (
    <>
      <SEO
        title="404 - Stranica nije pronađena"
        description="Stranica koju tražite ne postoji. Vratite se na početnu stranicu Studio LeFlow."
        keywords={["404", "stranica nije pronađena", "not found"]}
      />

      <div className="min-h-[calc(100vh-200px)] w-full flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-lg">
            <CardContent className="pt-12 pb-16 px-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-8"
              >
                <AlertCircle className="h-20 w-20 mx-auto mb-6 text-destructive" />
                
                <div className="mb-6">
                  <h1 className="text-8xl font-bold mb-2">404</h1>
                  <div className="flex items-center justify-center gap-2 text-xl font-semibold text-muted-foreground">
                    <Music className="h-6 w-6" />
                    <span>Stranica nije pronađena</span>
                  </div>
                </div>

                <p className="text-base text-muted-foreground max-w-md mx-auto mb-2">
                  Stranica koju tražite ne postoji ili je premeštena na drugu lokaciju.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Proverite da li je URL pravilno ukucan.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/">
                  <Button size="lg" className="gap-2 min-w-[200px]" data-testid="button-home">
                    <Home className="h-5 w-5" />
                    Početna Stranica
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button variant="outline" size="lg" className="gap-2 min-w-[200px]" data-testid="button-contact">
                    <AlertCircle className="h-5 w-5" />
                    Kontaktiraj Nas
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-12 pt-8 border-t"
              >
                <p className="text-sm text-muted-foreground mb-4">
                  Popularne stranice:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/tim">
                    <Button variant="ghost" size="sm" data-testid="link-team">
                      Tim
                    </Button>
                  </Link>
                  <Link href="/projekti">
                    <Button variant="ghost" size="sm" data-testid="link-projects">
                      Projekti
                    </Button>
                  </Link>
                  <Link href="/pravila">
                    <Button variant="ghost" size="sm" data-testid="link-terms">
                      Pravila
                    </Button>
                  </Link>
                  <Link href="/kontakt">
                    <Button variant="ghost" size="sm" data-testid="link-contact-footer">
                      Kontakt
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
