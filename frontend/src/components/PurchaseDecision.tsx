import { useEffect, useState } from "react";
import { formatPrice } from "../lib/format";
import { fetchRoadRoute, googleMapsUrl, hasCoordinates, type Position, type RoadRoute } from "../lib/navigation";
import { moneyCents, netSaving, tripCost } from "../lib/purchase";
import type { MarketResult } from "../services/api";

type Props = { markets: MarketResult[]; partial: boolean; commonCount: number };
const destination = (m: MarketResult) => ({ ...m, name: m.market_name });
const decimal = (s: string): number | null => /^\d+(?:[.,]\d{1,2})?$/.test(s.trim()) ? Number(s.replace(",", ".")) : null;

export function PurchaseDecision({ markets, partial, commonCount }: Props) {
  const total = (m: MarketResult) => partial ? m.comparable_total : m.total;
  const sorted = [...markets].sort((a, b) => moneyCents(total(a)!) - moneyCents(total(b)!));
  const best = sorted[0];
  const [referenceId, setReferenceId] = useState("");
  const reference = sorted.find(m => String(m.market_id) === referenceId && m.market_id !== best?.market_id) ?? sorted[1];
  const [position, setPosition] = useState<Position | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [routes, setRoutes] = useState<Record<number, RoadRoute>>({});
  const [routeMessage, setRouteMessage] = useState("");
  const [perKm, setPerKm] = useState("");
  const [bestCost, setBestCost] = useState("");
  const [referenceCost, setReferenceCost] = useState("");
  const [costMode, setCostMode] = useState("manual");

  useEffect(() => {
    setBestCost(""); setReferenceCost("");
  }, [best?.market_id, reference?.market_id]);

  useEffect(() => {
    setRoutes({}); setRouteMessage("");
    if (!position || !best || !reference) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 12000);
    setRouteMessage("Consultando distância e tempo pelas ruas...");
    const pair = [best, reference];
    void Promise.allSettled(pair.map(m => fetchRoadRoute(position, destination(m), controller.signal)))
      .then(results => {
        if (!active) return;
        const found: Record<number, RoadRoute> = {};
        results.forEach((r, i) => { if (r.status === "fulfilled") found[pair[i].market_id] = r.value; });
        setRoutes(found);
        setRouteMessage(Object.keys(found).length === 2 ? "" : "Não foi possível calcular os dois trajetos. Abra o Google Maps ou informe os custos de deslocamento.");
      }).finally(() => window.clearTimeout(timer));
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [position, best?.market_id, best?.latitude, best?.longitude, reference?.market_id, reference?.latitude, reference?.longitude]);

  if (!best || !reference) return null;
  const saving = (moneyCents(total(reference)!) - moneyCents(total(best)!)) / 100;
  const rate = decimal(perKm);
  const chosenTrip = costMode === "km" ? (rate !== null && routes[best.market_id] ? tripCost(routes[best.market_id].km, rate) : null) : decimal(bestCost);
  const otherTrip = costMode === "km" ? (rate !== null && routes[reference.market_id] ? tripCost(routes[reference.market_id].km, rate) : null) : decimal(referenceCost);
  const net = chosenTrip !== null && otherTrip !== null ? netSaving(saving, chosenTrip, otherTrip) / 100 : null;

  function locate() {
    if (!navigator.geolocation) { setGeoMessage("Localização indisponível. Você pode informar os custos manualmente."); return; }
    setGeoMessage("Obtendo sua localização...");
    navigator.geolocation.getCurrentPosition(result => {
      setPosition({ lat: result.coords.latitude, lon: result.coords.longitude }); setGeoMessage("");
    }, () => setGeoMessage("Localização não autorizada ou indisponível. Informe os custos ou consulte o Google Maps."), { timeout: 10000, maximumAge: 60000 });
  }

  return <section className="purchase-decision" aria-labelledby="decision-title">
    <h2 id="decision-title">Compensa o deslocamento?</h2>
    {partial && <p className="notice">Somente <strong>{commonCount} produtos em comum</strong>. A lista completa ainda não tem total.</p>}
    <p><strong>{best.market_name}</strong> tem o menor {partial ? "subtotal dos itens em comum" : "total registrado"} entre as opções comparáveis: <strong>{formatPrice(total(best))}</strong>.</p>
    <label className="field"><span>Comparar com</span><select value={reference.market_id} onChange={e => setReferenceId(e.target.value)}>
      {sorted.filter(m => m.market_id !== best.market_id).map(m => <option key={m.market_id} value={m.market_id}>{m.market_name} · {formatPrice(total(m))}</option>)}
    </select></label>
    <p>Diferença nos produtos: <strong>{formatPrice(saving)}</strong> a favor de {best.market_name}.</p>
    <button className="outline-button" type="button" onClick={locate}>Calcular trajetos</button>
    <p className="form-hint">Suas coordenadas serão enviadas ao OSRM para calcular os trajetos.</p>
    {geoMessage && <p role="status">{geoMessage}</p>}
    {routeMessage && <p role="status">{routeMessage}</p>}
    <div className="trip-options">{[best, reference].map(m => <div key={m.market_id}>
      <strong>{m.market_name}</strong>
      {routes[m.market_id] ? <p>{routes[m.market_id].km.toFixed(1).replace(".", ",")} km de ida pelas ruas · cerca de {Math.round(routes[m.market_id].minutes)} min de carro</p> : <p>{hasCoordinates(destination(m)) ? "Distância ainda não calculada." : "Sem coordenadas: consulte a localização pelo endereço no Google Maps."}</p>}
      <a href={googleMapsUrl(destination(m), position)} target="_blank" rel="noreferrer">Abrir rota no Google Maps ↗</a>
    </div>)}</div>
    <label className="field"><span>Custo do deslocamento</span><select value={costMode} onChange={e => setCostMode(e.target.value)}>
      <option value="manual">Informar ida e volta</option><option value="km">Calcular pelo custo por km</option>
    </select></label>
    {costMode === "manual" ? <div className="trip-options">
      <label className="field"><span>Ida e volta até {best.market_name} (R$)</span><input inputMode="decimal" placeholder="Ex.: 0,00 se for a pé" value={bestCost} onChange={e => setBestCost(e.target.value)} /></label>
      <label className="field"><span>Ida e volta até {reference.market_name} (R$)</span><input inputMode="decimal" placeholder="Informe seu custo" value={referenceCost} onChange={e => setReferenceCost(e.target.value)} /></label>
    </div> : <><label className="field"><span>Seu custo por km (R$)</span><input inputMode="decimal" placeholder="Informe o custo do seu veículo" value={perKm} onChange={e => setPerKm(e.target.value)} /></label>
      <details className="app-help"><summary>Como calculamos</summary><p>Estimativa: distância de ida × 2 × custo por km. A volta pode ter outro caminho. Não inclui pedágio, estacionamento ou tempo.</p></details></>}
    {net !== null ? <div className={`notice ${net > 0 ? "good" : ""}`} role="status">
      {net > 0 ? <>Considerando os custos informados, {best.market_name} ainda economiza <strong>{formatPrice(net)}</strong>.</> : net < 0 ? <>Com esse deslocamento, {reference.market_name} custa <strong>{formatPrice(-net)}</strong> menos no conjunto.</> : <>Os custos se igualam considerando o deslocamento informado.</>}
      <small className="block">{best.market_name}: {formatPrice(total(best))} + {formatPrice(chosenTrip)} de deslocamento. {reference.market_name}: {formatPrice(total(reference))} + {formatPrice(otherTrip)}.</small>
    </div> : <p className="form-hint">Informe os custos de ida e volta para calcular a economia final.</p>}
  </section>;
}
