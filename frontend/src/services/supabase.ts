const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const supabaseReady = Boolean(rawUrl && anonKey);

function configuration() {
  if (!supabaseReady) throw new Error("A autenticação ainda não foi configurada. Consulte o responsável pelo PreçoMobi.");
  return rawUrl.replace(/\/$/, "") + "/auth/v1";
}

async function call<T>(path: string, method: string, data?: unknown): Promise<T> {
  const response = await fetch(configuration() + path, {
    method,
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.msg === "string" ? result.msg : typeof result.error_description === "string" ? result.error_description : typeof result.message === "string" ? result.message : "Não foi possível concluir a operação.");
  return result as T;
}

export type SupabaseTokens = { access_token: string; refresh_token?: string };
export function supabaseRegister(name: string, email: string, password: string) {
  return call("/signup?redirect_to=" + encodeURIComponent(window.location.origin + "/confirmar-email"), "POST", { email, password, data: { name } });
}
export function supabaseLogin(email: string, password: string) {
  return call<SupabaseTokens>("/token?grant_type=password", "POST", { email, password });
}
export function supabaseResend(email: string) {
  return call("/resend", "POST", { type: "signup", email, options: { emailRedirectTo: window.location.origin + "/confirmar-email" } });
}
export function supabaseRecover(email: string) {
  return call("/recover?redirect_to=" + encodeURIComponent(window.location.origin + "/redefinir-senha"), "POST", { email });
}

export async function supabaseUpdatePassword(accessToken: string, password: string): Promise<void> {
  const response = await fetch(configuration() + "/user", { method: "PUT", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) throw new Error("Não foi possível atualizar a senha. Solicite um novo link.");
}
