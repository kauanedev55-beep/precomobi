const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// ---------- tipos (espelham os schemas do backend) ----------
export type Product = {
  id: number;
  ean: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  quantity_value: string | null;
  quantity_unit: string | null;
  image_url: string | null;
  min_price: string | null;
  min_price_market: string | null;
};

export type ProductPrice = {
  report_id: number | null;
  market_id: number;
  market_name: string;
  price: string | null;
  reported_at: string | null;
  source_type: string | null;
  confirmations_count: number;
  confirmed_by_me: boolean;
  is_mine: boolean;
};

export type ProductDetail = Product & { prices: ProductPrice[] };

export type Market = {
  id: number;
  name: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  latitude: string | null;
  longitude: string | null;
};

export type ComparisonItem = {
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: string | null;
  subtotal: string | null;
  reported_at: string | null;
  source_type: string | null;
};

export type MarketResult = {
  market_id: number;
  market_name: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  latitude: string | null;
  longitude: string | null;
  complete: boolean;
  found_items: number;
  total_items: number;
  total: string | null;
  available_total: string;
  comparable_total: string | null;
  items: ComparisonItem[];
};

export type Comparison = {
  shopping_list_id: number;
  list_name: string;
  results: MarketResult[];
  common_product_ids: number[];
  common_items_count: number;
  priced_markets_count: number;
};

export type ShoppingListItem = {
  id: number;
  product_id: number;
  quantity: string;
  is_purchased: boolean;
  product: Product;
};

export type ShoppingList = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  items: ShoppingListItem[];
};

export type PriceReport = {
  id: number;
  product_id: number;
  product_name: string;
  market_id: number;
  market_name: string;
  price: string;
  reported_at: string;
  source_type: string;
  notes: string | null;
  confirmations_count: number;
  confirmed_by_me: boolean;
  is_mine: boolean;
};

export type AuthUser = { id: number; name: string; email: string; is_admin: boolean };
export type AuthResult = { token: string; user: AuthUser };

// ---------- sessão ----------
// O token fica em memória neste módulo (o AuthContext também o guarda no localStorage).
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// ---------- requisição base ----------
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, cache: "no-store", headers });
  } catch {
    throw new Error("Não foi possível conectar à API. Tente novamente em instantes.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    if (response.status === 401 && authToken && onUnauthorized) onUnauthorized();
    let message = "A API retornou um erro.";
    if (typeof body?.detail === "string") message = body.detail;
    else if (Array.isArray(body?.detail)) message = "Verifique os dados informados e tente novamente.";
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("O servidor da aplicação não retornou os dados. Verifique a configuração da API.");
  }
  return response.json() as Promise<T>;
}

// ---------- endpoints ----------
export const getApiHealth = () => request<{ status: string; service: string }>("/health");

export const getProducts = (q?: string) =>
  request<Product[]>(q && q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");

export const getProductByEan = (ean: string) => request<Product[]>(`/products?ean=${encodeURIComponent(ean)}`);
export const getProduct = (id: number) => request<ProductDetail>(`/products/${id}`);
export const getMarkets = () => request<Market[]>("/markets");
export type MarketCreate = {
  name: string; address: string; neighborhood?: string; city: string; state: string;
  latitude?: number; longitude?: number;
};
export const createMarket = (payload: MarketCreate) => request<Market>("/markets", { method: "POST", body: JSON.stringify(payload) });

export const createShoppingList = (payload: { name: string; items: { product_id: number; quantity: number }[] }) =>
  request<ShoppingList>("/shopping-lists", { method: "POST", body: JSON.stringify(payload) });
export const getShoppingLists = () => request<ShoppingList[]>("/shopping-lists");
export const deleteShoppingList = (id: number) => request<void>(`/shopping-lists/${id}`, { method: "DELETE" });
export const compareShoppingList = (listId: number) => request<Comparison>(`/comparisons/${listId}`);

export const getPriceHistory = (params: { product_id?: number; market_id?: number }) => {
  const query = new URLSearchParams();
  if (params.product_id) query.set("product_id", String(params.product_id));
  if (params.market_id) query.set("market_id", String(params.market_id));
  const suffix = query.toString();
  return request<PriceReport[]>(`/price-reports${suffix ? `?${suffix}` : ""}`);
};
export const getMyPriceReports = () => request<PriceReport[]>("/price-reports/mine");
export const createPriceReport = (payload: {
  product_id: number;
  market_id: number;
  price: string;
  observed_at?: string;
  notes?: string;
}) => request<PriceReport>("/price-reports", { method: "POST", body: JSON.stringify(payload) });
export const confirmPriceReport = (reportId: number) =>
  request<PriceReport>(`/price-reports/${reportId}/confirm`, { method: "POST" });

type AuthApiResponse = { access_token: string; user: AuthUser };
const toAuthResult = (result: AuthApiResponse): AuthResult => ({ token: result.access_token, user: result.user });

export const registerUser = (payload: { name: string; email: string; password: string }) =>
  request<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const loginUser = (payload: { email: string; password: string }) =>
  request<AuthApiResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }).then(toAuthResult);
export const getMe = () => request<AuthUser>("/auth/me");
export const exchangeSupabaseSession = (access_token: string) => request<AuthApiResponse>("/auth/supabase-session", { method: "POST", body: JSON.stringify({access_token}) }).then(toAuthResult);

export const verifyEmail = (token: string) => request<{message: string}>("/auth/verify", { method: "POST", body: JSON.stringify({token}) });
export const resendVerification = (email: string) => request<{message: string}>("/auth/resend-verification", { method: "POST", body: JSON.stringify({email}) });

export const getFeatures = () => request<{demo_mode: boolean; region: string | null}>("/features");
export const startDemoSession = () => request<AuthApiResponse>("/auth/demo-session", {method: "POST"}).then(toAuthResult);
