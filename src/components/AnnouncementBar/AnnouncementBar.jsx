import "./AnnouncementBar.styles.css";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";
import { FREE_SHIPPING_MINIMUM } from "../data/storeConfig";

const navItems = [
  { label: "Shop", href: "/shop" },
  { label: "Build a Pack", href: "/build-a-pack" },
  { label: "COA", href: "/coa" },
  { label: "Restock Status", href: "/restock-status" },
];

const announcementItems = [
  "Grand Opening Savings",
  `Free Shipping Over $${FREE_SHIPPING_MINIMUM}`,
  "No Extra Card Fees",
  "All for Our Grand Opening",
];

function VialIcon() {
  return (
    <span className="sh-vial" aria-hidden="true">
      <svg viewBox="0 0 18 24" fill="none">
        <path
          d="M6.4 2.5h5.2"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M7 3.7h4v2.8c0 .48.18.94.52 1.28l1.5 1.52c.5.5.78 1.18.78 1.9v7.45c0 1.2-.97 2.17-2.17 2.17H6.37c-1.2 0-2.17-.97-2.17-2.17V11.2c0-.72.28-1.4.78-1.9l1.5-1.52C6.82 7.44 7 6.98 7 6.5V3.7Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M5.45 15.25h7.1v3.28c0 .62-.5 1.12-1.12 1.12H6.57c-.62 0-1.12-.5-1.12-1.12v-3.28Z"
          fill="currentColor"
          opacity="0.22"
        />
      </svg>
    </span>
  );
}

function AnnouncementLoop() {
  const loopItems = [...announcementItems, ...announcementItems, ...announcementItems];

  return (
    <div className="sh-announcement-track">
      {loopItems.map((item, index) => (
        <div className="sh-announcement-item" key={`${item}-${index}`}>
          <span>{item}</span>
          <VialIcon />
        </div>
      ))}
    </div>
  );
}

export default function SiteHeader({
  logoSrc = "/TRANSPARENCIA-03.png",
  logoAlt = "Research Lab Logo",
}) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const goingDown = currentY > lastY.current;

      setScrolled(currentY > 24);

      if (currentY < 20) {
        setHidden(false);
      } else if (goingDown && currentY > 120) {
        setHidden(true);
        setAccountOpen(false);
      } else if (!goingDown) {
        setHidden(false);
      }

      lastY.current = Math.max(currentY, 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showGlass = scrolled || mobileOpen;

  return (
    <>
      <header className={`sh-header ${hidden && !mobileOpen ? "sh-header-hidden" : ""}`}>
        <div className="sh-shell">
          <div className="sh-announcement">
            <div className="sh-announcement-fade sh-announcement-fade-left" />
            <div className="sh-announcement-fade sh-announcement-fade-right" />
            <AnnouncementLoop />
          </div>

          <div className={`sh-nav-card ${showGlass ? "sh-nav-glass" : "sh-nav-clear"}`}>
            <nav className="sh-nav">
              <a href="/" className="sh-logo" aria-label="Home">
                <img src={logoSrc} alt={logoAlt} />
              </a>

              <div className="sh-links">
                {navItems.map((item) => (
                  <a href={item.href} className="sh-link" key={item.label}>
                    {item.label}
                  </a>
                ))}

                <div className="sh-account">
                  <button
                    type="button"
                    className="sh-link sh-account-btn"
                    onClick={() => setAccountOpen(!accountOpen)}
                    onBlur={() => setTimeout(() => setAccountOpen(false), 180)}
                  >
                    Account
                    <ChevronDown
                      size={16}
                      className={accountOpen ? "sh-chevron-open" : ""}
                    />
                  </button>

                  {accountOpen && (
                    <div className="sh-dropdown">
                      <div className="sh-dropdown-head">
                        <p>Client Portal</p>
                        <span>Access orders, saved packs and research documents.</span>
                      </div>

                      <div className="sh-dropdown-line" />

                      <a href="/account/login">
                        <User size={17} />
                        Sign In
                      </a>

                      <a href="/account/register">
                        <ShieldCheck size={17} />
                        Create Account
                      </a>

                      <a href="/orders">
                        <PackageCheck size={17} />
                        Order History
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="sh-actions">
                <a href="/search" aria-label="Search" className="sh-icon">
                  <Search size={23} />
                </a>

                <a href="/cart" aria-label="Cart" className="sh-icon sh-cart">
                  <ShoppingCart size={25} />
                  <span>0</span>
                </a>
              </div>

              <button
                type="button"
                className="sh-mobile-toggle"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={29} />
              </button>
            </nav>
          </div>
        </div>

        {mobileOpen && (
          <div className="sh-mobile-overlay">
            <aside className="sh-mobile-panel">
              <div className="sh-mobile-top">
                <a href="/">
                  <img src={logoSrc} alt={logoAlt} />
                </a>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="sh-mobile-links">
                {navItems.map((item) => (
                  <a
                    href={item.href}
                    key={item.label}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}

                <a href="/account" onClick={() => setMobileOpen(false)}>
                  Account
                </a>
              </div>

              <div className="sh-mobile-note">
                <p>Grand Opening</p>
                <span>
                  Launch savings, free shipping over ${FREE_SHIPPING_MINIMUM},
                  and no extra card fees.
                </span>
              </div>

              <div className="sh-mobile-bottom">
                <a href="/search" onClick={() => setMobileOpen(false)}>
                  <Search size={23} />
                  Search
                </a>

                <a href="/cart" onClick={() => setMobileOpen(false)}>
                  <ShoppingCart size={24} />
                  Cart
                </a>
              </div>
            </aside>
          </div>
        )}
      </header>
    </>
  );
}
