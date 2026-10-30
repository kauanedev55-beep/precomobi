import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";

export function Dashboard() {
  const { user } = useAuth();
  const { items } = useCart();
  return <section className="pm-dashboard pm-focus-dashboard">
    <div className="pm-dashboard-head"><div><span className="pm-kicker">SEU PREÇOMOBI</span><h1>Olá, {user?.name.split(" ")[0]}.</h1><p>Organize sua compra e descubra onde vale mais a pena ir.</p></div></div>
    <div className="pm-focus-grid"><div className="pm-focus-card"><span className="pm-focus-eyebrow">SUA PRÓXIMA COMPRA</span><div className="pm-focus-illustration" aria-hidden="true"><span>☷</span><span>✓</span><span>✓</span></div><h2>{items.length ? `Sua lista tem ${items.length} ${items.length === 1 ? "produto" : "produtos"}` : "Vamos montar sua lista?"}</h2><p>{items.length ? "Continue de onde parou. Depois, compare os valores dos mercados." : "Adicione o que precisa e compare os mercados com poucos cliques."}</p><Link className="primary-button" to={items.length ? "/lista" : "/produtos"}>{items.length ? "Continuar minha lista" : "Começar minha lista"} →</Link></div>
    <div className="pm-focus-side"><span className="pm-kicker">COMO FUNCIONA</span><h3>Três passos, uma escolha melhor.</h3><ol><li><strong>Adicione produtos</strong><span>Monte sua lista com as quantidades desejadas.</span></li><li><strong>Compare mercados</strong><span>Veja as opções disponíveis e o total da compra.</span></li><li><strong>Escolha e vá</strong><span>Consulte a rota somente quando decidir.</span></li></ol><Link className="pm-subtle-link" to="/lista#listas-salvas">Ver minhas listas salvas →</Link></div></div>
  </section>;
}
