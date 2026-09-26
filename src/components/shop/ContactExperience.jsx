import "./ContactExperience.styles.css";
import { ArrowRight } from "lucide-react";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import DeferredCartDrawer from "../cart/DeferredCartDrawer.jsx";
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

      <DeferredCartDrawer />
    </CartProvider>
  );
}
