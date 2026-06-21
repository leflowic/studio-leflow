import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";

export function WhatsAppButton() {
  const [location] = useLocation();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [nearDismiss, setNearDismiss] = useState(false);
  const dragOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  if (location.startsWith("/l/") || location.startsWith("/portal/")) return null;
  if (hidden) return null;

  const DISMISS_ZONE_HEIGHT = 96;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    moved.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.mx;
    const dy = e.clientY - dragOrigin.current.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    setOffset({ x: dragOrigin.current.ox + dx, y: dragOrigin.current.oy + dy });
    setNearDismiss(e.clientY < DISMISS_ZONE_HEIGHT);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragOrigin.current = null;
    setDragging(false);
    setNearDismiss(false);
    if (moved.current && e.clientY < DISMISS_ZONE_HEIGHT) {
      setHidden(true);
    }
  };

  const onClick = (e: React.MouseEvent) => {
    if (moved.current) { e.preventDefault(); return; }
    window.open("https://wa.me/381637347023", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {dragging && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 pointer-events-none transition-all duration-150 ${
            nearDismiss
              ? "h-24 bg-red-500/80 backdrop-blur-sm"
              : "h-24 bg-black/30 backdrop-blur-sm"
          }`}
        >
          <X className={`w-5 h-5 transition-colors ${nearDismiss ? "text-white" : "text-white/60"}`} />
          <span className={`text-sm font-medium transition-colors ${nearDismiss ? "text-white" : "text-white/60"}`}>
            {nearDismiss ? "Pusti da sklopiš" : "Prevuci ovde da sklopiš"}
          </span>
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-full shadow-lg hover:shadow-xl transition-colors"
        aria-label="Kontaktirajte nas na WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current pointer-events-none">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>
    </>
  );
}
