import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-based modal (no Radix Dialog). Radix's FocusTrap closes the dialog
 * when the focused element becomes `disabled` mid-operation (e.g. a submit
 * button disabled while its mutation is pending), firing a false
 * `onFocusOutside`. This is a pure `createPortal` with no focus trap, so it
 * only closes when `onClose` is explicitly called. Use this for any new
 * admin modal instead of Radix `<Dialog>`.
 */
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ animation: "fadeIn 0.15s ease" }}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col"
        style={{
          background: "linear-gradient(135deg, rgba(18,18,22,0.99) 0%, rgba(12,12,16,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.85), 0 8px 32px rgba(0,0,0,0.6)",
          animation: "slideUp 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) scale(0.98) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
    </div>,
    document.body
  );
}
