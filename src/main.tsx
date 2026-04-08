import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registerSW } from "virtual:pwa-register";

// Register the service worker for PWA offline support
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(
  <App />
);
