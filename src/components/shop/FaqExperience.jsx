import React from "react";
import { ArrowRight } from "lucide-react";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import New from "../footer/NewsletterSection.jsx";

const faqGroups = [
  {
    title: "Orders",
    eyebrow: "Checkout & Processing",
    items: [
      {
        question: "How do I place an order?",
        answer:
          "Browse the catalog, select the research products you need, add them to your cart, and complete checkout using the secure payment options available at checkout.",
      },
      {
        question: "Can I change or cancel an order after checkout?",
        answer:
          "Orders are prepared quickly. If you need to request a change or cancellation, contact support as soon as possible with your order number. Once an order enters fulfillment, changes may no longer be available.",
      },
      {
        question: "What information should I include when contacting support?",
        answer:
          "For faster help, include your order number, account email, product name, batch details if available, and a clear description of what you need.",
      },
      {
        question: "Do I need an account to order?",
        answer:
          "An account helps with order history, account tools, rewards, COA-related support, and faster access to information connected to your purchases.",
      },
    ],
  },
  {
    title: "COA Access",
    eyebrow: "Batch Clarity",
    items: [
      {
        question: "Where can I find Certificates of Analysis?",
        answer:
          "COA access is available through the COA Portal when batch information is available. Use your product or batch details to locate the corresponding documentation.",
      },
      {
        question: "What should I do if I cannot find a COA?",
        answer:
          "Contact support with your order number, product name, and any batch information available. The team can help verify the correct documentation path.",
      },
      {
        question: "Why does batch information matter?",
        answer:
          "Batch information helps connect a product to the correct documentation, improves clarity, and gives researchers a more organized way to review available product records.",
      },
    ],
  },
  {
    title: "Shipping",
    eyebrow: "Tracking & Delivery",
    items: [
      {
        question: "How can I track my order?",
        answer:
          "Once tracking is available, you can use the Track Order page or contact support with your order number for help locating the latest available shipping information.",
      },
      {
        question: "When will my order ship?",
        answer:
          "Processing times can vary depending on order volume, product availability, and fulfillment status. For the most accurate update, contact support with your order number.",
      },
      {
        question: "What if my tracking has not updated?",
        answer:
          "Tracking can take time to update after a label is created or after a carrier scan. If it has not moved after a reasonable period, contact support with your order number.",
      },
    ],
  },
  {
    title: "Account & Rewards",
    eyebrow: "Customer Tools",
    items: [
      {
        question: "Where can I access my account?",
        answer:
          "You can access your account through the My Account page to view account-related tools, order information, and available customer features.",
      },
      {
        question: "How do rewards work?",
        answer:
          "Rewards are connected to account activity when available. Log in to your account to view eligible reward information, updates, and account-specific options.",
      },
      {
        question: "Can support help with account access?",
        answer:
          "Yes. If you are having trouble accessing your account, contact support with the email connected to your account so the team can assist.",
      },
    ],
  },
  {
    title: "Research Use",
    eyebrow: "Responsible Presentation",
    items: [
      {
        question: "What does Research Use Only mean?",
        answer:
          "Products displayed on this website are intended strictly for in-vitro laboratory research purposes only. They are not for human consumption, veterinary use, diagnostic use, therapeutic use, cosmetic use, food use, dietary supplement use, or clinical application.",
      },
      {
        question: "Can support provide dosing or usage guidance?",
        answer:
          "No. Support cannot provide medical, diagnostic, therapeutic, dosing, consumption, or clinical guidance. Products are presented strictly for laboratory research use only.",
      },
      {
        question: "Are these products intended to diagnose or treat disease?",
        answer:
          "No. Products are not intended to diagnose, treat, cure, or prevent any disease. Statements on this website have not been evaluated by the U.S. Food and Drug Administration.",
      },
    ],
  },
];

const supportCards = [
  {
    label: "Call",
    value: "(720) 517-1541",
    detail: "Mon–Fri 8am–5pm MT",
    href: "tel:7205171541",
  },
  {
    label: "Text",
    value: "(720) 517-1541",
    detail: "7 days 7am–8pm MT",
    href: "sms:7205171541",
  },
  {
    label: "Email",
    value: "support@phaseonelabz.com",
    detail: "Orders, COA, accounts, and support",
    href: "mailto:support@phaseonelabz.com",
  },
];

const quickLinks = [
  {
    label: "COA Portal",
    href: "/coa",
  },
  {
    label: "Track Order",
    href: "/track-order",
  },
  {
    label: "Contact Support",
    href: "/contact",
  },
];

export default function FaqExperience() {
  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="faq-experience relative overflow-hidden bg-[#020305] pt-[118px] text-white sm:pt-[128px] lg:pt-[136px]">
        <div className="faq-bg" aria-hidden="true" />

        <section className="relative px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="faq-hero">
              <div className="faq-hero-copy">
                <div className="faq-kicker">
                  <span className="faq-dot" />
                  <span>Phase One Labz Support</span>
                </div>

                <h1 className="faq-title">
                  Frequently asked
                  <span> questions.</span>
                </h1>
              </div>

              <p className="faq-intro">
                Premium support guidance for orders, COA access, tracking,
                account tools, and responsible research-use documentation.
              </p>
            </div>

            <div className="faq-layout">
              <aside className="faq-side">
                <div className="faq-side-inner">
                  <div className="faq-side-head">
                    <p>Support Hub</p>

                    <h2>
                      Find the right
                      <span> path faster.</span>
                    </h2>

                    <span>
                      Use the quick links below or contact the team directly
                      with your order number, batch details, or account email.
                    </span>
                  </div>

                  <div className="faq-quick-links">
                    {quickLinks.map((link) => (
                      <a key={link.label} href={link.href}>
                        {link.label}
                        <ArrowRight size={13} aria-hidden="true" />
                      </a>
                    ))}
                  </div>

                  <div className="faq-support-list">
                    {supportCards.map((item) => (
                      <a key={item.label} href={item.href}>
                        <p>{item.label}</p>
                        <h3>{item.value}</h3>
                        <span>{item.detail}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="faq-content">
                {faqGroups.map((group) => (
                  <section key={group.title} className="faq-group">
                    <div className="faq-group-head">
                      <p>{group.eyebrow}</p>
                      <h2>{group.title}</h2>
                    </div>

                    <div className="faq-items">
                      {group.items.map((item) => (
                        <details key={item.question} className="faq-item">
                          <summary>
                            <span>{item.question}</span>

                            <strong aria-hidden="true">+</strong>
                          </summary>

                          <p>{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="faq-disclaimer">
                  <p>
                    <strong>For laboratory and research use only.</strong>{" "}
                    Products displayed on this website are intended strictly for
                    in-vitro laboratory research purposes only. They are not for
                    human consumption, veterinary use, diagnostic use,
                    therapeutic use, cosmetic use, food use, dietary supplement
                    use, or clinical application.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </section>

        <New />
        <SiteFooter />
      </main>

      <CartDrawer />

      <style>{`
        .faq-experience {
          isolation: isolate;
        }

        .faq-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% -8%, rgba(103, 232, 249, 0.11), transparent 34%),
            radial-gradient(circle at 100% 22%, rgba(59, 130, 246, 0.09), transparent 32%),
            radial-gradient(circle at 0% 88%, rgba(103, 232, 249, 0.065), transparent 34%);
        }

        .faq-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
          text-align: center;
        }

        .faq-hero-copy {
          width: 100%;
        }

        .faq-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.15rem;
          font-size: 0.5625rem;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.68);
        }

        .faq-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 16px rgba(103, 232, 249, 0.55);
        }

        .faq-title {
          max-width: 31rem;
          margin: 0 auto;
          font-size: clamp(2.75rem, 10.5vw, 4.55rem);
          font-weight: 600;
          line-height: 0.92;
          letter-spacing: -0.075em;
          color: white;
        }

        .faq-title span {
          display: block;
          color: rgba(165, 243, 252, 0.88);
        }

        .faq-intro {
          max-width: 32rem;
          margin: 0;
          font-size: 0.925rem;
          line-height: 1.85;
          color: rgba(148, 163, 184, 0.86);
        }

        .faq-layout {
          display: grid;
          gap: 1.25rem;
        }

        .faq-side,
        .faq-group,
        .faq-disclaimer {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 1.35rem;
          background:
            radial-gradient(circle at 100% 0%, rgba(103, 232, 249, 0.07), transparent 34%),
            radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.055), transparent 38%),
            rgba(255, 255, 255, 0.022);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.24);
        }

        .faq-side {
          padding: 1.25rem;
        }

        .faq-side-inner {
          display: grid;
          gap: 1.25rem;
        }

        .faq-side-head {
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding-bottom: 1.5rem;
        }

        .faq-side-head p,
        .faq-group-head p,
        .faq-support-list p {
          margin: 0;
          font-size: 0.5625rem;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.66);
        }

        .faq-side-head h2 {
          margin: 0.85rem 0 0;
          font-size: clamp(2rem, 7vw, 3.05rem);
          font-weight: 600;
          line-height: 0.92;
          letter-spacing: -0.07em;
          color: white;
        }

        .faq-side-head h2 span {
          display: block;
          color: rgba(165, 243, 252, 0.86);
        }

        .faq-side-head > span {
          display: block;
          margin-top: 1.2rem;
          font-size: 0.875rem;
          line-height: 1.75;
          color: rgba(100, 116, 139, 1);
        }

        .faq-quick-links {
          display: grid;
          gap: 0.7rem;
        }

        .faq-quick-links a {
          display: inline-flex;
          min-height: 3rem;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0 1rem;
          font-size: 0.6875rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(207, 250, 254, 0.8);
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .faq-quick-links a:hover {
          border-color: rgba(165, 243, 252, 0.28);
          background: rgba(103, 232, 249, 0.06);
          color: white;
        }

        .faq-support-list {
          display: grid;
          border-top: 1px solid rgba(165, 243, 252, 0.1);
          padding-top: 0.25rem;
        }

        .faq-support-list a {
          display: block;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding: 1.15rem 0;
        }

        .faq-support-list a:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .faq-support-list h3 {
          margin: 0.45rem 0 0;
          overflow-wrap: anywhere;
          font-size: clamp(1.25rem, 5vw, 1.55rem);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.05em;
          color: white;
          transition: color 180ms ease;
        }

        .faq-support-list span {
          display: block;
          margin-top: 0.65rem;
          font-size: 0.8125rem;
          line-height: 1.55;
          color: rgba(100, 116, 139, 1);
        }

        .faq-support-list a:hover h3 {
          color: rgba(207, 250, 254, 1);
        }

        .faq-content {
          display: grid;
          gap: 1.25rem;
        }

        .faq-group {
          padding: 1.25rem;
          content-visibility: auto;
          contain-intrinsic-size: 560px;
        }

        .faq-group-head {
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding-bottom: 1.25rem;
        }

        .faq-group-head h2 {
          margin: 0.55rem 0 0;
          font-size: clamp(2rem, 7vw, 3.15rem);
          font-weight: 600;
          line-height: 0.95;
          letter-spacing: -0.065em;
          color: white;
        }

        .faq-items {
          display: grid;
          gap: 0.75rem;
          margin-top: 1.25rem;
        }

        .faq-item {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          background: rgba(0, 0, 0, 0.24);
          transition:
            border-color 180ms ease,
            background 180ms ease;
        }

        .faq-item:hover,
        .faq-item[open] {
          border-color: rgba(165, 243, 252, 0.18);
          background: rgba(103, 232, 249, 0.035);
        }

        .faq-item summary {
          display: flex;
          cursor: pointer;
          list-style: none;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          padding: 1rem;
          font-size: 0.925rem;
          font-weight: 700;
          line-height: 1.45;
          letter-spacing: -0.03em;
          color: white;
        }

        .faq-item summary::-webkit-details-marker {
          display: none;
        }

        .faq-item summary strong {
          display: grid;
          width: 2rem;
          height: 2rem;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.04);
          color: rgba(207, 250, 254, 0.9);
          font-size: 1rem;
          font-weight: 700;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .faq-item[open] summary strong {
          transform: rotate(45deg);
          border-color: rgba(165, 243, 252, 0.28);
          background: rgba(103, 232, 249, 0.08);
        }

        .faq-item > p {
          margin: 0;
          max-width: 52rem;
          padding: 0 1rem 1rem;
          font-size: 0.875rem;
          line-height: 1.75;
          color: rgba(100, 116, 139, 1);
        }

        .faq-disclaimer {
          border-color: rgba(248, 113, 113, 0.18);
          background:
            radial-gradient(circle at 100% 0%, rgba(248, 113, 113, 0.08), transparent 36%),
            rgba(239, 68, 68, 0.045);
          padding: 1.15rem;
        }

        .faq-disclaimer p {
          margin: 0;
          font-size: 0.7rem;
          line-height: 1.75;
          color: rgba(254, 226, 226, 0.72);
        }

        .faq-disclaimer strong {
          color: rgba(252, 165, 165, 0.95);
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        @media (min-width: 640px) {
          .faq-hero {
            gap: 1.75rem;
            margin-bottom: 3.5rem;
          }

          .faq-side,
          .faq-group,
          .faq-disclaimer {
            border-radius: 2rem;
          }

          .faq-side,
          .faq-group {
            padding: 1.65rem;
          }

          .faq-disclaimer {
            padding: 1.5rem;
          }

          .faq-item {
            border-radius: 1.15rem;
          }

          .faq-item summary {
            padding: 1.1rem 1.15rem;
            font-size: 1rem;
          }

          .faq-item > p {
            padding: 0 1.15rem 1.15rem;
          }
        }

        @media (min-width: 1024px) {
          .faq-hero {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 4rem;
            text-align: left;
          }

          .faq-kicker {
            justify-content: flex-start;
          }

          .faq-title {
            max-width: 48rem;
            margin: 0;
          }

          .faq-intro {
            padding-bottom: 0.45rem;
          }

          .faq-layout {
            grid-template-columns: minmax(310px, 0.72fr) minmax(0, 1.28fr);
            align-items: start;
            gap: 2rem;
          }

          .faq-side {
            position: sticky;
            top: 7.5rem;
          }

          .faq-side,
          .faq-group {
            padding: 1.9rem;
          }

          .faq-content {
            gap: 1.5rem;
          }
        }

        @media (min-width: 1280px) {
          .faq-layout {
            gap: 2.4rem;
          }

          .faq-side,
          .faq-group {
            padding: 2rem;
          }
        }

        @media (max-width: 768px) {
          .faq-group {
            content-visibility: visible;
            contain-intrinsic-size: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .faq-item,
          .faq-item *,
          .faq-quick-links a {
            transition: none !important;
          }
        }
      `}</style>
    </CartProvider>
  );
}