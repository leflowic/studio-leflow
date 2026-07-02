import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const WAVEFORM = [18, 38, 28, 56, 40, 24, 52, 36, 20, 44, 32, 48, 22, 34, 50, 26, 42];

export default function NotFound() {
  return (
    <>
      <SEO
        title="404 - Stranica nije pronađena"
        description="Stranica koju tražite ne postoji. Vratite se na početnu stranicu Studio LeFlow."
        keywords={["404", "stranica nije pronađena", "not found"]}
      />

      <div className="min-h-[calc(100vh-160px)] w-full flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">

          {/* Waveform decoration — "broken" audio */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-center gap-1 h-14 mb-8 mx-auto max-w-xs"
          >
            {WAVEFORM.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.025, duration: 0.35, ease: "easeOut" }}
                className={
                  i % 3 === 0
                    ? "flex-1 rounded-full bg-destructive/35"
                    : i % 3 === 1
                    ? "flex-1 rounded-full bg-destructive/15"
                    : "flex-1 rounded-full bg-muted/40"
                }
              />
            ))}
          </motion.div>

          {/* 404 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative mb-4"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-40 rounded-full bg-primary/5 blur-3xl" />
            </div>
            <p
              className="relative text-[120px] sm:text-[160px] font-black leading-none tracking-tighter select-none"
              style={{
                background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--muted-foreground)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              404
            </p>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8 space-y-2"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Headphones className="w-5 h-5 text-muted-foreground/50" />
              <p className="font-semibold text-lg">Stranica nije pronađena</p>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Zvuk koji tražiš nije u ovom studiju. Možda je premeštena ili URL nije tačan.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/">
              <Button size="lg" className="gap-2 min-w-[180px]" data-testid="button-home">
                <Home className="h-4 w-4" />
                Početna stranica
              </Button>
            </Link>
            <Link href="/kontakt">
              <Button variant="outline" size="lg" className="gap-2 min-w-[180px]" data-testid="button-contact">
                Kontaktiraj nas
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>
    </>
  );
}
