import {useCart} from "../cart/CartContext";
export function CartSyncNote(){
 const cart=useCart();
 if(cart.syncConflict)return <div className="cart-sync-note" role="status"><p>A lista mudou em outro aparelho. Suas alterações ficam nos rascunhos.</p><button className="outline-button" type="button" onClick={cart.acceptRemoteList}>Usar lista atualizada</button></div>;
 if(cart.syncError)return <p className="cart-sync-note" role="status">{cart.syncError} <button className="text-button" type="button" onClick={()=>void cart.refreshSavedList()}>Atualizar</button></p>;
 return null;
}
