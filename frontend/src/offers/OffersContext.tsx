import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { getOffers, type Offer } from "../services/api";

const Context = createContext<{ offers: Offer[]; loading: boolean; error: string; refresh: () => void }>({offers: [], loading: false, error: "", refresh: () => {}});
export function OffersProvider({children}: {children: ReactNode}) {
  const { user, checking } = useAuth();
  const { items } = useCart();
  const ids = items.map(i => i.product.id).sort((a,b) => a-b).join(",");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n+1), []);
  useEffect(() => {
    let active = true;
    if (!user || checking) {setOffers([]); setLoading(false); return;}
    setLoading(true);
    async function load() {
      try {
        const data = await getOffers({forMyLists: true, productIds: ids ? ids.split(",").map(Number) : []});
        if (active) {setOffers(data); setError("");}
      } catch (err) {if(active) setError(err instanceof Error ? err.message : "Não foi possível atualizar os avisos.");}
      finally {if(active) setLoading(false);}
    }
    void load();
    const visible = () => {if(!document.hidden) void load();};
    const timer = window.setInterval(visible, 60000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {active=false; window.clearInterval(timer); window.removeEventListener("focus",visible); document.removeEventListener("visibilitychange",visible);};
  }, [user?.id, checking, ids, revision]);
  return <Context.Provider value={{offers, loading, error, refresh}}>{children}</Context.Provider>;
}
export const useOffers = () => useContext(Context);
