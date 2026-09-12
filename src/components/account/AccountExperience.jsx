import "./AccountExperience.styles.css";
import { lazy, Suspense } from "react";
import { CartProvider, useCart } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import AccountDashboard from "./AccountDashboard.jsx";

const CartDrawer = lazy(() => import("../cart/CartDrawer.jsx"));

function DeferredCartDrawer() {
  const { isCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <Suspense fallback={null}>
      <CartDrawer />
    </Suspense>
  );
}

export default function AccountExperience({ initialTab = "overview" }) {
  return (
    <CartProvider>
      <div className="account-page-shell min-h-screen overflow-x-hidden bg-[#020617] text-white">
        <SiteHeader
          logoSrc="/TRANSPARENCIA-03.webp"
          transparentOnTop={false}
          isHome={false}
        />

        <main className="min-h-screen bg-[#020617] pt-[118px]">
          <AccountDashboard initialTab={initialTab} />
        </main>

        <DeferredCartDrawer />
      </div>
    </CartProvider>
  );
}
