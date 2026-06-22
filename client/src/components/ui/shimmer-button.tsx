import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  background?: string;
  borderRadius?: string;
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "rgba(255,255,255,0.25)",
      background = "hsl(var(--primary))",
      borderRadius = "0.75rem",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex items-center justify-center gap-2 overflow-hidden",
          "px-8 py-3 font-semibold text-white transition-all duration-300",
          "hover:scale-105 hover:shadow-2xl active:scale-100 cursor-pointer",
          className
        )}
        style={{ background, borderRadius }}
        {...props}
      >
        {/* Shimmer sweep */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          }}
        />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
