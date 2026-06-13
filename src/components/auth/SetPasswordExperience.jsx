import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import SetPasswordPortal from "./SetPasswordPortal.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx";

export default function SetPasswordExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="pt-[118px]">
        <SetPasswordPortal />
        <New />
        <SiteFooter />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}