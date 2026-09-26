import "./AccountExperience.styles.css";
import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import AccountDashboard from "./AccountDashboard.jsx";
import DeferredCartDrawer from "../cart/DeferredCartDrawer.jsx";

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
