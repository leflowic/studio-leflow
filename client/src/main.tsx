import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import DisableDevtool from "disable-devtool";

// Register PWA Service Worker
registerServiceWorker();

// ===== DEBUG PROTECTION (Production Only) =====
if (import.meta.env.PROD) {
  // Disable React DevTools extension
  disableReactDevTools();
  
  // Disable browser DevTools (F12, Inspect, etc.)
  DisableDevtool({
    clearLog: true,
    disableSelect: false,
    disableCopy: false,
    disableCut: false,
    disablePaste: false,
  });
}

// ===== KEYBOARD SHORTCUT PROTECTION =====
document.addEventListener('keydown', (e) => {
  // F12
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+I (Inspect Element)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+J (Console)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+C (Element picker)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+U (View Source)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
    e.preventDefault();
    return false;
  }
}, true);

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
