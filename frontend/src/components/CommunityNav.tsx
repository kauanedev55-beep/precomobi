import { NavLink } from "react-router-dom";

export function CommunityNav() {
  return <nav className="offer-tabs" aria-label="Área da comunidade">
    <NavLink end to="/comunidade" className={({isActive}) => isActive ? "selected" : ""}>Preços da comunidade</NavLink>
    <NavLink to="/minhas-contribuicoes" className={({isActive}) => isActive ? "selected" : ""}>Minhas contribuições</NavLink>
  </nav>;
}
