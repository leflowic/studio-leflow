import { motion } from "framer-motion";

// Subtle audio-waveform section divider - brand motif for the studio.
// Bars are static heights (symmetric), revealed with a single staggered
// scale-in when the divider enters the viewport.
const BARS = [4, 10, 7, 16, 9, 22, 12, 28, 14, 22, 9, 16, 7, 10, 4];

export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-[3px] ${className}`}
      aria-hidden="true"
    >
      {BARS.map((height, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-primary/30"
          style={{ height }}
          initial={{ scaleY: 0.3, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}
