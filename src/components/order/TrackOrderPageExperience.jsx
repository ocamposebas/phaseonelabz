import "./TrackOrderPageExperience.styles.css";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import DeferredCartDrawer from "../cart/DeferredCartDrawer.jsx";
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

      <DeferredCartDrawer />
    </CartProvider>
  );
}
