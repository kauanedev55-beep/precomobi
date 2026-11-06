export type SaleUnit = "unit" | "kg";
export function saleLabel(unit?: SaleUnit): string {return unit === "kg" ? "kg" : "unidade / embalagem";}
export function quantityLabel(value: string | number, unit?: SaleUnit): string {
  return `${Number(value).toLocaleString("pt-BR", {maximumFractionDigits:3})} ${unit === "kg" ? "kg" : "un."}`;
}
export function parseQuantity(text: string, unit: SaleUnit): number | null {
  const value=text.trim().replace(",", ".");
  if(!/^\d+(\.\d{1,3})?$/.test(value)) return null;
  const quantity=Number(value);
  if(!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999999.999) return null;
  if(unit === "unit" && !Number.isInteger(quantity)) return null;
  return quantity;
}
// Use integer cents and thousandths to match the API's Decimal ROUND_HALF_UP.
export function itemSubtotal(price: string | number | null, quantity: number): string | null {
  if(price === null || !Number.isFinite(quantity) || quantity <= 0) return null;
  const normalized=String(price);
  if(!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction=""] = normalized.split(".");
  const cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0"));
  const thousandths=BigInt(Math.round(quantity*1000));
  const total=(cents*thousandths+500n)/1000n;
  return `${total/100n}.${String(total%100n).padStart(2,"0")}`;
}
