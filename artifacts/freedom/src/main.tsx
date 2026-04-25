import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress harmless browser noise that the Replit runtime-error overlay
// otherwise displays as a scary "(unknown runtime error)" modal:
//   - "ResizeObserver loop completed with undelivered notifications" — a
//     spec-mandated warning, not a real bug. Triggered constantly on iOS
//     Safari by the breathing-circle animation and auto-resizing textareas.
//   - ErrorEvents whose .error is null and message is empty (a non-Error was
//     thrown, e.g. a third-party SDK rejecting with a non-Error value).
// We listen in capture phase and call stopImmediatePropagation so the overlay
// plugin's handler never runs for these events.
window.addEventListener(
  "error",
  (e) => {
    const msg = e.message || "";
    const isResizeObserverNoise = /ResizeObserver loop/i.test(msg);
    const isEmptyNonError = !e.error && !msg;
    if (isResizeObserverNoise || isEmptyNonError) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);
window.addEventListener(
  "unhandledrejection",
  (e) => {
    // Promises rejected with undefined/null/non-Error values — usually third
    // party SDK noise (e.g. Firebase popup-closed). Real errors keep surfacing.
    if (e.reason == null) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);

// Apply persisted theme (default: dark) before first paint
const savedTheme = localStorage.getItem("freedom_theme");
if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
