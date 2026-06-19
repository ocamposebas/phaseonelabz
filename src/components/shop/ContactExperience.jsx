import React from "react";
import { ArrowRight } from "lucide-react";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";

const contactMethods = [
  {
    label: "Phone",
    value: "(720) 517-1541",
    detail: "Mon–Fri 8am–5pm MT",
    href: "tel:7205171541",
    action: "Call",
  },
  {
    label: "Text",
    value: "(720) 517-1541",
    detail: "7 days 7am–8pm MT",
    href: "sms:7205171541",
    action: "Text",
  },
  {
    label: "Email",
    value: "support@phaseonelabz.com",
    detail: "Orders, COA access, accounts, and general support",
    href: "mailto:support@phaseonelabz.com",
    action: "Email",
  },
];

const supportTopics = [
  "Order Support",
  "COA Access",
  "Account Help",
  "Shipping Question",
  "Payment Question",
  "General Support",
];

export default function ContactExperience() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const topic = String(data.get("topic") || "").trim();
    const order = String(data.get("order") || "").trim();
    const message = String(data.get("message") || "").trim();

    const subject = encodeURIComponent(
      topic ? `Phase One Labz Support - ${topic}` : "Phase One Labz Support"
    );

    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        `Topic: ${topic}`,
        `Order Number: ${order || "N/A"}`,
        "",
        "Message:",
        message,
      ].join("\n")
    );

    window.location.href = `mailto:support@phaseonelabz.com?subject=${subject}&body=${body}`;
  };

  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="contact-experience relative overflow-hidden bg-[#020305] pt-[118px] text-white sm:pt-[128px] lg:pt-[136px]">
        <div className="contact-bg" aria-hidden="true" />

        <section className="relative px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="contact-hero">
              <div className="contact-hero-copy">
                <div className="contact-kicker">
                  <span className="contact-dot" />
                  <span>Phase One Labz Support</span>
                </div>

                <h1 className="contact-title">
                  Contact our
                  <span> support team.</span>
                </h1>
              </div>

              <p className="contact-intro">
                Get help with orders, COA access, shipping updates, account
                questions, and research-use documentation.
              </p>
            </div>

            <div className="contact-layout">
              <section className="contact-panel contact-form-panel">
                <div className="contact-section-head">
                  <p className="contact-eyebrow">Send a Request</p>

                  <h2>
                    Tell us what
                    <span> you need.</span>
                  </h2>

                  <p>
                    Include your order number or batch details when available so
                    our team can assist faster.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="contact-grid">
                    <label>
                      <span>Name</span>
                      <input
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                      />
                    </label>

                    <label>
                      <span>Email</span>
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@email.com"
                      />
                    </label>
                  </div>

                  <div className="contact-grid">
                    <label>
                      <span>Topic</span>
                      <select name="topic" required defaultValue="">
                        <option value="" disabled>
                          Choose a topic
                        </option>

                        {supportTopics.map((topic) => (
                          <option key={topic} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Order Number</span>
                      <input
                        name="order"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        placeholder="Optional"
                      />
                    </label>
                  </div>

                  <label>
                    <span>Message</span>
                    <textarea
                      name="message"
                      rows={7}
                      required
                      placeholder="How can we help?"
                    />
                  </label>

                  <button type="submit" className="contact-submit">
                    Send Request
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </form>
              </section>

              <aside className="contact-panel contact-direct-panel">
                <div className="contact-section-head">
                  <p className="contact-eyebrow">Direct Support</p>

                  <h2>
                    Reach us
                    <span> directly.</span>
                  </h2>

                  <p>
                    Choose the fastest channel for your request. For order or
                    COA questions, include your order number or batch details.
                  </p>
                </div>

                <div className="contact-methods">
                  {contactMethods.map((method) => (
                    <a
                      key={method.label}
                      href={method.href}
                      className="contact-method"
                    >
                      <div>
                        <p>{method.label}</p>
                        <h3>{method.value}</h3>
                        <span>{method.detail}</span>
                      </div>

                      <strong>
                        {method.action}
                        <ArrowRight size={13} aria-hidden="true" />
                      </strong>
                    </a>
                  ))}
                </div>

                <div className="contact-note">
                  <p>
                    <strong>Research use only.</strong> Support cannot provide
                    medical, diagnostic, therapeutic, dosing, consumption, or
                    clinical guidance.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>

      <CartDrawer />

      <style>{`
        .contact-experience {
          isolation: isolate;
        }

        .contact-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% -8%, rgba(103, 232, 249, 0.11), transparent 34%),
            radial-gradient(circle at 100% 22%, rgba(59, 130, 246, 0.09), transparent 32%),
            radial-gradient(circle at 0% 88%, rgba(103, 232, 249, 0.065), transparent 34%);
        }

        .contact-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
          text-align: center;
        }

        .contact-hero-copy {
          width: 100%;
        }

        .contact-kicker {
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

        .contact-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 16px rgba(103, 232, 249, 0.55);
        }

        .contact-title {
          max-width: 28rem;
          margin: 0 auto;
          font-size: clamp(2.75rem, 10.5vw, 4.35rem);
          font-weight: 600;
          line-height: 0.92;
          letter-spacing: -0.075em;
          color: white;
        }

        .contact-title span {
          display: block;
          color: rgba(165, 243, 252, 0.88);
        }

        .contact-intro {
          max-width: 31rem;
          margin: 0;
          font-size: 0.925rem;
          line-height: 1.85;
          color: rgba(148, 163, 184, 0.86);
        }

        .contact-layout {
          display: grid;
          gap: 1.25rem;
        }

        .contact-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 1.35rem;
          background:
            radial-gradient(circle at 100% 0%, rgba(103, 232, 249, 0.07), transparent 34%),
            radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.055), transparent 38%),
            rgba(255, 255, 255, 0.022);
          padding: 1.25rem;
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.24);
        }

        .contact-section-head {
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding-bottom: 1.65rem;
        }

        .contact-eyebrow,
        .contact-method p {
          margin: 0;
          font-size: 0.5625rem;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.66);
        }

        .contact-section-head h2 {
          max-width: 34rem;
          margin: 0.85rem 0 0;
          font-size: clamp(2.2rem, 7.8vw, 3.35rem);
          font-weight: 600;
          line-height: 0.92;
          letter-spacing: -0.07em;
          color: white;
        }

        .contact-section-head h2 span {
          display: block;
          color: rgba(165, 243, 252, 0.86);
        }

        .contact-section-head p {
          max-width: 36rem;
          margin: 1.25rem 0 0;
          font-size: 0.9rem;
          line-height: 1.8;
          color: rgba(100, 116, 139, 1);
        }

        .contact-form {
          display: grid;
          gap: 1.05rem;
          margin-top: 1.65rem;
        }

        .contact-grid {
          display: grid;
          gap: 1.05rem;
        }

        .contact-form label {
          display: grid;
          gap: 0.55rem;
          min-width: 0;
        }

        .contact-form label span {
          font-size: 0.625rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.72);
        }

        .contact-form input,
        .contact-form select,
        .contact-form textarea {
          width: 100%;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(0, 0, 0, 0.34);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          outline: none;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .contact-form input,
        .contact-form select {
          height: 3.15rem;
          border-radius: 1rem;
          padding: 0 1rem;
        }

        .contact-form textarea {
          min-height: 12rem;
          resize: vertical;
          border-radius: 1rem;
          padding: 1rem;
          line-height: 1.65;
        }

        .contact-form input::placeholder,
        .contact-form textarea::placeholder {
          color: rgba(71, 85, 105, 0.95);
        }

        .contact-form input:focus,
        .contact-form select:focus,
        .contact-form textarea:focus {
          border-color: rgba(165, 243, 252, 0.36);
          background: rgba(0, 0, 0, 0.48);
          box-shadow: 0 0 0 2px rgba(165, 243, 252, 0.08);
        }

        .contact-form option {
          background: #020305;
          color: white;
        }

        .contact-submit {
          display: inline-flex;
          width: 100%;
          min-height: 3.35rem;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 0.65rem;
          border: 1px solid rgba(165, 243, 252, 0.18);
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding: 0 1.75rem;
          color: rgb(2, 6, 23);
          font-size: 0.6875rem;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition:
            background 180ms ease,
            transform 180ms ease,
            border-color 180ms ease;
        }

        .contact-submit:hover {
          border-color: rgba(255, 255, 255, 0.42);
          background: white;
          transform: translate3d(0, -2px, 0);
        }

        .contact-methods {
          display: grid;
          margin-top: 0.45rem;
        }

        .contact-method {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding: 1.35rem 0;
        }

        .contact-method:last-child {
          border-bottom: 0;
        }

        .contact-method h3 {
          margin: 0.55rem 0 0;
          overflow-wrap: anywhere;
          font-size: clamp(1.45rem, 6vw, 1.8rem);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.05em;
          color: white;
          transition: color 180ms ease;
        }

        .contact-method span {
          display: block;
          margin-top: 0.8rem;
          font-size: 0.875rem;
          line-height: 1.6;
          color: rgba(100, 116, 139, 1);
        }

        .contact-method strong {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          gap: 0.35rem;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0.7rem 0.85rem;
          font-size: 0.625rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.72);
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .contact-method:hover h3 {
          color: rgba(207, 250, 254, 1);
        }

        .contact-method:hover strong {
          border-color: rgba(165, 243, 252, 0.28);
          background: rgba(103, 232, 249, 0.06);
          color: white;
        }

        .contact-note {
          margin-top: 0.9rem;
          border: 1px solid rgba(248, 113, 113, 0.18);
          border-radius: 1rem;
          background: rgba(239, 68, 68, 0.045);
          padding: 1rem;
        }

        .contact-note p {
          margin: 0;
          font-size: 0.6875rem;
          line-height: 1.7;
          color: rgba(254, 226, 226, 0.72);
        }

        .contact-note strong {
          color: rgba(252, 165, 165, 0.95);
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        @media (min-width: 640px) {
          .contact-hero {
            gap: 1.75rem;
            margin-bottom: 3.5rem;
          }

          .contact-panel {
            border-radius: 2rem;
            padding: 1.65rem;
          }

          .contact-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contact-form input,
          .contact-form select,
          .contact-form textarea,
          .contact-note {
            border-radius: 1.15rem;
          }

          .contact-submit {
            width: fit-content;
            min-width: 220px;
          }
        }

        @media (min-width: 1024px) {
          .contact-hero {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 4rem;
            text-align: left;
          }

          .contact-kicker {
            justify-content: flex-start;
          }

          .contact-title {
            max-width: 48rem;
            margin: 0;
          }

          .contact-intro {
            padding-bottom: 0.45rem;
          }

          .contact-layout {
            grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
            gap: 2rem;
          }

          .contact-panel {
            padding: 1.9rem;
          }

          .contact-direct-panel {
            align-self: start;
          }
        }

        @media (min-width: 1280px) {
          .contact-layout {
            gap: 2.4rem;
          }

          .contact-panel {
            padding: 2rem;
          }
        }

        @media (max-width: 520px) {
          .contact-method {
            flex-direction: column;
          }

          .contact-method strong {
            width: fit-content;
          }
        }

        @media (max-width: 768px) {
          .contact-submit:hover {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .contact-submit,
          .contact-method *,
          .contact-form input,
          .contact-form select,
          .contact-form textarea {
            transition: none !important;
          }
        }
      `}</style>
    </CartProvider>
  );
}