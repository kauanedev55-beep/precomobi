import { useId } from "react";
import { useRegion } from "../region/RegionContext";
import { Icon } from "./Icon";

export function CitySelector() {
  const {city,setCity,cities} = useRegion();
  const id=useId();
  return <div className="city-selector"><Icon name="pin"/><label htmlFor={id}>Onde você quer comprar?</label><select id={id} value={city} onChange={e=>setCity(e.target.value)} aria-describedby={`${id}-hint`}><option value="">Escolha a cidade</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}<option value="*">Todas as cidades · ES</option></select><p id={`${id}-hint`}>{!city ? "Escolha uma cidade para ver mercados, promoções e comparar sua lista." : city==="*" ? "Você escolheu consultar todas as cidades cadastradas no ES." : `Mercados, promoções e comparações em ${city}. Você pode mudar quando quiser.`}</p></div>;
}
