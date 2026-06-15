import { CartProvider } from "../cart/CartContext";

import SiteHeader from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import AccountDashboard from "./AccountDashboard.jsx";

export default function AccountExperience() {
  return (
    <CartProvider>
      <div className="account-page-shell min-h-screen overflow-x-hidden bg-[#020617] text-white">
        <SiteHeader
          logoSrc="/TRANSPARENCIA-03.webp"
          transparentOnTop={false}
          isHome={false}
        />

        <main className="min-h-screen bg-[#020617] pt-[118px]">
          <AccountDashboard />
        </main>

        <CartDrawer />

        <style>{`
          .account-page-shell {
            background: #020617 !important;
          }

          .account-page-shell .sh-header,
          .account-page-shell .sh-shell {
            background: #020617 !important;
          }

          .account-page-shell .sh-announcement {
            display: block !important;
            background: #020617 !important;
            border-bottom-color: rgba(165, 243, 252, 0.08) !important;
          }

          .account-page-shell .sh-header-inner .sh-announcement,
          .account-page-shell .sh-header-home .sh-announcement {
            background: #020617 !important;
          }

          .account-page-shell .sh-announcement-fade-left {
            background: linear-gradient(
              90deg,
              #020617,
              rgba(2, 6, 23, 0)
            ) !important;
          }

          .account-page-shell .sh-announcement-fade-right {
            background: linear-gradient(
              270deg,
              #020617,
              rgba(2, 6, 23, 0)
            ) !important;
          }

          .account-page-shell .sh-nav-clear,
          .account-page-shell .sh-header-inner .sh-nav-clear {
            background: #020617 !important;
          }

          .account-page-shell .sh-nav-card {
            background: #020617 !important;
            box-shadow: none !important;
          }

          .account-page-shell .sh-nav-glass {
            background: #020617 !important;
            box-shadow: none !important;
          }

          .account-page-shell main {
            background: #020617 !important;
          }
        `}</style>
      </div>
    </CartProvider>
  );
}