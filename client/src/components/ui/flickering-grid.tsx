import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  maxOpacity?: number;
  className?: string;
}

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.35,
  color = "99,91,255",
  maxOpacity = 0.18,
  className,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId: number;
    let cols = 0;
    let rows = 0;
    let opacities: Float32Array = new Float32Array(0);

    const resize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / (squareSize + gridGap));
      rows = Math.ceil(h / (squareSize + gridGap));
      opacities = new Float32Array(cols * rows);
      for (let i = 0; i < opacities.length; i++) {
        opacities[i] = Math.random() * maxOpacity;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const idx = c * rows + r;
          if (Math.random() < flickerChance / 50) {
            opacities[idx] = Math.random() * maxOpacity;
          }
          ctx.fillStyle = `rgba(${color},${opacities[idx]})`;
          ctx.fillRect(
            c * (squareSize + gridGap),
            r * (squareSize + gridGap),
            squareSize,
            squareSize
          );
        }
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [squareSize, gridGap, flickerChance, color, maxOpacity]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
