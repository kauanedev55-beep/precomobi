export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

// O backend devolve datas em UTC, às vezes sem o "Z" no final; sem ele o navegador
// interpretaria como horário local e deslocaria a data.
export function parseApiDate(value: string): Date {
  const hasZone = /Z$|[+-]\d\d:\d\d$/.test(value);
  return new Date(hasZone ? value : `${value.replace(" ", "T")}Z`);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return parseApiDate(value).toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return parseApiDate(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function sourceLabel(sourceType: string | null | undefined): string {
  if (sourceType === "community") return "Informado pela comunidade";
  if (sourceType === "development") return "Dados de desenvolvimento";
  return "Origem não informada";
}

export function productSubtitle(product: { brand: string | null; quantity_value: string | null; quantity_unit: string | null }): string {
  const parts = [product.brand];
  if (product.quantity_value && product.quantity_unit) parts.push(`${Number(product.quantity_value)} ${product.quantity_unit}`);
  return parts.filter(Boolean).join(" · ") || "Produto";
}

// Distância em km entre dois pontos (fórmula de Haversine) — calculada no navegador.
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
