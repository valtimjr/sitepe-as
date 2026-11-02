import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: service worker apenas em produção e fora do app nativo (Capacitor)
if (import.meta.env.PROD && "serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
