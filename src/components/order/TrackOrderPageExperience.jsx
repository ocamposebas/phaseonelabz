import "./TrackOrderPageExperience.styles.css";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import TrackOrderExperience from "./TrackOrderExperience.jsx";
import NewsletterSection from "../footer/NewsletterSection.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";

export default function TrackOrderPageExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="track-page-shell">
        <div className="track-page-spacer">
          <TrackOrderExperience />
        </div>

        <div className="track-after-content">
          <NewsletterSection />
          <SiteFooter />
        </div>
      </main>

      <CartDrawer />
    </CartProvider>
  );
}