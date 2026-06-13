import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import RegisterForm from "./RegisterForm.jsx";

export default function RegisterExperience() {
  return (
    <CartProvider>
      <SiteHeader logoSrc="/TRANSPARENCIA-03.webp" />

      <main className="pt-[118px]">
        <RegisterForm />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}