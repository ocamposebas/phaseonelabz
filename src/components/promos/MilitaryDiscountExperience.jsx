import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx";
import MilitaryDiscountSection from "./MilitaryDiscountSection.jsx";

export default function MilitaryDiscountExperience() {
  return (
    <CartProvider>
      <div className="min-h-screen overflow-x-hidden bg-[#020617] text-white">
        <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

        <main className="relative min-h-screen bg-[#020617] pt-[118px]">
          <MilitaryDiscountSection />
          <New />
          <SiteFooter />
        </main>

        <CartDrawer />
      </div>
    </CartProvider>
  );
}