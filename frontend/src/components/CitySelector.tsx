import { useId } from "react";
import { useRegion } from "../region/RegionContext";
import "../styles/mobile-clarity.css";
import { Icon } from "./Icon";

export function CitySelector() {
  const {city,setCity,cities} = useRegion();
  const id=useId();
  return <div className="city-selector"><Icon name="pin"/><label htmlFor={id}>Cidade</label><select id={id} value={city} onChange={e=>setCity(e.target.value)} aria-describedby={!city?`${id}-hint`:undefined}><option value="">Escolha a cidade</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}<option value="*">Todas as cidades · ES</option></select>{!city&&<p id={`${id}-hint`}>Escolha onde vai comprar.</p>}</div>;
}
