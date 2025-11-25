import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Waves, BarChart3, Gauge, Radio, Zap, Lock } from "lucide-react";
import evlfrqLogoWhite from "@assets/Evlfrq logo beli_1764051642891.png";

const features = [
  {
    icon: Waves,
    title: "FFT Spektar",
    description: "Realtime frekvencijska analiza"
  },
  {
    icon: BarChart3,
    title: "Tonalna Balansa",
    description: "Low / Mid / High analiza"
  },
  {
    icon: Gauge,
    title: "LUFS Merenje",
    description: "Loudness i True Peak"
  },
  {
    icon: Radio,
    title: "Stereo Analiza",
    description: "Vectorscope i Width"
  },
  {
    icon: Zap,
    title: "Rezonanca",
    description: "Detekcija problema"
  },
  {
    icon: Lock,
    title: "Ekskluzivan Pristup",
    description: "Samo za LeFlow producente"
  }
];

export function EVLFRQShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const logoScale = useTransform(smoothProgress, [0, 0.25, 0.5], [0.7, 1.1, 1]);
  const logoOpacity = useTransform(smoothProgress, [0, 0.1, 0.85, 1], [0.4, 1, 1, 0.6]);
  const logoY = useTransform(smoothProgress, [0, 0.35, 0.7], [50, 0, -20]);
  const logoRotate = useTransform(smoothProgress, [0, 0.5], [0, 360]);
  
  const titleOpacity = useTransform(smoothProgress, [0.1, 0.25], [0, 1]);
  const titleY = useTransform(smoothProgress, [0.1, 0.25], [30, 0]);
  
  const subtitleOpacity = useTransform(smoothProgress, [0.15, 0.3], [0, 1]);
  
  const featuresOpacity = useTransform(smoothProgress, [0.25, 0.4], [0, 1]);
  const featuresY = useTransform(smoothProgress, [0.25, 0.45], [40, 0]);
  
  const ctaOpacity = useTransform(smoothProgress, [0.45, 0.6], [0, 1]);
  const ctaY = useTransform(smoothProgress, [0.45, 0.6], [30, 0]);
  
  const glowOpacity = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [0.15, 0.5, 0.5, 0.15]);
  const glowScale = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [0.6, 1.2, 1.2, 0.6]);

  return (
    <section 
      ref={containerRef}
      className="relative h-[200vh] md:h-[250vh]"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_60%)]" />
        
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-indigo-500/15 blur-3xl"
          style={{ 
            opacity: glowOpacity,
            scale: glowScale
          }}
        />

        <div className="absolute inset-0 opacity-[0.03] hidden md:block">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 flex flex-col items-center py-4">
          <motion.div
            className="relative mb-4 md:mb-6"
            style={{
              scale: logoScale,
              opacity: logoOpacity,
              y: logoY,
              rotate: logoRotate
            }}
          >
            <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-2xl md:blur-3xl scale-[1.5] md:scale-[2]" />
            <img 
              src={evlfrqLogoWhite} 
              alt="EVLFRQ - Evil Frequency" 
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 relative z-10"
              style={{ filter: 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.25))' }}
            />
          </motion.div>

          <motion.div 
            className="text-center mb-3 md:mb-6"
            style={{ opacity: titleOpacity, y: titleY }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-1 md:mb-2 tracking-tight">
              EVLFRQ
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light text-indigo-200/70">
              Audio Analyzer
            </p>
          </motion.div>

          <motion.p 
            className="text-sm sm:text-base md:text-lg text-slate-300/80 text-center max-w-md md:max-w-xl mb-6 md:mb-8 px-2"
            style={{ opacity: subtitleOpacity }}
          >
            Profesionalni alat za audio analizu - ekskluzivno za producente Studio LeFlow Community-a.
          </motion.p>

          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 w-full max-w-2xl md:max-w-3xl mb-6 md:mb-8 px-1"
            style={{ opacity: featuresOpacity, y: featuresY }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 sm:p-3 md:p-4"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-indigo-300" />
                    </div>
                    <h3 className="text-white font-medium text-xs sm:text-sm truncate">{feature.title}</h3>
                  </div>
                  <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed line-clamp-2">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto px-4 sm:px-0"
            style={{ opacity: ctaOpacity, y: ctaY }}
          >
            <Link href="/audio-analyzer" className="w-full sm:w-auto">
              <Button 
                size="default"
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-semibold px-5 md:px-6"
                data-testid="button-evlfrq-access"
              >
                Pristup EVLFRQ
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button 
                size="default"
                variant="outline"
                className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
                data-testid="button-activate-key"
              >
                Aktiviraj Ključ
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div 
          className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ opacity: useTransform(smoothProgress, [0, 0.15, 0.6, 1], [0.7, 0.3, 0.3, 0]) }}
        >
          <span className="text-white/25 text-[10px] sm:text-xs uppercase tracking-widest">Skroluj</span>
          <motion.div 
            className="w-4 h-6 sm:w-5 sm:h-8 border border-white/15 rounded-full flex justify-center pt-1 sm:pt-1.5"
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <div className="w-1 h-1 bg-white/30 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
