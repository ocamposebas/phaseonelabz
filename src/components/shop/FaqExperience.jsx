import "./FaqExperience.styles.css";
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
    </CartProvider>
  );
}