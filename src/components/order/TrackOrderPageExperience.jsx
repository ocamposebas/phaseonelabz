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

      <style>{`
        .track-page-shell {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .track-page-spacer {
          position: relative;
          z-index: 1;
          padding-top: 92px;
        }

        /*
          This overrides the section padding inside TrackOrderExperience.
          It gives the hero/header area more breathing room below the navbar.
        */
        .track-page-shell .track-page {
          padding-top: 96px !important;
        }

        .track-after-content {
          position: relative;
          z-index: 5;
          margin-top: 24px;
        }

        @media (max-width: 1040px) {
          .track-page-spacer {
            padding-top: 82px;
          }

          .track-page-shell .track-page {
            padding-top: 88px !important;
          }
        }

        @media (max-width: 620px) {
          .track-page-spacer {
            padding-top: 76px;
          }

          .track-page-shell .track-page {
            padding-top: 78px !important;
          }
        }
      `}</style>
    </CartProvider>
  );
}