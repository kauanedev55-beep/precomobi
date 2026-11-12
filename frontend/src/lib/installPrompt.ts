export type InstallChoice = { outcome: "accepted" | "dismissed" };
export type InstallPromptEvent = Event & {
  prompt(): Promise<unknown>;
  userChoice?: Promise<InstallChoice>;
};
export type InstallState = { canInstall: boolean; pending: boolean; installed: boolean; message: string };

// Capture browser events before React mounts; a prompt may arrive before a page subscribes.
export function createInstallPromptStore(target: Pick<Window, "addEventListener" | "removeEventListener">) {
  let deferred: InstallPromptEvent | null = null;
  let state: InstallState = { canInstall: false, pending: false, installed: false, message: "" };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<InstallState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const ready = (event: Event) => {
    event.preventDefault(); deferred = event as InstallPromptEvent;
    update({ canInstall: true });
  };
  const completed = () => {
    deferred = null;
    update({ installed: true, canInstall: false, message: "Instalação concluída. Procure o ícone PreçoMobi no celular." });
  };
  target.addEventListener("beforeinstallprompt", ready);
  target.addEventListener("appinstalled", completed);
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async install() {
      if (!deferred || state.pending) return;
      const event = deferred; deferred = null;
      update({ pending: true, canInstall: false, message: "" });
      try {
        // Call synchronously inside the user's click, before awaiting anything else.
        const result = await event.prompt();
        const choice = event.userChoice ? await event.userChoice : result as InstallChoice | undefined;
        if (!state.installed) update({ message: choice?.outcome === "accepted"
          ? "Pedido aceito. Aguarde o navegador concluir a instalação."
          : "Você pode instalar depois ou continuar pelo site." });
      } catch {
        update({ message: "O navegador não abriu a instalação. Use o menu do Chrome: ⋮ → Adicionar à tela inicial → Instalar." });
      } finally { update({ pending: false, canInstall: Boolean(deferred) }); }
    },
    dispose() { target.removeEventListener("beforeinstallprompt", ready); target.removeEventListener("appinstalled", completed); listeners.clear(); }
  };
}
