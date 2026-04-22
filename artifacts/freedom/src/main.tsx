import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force dark mode
document.documentElement.classList.add("dark");

// Welcome rumble on app load (~1s pattern)
if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
  try {
    navigator.vibrate([400, 100, 400]);
  } catch {
    // ignore
  }
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
