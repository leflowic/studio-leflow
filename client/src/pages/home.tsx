import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Music, Mic2, Video, ArrowRight, Phone, Play, AlertCircle, Gamepad2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { SEO } from "@/components/SEO";
import { ParallaxHero } from "@/components/parallax/ParallaxHero";
import { WaveDivider } from "@/components/WaveDivider";
import { BeforeAfterSection } from "@/components/home/BeforeAfterPlayer";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ForYouToday } from "@/components/home/ForYouToday";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import leflowLogo from "@/assets/leflow-logo.png";
import { PlatformMarquee } from "@/components/home/PlatformMarquee";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";

import type { CmsContent } from "@shared/schema";
import videoSetupImage from "@assets/generated_images/Video_camera_production_setup_199f7c64.png";

function GameAnnouncement() {
  const { data } = useQuery<any>({
    queryKey: ["/api/game/upcoming"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!data?.isToday || data?.isOpen) return;
    const tick = () => {
      const belgrade = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
      const belgHour = belgrade.getHours();
      const belgMin = belgrade.getMinutes();
      const belgSec = belgrade.getSeconds();
      const nowSecs = belgHour * 3600 + belgMin * 60 + belgSec;
      const openSecs = data.openHour * 3600 + data.openMinute * 60;
      const left = openSecs - nowSecs;
      if (left <= 0) { setCountdown(""); return; }
      const h = Math.floor(left / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = left % 60;
      setCountdown(h > 0
        ? `${h}h ${String(m).padStart(2,'0')}min`
        : `${m}:${String(s).padStart(2,'0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  if (!data) return null;

  const openTime = `${String(data.openHour).padStart(2,'0')}:${String(data.openMinute).padStart(2,'0')}`;

  if (data.isOpen) return null; // dugme već pokazuje LIVE

  const dateLabel = (() => {
    if (data.isToday) return `danas u ${openTime}`;
    const d = new Date(data.challengeDate + "T12:00:00Z");
    const days = ["nedeljom","ponedeljkom","utorkom","sredom","četvrtkom","petkom","subotom"];
    const day = days[d.getUTCDay()];
    return `${day} ${d.getUTCDate()}. ${d.toLocaleString('sr-Latn', { month: 'long', timeZone: 'UTC' })} u ${openTime}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.1 }}
      className="mt-4 flex justify-center"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm">
        <Music className="w-4 h-4 text-white/70 flex-shrink-0" />
        <span>
          Sledeća igra počinje <strong>{dateLabel}</strong>
          {countdown && <span className="ml-1.5 font-mono text-white/80">- još {countdown}</span>}
        </span>
      </div>
    </motion.div>
  );
}

function GuestBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("guest_banner_dismissed") === "1");

  useEffect(() => {
    if (dismissed) return;
    // Show at most once per session, and only after real engagement:
    // 20s on the page or 60% scroll depth - whichever comes first.
    if (sessionStorage.getItem("guest_banner_shown") === "1") return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      sessionStorage.setItem("guest_banner_shown", "1");
      setVisible(true);
    };
    const timer = setTimeout(show, 20000);
    const onScroll = () => {
      const depth = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (depth > 0.6) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem("guest_banner_dismissed", "1");
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 w-[calc(100%-2rem)] max-w-sm">
      <motion.div
        role="dialog"
        aria-label="Napravite besplatan nalog"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-5"
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Zatvori"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 pr-8">
          <img src={leflowLogo} alt="" className="h-5 w-auto dark:invert select-none" draggable={false} />
          <p className="text-[15px] font-semibold leading-tight">Napravite besplatan nalog</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Pratite status svoje pesme, igrajte Pogodi Pesmu i dopisujte se sa drugim izvođačima.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <Link href="/registracija">
            <Button size="sm" className="h-9 px-4">Napravi nalog</Button>
          </Link>
          <Link href="/prijava" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Već imate nalog?
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: gameData } = useQuery<any>({
    queryKey: ["/api/game/today"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/game/today");
      return res.json();
    },
    enabled: !!user && user.emailVerified === true,
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const gameIsLive = gameData?.available === true && !gameData?.alreadyPlayed;
  
  const { data: cmsContent = [] } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content", "home"],
    queryFn: async () => {
      const response = await fetch("/api/cms/content?page=home");
      if (!response.ok) {
        throw new Error(`Failed to load content: ${response.statusText}`);
      }
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: testimonials = [] } = useQuery<Array<{ id: number; text: string; createdAt: string; username: string; avatarUrl: string | null }>>({
    queryKey: ["/api/testimonials"],
  });

  const { data: announcement } = useQuery<{ isActive: boolean; message: string }>({
    queryKey: ['/api/announcement'],
  });

  // Handle hash navigation for services section
  useEffect(() => {
    if (window.location.hash === "#usluge") {
      // Wait for layout to paint before scrolling
      setTimeout(() => {
        const element = document.getElementById("usluge");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [location]);

  const getCmsValue = (section: string, key: string, fallback: string = "") => {
    return cmsContent.find(c => c.section === section && c.contentKey === key)?.contentValue || fallback;
  };
  const services = [
    {
      icon: Mic2,
      title: getCmsValue("services", "service_1_title", "Snimanje, mix i master"),
      description: getCmsValue("services", "service_1_description", "Snimanje vokala i instrumenata u akustički tretiranom studiju, pa mix i master"),
      features: [
        "Warm Audio WA-47 lampaški mikrofon",
        "Apollo Twin X interface i UAD plugin suite",
        "Yamaha HS8 monitori za precizan mix",
        "Finalni fajlovi u WAV i MP3 formatu"
      ],
      imageKey: "service_1_image",
      imageFallback: "/services/wa47-microphone-service.jpg"
    },
    {
      icon: Music,
      title: getCmsValue("services", "service_2_title", "Instrumentali i gotove pesme"),
      description: getCmsValue("services", "service_2_description", "Originalni bitovi ili kompletna produkcija vaše pesme"),
      features: [
        "Hip-Hop, Pop, R&B, Trap",
        "Stem fajlovi uz instrumental",
        "Ekskluzivna i neekskluzivna prava"
      ],
      imageKey: "service_2_image",
      imageFallback: "/services/midi-keyboard-service.jpg"
    },
    {
      icon: Video,
      title: getCmsValue("services", "service_3_title", "Video produkcija"),
      description: getCmsValue("services", "service_3_description", "Snimanje i montaža muzičkih spotova"),
      features: [
        "4K snimanje",
        "Koncept i scenario spota",
        "Color grading i post-produkcija",
        "Verzije za YouTube i društvene mreže"
      ],
      imageKey: "service_3_image",
      imageFallback: videoSetupImage
    }
  ];

  return (
    <div className="min-h-screen relative">
      {!user && <GuestBanner />}
      <SEO
        title="Studio LeFlow - Muzički Studio Beograd | Snimanje Pesama, Miks, Mastering"
        description="Muzički studio u Beogradu. Snimanje vokala, mix i mastering, instrumentali i video spotovi. Warm Audio WA-47, Apollo Twin X, UAD pluginovi."
        keywords={[
          "studio leflow",
          "leflow studio",
          "leflow",
          "leflow beograd",
          "studio leflow beograd",
          "leflow studio beograd",
          "muzički studio beograd",
          "muzicki studio beograd",
          "snimanje pesme beograd",
          "snimanje vokala beograd",
          "miks i mastering",
          "mix mastering beograd",
          "muzička produkcija",
          "muzicka produkcija",
          "audio produkcija beograd",
          "recording studio belgrade",
          "voice over studio",
          "podcast studio beograd",
          "producent muzike beograd",
          "beatmaker beograd",
          "snimanje pesme dorćol",
          "najbolji muzički studio beograd",
          "leflow music studio",
          "music studio belgrade"
        ]}
      />

      <ParallaxHero>
        <div className="flex items-center justify-center min-h-[calc(100svh-4rem-1rem)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">
            {announcement?.isActive && announcement.message && (
              <motion.div
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive/20 backdrop-blur-md border border-destructive/40 max-w-md mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                data-testid="badge-site-announcement"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-sm font-medium text-white text-center whitespace-pre-line">{announcement.message}</span>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="title"
                value={getCmsValue("hero", "title", "Studio LeFlow")}
                as="h1"
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-white tracking-tight drop-shadow-2xl"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="subtitle"
                value={getCmsValue("hero", "subtitle", "Tvoja pesma. Radio-ready zvuk.")}
                as="p"
                className="text-xl md:text-2xl lg:text-3xl mb-4 text-white/90 max-w-3xl mx-auto font-light"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="description"
                value={getCmsValue("hero", "description", "Mix • Master • Instrumentali • Video Produkcija")}
                as="p"
                className="text-sm md:text-base mb-12 text-white/60 max-w-2xl mx-auto uppercase tracking-[0.14em] font-medium"
              />
            </motion.div>
            
            <motion.div 
              className="flex flex-wrap gap-4 justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/kontakt" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-6 font-semibold"
                  data-testid="button-book-session"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Zakažite termin
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/projekti" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-8 py-6 bg-transparent text-white [border-color:rgba(255,255,255,0.3)] hover:bg-white/10 font-semibold"
                  data-testid="button-view-projects"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Pogledaj projekte
                </Button>
              </Link>
              {user?.emailVerified && (
                <Link href="/igra" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg px-8 py-6 bg-transparent text-white [border-color:rgba(255,255,255,0.3)] hover:bg-white/10 font-semibold relative"
                  >
                    <Gamepad2 className="mr-2 w-5 h-5" />
                    Pogodi Pesmu
                    {gameIsLive && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        LIVE
                      </span>
                    )}
                  </Button>
                </Link>
              )}
            </motion.div>

            <motion.p
              className="mt-8 text-sm text-white/50 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Odgovaramo u roku od 24h&ensp;·&ensp;2 besplatne revizije&ensp;·&ensp;Od 2026.
            </motion.p>

            {/* Upcoming game announcement */}
            <GameAnnouncement />
          </div>
        </div>
        <ScrollIndicator targetId="usluge" />
      </ParallaxHero>

      {user?.emailVerified && <ForYouToday gameData={gameData} />}

      <PlatformMarquee />

      <section className="py-20 lg:py-28 bg-background relative z-10" id="usluge">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="mb-12 lg:mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-2xl">
                <WaveDivider className="mb-6" align="start" />
                <h2 className="heading-lg mb-4" data-testid="text-services-title">
                  Usluge
                </h2>
                <p className="text-lg text-muted-foreground">
                  Snimanje vokala, mix i mastering, instrumentali po meri i muzički spotovi. Sve radimo u akustički tretiranom studiju u Beogradu.
                </p>
              </div>
              <Link
                href="/usluge"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4 shrink-0"
              >
                Detaljno o uslugama
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <Card key={index} className="overflow-hidden h-full flex flex-col group" data-testid={`card-service-${index}`}>
                  <div className="aspect-video overflow-hidden">
                    <EditableImage
                      page="home"
                      section="services"
                      contentKey={service.imageKey}
                      currentImageUrl={getCmsValue("services", service.imageKey, undefined)}
                      fallbackSrc={service.imageFallback}
                      alt={service.title}
                      className="w-full h-full object-cover saturate-[0.25] transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <CardContent className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold mb-2" data-testid={`text-service-title-${index}`}>
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground mb-5">
                      {service.description}
                    </p>
                    <ul className="space-y-2 text-sm mb-6">
                      {service.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/kontakt"
                      className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4"
                    >
                      Pošaljite upit
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      <BeforeAfterSection getCms={getCmsValue} />

      <ProcessSection />

      <section className="py-20 lg:py-28 bg-background relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
              <EditableImage
                page="home"
                section="equipment"
                contentKey="equipment_image"
                currentImageUrl={getCmsValue("equipment", "equipment_image", undefined)}
                fallbackSrc="/services/yamaha-hs8-service.jpg"
                alt="Studio oprema"
                className="rounded-xl w-full saturate-[0.25]"
              />

              <div>
                <h2 className="heading-lg mb-6" data-testid="text-why-choose-title">
                  Kako radimo
                </h2>
                <p className="text-lg text-muted-foreground mb-5 leading-relaxed">
                  Vokal snimamo na Warm Audio WA-47 kroz Apollo Twin X, a mix radimo na Yamaha HS8 monitorima i proveravamo na slušalicama. Ista oprema se koristi u komercijalnim studijima.
                </p>
                <p className="text-muted-foreground mb-8 leading-relaxed" data-testid="text-reason-0">
                  Termin se dogovara prema vašem rasporedu, a svaka usluga uključuje 2 besplatne revizije. Ako vam nešto ne zvuči kako treba, ispravljamo.
                </p>
                <Link href="/kontakt">
                  <Button size="lg" data-testid="button-contact-us">
                    Kontaktirajte nas
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="mb-12 max-w-2xl">
              <h2 className="heading-md mb-4">
                Oprema u studiju
              </h2>
              <p className="text-muted-foreground">
                Šta tačno koristimo pri snimanju, miksu i masteringu.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  src: "/equipment/apollo-twin-duo.jpg",
                  title: "Universal Audio Apollo Twin X Duo",
                  text: "Audio interfejs sa Unison pretpojačalima i UAD obradom u realnom vremenu, pa izvođač u slušalicama čuje efekte bez kašnjenja.",
                },
                {
                  src: "/equipment/dt990-headphones.jpg",
                  title: "Beyerdynamic DT 990 PRO i DT 770 PRO",
                  text: "DT 990 PRO (otvorene) za proveru miksa, DT 770 PRO (zatvorene) za snimanje, da zvuk iz slušalica ne ulazi u mikrofon.",
                },
                {
                  src: "/equipment/uad-plugins.jpg",
                  title: "UAD pluginovi, originalne licence",
                  text: "Neve 1073, Pultec EQ, 1176, LA-2A, Avalon 737 i drugi. Emulacije analogne opreme koja se decenijama koristi u studijima.",
                },
                {
                  src: "/equipment/autotune-uad.jpg",
                  title: "Auto-Tune Realtime Advanced",
                  text: "Radi u realnom vremenu na Apollo interfejsu, pa izvođač peva sa efektom u slušalicama, bez čujnog kašnjenja.",
                },
              ].map((item) => (
                <Card key={item.title} className="overflow-hidden">
                  <CardContent className="p-0">
                    <OptimizedImage src={item.src} alt={item.title} className="w-full h-48 object-cover saturate-[0.25]" />
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10">
              <Link href="/projekti">
                <Button variant="outline" size="lg">
                  Pogledajte naše projekte
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Šta kažu klijenti</h2>
                <p className="text-muted-foreground">
                  {testimonials.length
                    ? "Utisci klijenata posle isporuke. Ostale recenzije su na Google-u, gde ih ne možemo menjati ni birati."
                    : "Recenzije su na Google-u, gde ih ne možemo menjati ni birati."}
                </p>
              </div>
              <a
                href="https://www.google.com/search?q=Studio+LeFlow+Beograd"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button size="lg" variant="outline" className="gap-2">
                  <GoogleIcon className="w-4 h-4" />
                  Recenzije na Google-u
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
            {testimonials.length > 0 && (
              <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map(t => (
                  <figure key={t.id} className="rounded-xl border border-border/60 bg-card p-6 flex flex-col">
                    <blockquote className="text-foreground/90 leading-relaxed flex-1">"{t.text}"</blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      <AvatarWithInitials src={t.avatarUrl} name={t.username} className="w-8 h-8" />
                      <div className="text-sm">
                        <p className="font-semibold">{t.username}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(t.createdAt).toLocaleDateString("sr-Latn", { month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-background border-t border-border/40 relative z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <FadeInWhenVisible>
            <EditableText
              page="home"
              section="cta"
              contentKey="title"
              value={getCmsValue("cta", "title", "Zakažite termin")}
              as="h2"
              className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
            />
            <EditableText
              page="home"
              section="cta"
              contentKey="description"
              value={getCmsValue("cta", "description", "Pozovite ili pišite - besplatna konsultacija, bez obaveze")}
              as="p"
              className="text-lg mb-10 text-muted-foreground max-w-xl mx-auto"
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/kontakt">
                <Button size="lg" className="text-base px-8 py-6" data-testid="button-cta-book">
                  Zakažite termin
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a
                href="tel:+381637347023"
                className="inline-flex items-center gap-2 text-base font-semibold text-foreground/80 hover:text-primary transition-colors px-4 py-3"
                data-testid="button-cta-call"
              >
                <Phone className="w-4 h-4" />
                ili pozovite +381 63 734 7023
              </a>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
