import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import ProductCatalog from "../catalog/ShopCatalogSection.jsx"
import CartDrawer from "../cart/CartDrawer.jsx";

export default function ShopExperience({ products = [] }) {
  return (
    <CartProvider>

      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="pt-[108px]">
        <ProductCatalog
          products={products}
          productsEndpoint="/api/products?limit=100"
        />
      </main> 

      <CartDrawer />
    </CartProvider>
  );
}
