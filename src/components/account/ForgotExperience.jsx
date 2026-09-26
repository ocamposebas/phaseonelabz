import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import DeferredCartDrawer from "../cart/DeferredCartDrawer.jsx";
import ForgotP from "./ForgotPasswordPage.jsx";

export default function AccountExperience() {
  return (
    <CartProvider>
      <SiteHeader logoSrc="/TRANSPARENCIA-03.webp" />

      <main className="pt-[118px]">
        <ForgotP />
      </main>

      <DeferredCartDrawer />
    </CartProvider>
  );
}
