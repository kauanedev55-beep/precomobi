import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { ComparisonPage } from "./pages/ComparisonPage";
import { Contribute } from "./pages/Contribute";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { MapPage } from "./pages/MapPage";
import { Markets } from "./pages/Markets";
import { MyContributions } from "./pages/MyContributions";
import { NotFound } from "./pages/NotFound";
import { ProductDetail } from "./pages/ProductDetail";
import { Products } from "./pages/Products";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";
import { ShoppingListPage } from "./pages/ShoppingListPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="cadastro" element={<Register />} />
              <Route path="produtos" element={<Products />} />
              <Route path="produtos/:id" element={<ProductDetail />} />
              <Route path="lista" element={<ShoppingListPage />} />
              <Route path="comparacao/:id" element={<RequireAuth><ComparisonPage /></RequireAuth>} />
              <Route path="contribuir" element={<RequireAuth><Contribute /></RequireAuth>} />
              <Route path="minhas-contribuicoes" element={<RequireAuth><MyContributions /></RequireAuth>} />
              <Route path="perfil" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="historico" element={<History />} />
              <Route path="mercados" element={<Markets />} />
              <Route path="mapa" element={<MapPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
