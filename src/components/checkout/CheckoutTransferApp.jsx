import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import CheckoutTransferPage from "./CheckoutTransferPage.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";

export default function CheckoutExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={false} />

      <main className="pt-[118px]">
        <CheckoutTransferPage />
      </main>

      <SiteFooter />

      <CartDrawer />
    </CartProvider>
  );
}