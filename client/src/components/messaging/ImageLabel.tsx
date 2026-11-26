import { Image as ImageIcon, Music2 } from "lucide-react";

// Shown in message previews (conversation list, reply quotes) for an
// image-only message instead of the stored "📎" placeholder content.
export function ImageLabel() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <ImageIcon className="w-3 h-3" />
      Slika
    </span>
  );
}

// Same for an audio-only message (stored content "🎵").
export function AudioLabel() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <Music2 className="w-3 h-3" />
      Audio
    </span>
  );
}
