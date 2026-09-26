import { CartProvider } from "../cart/CartContext";
import DeferredCartDrawer from "../cart/DeferredCartDrawer.jsx";
import Header from "../nav/Navbar.jsx";

export default function StorefrontChrome({ isHome = false }) {
  return (
    <CartProvider>
      <Header
        logoSrc="/TRANSPARENCIA-03.webp"
        transparentOnTop={true}
        isHome={isHome}
      />
      <DeferredCartDrawer />
    </CartProvider>
  );
}
