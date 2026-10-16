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
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [selected, setSelected] = useState<number | null>(selectedId);
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

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
        // a posição fica só na memória desta página; nada é enviado ao servidor
        setPosition({ lat: result.coords.latitude, lon: result.coords.longitude });
        setGeoMessage("");
      },
      () => setGeoMessage("Não foi possível obter sua localização (permissão negada ou indisponível)."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  // veio do botao "Ver no mapa" na comparacao: ja tenta localizar sozinho
  useEffect(() => {
    if (selectedId) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function routeUrl(market: Market): string {
    const dest = `${market.latitude},${market.longitude}`;
    if (position) {
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`${position.lat},${position.lon};${dest}`)}`;
    }
    return `https://www.openstreetmap.org/?mlat=${market.latitude}&mlon=${market.longitude}#map=17/${market.latitude}/${market.longitude}`;
  }

  return (
    <section>
      <h1>Mapa dos mercados</h1>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={locate}>Usar minha localização</button>
        {position && <button className="outline-button" type="button" onClick={() => setPosition(null)}>Limpar localização</button>}
        {geoMessage && <span className="form-hint">{geoMessage}</span>}
      </div>

      <div className="map-box" ref={container} aria-label="Mapa OpenStreetMap" />

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
              </div>
              <div className="card-actions">
                <a className="primary-button small" href={routeUrl(market)} target="_blank" rel="noreferrer">{position ? "Abrir rota" : "Ver no OpenStreetMap"}</a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="form-hint">Mapa e rotas: © colaboradores do OpenStreetMap (uso gratuito, sem chave de API). A distância exibida é em linha reta.</p>
    </section>
  );
}
