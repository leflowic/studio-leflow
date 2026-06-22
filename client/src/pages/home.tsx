import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Music, Mic2, Video, ArrowRight, CheckCircle2, Headphones, Phone, Play, Mail, AlertCircle, Gamepad2, UserPlus, X, LogIn, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  if (data.isOpen) return null;

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
        <Music className="w-4 h-4 text-primary flex-shrink-0" />
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
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-0.5 cursor-pointer">
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
      if (!response.ok) throw new Error(`Failed to load content: ${response.statusText}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: announcement } = useQuery<{ isActive: boolean; message: string }>({
    queryKey: ['/api/announcement'],
  });

  useEffect(() => {
    if (window.location.hash === "#usluge") {
      setTimeout(() => {
        const element = document.getElementById("usluge");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const whyChooseUs = [
    "Preko 5 godina iskustva u muzičkoj produkciji",
    "Profesionalna oprema (WA-47, Apollo Twin X, HS8)",
    "Universal Audio plugin suite i vrhunski processing",
    "Individualan pristup svakom klijentu",
    "Fleksibilni termini i prilagođeni paketi"
  ];

  const stats = [
    { value: "WA-47", label: "Warm Audio kondenzatorski mikrofon" },
    { value: "UAD", label: "Universal Audio plugin suite" },
    { value: "4K", label: "Video produkcija" },
  ];

  const eq0 = { src: "/equipment/apollo-twin-duo.jpg", alt: "Universal Audio Apollo Twin X Duo", title: "Apollo Twin X Duo", desc: "Thunderbolt audio interface sa Realtime UAD processing-om. Kristalno čist konvertor, ultra niska latencija." };
  const eq1 = { src: "/equipment/dt990-headphones.jpg", alt: "Beyerdynamic DT 990 PRO", title: "Beyerdynamic DT 990 & 770 PRO", desc: "Studio referentne slušalice za precizno miksovanje i monitoring." };
  const eq2 = { src: "/equipment/uad-plugins.jpg", alt: "UAD Plugin Collection", title: "UAD Plugin Suite", desc: "Neve 1073, Pultec EQ, 1176, LA-2A — legendarni analog zvuk u digitalnom domenu." };
  const eq3 = { src: "/equipment/autotune-uad.jpg", alt: "AutoTune RealTime Advanced", title: "AutoTune RealTime", desc: "Live pitch correction bez čujnog kasnjenja — profesionalni zvuk tokom snimanja." };

  return (
    <div className="min-h-screen relative">
      {!user && <GuestBanner />}
      <SEO
        title="Studio LeFlow - Muzički Studio Beograd | Snimanje Pesama, Miks, Mastering"
        description="Vrhunski muzički studio u Beogradu. Snimanje, mix/mastering, instrumentali, video spotovi. WA-47, Apollo Twin X, UAD plugins. Preko 5 godina iskustva."
        keywords={[
          "studio leflow", "leflow studio", "leflow", "leflow beograd",
          "studio leflow beograd", "leflow studio beograd", "muzički studio beograd",
          "muzicki studio beograd", "snimanje pesme beograd", "snimanje vokala beograd",
          "miks i mastering", "mix mastering beograd", "muzička produkcija",
          "muzicka produkcija", "audio produkcija beograd", "recording studio belgrade",
          "voice over studio", "podcast studio beograd", "producent muzike beograd",
          "beatmaker beograd", "snimanje pesme dorćol", "najbolji muzički studio beograd",
          "leflow music studio", "music studio belgrade"
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
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
            "opens": "10:00",
            "closes": "22:00"
          }
        }}
      />

      {/* ── HERO ── */}
      <ParallaxHero>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">

            {announcement?.isActive && announcement.message && (
              <motion.div
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive/20 backdrop-blur-md border border-destructive/40 max-w-md mx-auto mb-8"
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-10"
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, type: "spring" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-white/90 tracking-wide" data-testid="text-location">Beograd, Srbija</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, type: "spring" }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="title"
                value={getCmsValue("hero", "title", "Studio LeFlow")}
                as="h1"
                className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold mb-5 text-white tracking-tight font-[Montserrat] drop-shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.38 }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="subtitle"
                value={getCmsValue("hero", "subtitle", "Profesionalna Muzička Produkcija")}
                as="p"
                className="text-xl md:text-2xl lg:text-3xl mb-3 text-white/85 max-w-3xl mx-auto font-light tracking-wide"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.52 }}
            >
              <EditableText
                page="home"
                section="hero"
                contentKey="description"
                value={getCmsValue("hero", "description", "Mix • Master • Instrumentali • Video Produkcija")}
                as="p"
                className="text-base md:text-lg mb-12 text-white/55 max-w-xl mx-auto tracking-widest uppercase text-sm"
              />
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-4 justify-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.68 }}
            >
              <Link href="/kontakt" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/30"
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
                  className="w-full sm:w-auto text-base px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/25 hover:bg-white/20 transition-all hover:scale-105 font-semibold"
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
                    className="w-full sm:w-auto text-base px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/25 hover:bg-white/20 transition-all hover:scale-105 font-semibold relative"
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
                    className="w-full sm:w-auto text-base px-8 py-6 backdrop-blur-md bg-white/10 text-white border-white/25 hover:bg-white/20 transition-all hover:scale-105 font-semibold gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Pridruži se besplatno
                  </Button>
                </Link>
              )}
            </motion.div>

            <GameAnnouncement />
          </div>
        </div>
        <ScrollIndicator targetId="usluge" />
      </ParallaxHero>

      {/* ── STATS ── */}
      <section className="relative z-10 bg-background border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4">
          <FadeInWhenVisible>
            <div className="grid grid-cols-3 divide-x divide-border/40">
              {stats.map((stat, i) => (
                <div key={i} className="py-10 px-6 text-center">
                  <p className="text-4xl md:text-5xl font-bold text-primary mb-1 font-[Montserrat]">{stat.value}</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ── USLUGE ── */}
      <section className="py-24 lg:py-36 bg-background relative z-10" id="usluge">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <ParallaxSection direction="up" intensity={30}>
            <div className="text-center mb-16">
              <motion.p
                className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Šta radimo
              </motion.p>
              <motion.h2
                className="heading-lg mb-4"
                data-testid="text-services-title"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                Naše Usluge
              </motion.h2>
              <motion.p
                className="text-muted-foreground max-w-xl mx-auto"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Kompletna muzička i video produkcija — od ideje do finalnog proizvoda
              </motion.p>
            </div>
          </ParallaxSection>

          <FadeInWhenVisible>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Parallax3DCard key={index}>
                  <div
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_40px_-8px] hover:shadow-primary/20 h-full flex flex-col cursor-pointer"
                    data-testid={`card-service-${index}`}
                  >
                    <div className="aspect-video overflow-hidden">
                      <motion.div
                        className="w-full h-full"
                        whileHover={{ scale: 1.07 }}
                        transition={{ duration: 0.6 }}
                      >
                        <EditableImage
                          page="home"
                          section="services"
                          contentKey={service.imageKey}
                          currentImageUrl={getCmsValue("services", service.imageKey, undefined)}
                          fallbackSrc={service.imageFallback}
                          alt={service.title}
                          className="w-full h-full object-cover transition-all duration-500 brightness-90 group-hover:brightness-100"
                        />
                      </motion.div>
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <service.icon className="w-5 h-5 text-primary" />
                      </div>

                      <h3
                        className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300"
                        data-testid={`text-service-title-${index}`}
                      >
                        {service.title}
                      </h3>

                      <p className="text-muted-foreground text-sm mb-5 leading-relaxed flex-1">
                        {service.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {service.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link href="/kontakt">
                        <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                          Zakažite Termin
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Parallax3DCard>
            ))}
          </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ── ZAŠTO LEFLOW ── */}
      <section className="py-24 lg:py-36 bg-muted/20 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_50%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <ParallaxSection direction="left" intensity={40}>
              <Parallax3DCard>
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 to-primary/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative rounded-2xl overflow-hidden border border-white/[0.07]">
                    <EditableImage
                      page="home"
                      section="equipment"
                      contentKey="equipment_image"
                      currentImageUrl={getCmsValue("equipment", "equipment_image", undefined)}
                      fallbackSrc="/services/yamaha-hs8-service.jpg"
                      alt="Studio oprema"
                      className="w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                </div>
              </Parallax3DCard>
            </ParallaxSection>

            <ParallaxSection direction="right" intensity={40}>
              <div>
                <motion.p
                  className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  Naša prednost
                </motion.p>
                <motion.h2
                  className="heading-lg mb-5"
                  data-testid="text-why-choose-title"
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  Zašto Izabrati Studio LeFlow?
                </motion.h2>
                <motion.p
                  className="text-muted-foreground mb-8 leading-relaxed"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                >
                  Kombinujemo najsavremeniju tehnologiju sa kreativnim pristupom i stručnošću — produkcija koja će istaći vaš muzički rad.
                </motion.p>

                <ul className="space-y-3 mb-10">
                  {whyChooseUs.map((reason, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-3 group"
                      data-testid={`text-reason-${index}`}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.07 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed group-hover:text-foreground text-muted-foreground transition-colors">{reason}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                >
                  <Link href="/kontakt">
                    <Button size="lg" className="transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/20" data-testid="button-contact-us">
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

      {/* ── OPREMA — BENTO GRID ── */}
      <section className="py-24 lg:py-36 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="text-center mb-14">
              <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Profesionalni alati</p>
              <h2 className="heading-md mb-3">Studio Oprema</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">Oprema koja garantuje vrhunski zvuk i produkciju</p>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {/* Large card — spans 2 cols on lg */}
              <div className="lg:col-span-2 group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/25 transition-all duration-500 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/15 cursor-default">
                <div className="aspect-video lg:aspect-[16/7] overflow-hidden">
                  <OptimizedImage
                    src={eq0.src}
                    alt={eq0.alt}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-500 scale-100 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Headphones className="w-4 h-4 text-primary" />
                    <span className="text-xs text-primary font-semibold uppercase tracking-widest">Audio Interface</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{eq0.title}</h3>
                  <p className="text-white/60 text-sm">{eq0.desc}</p>
                </div>
              </div>

            {/* Small card */}
              <div className="group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/25 transition-all duration-500 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/15 cursor-default">
                <div className="aspect-video overflow-hidden">
                  <OptimizedImage
                    src={eq1.src}
                    alt={eq1.alt}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-500 group-hover:scale-105 scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-base font-bold text-white mb-1">{eq1.title}</h3>
                  <p className="text-white/55 text-xs">{eq1.desc}</p>
                </div>
              </div>

            {/* Small card */}
              <div className="group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/25 transition-all duration-500 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/15 cursor-default">
                <div className="aspect-video overflow-hidden">
                  <OptimizedImage
                    src={eq2.src}
                    alt={eq2.alt}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-500 group-hover:scale-105 scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-base font-bold text-white mb-1">{eq2.title}</h3>
                  <p className="text-white/55 text-xs">{eq2.desc}</p>
                </div>
              </div>

            {/* Small card */}
              <div className="group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/25 transition-all duration-500 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/15 cursor-default">
                <div className="aspect-video overflow-hidden">
                  <OptimizedImage
                    src={eq3.src}
                    alt={eq3.alt}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-500 group-hover:scale-105 scale-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-base font-bold text-white mb-1">{eq3.title}</h3>
                  <p className="text-white/55 text-xs">{eq3.desc}</p>
                </div>
              </div>

            {/* CTA card */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary/40 hover:bg-primary/10 transition-all duration-500 group cursor-default aspect-video">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3">Projekti</p>
                  <h3 className="text-lg font-bold mb-2">Pogledajte naš rad</h3>
                  <p className="text-muted-foreground text-sm">Više stotina projekata. Uverite se sami.</p>
                </div>
                <Link href="/projekti">
                  <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                    Pogledaj Projekte
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
          </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ── RECENZIJE ── */}
      <section className="py-20 bg-background relative z-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Recenzije</p>
            <h2 className="text-3xl font-bold mb-4">Šta kažu klijenti</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Naši klijenti su naš najveći dokaz. Pročitajte iskustva na Google-u.
            </p>
            <a
              href="https://www.google.com/search?q=Studio+LeFlow+Beograd"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="gap-2">
                <Star className="w-5 h-5 text-primary" />
                Pročitaj recenzije na Google-u
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="py-24 lg:py-32 bg-background relative z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="rounded-2xl border border-white/[0.07] bg-card/30 backdrop-blur-sm p-8 md:p-12 text-center">
              <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Newsletter</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Budite u toku</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Prijavite se i budite prvi koji će saznati o novim projektima, promocijama i ekskluzivnim ponudama
              </p>
              <NewsletterForm />
              <p className="text-xs text-muted-foreground/60 mt-4 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                Nikada nećemo deliti vaš email sa trećim stranama
              </p>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 lg:py-36 bg-background relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_50%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center relative">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-4">Sledeći korak</p>
            <EditableText
              page="home"
              section="cta"
              contentKey="title"
              value={getCmsValue("cta", "title", "Spremni za Vašu Sledeću Produkciju?")}
              as="h2"
              className="text-4xl md:text-5xl font-bold mb-5 tracking-tight"
            />
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.15}>
            <EditableText
              page="home"
              section="cta"
              contentKey="description"
              value={getCmsValue("cta", "description", "Zakažite besplatnu konsultaciju i razgovarajmo o vašoj muzičkoj viziji")}
              as="p"
              className="text-lg mb-10 text-muted-foreground max-w-xl mx-auto"
            />
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.3}>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kontakt">
                <Button
                  size="lg"
                  className="text-base px-8 py-6 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/30"
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
                  Upoznajte Naš Tim
                </Button>
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
