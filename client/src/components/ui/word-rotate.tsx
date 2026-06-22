import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WordRotateProps {
  words: string[];
  duration?: number;
  className?: string;
  motionProps?: React.ComponentPropsWithoutRef<typeof motion.span>;
}

export function WordRotate({
  words,
  duration = 2800,
  className,
  motionProps = {
    initial: { opacity: 0, y: -24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 24 },
    transition: { duration: 0.38, ease: "easeInOut" },
  },
}: WordRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), duration);
    return () => clearInterval(id);
  }, [words, duration]);

  return (
    <span className={cn("inline-block overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        <motion.span key={index} className="inline-block" {...motionProps}>
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
