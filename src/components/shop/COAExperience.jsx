import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import Coa from "../data/COAPageExperience.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import NewsletterSection from "../footer/NewsletterSection.jsx";

export default function ShopExperience({ products = [] }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#050b18] text-white">
        <Header
          logoSrc="/TRANSPARENCIA-03.webp"
          transparentOnTop={false}
        />

        <main className="min-h-screen bg-[#050b18] pt-[118px]">
          <Coa />
          <NewsletterSection />
          <SiteFooter />
        </main>

        <CartDrawer />
      </div>
    </CartProvider>
  );
}