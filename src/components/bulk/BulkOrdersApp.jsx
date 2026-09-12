import { CartProvider } from "../cart/CartContext";
import Header from "../nav/Navbar";
import SiteFooter from "../footer/SiteFooter";
import BulkOrders from "./BulkOrders";

export default function BulkOrdersApp() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={false} showCart={false} />
      <BulkOrders />
      <SiteFooter />
    </CartProvider>
  );
}
