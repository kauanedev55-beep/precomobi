import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type InstallPrompt = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = { installed: boolean; canInstall: boolean; pending: boolean; message: string; install(): Promise<void> };
const Context = createContext<PwaState | null>(null);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(standalone);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const changed = () => setInstalled(standalone());
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const completed = () => { setInstalled(true); setPrompt(null); setMessage("Instalação concluída. Procure o ícone PreçoMobi no celular."); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", completed);
    media.addEventListener?.("change", changed);
    return () => { window.removeEventListener("beforeinstallprompt", ready); window.removeEventListener("appinstalled", completed); media.removeEventListener?.("change", changed); };
  }, []);
  async function install() {
    if (!prompt || pending) return;
    setPending(true); setMessage("");
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      setMessage(result.outcome === "accepted" ? "Pedido aceito. Aguarde o navegador concluir a instalação." : "Tudo bem. Você pode instalar quando quiser ou continuar pelo site.");
    } catch { setMessage("O navegador não abriu a instalação. Use as orientações abaixo."); }
    finally { setPrompt(null); setPending(false); }
  }
  return <Context.Provider value={{ installed, canInstall: Boolean(prompt), pending, message, install }}>{children}</Context.Provider>;
}
export function usePwa() {
  const value = useContext(Context);
  if (!value) throw new Error("PwaProvider ausente");
  return value;
}
