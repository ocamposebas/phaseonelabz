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

const navItems = [
  { label: "Shop", href: "/catalog" },
  { label: "Build a Pack", href: "/build-a-pack" },
  { label: "COA", href: "/coa" },
  { label: "Restock Status", href: "/restock-status" },
];

const announcementItems = [
  "Grand Opening Savings",
  "Free Shipping Over $35",
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
                  Launch savings, free shipping over $35, and no extra card fees.
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

      <style>{`
        .sh-header {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 100;
          pointer-events: none;
          transform: translateY(0);
          opacity: 1;
          transition:
            transform 460ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 260ms ease;
          will-change: transform, opacity;
        }

        .sh-header-hidden {
          transform: translateY(-118%);
          opacity: 0;
        }

        .sh-shell {
          pointer-events: auto;
          padding: 0 12px;
        }

        .sh-announcement {
          position: relative;
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            90deg,
            rgba(7, 25, 38, 0.76),
            rgba(2, 6, 23, 0.72),
            rgba(7, 25, 38, 0.76)
          );
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          white-space: nowrap;
        }

        .sh-announcement-track {
          display: flex;
          width: max-content;
          animation: shAnnouncementMove 42s linear infinite;
          will-change: transform;
        }

        .sh-announcement-item {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 9px 24px;
          flex-shrink: 0;
          font-family: "Orbitron", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(236, 254, 255, 0.86);
        }

        .sh-vial {
          display: inline-grid;
          width: 17px;
          height: 22px;
          place-items: center;
          color: rgba(103, 232, 249, 0.72);
          filter: drop-shadow(0 0 9px rgba(34, 211, 238, 0.25));
          flex-shrink: 0;
        }

        .sh-vial svg {
          width: 15px;
          height: 20px;
        }

        .sh-announcement-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 2;
          width: 92px;
          pointer-events: none;
        }

        .sh-announcement-fade-left {
          left: 0;
          background: linear-gradient(90deg, rgba(2, 6, 23, 0.9), transparent);
        }

        .sh-announcement-fade-right {
          right: 0;
          background: linear-gradient(270deg, rgba(2, 6, 23, 0.9), transparent);
        }

        .sh-nav-card {
          max-width: 1280px;
          margin: 10px auto 0;
          border-radius: 24px;
          overflow: visible;
          transition:
            background 300ms ease,
            border-color 300ms ease,
            box-shadow 300ms ease,
            backdrop-filter 300ms ease;
        }

        .sh-nav-clear {
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;
          backdrop-filter: blur(0);
          -webkit-backdrop-filter: blur(0);
        }

        .sh-nav-glass {
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            135deg,
            rgba(8, 25, 38, 0.72),
            rgba(3, 10, 18, 0.66),
            rgba(8, 28, 42, 0.7)
          );
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sh-nav {
          display: flex;
          height: 84px;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
        }

        .sh-logo {
          display: flex;
          min-width: 130px;
          align-items: center;
        }

        .sh-logo img {
          width: auto;
          max-width: 176px;
          max-height: 54px;
          object-fit: contain;
          transition: transform 280ms ease;
        }

        .sh-logo:hover img {
          transform: scale(1.03);
        }

        .sh-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sh-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.84);
          transition: color 260ms ease;
        }

        .sh-link:hover {
          color: white;
        }

        .sh-link::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          border: 1px solid transparent;
          background: transparent;
          opacity: 0;
          transform: scale(0.92);
          transition:
            opacity 260ms ease,
            transform 260ms ease,
            background 260ms ease,
            border-color 260ms ease;
        }

        .sh-link:hover::before {
          opacity: 1;
          transform: scale(1);
          border-color: rgba(165, 243, 252, 0.1);
          background: rgba(34, 211, 238, 0.055);
        }

        .sh-link::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          height: 2px;
          width: 0;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgb(103, 232, 249);
          transition: width 260ms ease;
        }

        .sh-link:hover::after {
          width: 32px;
        }

        .sh-account {
          position: relative;
        }

        .sh-account-btn {
          border: 0;
          background: transparent;
          cursor: pointer;
          font: inherit;
        }

        .sh-chevron-open {
          color: rgb(165, 243, 252);
          transform: rotate(180deg);
        }

        .sh-dropdown {
          position: absolute;
          top: calc(100% + 14px);
          right: 0;
          width: 288px;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 26px;
          background: rgba(7, 22, 34, 0.96);
          padding: 8px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .sh-dropdown-head {
          padding: 12px 16px;
        }

        .sh-dropdown-head p {
          margin: 0;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-dropdown-head span {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.5);
        }

        .sh-dropdown-line {
          height: 1px;
          margin-block: 4px;
          background: rgba(165, 243, 252, 0.1);
        }

        .sh-dropdown a {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.88);
          transition: background 220ms ease, color 220ms ease;
        }

        .sh-dropdown a svg {
          color: rgb(165, 243, 252);
        }

        .sh-dropdown a:hover {
          background: rgba(34, 211, 238, 0.07);
          color: white;
        }

        .sh-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .sh-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.78);
          transition: color 240ms ease, transform 240ms ease;
        }

        .sh-icon:hover {
          color: rgb(165, 243, 252);
          transform: translateY(-1px);
        }

        .sh-cart span {
          position: absolute;
          top: -12px;
          right: -12px;
          display: grid;
          min-width: 17px;
          height: 17px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding-inline: 5px;
          font-size: 9px;
          font-weight: 900;
          color: rgb(2, 6, 23);
          box-shadow: 0 0 18px rgba(103, 232, 249, 0.45);
        }

        .sh-mobile-toggle {
          display: none;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.86);
        }

        .sh-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.66);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          pointer-events: auto;
        }

        .sh-mobile-panel {
          margin-left: auto;
          display: flex;
          height: 100%;
          width: min(86%, 390px);
          flex-direction: column;
          border-left: 1px solid rgba(165, 243, 252, 0.1);
          background: #061522;
          padding: 20px;
          box-shadow: -20px 0 80px rgba(0, 0, 0, 0.45);
        }

        .sh-mobile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sh-mobile-top img {
          max-width: 160px;
          max-height: 52px;
          object-fit: contain;
        }

        .sh-mobile-top button {
          border: 0;
          background: transparent;
          color: white;
        }

        .sh-mobile-links {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sh-mobile-links a {
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.035);
          padding: 16px 20px;
          font-size: 16px;
          font-weight: 800;
          color: white;
        }

        .sh-mobile-note {
          margin-top: 32px;
          border: 1px solid rgba(103, 232, 249, 0.16);
          border-radius: 28px;
          background: rgba(103, 232, 249, 0.06);
          padding: 20px;
        }

        .sh-mobile-note p {
          margin: 0;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-mobile-note span {
          display: block;
          margin-top: 10px;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.62);
        }

        .sh-mobile-bottom {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
        }

        .sh-mobile-bottom a {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
        }

        @keyframes shAnnouncementMove {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-33.333%);
          }
        }

        @media (max-width: 1024px) {
          .sh-links,
          .sh-actions {
            display: none;
          }

          .sh-mobile-toggle {
            display: inline-flex;
          }

          .sh-nav {
            padding-inline: 20px;
          }
        }

        @media (max-width: 768px) {
          .sh-shell {
            padding: 0 10px;
          }

          .sh-announcement {
            width: calc(100% + 20px);
            margin-left: -10px;
          }

          .sh-announcement-item {
            gap: 12px;
            padding: 8px 16px;
            font-size: 8.5px;
            letter-spacing: 0.2em;
          }

          .sh-vial svg {
            width: 13px;
            height: 18px;
          }

          .sh-nav {
            height: 78px;
          }

          .sh-logo img {
            max-width: 155px;
            max-height: 50px;
          }
        }
      `}</style>
    </>
  );
}