// No cached app shell, authentication responses, prices or API data.
export function registerPwa() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  // Do not wait for window.load: slow photos/fonts must not delay Android installability.
  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(registration => {
      const update = () => { if (document.visibilityState === "visible") void registration.update().catch(() => undefined); };
      document.addEventListener("visibilitychange", update);
    }).catch(() => { /* The website and manual installation instructions remain usable. */ });
}
