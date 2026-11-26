import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarWithInitialsProps {
  src?: string | null;
  alt?: string;
  name: string;
  userId?: number;
  className?: string;
  fallbackClassName?: string;
}

function generateColorFromId(id?: number): { bg: string; text: string; bgDark: string; textDark: string } {
  if (!id) {
    return {
      bg: "hsl(var(--primary) / 0.1)",
      text: "hsl(var(--primary))",
      bgDark: "hsl(var(--primary) / 0.15)",
      textDark: "hsl(var(--primary))",
    };
  }

  // Muted studio tones (2026-11 palette) - distinct per user, but no bright blue/purple.
  const colors = [
    { bg: "hsl(32, 42%, 90%)", bgDark: "hsl(32, 36%, 19%)", text: "hsl(32, 52%, 30%)", textDark: "hsl(32, 50%, 76%)" },  // hrast
    { bg: "hsl(14, 40%, 90%)", bgDark: "hsl(14, 34%, 19%)", text: "hsl(14, 50%, 30%)", textDark: "hsl(14, 48%, 76%)" },  // terakota
    { bg: "hsl(72, 24%, 90%)", bgDark: "hsl(72, 18%, 19%)", text: "hsl(72, 34%, 30%)", textDark: "hsl(72, 32%, 76%)" },  // maslina
    { bg: "hsl(210, 14%, 90%)", bgDark: "hsl(210, 10%, 19%)", text: "hsl(210, 24%, 30%)", textDark: "hsl(210, 22%, 76%)" },  // škriljac
    { bg: "hsl(44, 34%, 90%)", bgDark: "hsl(44, 28%, 19%)", text: "hsl(44, 44%, 30%)", textDark: "hsl(44, 42%, 76%)" },  // pesak
    { bg: "hsl(22, 48%, 90%)", bgDark: "hsl(22, 42%, 19%)", text: "hsl(22, 58%, 30%)", textDark: "hsl(22, 56%, 76%)" },  // rđa
    { bg: "hsl(145, 16%, 90%)", bgDark: "hsl(145, 10%, 19%)", text: "hsl(145, 26%, 30%)", textDark: "hsl(145, 24%, 76%)" },  // žalfija
    { bg: "hsl(335, 14%, 90%)", bgDark: "hsl(335, 10%, 19%)", text: "hsl(335, 24%, 30%)", textDark: "hsl(335, 22%, 76%)" },  // šljiva
  ];

  const index = id % colors.length;
  const color = colors[index]!;

  return color;
}

function getInitials(name: string): string {
  if (!name) return "?";
  
  const parts = name.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase();
  }
  
  return (parts[0]![0] + (parts[1]?.[0] || parts[0]![1] || "")).toUpperCase();
}

export function AvatarWithInitials({
  src,
  alt,
  name,
  userId,
  className,
  fallbackClassName,
}: AvatarWithInitialsProps) {
  const initials = getInitials(name);
  const colors = generateColorFromId(userId);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <Avatar className={className}>
      {src ? (
        <AvatarImage src={src} alt={alt || name} />
      ) : null}
      <AvatarFallback
        className={cn("font-semibold", fallbackClassName)}
        style={{
          backgroundColor: isDark ? colors.bgDark : colors.bg,
          color: isDark ? colors.textDark : colors.text,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
