import { Link } from "react-router-dom";
import { usePwa } from "../pwa/PwaContext";

export function InstallApp() {
  const pwa = usePwa();
  return <section className="install-page" aria-labelledby="install-title">
    <img className="install-icon" src="/icons/precomobi-192.png" width="80" height="80" alt="" />
    <h1 id="install-title">PreçoMobi no seu celular</h1>
    <p>Sua lista a um toque. Adicione o ícone à tela inicial e abra o PreçoMobi como um app, sem taxa de instalação.</p>
    {pwa.installed ? <div className="notice good" role="status">O PreçoMobi já está instalado ou aberto como aplicativo.</div> : <>
      {pwa.canInstall && <button className="primary-button" type="button" disabled={pwa.pending} onClick={() => void pwa.install()}>{pwa.pending ? "Abrindo instalação…" : "Instalar PreçoMobi"}</button>}
      <div className="install-guides">
        <section><h2>Android</h2><ol><li>Abra este site no Chrome.</li><li>Toque em <strong>Instalar PreçoMobi</strong>, se o botão aparecer, ou no menu <strong>⋮</strong> do navegador.</li><li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong> e confirme.</li></ol></section>
        <section><h2>iPhone</h2><ol><li>Abra este site no Safari.</li><li>Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</li><li>Se aparecer <strong>Abrir como App</strong>, deixe ativado. Toque em <strong>Adicionar</strong>.</li></ol></section>
      </div>
      <p className="form-hint">Os nomes das opções podem variar. Se estiver no navegador do WhatsApp ou Instagram, abra o link no Chrome ou Safari primeiro. A instalação é opcional.</p>
    </>}
    {pwa.message && <p className="notice" role="status">{pwa.message}</p>}
    <div className="install-details"><h2>Depois de instalar</h2><p>Procure o ícone PreçoMobi no celular. Entre com a mesma conta para acessar as listas salvas. No iPhone, talvez seja necessário entrar novamente na primeira abertura.</p><p>Você precisa de internet para consultar preços, comparar mercados, usar listas compartilhadas e salvar alterações na conta. O app não guarda preços offline como se estivessem atualizados.</p><p>As melhorias chegam pelo site. Feche e abra o app para carregar uma nova versão; não é necessário reinstalar a cada atualização.</p></div>
    <Link className="outline-button" to="/lista">Continuar para minha lista</Link>
  </section>;
}
