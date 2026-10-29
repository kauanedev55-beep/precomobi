import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { distanceKm } from "../lib/format";
import { getMarkets, type Market } from "../services/api";

// Centro aproximado da região de Laranjeiras em Serra/ES, onde ficam os 3 mercados
// cadastrados — usado só para posicionar a câmera inicial do mapa.
const SERRA_CENTER: [number, number] = [-20.1919, -40.265];

type Position = { lat: number; lon: number };

export function MapPage() {
  const [params] = useSearchParams();
  const selectedId = Number(params.get("mercado")) || null;
  const routeRequested = params.get("rota") === "1";
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [manualOrigin, setManualOrigin] = useState("");
  const [selected, setSelected] = useState<number | null>(selectedId);
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
      setMarkets(await getMarkets());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os mercados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const located = useMemo(
    () => markets.filter((market) => market.latitude !== null && market.longitude !== null),
    [markets],
  );
  const withDistance = useMemo(() => {
    const rows = located.map((market) => ({
      market,
      km: position ? distanceKm(position.lat, position.lon, Number(market.latitude), Number(market.longitude)) : null,
    }));
    return position ? rows.sort((a, b) => (a.km ?? 0) - (b.km ?? 0)) : rows;
  }, [located, position]);

  const selectedMarket = located.find((item) => item.id === selected) ?? null;

  useEffect(() => {
    if (!position || !selectedMarket) {
      setRouteLoading(false);
      setRoadRoute(null);
      setRouteError("");
      return;
    }
    const controller = new AbortController();
    setRoadRoute(null);
    setRouteLoading(true);
    setRouteError("");
    const url = `https://router.project-osrm.org/route/v1/driving/${position.lon},${position.lat};${selectedMarket.longitude},${selectedMarket.latitude}?overview=full&geometries=geojson`;
    const timeout = window.setTimeout(() => {
      controller.abort(); setRouteLoading(false);
      setRouteError("O cálculo demorou mais que o esperado. Use a navegação externa.");
    }, 12000);
    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Serviço de rotas indisponível"); return r.json(); })
      .then((data) => {
        const route = data.routes?.[0];
        if (!route || !Array.isArray(route.geometry?.coordinates)) throw new Error("Rota não encontrada");
        setRoadRoute({ km: route.distance / 1000, minutes: route.duration / 60, coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]) });
      })
      .catch((err) => { if (err.name !== "AbortError") setRouteError("Não foi possível calcular a rota por ruas agora. Você ainda pode iniciar a navegação externa."); })
      .finally(() => { window.clearTimeout(timeout); if (!controller.signal.aborted) setRouteLoading(false); });
    return () => { window.clearTimeout(timeout); controller.abort(); };
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
    layer.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    located.forEach((market) => {
      const point: L.LatLngExpression = [Number(market.latitude), Number(market.longitude)];
      bounds.push(point);
      L.circleMarker(point, {
        radius: market.id === selected ? 12 : 9,
        color: "#123822",
        fillColor: market.id === selected ? "#dd8f2c" : "#1f6b44",
        fillOpacity: 0.9,
      })
        .bindPopup(`<strong>${market.name.replace(/</g, "&lt;")}</strong><br/>${market.address.replace(/</g, "&lt;")}`)
        .on("click", () => setSelected(market.id))
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
    if (routeRequested && selectedId && !position) locate();
    // Solicita localização uma vez ao abrir a rota; evita repetir se a permissão for negada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeRequested, selectedId]);

  function navigationUrl(market: Market): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${market.latitude}%2C${market.longitude}&travelmode=driving${position ? `&origin=${position.lat}%2C${position.lon}` : manualOrigin.trim() ? `&origin=${encodeURIComponent(manualOrigin.trim())}` : ""}`;
  }

  return (
    <section>
      <p className="form-hint">Mercados cadastrados da região de Laranjeiras, Serra/ES. A cobertura ainda é regional.</p>
      <h1>{selectedMarket ? `Como chegar: ${selectedMarket.name}` : "Mapa dos mercados"}</h1>
      {routeRequested && !position && <div className="notice">Para mostrar a distância e o trajeto a partir de onde você está, toque em <strong>Usar minha localização</strong>. A permissão é opcional.</div>}
      {selectedMarket && <div className="pm-route-panel"><div><strong>{selectedMarket.name}</strong><small>{selectedMarket.address}</small>{roadRoute && <p><b>{roadRoute.km.toFixed(1).replace(".", ",")} km por ruas</b> · aproximadamente {Math.round(roadRoute.minutes)} min de carro</p>}{routeLoading && <p>Calculando caminho pelas ruas...</p>}{routeError && <p role="status">{routeError}</p>}{!position && <p>Ative sua localização para calcular a distância.</p>}</div><a className="primary-button" target="_blank" rel="noreferrer" href={navigationUrl(selectedMarket)}>Iniciar navegação ↗</a></div>}
      <div className="button-row">
        <button className="primary-button" type="button" onClick={locate}>Usar minha localização</button>
        {position && <button className="outline-button" type="button" onClick={() => setPosition(null)}>Limpar localização</button>}
        {geoMessage && <span className="form-hint">{geoMessage}</span>}
      </div>

      {!position && <div className="manual-origin"><label className="field"><span>Ou informe seu endereço de saída</span><input placeholder="Rua, número e cidade" value={manualOrigin} onChange={e => setManualOrigin(e.target.value)} /></label><p className="form-hint">O endereço será usado ao abrir a navegação no Google Maps.</p></div>}
      <div className="map-box" ref={container} aria-label="Mapa OpenStreetMap" />
      {selectedMarket && <p className="form-hint">Rota em azul: trajeto estimado pelas vias, quando o serviço estiver disponível. O botão de navegação abre o Google Maps.</p>}

      {loading && <Loading text="Carregando mercados..." />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && located.length === 0 && (
        <Empty title="Nenhum mercado tem localização cadastrada">
          Os mercados de <Link to="/mercados">Mercados</Link> ainda não possuem latitude/longitude no banco, então não há marcadores. O mapa já está pronto: quando as coordenadas forem cadastradas, os mercados aparecem aqui com distância e rota.
        </Empty>
      )}
      {withDistance.length > 0 && (
        <ul className="card-list">
          {withDistance.map(({ market, km }) => (
            <li className={`list-card ${market.id === selected ? "selected" : ""}`} key={market.id}>
              <div>
                <button className="card-title link-button" type="button" onClick={() => setSelected(market.id)}>{market.name}</button>
                <small>{market.address} · {market.city}/{market.state}</small>
                {km !== null && <small><strong>{km.toFixed(1).replace(".", ",")} km</strong> em linha reta da sua localização</small>}
                {market.id === selected && roadRoute && <small><strong>{roadRoute.km.toFixed(1).replace(".", ",")} km pelas ruas</strong> · {Math.round(roadRoute.minutes)} min estimados</small>}
              </div>
              <div className="card-actions">
                <button className="outline-button" type="button" onClick={() => setSelected(market.id)}>Ver trajeto</button>
                <a className="primary-button small" href={navigationUrl(market)} target="_blank" rel="noreferrer">Iniciar navegação ↗</a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="form-hint">Mapa: © OpenStreetMap. Trajeto e tempo estimados pelo serviço público de roteamento OSRM, sujeito a disponibilidade. A distância em linha reta é exibida separadamente.</p>
    </section>
  );
}
