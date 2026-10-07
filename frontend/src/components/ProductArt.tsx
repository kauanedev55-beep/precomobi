/**
 * Ilustração do produto. Usa a foto real (product.image_url) quando existir —
 * hoje nenhum produto do seed tem foto, então cai no ícone ilustrado por
 * categoria, para não fingir uma foto que não existe.
 */
const CATEGORY_STYLE: Record<string, { bg: string; fg: string; icon: "graos" | "laticinios" | "bebidas" | "massas" | "generico" }> = {
  "Grãos": { bg: "#f6e4c6", fg: "#a8742f", icon: "graos" },
  "Laticínios": { bg: "#dcecef", fg: "#3f7c86", icon: "laticinios" },
  "Bebidas": { bg: "#e9dccb", fg: "#6b4a2f", icon: "bebidas" },
  "Massas": { bg: "#fbe9bd", fg: "#a87a10", icon: "massas" },
};
const DEFAULT_STYLE = { bg: "#e3f1e4", fg: "#1f6b44", icon: "generico" as const };

function Icon({ icon }: { icon: "graos" | "laticinios" | "bebidas" | "massas" | "generico" }) {
  switch (icon) {
    case "graos": // saco de grãos
      return <path d="M36 20h28l6 46a8 8 0 0 1-8 9H38a8 8 0 0 1-8-9z M40 20c0-8 6-12 10-12s10 4 10 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />;
    case "laticinios": // garrafa de leite
      return <path d="M42 14h16v10l7 9v43a6 6 0 0 1-6 6H41a6 6 0 0 1-6-6V33l7-9z M42 14v0 M40 30h20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />;
    case "bebidas": // pacote de café
      return <path d="M32 26h36l-3 50a7 7 0 0 1-7 6H42a7 7 0 0 1-7-6zM40 26c0-8 20-8 20 0M50 40v20M42 50h16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />;
    case "massas": // pacote de massa
      return <path d="M30 24h40v54a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4zM40 24V14h20v10M40 40h20M40 50h20M40 60h20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />;
    default: // sacola de compras
      return <path d="M32 34h36l-3 42a6 6 0 0 1-6 6H41a6 6 0 0 1-6-6zM40 34V26a10 10 0 0 1 20 0v8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />;
  }
}

export function ProductArt({ category, imageUrl, name, size = 72 }: { category: string | null; imageUrl?: string | null; name: string; size?: number }) {
  if (imageUrl) {
    return <img className="product-art photo" src={imageUrl} alt={name} width={size} height={size} loading="lazy" />;
  }
  const style = (category && CATEGORY_STYLE[category]) || DEFAULT_STYLE;
  return (
    <span className="product-art" style={{ width: size, height: size, background: style.bg, color: style.fg }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width="62%" height="62%">
        <Icon icon={style.icon} />
      </svg>
    </span>
  );
}
