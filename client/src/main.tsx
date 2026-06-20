import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import DisableDevtool from "disable-devtool";

// Register PWA Service Worker
registerServiceWorker();

// ===== DEBUG PROTECTION (Production Only) =====
// TEMPORARILY DISABLED FOR DEBUGGING — re-enable after portal bug is fixed
// if (import.meta.env.PROD) {
//   disableReactDevTools();
//   DisableDevtool({ clearLog: true, disableSelect: false, disableCopy: false, disableCut: false, disablePaste: false });
// }

// ===== IMAGE PROTECTION =====
// Prevent right-click context menu on images
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'IMG' || target.closest('img')) {
    e.preventDefault();
    return false;
  }
}, true);

// Prevent drag on images
document.addEventListener('dragstart', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
}, true);

// Prevent image save on long press (mobile)
document.addEventListener('touchstart', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'IMG') {
    (target.style as any).webkitTouchCallout = 'none';
  }
}, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
