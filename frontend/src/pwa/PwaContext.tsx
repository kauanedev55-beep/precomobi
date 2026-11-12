import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createInstallPromptStore } from "../lib/installPrompt";

type PwaState = { installed: boolean; canInstall: boolean; pending: boolean; message: string; install(): Promise<void> };
const Context = createContext<PwaState | null>(null);
// This module loads before rendering and before service-worker registration.
const prompts = createInstallPromptStore(window);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function PwaProvider({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(prompts.subscribe, prompts.getSnapshot);
  const [openedAsApp, setOpenedAsApp] = useState(standalone);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const changed = () => setOpenedAsApp(standalone());
    media.addEventListener?.("change", changed);
    return () => media.removeEventListener?.("change", changed);
  }, []);
  return <Context.Provider value={{ ...status, installed: openedAsApp || status.installed, install: prompts.install }}>{children}</Context.Provider>;
}
export function usePwa() {
  const value = useContext(Context);
  if (!value) throw new Error("PwaProvider ausente");
  return value;
}
