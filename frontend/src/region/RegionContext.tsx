import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { getMarkets } from "../services/api";

const defaults = ["Serra", "Vitória", "Vila Velha", "Cariacica"];
const normalize = (s: string) => s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export function inCity(market: {city: string; state: string}, city: string) {
  return Boolean(city) && market.state.trim().toUpperCase() === "ES" && (city === "*" || normalize(market.city) === normalize(city));
}
const Context = createContext<{city: string; setCity: (city: string) => void; cities: string[]}>({city:"", setCity:()=>{}, cities:defaults});
// Mounted inside the account-keyed cart: a new login never inherits another user's choice.
export function RegionProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const key = `precomobi_city_${user?.id ?? "guest"}`;
  const [city, setCity] = useState(() => {try {return localStorage.getItem(key) ?? "";} catch {return "";}});
  const [cities, setCities] = useState(defaults);
  useEffect(() => {try {localStorage.setItem(key, city);} catch { /* Selection still works without browser storage. */ }}, [key,city]);
  useEffect(() => {
    if (!user) return;
    let active=true;
    getMarkets().then(rows => {if(active) {
      const byName=new Map(defaults.map(c => [normalize(c),c]));
      rows.filter(m => m.state.trim().toUpperCase()==="ES").forEach(m => byName.set(normalize(m.city),m.city));
      setCities([...byName.values()].sort((a,b) => a.localeCompare(b,"pt-BR")));
    }}).catch(() => undefined);
    return () => {active=false;};
  }, [user?.id]);
  return <Context.Provider value={{city,setCity,cities}}>{children}</Context.Provider>;
}
export const useRegion = () => useContext(Context);
