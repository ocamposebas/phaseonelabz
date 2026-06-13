import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import Hero from "../hero/Hero.jsx";
import ProductCatalog from "../catalog/ProductCatalog.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import Trust from "../hero/TrustSection.jsx";
import RewardsProgram from "../rewards/RewardsProgram.jsx";
import Coa from "../data/COALookupSection.jsx";
import ShopByCategorySection from "../catalog/ShopByCategorySection.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx";
import MilitaryDiscountBanner from "../promos/MilitaryDiscountBanner.jsx";

export default function ShopExperience({ products = [] }) {
  return (
    <CartProvider>
      <Header
        logoSrc="/TRANSPARENCIA-03.webp"
        transparentOnTop={true}
        isHome={true}
      />

      <main className="pt-0">
        <Hero videoSrc="/prueba.mp4" />

        <Trust />

        <ShopByCategorySection />

        <ProductCatalog products={products} />

        <Coa />
        <MilitaryDiscountBanner />
        <RewardsProgram />

        <New />

        <SiteFooter />
      </main>

      <CartDrawer />
    </CartProvider>
  );
}