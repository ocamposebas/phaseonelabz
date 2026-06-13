import { CartProvider } from "../cart/CartContext.jsx";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import PublicAffiliateApplicationSection from "./PublicAffiliateApplicationSection.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx";

export default function AffiliatesExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="pt-[118px]">
        <PublicAffiliateApplicationSection />
        <New />
        <SiteFooter />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}