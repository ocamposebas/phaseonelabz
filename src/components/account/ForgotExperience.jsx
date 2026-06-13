import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import ForgotP from "./ForgotPasswordPage.jsx";

export default function AccountExperience() {
  return (
    <CartProvider>
      <SiteHeader logoSrc="/TRANSPARENCIA-03.webp" />

      <main className="pt-[118px]">
        <ForgotP />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}