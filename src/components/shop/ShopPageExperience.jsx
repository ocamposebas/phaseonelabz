import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import ProductCatalog from "../catalog/ShopCatalogSection.jsx"
import CartDrawer from "../cart/CartDrawer.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx"

export default function ShopExperience({ products = [] }) {
  return (
    <CartProvider>

      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="pt-[118px]">
        <ProductCatalog products={products} />
        <New/>
        <SiteFooter />
      </main> 

      <CartDrawer />
    </CartProvider>
  );
}