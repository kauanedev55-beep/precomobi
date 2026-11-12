import { Link } from "react-router-dom";
import "../styles/install-qr.css";

export function InstallQr() {
  return <section className="install-qr" aria-labelledby="install-qr-title">
    <div className="install-qr-copy"><h2 id="install-qr-title">PreçoMobi no seu celular</h2><p className="install-qr-desktop-copy">Aponte a câmera para o QR code e veja como instalar. Sua conta é a mesma do site.</p><p className="install-qr-mobile-copy">Escolha seu celular para ver como instalar.</p></div>
    <div className="install-qr-options">
      <Link to="/instalar#android" className="install-qr-card" aria-label="Ver como instalar o PreçoMobi no Android"><img src="/install-android-qr.png" width="180" height="180" loading="lazy" alt="QR code para as instruções de instalação no Android"/><strong>Android</strong><span>Instalar pelo Chrome</span></Link>
      <Link to="/instalar#iphone" className="install-qr-card" aria-label="Ver como instalar o PreçoMobi no iPhone"><img src="/install-iphone-qr.png" width="180" height="180" loading="lazy" alt="QR code para as instruções de instalação no iPhone"/><strong>iPhone</strong><span>Adicionar pelo Safari</span></Link>
    </div>
  </section>;
}
