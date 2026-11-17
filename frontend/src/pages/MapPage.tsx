import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/offer-filters.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useRegion, inCity } from "../region/RegionContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { fetchRoadRoute, fullAddress, googleMapsUrl, hasCoordinates } from "../lib/navigation";
import { distanceKm } from "../lib/format";
import {cityMarkets,mapDestinations} from "../lib/marketScope";
import { getMarkets, type Market } from "../services/api";

// Centro aproximado da região de Laranjeiras em Serra/ES, onde ficam os 3 mercados
// cadastrados — usado só para posicionar a câmera inicial do mapa.
const SERRA_CENTER: [number, number] = [-20.1919, -40.265];

type Position = { lat: number; lon: number };

export function MapPage() {
  const [params,setParams] = useSearchParams();
  const {city} = useRegion();
  const value=params.get("mercado") || "";
  const selectedId = /^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value)) ? Number(value) : null;
  const routeRequested = params.get("rota") === "1";
  const [markets, setMarkets] = useState<Market[]>([]);
  const [pricedIds,setPricedIds]=useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [manualOrigin, setManualOrigin] = useState("");
  const [selected, setSelected] = useState<number | null>(selectedId);
  const previousCity=useRef(city);
  useEffect(()=>{
    if(previousCity.current===city)return;
    previousCity.current=city;setSelected(null);
    const next=new URLSearchParams(params);next.delete("mercado");next.delete("rota");setParams(next,{replace:true});
  },[city,params,setParams]);
  function chooseMarket(id:number|null){
    setSelected(id);
    const next=new URLSearchParams(params);
    if(id!==null)next.set("mercado",String(id));else next.delete("mercado");
    next.delete("rota");setParams(next);
  }
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const [roadRoute, setRoadRoute] = useState<{ km: number; minutes: number; coordinates: [number, number][] } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [all,priced]=await Promise.all([getMarkets(),getMarkets(true)]);
      setMarkets(all);setPricedIds(priced.map(m=>m.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os mercados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cityStores=useMemo(()=>cityMarkets(markets,city).filter(m=>pricedIds.includes(m.id)),[markets,city,pricedIds]);
  const visibleMarkets=useMemo(()=>selected!==null ? mapDestinations(markets,selected) : cityStores,[markets,selected,cityStores]);
  const selectorStores=useMemo(()=>{
    const linked=markets.find(m=>m.id===selected);
    return linked&&!cityStores.some(m=>m.id===linked.id) ? [linked,...cityStores] : cityStores;
  },[markets,selected,cityStores]);
  const located = useMemo(
    () => visibleMarkets.filter(hasCoordinates),
    [visibleMarkets],
  );
  const withDistance = useMemo(() => {
    const rows = visibleMarkets.map((market) => ({
      market,
      km: position && hasCoordinates(market) ? distanceKm(position.lat, position.lon, Number(market.latitude), Number(market.longitude)) : null,
    }));
    return position ? rows.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity)) : rows;
  }, [visibleMarkets, position]);

  const selectedMarket = markets.find((item) => item.id === selected) ?? null;

  useEffect(() => {
    if (!position || !selectedMarket || !hasCoordinates(selectedMarket)) {
      setRouteLoading(false);
      setRoadRoute(null);
      setRouteError("");
      return;
    }
    const controller = new AbortController();
    setRoadRoute(null);
    setRouteLoading(true);
    setRouteError("");
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    fetchRoadRoute(position, selectedMarket, controller.signal)
      .then(route => { if (active) setRoadRoute(route); })
      .catch(() => { if (active) setRouteError("Não foi possível calcular a rota por ruas agora. Abra o Google Maps para consultar pelo endereço."); })
      .finally(() => { window.clearTimeout(timeout); if (active) setRouteLoading(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [position, selectedMarket?.id, selectedMarket?.latitude, selectedMarket?.longitude]);

  useEffect(() => {
    if (!map.current) return;
    routeLayer.current?.remove();
    routeLayer.current = null;
    if (!roadRoute) return;
    routeLayer.current = L.polyline(roadRoute.coordinates, { color: "#2176dc", weight: 6, opacity: .85 }).addTo(map.current);
    map.current.fitBounds(routeLayer.current.getBounds(), { padding: [35, 35] });
  }, [roadRoute]);

  // cria o mapa uma vez (o Leaflet mexe direto no DOM, por isso o useRef)
  useEffect(() => {
    if (!container.current || map.current) return;
    map.current = L.map(container.current).setView(SERRA_CENTER, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // redesenha os marcadores quando mercados, posição ou seleção mudam
  useEffect(() => {
    if (!map.current || !layer.current) return;
    map.current.invalidateSize();
    layer.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    located.forEach((market) => {
      const point: L.LatLngExpression = [Number(market.latitude), Number(market.longitude)];
      bounds.push(point);
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = market.name;
      popup.append(title, document.createElement("br"), document.createTextNode(fullAddress(market)));
      L.circleMarker(point, {
        radius: market.id === selected ? 12 : 9,
        color: "#123822",
        fillColor: market.id === selected ? "#dd8f2c" : "#1f6b44",
        fillOpacity: 0.9,
      })
        .bindPopup(popup)
        .on("click", () => chooseMarket(market.id))
        .addTo(layer.current!);
    });
    if (position) {
      const point: L.LatLngExpression = [position.lat, position.lon];
      bounds.push(point);
      L.circleMarker(point, { radius: 8, color: "#0b57d0", fillColor: "#4c8dff", fillOpacity: 0.9 }).bindPopup("Você está aqui").addTo(layer.current);
    }
    if (bounds.length) map.current.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
  }, [located, position, selected]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage("Seu navegador não oferece geolocalização.");
      return;
    }
    setGeoMessage("Obtendo sua localização...");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        // Posição local; o serviço OSRM recebe as coordenadas ao calcular a rota.
        setPosition({ lat: result.coords.latitude, lon: result.coords.longitude });
        setGeoMessage("");
      },
      () => setGeoMessage("Não foi possível obter sua localização (permissão negada ou indisponível)."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  useEffect(() => {
    if (routeRequested && selectedMarket && !position) locate();
    // Solicita localização uma vez ao abrir a rota; evita repetir se a permissão for negada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeRequested, selectedMarket?.id]);

  useEffect(() => { setSelected(selectedId); }, [selectedId]);
  function navigationUrl(market: Market): string {
    return googleMapsUrl(market, position ?? manualOrigin);
  }

  return (
    <section className="map-page">
      <h1>{selectedMarket ? "Como chegar" : "Mercados no mapa"}</h1>
      <label className="field map-market-filter"><span>Loja</span><select value={selected ?? ""} disabled={loading} onChange={event=>chooseMarket(event.target.value ? Number(event.target.value) : null)}><option value="">Todas as lojas com preços</option>{selectorStores.map(m=><option key={m.id} value={m.id}>{m.name}{city==="*"||!inCity(m,city) ? ` · ${m.city}` : ""}</option>)}</select></label>
      {selected!==null&&!loading&&!error&&!selectedMarket&&<Empty title="Unidade não encontrada">Escolha uma loja cadastrada no filtro acima.</Empty>}
      {selectedMarket && !inCity(selectedMarket,city) && <p className="notice">Esta loja fica em {selectedMarket.city}, fora da cidade selecionada.</p>}
      {selectedMarket && <div className="pm-route-panel"><div><strong>{selectedMarket.name}</strong><small>{fullAddress(selectedMarket)}</small>{roadRoute && <p><b>{roadRoute.km.toFixed(1).replace(".", ",")} km por ruas</b> · {Math.round(roadRoute.minutes)} min estimados</p>}{routeLoading && <p>Calculando caminho pelas ruas...</p>}{routeError && <p role="status">{routeError}</p>}{!hasCoordinates(selectedMarket) && <p>Rota pelo endereço. Confira a loja no Google Maps.</p>}</div><a className="primary-button" target="_blank" rel="noreferrer" href={navigationUrl(selectedMarket)}>Ir pelo Google Maps ↗</a></div>}
      <div className="button-row">
        <button className="primary-button" type="button" onClick={locate}>Usar minha localização</button>
        {position && <button className="outline-button" type="button" onClick={() => setPosition(null)}>Limpar localização</button>}
        {geoMessage && <span className="form-hint">{geoMessage}</span>}
      </div>

      {!position && <div className="manual-origin"><label className="field"><span>Ou digite o endereço de saída</span><input placeholder="Rua, número e cidade" value={manualOrigin} onChange={e => setManualOrigin(e.target.value)} /></label></div>}
      <p className="form-hint">Localização opcional. Ao calcular a rota, suas coordenadas são enviadas ao OSRM; não são salvas na conta.</p>
      <div className="map-box" ref={container} aria-label="Mapa OpenStreetMap" />

      {loading && <Loading text="Carregando mercados..." />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && visibleMarkets.length>0 && located.length === 0 && (
        <Empty title="Nenhum marcador disponível neste filtro">
          Lojas sem marcador podem ser abertas pelo endereço no Google Maps. <Link to="/mercados">Ver todos os mercados</Link>.
        </Empty>
      )}
      {withDistance.length > 0 && (
        <ul className="card-list">
          {withDistance.map(({ market, km }) => (
            <li className={`list-card ${market.id === selected ? "selected" : ""}`} key={market.id}>
              <div>
                <button className="card-title link-button" type="button" onClick={() => chooseMarket(market.id)}>{market.name}</button>
                <small>{fullAddress(market)}</small>
                {km !== null && <small><strong>{km.toFixed(1).replace(".", ",")} km</strong> em linha reta da sua localização</small>}
                {market.id === selected && roadRoute && <small><strong>{roadRoute.km.toFixed(1).replace(".", ",")} km pelas ruas</strong> · {Math.round(roadRoute.minutes)} min estimados</small>}
              </div>
              <div className="card-actions">
                <button className="outline-button" type="button" onClick={() => chooseMarket(market.id)}>Ver trajeto</button>
                <a className="primary-button small" href={navigationUrl(market)} target="_blank" rel="noreferrer">Ir pelo Google Maps ↗</a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <details className="app-help"><summary>Sobre o mapa</summary><p>Mapa: © OpenStreetMap. Trajeto azul e tempo estimados pelo OSRM, sujeitos à disponibilidade. A distância em linha reta aparece separadamente.</p></details>
    </section>
  );
}
