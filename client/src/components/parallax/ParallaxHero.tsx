import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Music, Headphones, Mic2, Volume2 } from "lucide-react";

interface ParallaxHeroProps {
  children: React.ReactNode;
}

export function ParallaxHero({ children }: ParallaxHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const darkOverlayOpacity = useTransform(smoothProgress, [0, 1], [0.6, 1]);
  
  const midLayerOpacity = useTransform(smoothProgress, [0, 0.5], [0.15, 0]);
  
  const contentY = useTransform(smoothProgress, [0, 1], ["0%", "20%"]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.8], [1, 0]);
  const contentScale = useTransform(smoothProgress, [0, 0.5], [1, 0.95]);

  const floatingElements = [
    { icon: Music, x: "10%", y: "20%", size: 40, delay: 0, rotate: 15 },
    { icon: Headphones, x: "85%", y: "25%", size: 48, delay: 0.2, rotate: -10 },
    { icon: Mic2, x: "15%", y: "70%", size: 36, delay: 0.4, rotate: 20 },
    { icon: Volume2, x: "80%", y: "65%", size: 44, delay: 0.6, rotate: -15 },
    { icon: Music, x: "50%", y: "15%", size: 32, delay: 0.8, rotate: 25 },
    { icon: Music, x: "25%", y: "45%", size: 28, delay: 1, rotate: -20 },
    { icon: Headphones, x: "70%", y: "40%", size: 34, delay: 1.2, rotate: 10 },
  ];

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen overflow-hidden"
      style={{ perspective: "1000px" }}
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/equipment/hero-studio-background.jpg"
          alt="Studio LeFlow Background"
          className="w-full h-full object-cover blur-sm"
        />
      </div>

      <motion.div 
        className="absolute inset-0 z-[1] bg-black"
        style={{
          opacity: darkOverlayOpacity,
        }}
      />

      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      <motion.div 
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          opacity: midLayerOpacity,
        }}
      >
        {floatingElements.map((element, index) => {
          const Icon = element.icon;
          const elementY = useTransform(
            smoothProgress, 
            [0, 1], 
            ["0px", `${-150 - index * 30}px`]
          );
          const elementRotate = useTransform(
            smoothProgress,
            [0, 1],
            [element.rotate, element.rotate + 45]
          );
          const elementScale = useTransform(
            smoothProgress,
            [0, 0.5, 1],
            [1, 1.2, 0.8]
          );

          return (
            <motion.div
              key={index}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                y: elementY,
                rotate: elementRotate,
                scale: elementScale,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -10, 0],
              }}
              transition={{
                opacity: { delay: element.delay, duration: 0.8 },
                scale: { delay: element.delay, duration: 0.8, type: "spring" },
                y: {
                  delay: element.delay + 0.5,
                  duration: 3 + index * 0.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                <Icon 
                  size={element.size} 
                  className="text-primary/40 drop-shadow-lg relative z-10"
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="absolute inset-0 z-[4] pointer-events-none overflow-hidden"
        style={{
          opacity: midLayerOpacity,
        }}
      >
        {[...Array(20)].map((_, i) => {
          const particleY = useTransform(
            smoothProgress,
            [0, 1],
            ["0vh", `${-50 - i * 5}vh`]
          );
          
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              style={{
                left: `${5 + (i * 4.7) % 90}%`,
                top: `${10 + (i * 7) % 80}%`,
                y: particleY,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 4 + (i % 3),
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </motion.div>

      <motion.div 
        className="relative z-10"
        style={{
          y: contentY,
          opacity: contentOpacity,
          scale: contentScale,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
    </div>
  );
}

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right" | "up";
  intensity?: number;
}

export function ParallaxSection({ 
  children, 
  className = "", 
  direction = "up",
  intensity = 50
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
  });

  const yTransform = useTransform(
    smoothProgress, 
    [0, 1], 
    direction === "up" ? [intensity, -intensity] : [-intensity, intensity]
  );
  
  const xTransform = useTransform(
    smoothProgress, 
    [0, 1], 
    direction === "left" ? [intensity, -intensity] : [-intensity, intensity]
  );

  const opacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        y: direction === "up" ? yTransform : 0,
        x: direction !== "up" ? xTransform : 0,
        opacity,
      }}
    >
      {children}
    </motion.div>
  );
}

interface Parallax3DCardProps {
  children: React.ReactNode;
  className?: string;
}

export function Parallax3DCard({ children, className = "" }: Parallax3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-300 ease-out ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}

export function SoundWaveBackground() {
  const { scrollYProgress } = useScroll();
  
  const waveOffset = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const waveOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.1, 0.2, 0.2, 0.1]);

  return (
    <motion.div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity: waveOpacity }}
    >
      <svg 
        className="absolute bottom-0 left-0 w-full h-48"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,149.3C960,139,1056,149,1152,154.7C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="currentColor"
          className="text-primary/10"
          style={{
            translateX: waveOffset,
          }}
        />
      </svg>
      <svg 
        className="absolute bottom-0 left-0 w-full h-32"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,202.7C672,203,768,181,864,170.7C960,160,1056,160,1152,170.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="currentColor"
          className="text-primary/5"
          style={{
            translateX: useTransform(scrollYProgress, [0, 1], [0, -50]),
          }}
        />
      </svg>
    </motion.div>
  );
}
