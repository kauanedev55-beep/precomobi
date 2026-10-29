import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
const ComparisonPage = lazy(() => import("./pages/ComparisonPage").then(m => ({ default: m.ComparisonPage })));
const Contribute = lazy(() => import("./pages/Contribute").then(m => ({ default: m.Contribute })));
const History = lazy(() => import("./pages/History").then(m => ({ default: m.History })));
import { Home } from "./pages/Home";
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const MapPage = lazy(() => import("./pages/MapPage").then(m => ({ default: m.MapPage })));
const Markets = lazy(() => import("./pages/Markets").then(m => ({ default: m.Markets })));
const MyContributions = lazy(() => import("./pages/MyContributions").then(m => ({ default: m.MyContributions })));
import { NotFound } from "./pages/NotFound";
const ProductDetail = lazy(() => import("./pages/ProductDetail").then(m => ({ default: m.ProductDetail })));
const Products = lazy(() => import("./pages/Products").then(m => ({ default: m.Products })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail").then(m => ({ default: m.VerifyEmail })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const ShoppingListPage = lazy(() => import("./pages/ShoppingListPage").then(m => ({ default: m.ShoppingListPage })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<div className="pm-session-loading" role="status">Carregando...</div>}><Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="painel" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="login" element={<Login />} />
              <Route path="cadastro" element={<Register />} />
              <Route path="confirmar-email" element={<VerifyEmail />} />
              <Route path="redefinir-senha" element={<ResetPassword />} />
              <Route path="produtos" element={<RequireAuth><Products /></RequireAuth>} />
              <Route path="produtos/:id" element={<RequireAuth><ProductDetail /></RequireAuth>} />
              <Route path="lista" element={<RequireAuth><ShoppingListPage /></RequireAuth>} />
              <Route path="comparacao/:id" element={<RequireAuth><ComparisonPage /></RequireAuth>} />
              <Route path="contribuir" element={<RequireAuth><Contribute /></RequireAuth>} />
              <Route path="minhas-contribuicoes" element={<RequireAuth><MyContributions /></RequireAuth>} />
              <Route path="perfil" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="historico" element={<RequireAuth><History /></RequireAuth>} />
              <Route path="mercados" element={<RequireAuth><Markets /></RequireAuth>} />
              <Route path="mapa" element={<RequireAuth><MapPage /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes></Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
