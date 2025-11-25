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

function generateColorFromId(id?: number): { bg: string; text: string } {
  if (!id) {
    return {
      bg: "hsl(var(--primary) / 0.1)",
      text: "hsl(var(--primary))",
    };
  }
  
  const colors = [
    { bg: "hsl(220, 85%, 92%)", bgDark: "hsl(220, 70%, 20%)", text: "hsl(220, 90%, 35%)", textDark: "hsl(220, 85%, 85%)" },  // Blue
    { bg: "hsl(280, 85%, 92%)", bgDark: "hsl(280, 70%, 20%)", text: "hsl(280, 90%, 35%)", textDark: "hsl(280, 85%, 85%)" },  // Purple
    { bg: "hsl(340, 85%, 92%)", bgDark: "hsl(340, 70%, 20%)", text: "hsl(340, 90%, 35%)", textDark: "hsl(340, 85%, 85%)" },  // Pink
    { bg: "hsl(30, 85%, 92%)", bgDark: "hsl(30, 70%, 20%)", text: "hsl(30, 90%, 35%)", textDark: "hsl(30, 85%, 85%)" },   // Orange
    { bg: "hsl(160, 85%, 92%)", bgDark: "hsl(160, 70%, 20%)", text: "hsl(160, 90%, 30%)", textDark: "hsl(160, 85%, 85%)" },  // Teal
    { bg: "hsl(120, 85%, 92%)", bgDark: "hsl(120, 70%, 20%)", text: "hsl(120, 90%, 30%)", textDark: "hsl(120, 85%, 85%)" },  // Green
    { bg: "hsl(50, 85%, 92%)", bgDark: "hsl(50, 70%, 25%)", text: "hsl(50, 90%, 30%)", textDark: "hsl(50, 85%, 85%)" },   // Yellow
    { bg: "hsl(10, 85%, 92%)", bgDark: "hsl(10, 70%, 20%)", text: "hsl(10, 90%, 35%)", textDark: "hsl(10, 85%, 85%)" },   // Red
  ];
  
  const index = id % colors.length;
  const color = colors[index]!;
  
  return {
    bg: color.bg,
    text: color.text,
  };
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

  return (
    <Avatar className={className}>
      {src ? (
        <AvatarImage src={src} alt={alt || name} />
      ) : null}
      <AvatarFallback
        className={cn("font-semibold", fallbackClassName)}
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
