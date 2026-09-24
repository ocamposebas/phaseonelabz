import { CartProvider } from "../cart/CartContext";
import CartDrawer from "../cart/CartDrawer.jsx";
import Header from "../nav/Navbar.jsx";

export default function StorefrontChrome({ isHome = false }) {
  return (
    <CartProvider>
      <Header
        logoSrc="/TRANSPARENCIA-03.webp"
        transparentOnTop={true}
        isHome={isHome}
      />
      <CartDrawer />
    </CartProvider>
  );
}
