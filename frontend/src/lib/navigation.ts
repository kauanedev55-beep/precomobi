export type Destination = {
  name: string; address: string; neighborhood?: string | null; city: string; state: string;
  latitude: string | number | null; longitude: string | number | null;
};
export type Position = { lat: number; lon: number };

export function hasCoordinates(market: Destination): boolean {
  const { latitude, longitude } = market;
  return latitude !== null && longitude !== null && String(latitude).trim() !== "" && String(longitude).trim() !== "" &&
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) &&
    Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;
}
export function fullAddress(market: Destination): string {
  return [market.address, market.neighborhood, market.city, market.state].filter(v => v?.trim()).join(", ");
}
export function destinationQuery(market: Destination): string {
  return hasCoordinates(market) ? `${market.latitude},${market.longitude}` : [market.name, fullAddress(market)].filter(Boolean).join(", ");
}
export function googleMapsUrl(market: Destination, origin?: Position | string | null): string {
  const params = new URLSearchParams({ api: "1", destination: destinationQuery(market), travelmode: "driving" });
  if (typeof origin === "string" && origin.trim()) params.set("origin", origin.trim());
  else if (origin && typeof origin !== "string") params.set("origin", `${origin.lat},${origin.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}

export type RoadRoute = { km: number; minutes: number; coordinates: [number, number][] };
export async function fetchRoadRoute(position: Position, market: Destination, signal?: AbortSignal): Promise<RoadRoute> {
  if (!hasCoordinates(market)) throw new Error("Localização sem coordenadas cadastradas.");
  const url = `https://router.project-osrm.org/route/v1/driving/${position.lon},${position.lat};${market.longitude},${market.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Serviço de rotas indisponível.");
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route || !Number.isFinite(route.distance) || route.distance < 0 ||
    !Number.isFinite(route.duration) || route.duration < 0 || !Array.isArray(route.geometry?.coordinates) ||
    route.geometry.coordinates.length < 2 || !route.geometry.coordinates.every((p: unknown) =>
      Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) {
    throw new Error("Rota não encontrada.");
  }
  return { km: route.distance / 1000, minutes: route.duration / 60,
    coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]) };
}
