import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import RestockStatusPanel from "./RestockStatusPanel.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import NewsletterSection from "../footer/NewsletterSection.jsx";

export default function RestockStatusExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="pt-[118px]">
        <RestockStatusPanel />
        <NewsletterSection />
        <SiteFooter />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}