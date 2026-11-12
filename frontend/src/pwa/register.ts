// No cached app shell, authentication responses, prices or API data.
export function registerPwa() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  const register = () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(registration => {
        const update = () => { if (document.visibilityState === "visible") void registration.update().catch(() => undefined); };
        document.addEventListener("visibilitychange", update);
      }).catch(() => { /* The website remains usable if installation is unavailable. */ });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
