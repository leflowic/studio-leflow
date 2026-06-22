import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Music, Mic2, Video, ArrowRight, Headphones, Phone, Play, AlertCircle, Gamepad2, UserPlus, X, Star, Sliders, Zap } from "lucide-react";
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
import { NewsletterForm } from "@/components/newsletter-form";
import { ParallaxHero, ParallaxSection, Parallax3DCard } from "@/components/parallax/ParallaxHero";

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
      const now = new Date();
      const belgHour = (now.getUTCHours() + 2) % 24;
      const belgMin = now.getUTCMinutes();
      const belgSec = now.getUTCSeconds();
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
        <span className="text-base">🎵</span>
        <span>
          Sledeća igra počinje <strong>{dateLabel}</strong>
          {countdown && <span className="ml-1.5 font-mono text-white/80">— još {countdown}</span>}
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
    const onScroll = () => { if (window.scrollY > 280) setVisible(true); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem("guest_banner_dismissed", "1");
  };

  if (dismissed || !visible) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg"
    >
      <div className="flex items-center gap-3 bg-card border border-border/80 rounded-2xl shadow-2xl px-4 py-3 backdrop-blur-sm">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Pridruži se zajednici</p>
          <p className="text-xs text-muted-foreground">Besplatno · Igre · Feed · Poruke</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href="/registracija">
            <Button size="sm" className="h-8 rounded-xl text-xs px-3 gap-1.5">
              Registruj se
            </Button>
          </Link>
          <Link href="/prijava">
            <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs px-2.5">
              Prijava
            </Button>
          </Link>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
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
      title: getCmsValue("services", "service_1_title", "Snimanje & Mix/Master"),
      description: getCmsValue("services", "service_1_description", "Profesionalno snimanje vokala i instrumenata u akustički tretiranom studiju"),
      features: [
        "Warm Audio WA-47 mikrofon za kristalno čist zvuk",
        "Apollo Twin X interface i UAD plugin suite",
        "Yamaha HS8 monitori za precizan mix",
        "Finalni fajlovi u WAV i MP3 formatu"
      ],
      imageKey: "service_1_image",
      imageFallback: "/services/wa47-microphone-service.jpg"
    },
    {
      icon: Music,
      title: getCmsValue("services", "service_2_title", "Instrumentali & Gotove Pesme"),
      description: getCmsValue("services", "service_2_description", "Kreiranje originalnih bitova i kompletna produkcija vaših pesama"),
      features: [
        "Profesionalni synthesizeri i MIDI kontroleri",
        "Produkcija od ideje do finalnog miksa",
        "Raznovrsni žanrovi (Hip-Hop, Pop, R&B, Trap)",
        "Ekskluzivna i neekskluzivna prava"
      ],
      imageKey: "service_2_image",
      imageFallback: "/services/midi-keyboard-service.jpg"
    },
    {
      icon: Video,
      title: getCmsValue("services", "service_3_title", "Video Produkcija"),
      description: getCmsValue("services", "service_3_description", "Snimanje i editing profesionalnih muzičkih spotova"),
      features: [
        "4K video snimanje sa profesionalnom opremom",
        "Kreativni koncept i scenario",
        "Color grading i post-produkcija",
        "Finalni video optimizovan za YouTube i socijalne mreže"
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
        description="Vrhunski muzički studio u Beogradu. Snimanje, mix/mastering, instrumentali, video spotovi. WA-47, Apollo Twin X, UAD plugins. Preko 5 godina iskustva."
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
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MusicRecordingStudio",
          "name": "Studio LeFlow",
          "alternateName": ["LeFlow Studio", "LeFlow", "Studio LeFlow Beograd", "LeFlow Studio Beograd"],
          "description": "Profesionalni muzički studio u Beogradu. Snimanje vokala, miks i mastering, voice over, podcast produkcija.",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Beograd",
            "addressCountry": "RS"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "44.7866",
            "longitude": "20.4489"
          },
          "priceRange": "$$",
          "telephone": "+381",
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "10:00",
            "closes": "22:00"
          }
        }}
      />

      <ParallaxHero>
        <div className="flex items-center justify-center min-h-screen">
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
              initial={{ opacity: 0, y: 40, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, delay: 0.2, type: "spring" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="title"
                value={getCmsValue("hero", "title", "Studio LeFlow")}
                as="h1"
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-white tracking-tight font-[Montserrat] drop-shadow-2xl"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.9, delay: 0.4, type: "spring" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="subtitle"
                value={getCmsValue("hero", "subtitle", "Profesionalna Muzička Produkcija")}
                as="p"
                className="text-xl md:text-2xl lg:text-3xl mb-4 text-white/90 max-w-3xl mx-auto font-light"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="description"
                value={getCmsValue("hero", "description", "Mix • Master • Instrumentali • Video Produkcija")}
                as="p"
                className="text-lg md:text-xl mb-12 text-white/70 max-w-2xl mx-auto"
              />
            </motion.div>
            
            <motion.div 
              className="flex flex-wrap gap-4 justify-center"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8, type: "spring" }}
            >
              <Link href="/kontakt" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-6 bg-primary hover:bg-primary border border-primary-border backdrop-blur-md transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 font-semibold"
                  data-testid="button-book-session"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Zakažite Termin
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/projekti" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-xl font-semibold"
                  data-testid="button-view-projects"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Pogledaj Projekte
                </Button>
              </Link>
              {user?.emailVerified && (
                <Link href="/igra" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-xl font-semibold relative"
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
              {!user && (
                <Link href="/registracija" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-xl font-semibold gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Pridruži se besplatno
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Upcoming game announcement */}
            <GameAnnouncement />
          </div>
        </div>
        <ScrollIndicator targetId="usluge" />
      </ParallaxHero>

      <section className="py-20 lg:py-32 bg-background relative z-10" id="usluge">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <ParallaxSection direction="up" intensity={30}>
            <div className="text-center mb-16">
              <motion.h2 
                className="heading-lg mb-6" 
                data-testid="text-services-title"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                Naše Usluge
              </motion.h2>
              <motion.p
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Snimanje vokala, mix/mastering, custom instrumentali i muzički spotovi — u akustički tretiranom studiju u Beogradu
              </motion.p>
            </div>
          </ParallaxSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <FadeInWhenVisible key={index} delay={index * 0.15}>
                <Parallax3DCard>
                  <Card className="overflow-visible h-full cursor-pointer group" data-testid={`card-service-${index}`}>
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <motion.div
                        className="w-full h-full"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <EditableImage
                          page="home"
                          section="services"
                          contentKey={service.imageKey}
                          currentImageUrl={getCmsValue("services", service.imageKey, undefined)}
                          fallbackSrc={service.imageFallback}
                          alt={service.title}
                          className="w-full h-full object-cover transition-all duration-500"
                        />
                      </motion.div>
                    </div>
                    <CardContent className="p-6 relative">
                      <h3
                        className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors" 
                        data-testid={`text-service-title-${index}`}
                        style={{ transform: "translateZ(15px)" }}
                      >
                        {service.title}
                      </h3>
                      
                      <p className="text-muted-foreground mb-4" style={{ transform: "translateZ(10px)" }}>
                        {service.description}
                      </p>
                      
                      <ul className="space-y-2" style={{ transform: "translateZ(5px)" }}>
                        {service.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5 flex-shrink-0">—</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 pt-4 border-t" style={{ transform: "translateZ(5px)" }}>
                        <Link href="/kontakt">
                          <Button size="sm" className="w-full">
                            Zakažite Termin
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </Parallax3DCard>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32 bg-muted/30 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ParallaxSection direction="left" intensity={40}>
              <Parallax3DCard>
                <motion.div
                  className="w-full relative group"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <EditableImage
                    page="home"
                    section="equipment"
                    contentKey="equipment_image"
                    currentImageUrl={getCmsValue("equipment", "equipment_image", undefined)}
                    fallbackSrc="/services/yamaha-hs8-service.jpg"
                    alt="Studio oprema"
                    className="rounded-xl shadow-2xl w-full relative z-10"
                  />
                </motion.div>
              </Parallax3DCard>
            </ParallaxSection>
            
            <ParallaxSection direction="right" intensity={40}>
              <div>
                <motion.h2
                  className="heading-lg mb-6"
                  data-testid="text-why-choose-title"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  Oprema i Pristup
                </motion.h2>

                <motion.p
                  className="text-lg text-muted-foreground mb-6 leading-relaxed"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  Warm Audio WA-47, Apollo Twin X sa UAD plugin suiteom i Yamaha HS8 monitori — oprema koja se koristi u komercijalnim studijima. Bez kompromisa u zvuku, bez skrivenih troškova.
                </motion.p>

                <motion.p
                  className="text-muted-foreground mb-8 leading-relaxed"
                  data-testid="text-reason-0"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Fleksibilni termini, individualan pristup svakom projektu i neograničen broj revizija miksa — dok ne budete zadovoljni rezultatom.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Link href="/kontakt">
                    <Button 
                      size="lg" 
                      className="text-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/20" 
                      data-testid="button-contact-us"
                    >
                      Kontaktirajte Nas
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </ParallaxSection>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32 bg-muted/10">
        <div className="max-w-xl mx-auto px-4 md:px-6 text-center">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.15em] mb-3">Newsletter</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Budite u toku</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Novi projekti, promocije i ekskluzivne ponude — direktno na vaš email. Bez spama.
            </p>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.2}>
            <NewsletterForm />
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="py-20 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="text-center mb-16">
              <h2 className="heading-md mb-4">
                Studio Oprema
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Profesionalna oprema koja garantuje vrhunski zvuk i produkciju
              </p>
            </div>
          </FadeInWhenVisible>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <FadeInWhenVisible delay={0.1}>
              <Card className="overflow-hidden hover-elevate transition-all duration-300">
                <CardContent className="p-0">
                  <OptimizedImage
                    src="/equipment/apollo-twin-duo.jpg"
                    alt="Universal Audio Apollo Twin X Duo"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-primary" />
                      Universal Audio Apollo Twin X Duo
                    </h3>
                    <p className="text-muted-foreground">
                      Profesionalni Thunderbolt audio interface sa Realtime UAD processing-om. Kristalno čist konvertor i ultra niska latencija za precizno snimanje i monitoring.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.2}>
              <Card className="overflow-hidden hover-elevate transition-all duration-300">
                <CardContent className="p-0">
                  <OptimizedImage
                    src="/equipment/dt990-headphones.jpg"
                    alt="Beyerdynamic DT 990 PRO"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-primary" />
                      Beyerdynamic DT 990 PRO & DT 770 PRO
                    </h3>
                    <p className="text-muted-foreground">
                      Studio referentne slušalice za precizno miksovanje i mastering. DT 990 PRO (otvorene) za analitičko slušanje, DT 770 PRO (zatvorene) za snimanje bez curenja zvuka.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.3}>
              <Card className="overflow-hidden hover-elevate transition-all duration-300">
                <CardContent className="p-0">
                  <OptimizedImage
                    src="/equipment/uad-plugins.jpg"
                    alt="UAD Plugin Collection"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-primary" />
                      UAD Plugin Suite - Sve Originalne Licence
                    </h3>
                    <p className="text-muted-foreground">
                      Kompletna kolekcija originalnih Universal Audio pluginova: Neve 1073, Pultec EQ, 1176 Compressor, LA-2A, Avalon 737 i mnogi drugi. Legendarni analog zvuk u digitalnom domenu.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.4}>
              <Card className="overflow-hidden hover-elevate transition-all duration-300">
                <CardContent className="p-0">
                  <OptimizedImage
                    src="/equipment/autotune-uad.jpg"
                    alt="AutoTune RealTime Advanced"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      AutoTune RealTime Advanced - Bez Kasnjenja
                    </h3>
                    <p className="text-muted-foreground">
                      Realtime Auto-Tune processing sa ultra niskom latencijom - performeri mogu da snimaju sa live pitch correction efektom bez čujnog kasnjenja. Profesionalni zvuk tokom snimanja.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeInWhenVisible>
          </div>

          <FadeInWhenVisible delay={0.5}>
            <div className="text-center mt-12">
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

      <section className="py-20 bg-background relative z-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.15em] mb-3">Recenzije</p>
            <h2 className="text-3xl font-bold mb-4">Šta kažu klijenti</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Više stotina pesama snimljeno. Pročitajte iskustva klijenata direktno na Google-u.
            </p>
            <a
              href="https://www.google.com/search?q=Studio+LeFlow+Beograd"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                Pročitaj recenzije na Google-u
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="py-20 lg:py-32 bg-background border-t border-border/40 relative z-10">
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
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.15}>
            <EditableText
              page="home"
              section="cta"
              contentKey="description"
              value={getCmsValue("cta", "description", "Pozovite ili pišite — besplatna konsultacija, bez obaveze")}
              as="p"
              className="text-lg mb-10 text-muted-foreground max-w-xl mx-auto"
            />
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.3}>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kontakt">
                <Button
                  size="lg"
                  className="text-base px-8 py-6 transition-all hover:scale-105"
                  data-testid="button-cta-book"
                >
                  Zakažite Termin
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/tim">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 transition-all hover:scale-105"
                  data-testid="button-view-team"
                >
                  Upoznajte Tim
                </Button>
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
