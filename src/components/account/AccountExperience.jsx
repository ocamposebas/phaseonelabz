import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import AccountDashboard from "./AccountDashboard.jsx";

export default function AccountExperience() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#020617] text-white">
        <SiteHeader
          logoSrc="/TRANSPARENCIA-03.webp"
          transparentOnTop={false}
        />

        <main className="pt-[118px] min-h-screen bg-[#020617]">
          <AccountDashboard />
        </main>

        <CartDrawer />
      </div>
    </CartProvider>
  );
}