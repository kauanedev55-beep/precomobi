import { useState, type ChangeEvent, type FormEvent } from "react";
import { createMarket, type Market } from "../services/api";

export function MarketForm({ onCreated, onCancel }: { onCreated: (market: Market) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: "", address: "", neighborhood: "", city: "Serra", state: "ES", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: ChangeEvent<HTMLInputElement>) => setForm(current => ({ ...current, [key]: event.target.value })) });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const lat = form.latitude.trim(), lon = form.longitude.trim();
    if (Boolean(lat) !== Boolean(lon) || (lat && (!Number.isFinite(Number(lat.replace(",", "."))) || !Number.isFinite(Number(lon.replace(",", ".")))))) {
      setError("Preencha as duas coordenadas válidas ou deixe ambas vazias.");
      return;
    }
    setSaving(true);
    try {
      const market = await createMarket({
        name: form.name.trim(), address: form.address.trim(), neighborhood: form.neighborhood.trim(),
        city: form.city.trim(), state: form.state.trim().toUpperCase(),
        ...(lat ? { latitude: Number(lat.replace(",", ".")), longitude: Number(lon.replace(",", ".")) } : {}),
      });
      onCreated(market);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o mercado.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="form-card" onSubmit={submit}>
    <h2>Cadastrar mercado</h2>
    <p className="form-hint">Cadastre cada unidade separadamente, com o endereço completo. O mercado ficará disponível para todos consultarem e informarem preços.</p>
    <label className="field"><span>Nome e unidade</span><input required minLength={2} maxLength={160} placeholder="Ex.: Mercado — unidade Centro" {...field("name")} /></label>
    <label className="field"><span>Rua ou avenida e número</span><input required minLength={3} maxLength={255} {...field("address")} /></label>
    <label className="field"><span>Bairro</span><input maxLength={120} {...field("neighborhood")} /></label>
    <label className="field"><span>Cidade</span><input required minLength={2} maxLength={120} {...field("city")} /></label>
    <label className="field"><span>UF</span><input required minLength={2} maxLength={2} {...field("state")} /></label>
    <details><summary>Localização exata (opcional)</summary>
      <p className="form-hint">Use coordenadas verificadas no mapa. Sem elas, o Google Maps abre pelo endereço; a distância não será estimada no aplicativo.</p>
      <label className="field"><span>Latitude</span><input inputMode="decimal" placeholder="Ex.: -20.123456" {...field("latitude")} /></label>
      <label className="field"><span>Longitude</span><input inputMode="decimal" placeholder="Ex.: -40.123456" {...field("longitude")} /></label>
    </details>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="button-row"><button className="primary-button" disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar mercado"}</button><button type="button" className="outline-button" disabled={saving} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
