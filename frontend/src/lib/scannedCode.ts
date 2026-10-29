const EAN = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/;
/** Identifies products only. A receipt QR is not itself a product or a price. */
export function productCode(raw: string): string | null {
  const text = raw.trim();
  if (EAN.test(text)) return text;
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      for (const field of ["ean", "gtin", "code"]) {
        if (typeof record[field] === "string" && EAN.test(record[field])) return record[field];
      }
    }
  } catch { /* Try a product URL next. */ }
  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    for (const field of ["ean", "gtin", "code"]) {
      const code = url.searchParams.get(field);
      if (code && EAN.test(code)) return code;
    }
    // Open Food Facts product QR links contain a clearly identified product code.
    const match = url.pathname.match(/^\/(?:product|produto)\/(\d{8,14})(?:\/|$)/);
    if (match && EAN.test(match[1])) return match[1];
  } catch { /* No arbitrary URL navigation, HTML rendering, or price ingestion. */ }
  return null;
}
