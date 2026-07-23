import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Copy,
  CreditCard,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

const ORDER_STATUS_ENDPOINT = "/api/prism/order-status";
const MANUAL_STORAGE_KEY = "phaseone_thank_you_order";
const PRISM_STORAGE_KEY = "phaseone_prism_pending_order";
const MAX_STATUS_CHECKS = 12;
const STATUS_POLL_DELAY = 2000;

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(toNumber(value, 0));
}

function normalizeAddress(source = {}) {
  const address = source && typeof source === "object" ? source : {};

  return {
    firstName: String(address.first_name || address.firstName || "").trim(),
    lastName: String(address.last_name || address.lastName || "").trim(),
    address1: String(address.address_1 || address.address1 || "").trim(),
    address2: String(address.address_2 || address.address2 || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    postcode: String(
      address.postcode || address.zip || address.postalCode || "",
    ).trim(),
    country: String(address.country || "US").trim(),
    phone: String(address.phone || "").trim(),
    email: String(address.email || "").trim(),
  };
}

function addressLines(source = {}) {
  const address = normalizeAddress(source);
  const cityLine = [address.city, address.state, address.postcode]
    .filter(Boolean)
    .join(", ");

  return [
    address.address1,
    address.address2,
    cityLine,
    address.country,
  ].filter(Boolean);
}

function getItemName(item = {}) {
  return String(
    item.name ||
      item.title ||
      item.product_name ||
      item.productName ||
      item.product?.name ||
      "Item",
  );
}

function getItemImage(item = {}) {
  return (
    item.image ||
    item.image_url ||
    item.imageUrl ||
    item.thumbnail ||
    item.product?.image ||
    "/tarro.png"
  );
}

function getItemQuantity(item = {}) {
  return Math.max(1, toNumber(item.quantity ?? item.qty ?? item.count, 1));
}

function getItemTotal(item = {}) {
  const direct = toNumber(
    item.total ??
      item.line_total ??
      item.lineTotal ??
      item.subtotal ??
      item.amount,
    NaN,
  );

  if (Number.isFinite(direct)) return direct;

  const unit = toNumber(
    item.price ?? item.unit_price ?? item.unitPrice ?? item.sale_price,
    0,
  );

  return unit * getItemQuantity(item);
}

function clearPurchasedCart() {
  if (typeof window === "undefined") return;

  [
    "lab_cart",
    "phaseone_pending_checkout",
    "phaseone_checkout_session",
    "phaseone_checkout_coupon",
  ].forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore blocked storage.
    }
  });

  try {
    const keysToRemove = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("phaseone_manual_payment_order_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore blocked storage.
  }

  window.dispatchEvent(
    new CustomEvent("phaseone-cart-cleared", {
      detail: { source: "checkout_thank_you" },
    }),
  );
}

function cleanSensitiveUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("order_key");
  url.searchParams.delete("prism_session");

  window.history.replaceState(
    { phaseoneThankYouCleaned: true },
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function getCheckoutContext() {
  if (typeof window === "undefined") {
    return {
      payment: "",
      gateway: "",
      orderId: 0,
      orderKey: "",
      prismSession: "",
      pending: null,
      manual: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const pending = safeJsonParse(
    window.localStorage.getItem(PRISM_STORAGE_KEY),
    null,
  );
  const manual = safeJsonParse(
    window.localStorage.getItem(MANUAL_STORAGE_KEY),
    null,
  );

  const orderId = toNumber(
    params.get("order_id") ||
      manual?.order_id ||
      manual?.orderId ||
      pending?.orderId ||
      pending?.order_id,
    0,
  );

  const orderKey = String(
    params.get("order_key") ||
      pending?.orderKey ||
      pending?.order_key ||
      "",
  ).trim();

  if (orderKey && pending) {
    window.localStorage.setItem(
      PRISM_STORAGE_KEY,
      JSON.stringify({
        ...pending,
        orderId: pending.orderId || orderId,
        orderKey,
      }),
    );
  }

  return {
    payment: String(params.get("payment") || "").toLowerCase(),
    gateway: String(params.get("gateway") || manual?.method || "").toLowerCase(),
    orderId,
    orderKey,
    prismSession: String(params.get("prism_session") || ""),
    pending,
    manual,
  };
}

function isPaidStatus(status = "") {
  return ["processing", "completed"].includes(String(status).toLowerCase());
}

function isFailedStatus(status = "") {
  return ["failed", "cancelled", "refunded"].includes(
    String(status).toLowerCase(),
  );
}

function getStatusLabel(status = "") {
  const clean = String(status || "").toLowerCase();

  const labels = {
    pending: "Confirmation pending",
    "on-hold": "Awaiting payment",
    processing: "Payment confirmed",
    completed: "Completed",
    failed: "Payment failed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  return labels[clean] || "Order received";
}

export default function CheckoutThankYouPage() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.setAttribute("name", "viewport");
      document.head.appendChild(viewport);
    }

    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );

    document.documentElement.style.width = "100%";
    document.documentElement.style.maxWidth = "100%";
    document.body.style.width = "100%";
    document.body.style.maxWidth = "100%";
  }, []);

  const [context, setContext] = useState(null);
  const [order, setOrder] = useState(null);
  const [statusState, setStatusState] = useState("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const checkoutContext = getCheckoutContext();
    setContext(checkoutContext);
    cleanSensitiveUrl();

    if (checkoutContext.payment === "manual") {
      setStatusState("manual");
      clearPurchasedCart();
      return undefined;
    }

    if (
      checkoutContext.payment !== "success" ||
      !checkoutContext.orderId ||
      !checkoutContext.orderKey
    ) {
      setStatusState("missing");
      return undefined;
    }

    clearPurchasedCart();

    let active = true;

    async function checkOrderStatus() {
      attemptsRef.current += 1;

      try {
        const response = await fetch(ORDER_STATUS_ENDPOINT, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            orderId: checkoutContext.orderId,
            order_id: checkoutContext.orderId,
            orderKey: checkoutContext.orderKey,
            order_key: checkoutContext.orderKey,
            prismSession: checkoutContext.prismSession,
            prism_session: checkoutContext.prismSession,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!active) return;

        if (!response.ok || !data?.success || !data?.order) {
          throw new Error(
            data?.message ||
              data?.error ||
              "We could not verify the order status yet.",
          );
        }

        setOrder(data.order);

        if (isPaidStatus(data.order.status) || data.order.isPaid) {
          setStatusState("paid");
          setStatusMessage("");
          return;
        }

        if (isFailedStatus(data.order.status)) {
          setStatusState("failed");
          setStatusMessage(
            "The payment was not completed. No successful card charge was confirmed.",
          );
          return;
        }

        if (attemptsRef.current < MAX_STATUS_CHECKS) {
          setStatusState("confirming");
          timerRef.current = window.setTimeout(
            checkOrderStatus,
            STATUS_POLL_DELAY,
          );
          return;
        }

        setStatusState("submitted");
        setStatusMessage(
          "Your payment was submitted successfully. The order confirmation may take another moment to update.",
        );
      } catch (error) {
        if (!active) return;

        if (attemptsRef.current < 3) {
          timerRef.current = window.setTimeout(
            checkOrderStatus,
            STATUS_POLL_DELAY,
          );
          return;
        }

        setStatusState("submitted");
        setStatusMessage(
          error?.message ||
            "Your payment return was received, but live order verification is temporarily unavailable.",
        );
      }
    }

    checkOrderStatus();

    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const manualOrder = context?.manual || null;
  const isManual = statusState === "manual";
  const visibleOrder = isManual ? manualOrder : order || context?.pending || {};
  const orderNumber =
    visibleOrder?.number ||
    visibleOrder?.order_number ||
    visibleOrder?.orderNumber ||
    visibleOrder?.id ||
    visibleOrder?.order_id ||
    context?.orderId ||
    "";
  const currency =
    visibleOrder?.currency || manualOrder?.currency || context?.pending?.currency || "USD";
  const total =
    visibleOrder?.total ??
    visibleOrder?.order_total ??
    context?.pending?.total ??
    0;
  const email =
    visibleOrder?.email ||
    visibleOrder?.billing?.email ||
    context?.pending?.email ||
    "";
  const shipping =
    visibleOrder?.shipping ||
    context?.pending?.shipping ||
    visibleOrder?.billing ||
    context?.pending?.billing ||
    {};
  const items = Array.isArray(visibleOrder?.items)
    ? visibleOrder.items
    : Array.isArray(context?.pending?.items)
      ? context.pending.items
      : [];
  const paymentReference = String(
    manualOrder?.payment_reference ||
      manualOrder?.paymentReference ||
      manualOrder?.reference ||
      "",
  ).trim();
  const paymentDetails =
    manualOrder?.payment_details ||
    manualOrder?.paymentDetails ||
    {};
  const manualMethodTitle =
    manualOrder?.methodTitle ||
    manualOrder?.payment_method_title ||
    (context?.gateway === "zelle" ? "Zelle" : "Venmo");

  const statusContent = useMemo(() => {
    if (statusState === "paid") {
      return {
        eyebrow: "Payment confirmed",
        title: "Thank you for your order",
        copy: `Order${orderNumber ? ` #${orderNumber}` : ""} was paid successfully and is now being prepared.`,
        icon: BadgeCheck,
        tone: "success",
      };
    }

    if (statusState === "confirming" || statusState === "loading") {
      return {
        eyebrow: "Secure payment received",
        title: "Confirming your payment",
        copy: "We are matching the secure payment with your WooCommerce order. This usually takes only a few seconds.",
        icon: LoaderCircle,
        tone: "loading",
      };
    }

    if (statusState === "submitted") {
      return {
        eyebrow: "Payment submitted",
        title: "Your order was received",
        copy:
          statusMessage ||
          "Your payment return was received and the order is being confirmed.",
        icon: Clock3,
        tone: "pending",
      };
    }

    if (statusState === "manual") {
      return {
        eyebrow: `${manualMethodTitle} order created`,
        title: "Your order was received",
        copy: `Order${orderNumber ? ` #${orderNumber}` : ""} is on hold until we confirm your ${manualMethodTitle} payment.`,
        icon: BadgeCheck,
        tone: "manual",
      };
    }

    if (statusState === "failed") {
      return {
        eyebrow: "Payment not completed",
        title: "Your card was not charged",
        copy:
          statusMessage ||
          "The payment was not completed. You can return to checkout and try again.",
        icon: XCircle,
        tone: "failed",
      };
    }

    return {
      eyebrow: "Order details unavailable",
      title: "We could not load this confirmation",
      copy: "Open this page from the secure payment return or check your email for the order confirmation.",
      icon: AlertTriangle,
      tone: "failed",
    };
  }, [manualMethodTitle, orderNumber, statusMessage, statusState]);

  const StatusIcon = statusContent.icon;
  const shippingName = [
    shipping?.first_name || shipping?.firstName,
    shipping?.last_name || shipping?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const shippingAddressLines = addressLines(shipping);

  async function copyReference() {
    if (!paymentReference || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(paymentReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="thank-you-page">
      <div className="thank-you-glow thank-you-glow-one" />
      <div className="thank-you-glow thank-you-glow-two" />

      <section className="thank-you-shell">
        <header className="thank-you-header">
          <a href="/shop" className="thank-you-brand">
            <span>PHASE ONE LABZ</span>
            <small>
              <Lock size={12} />
              Secure checkout
            </small>
          </a>

          <a href="/shop" className="continue-link">
            Continue shopping
            <ArrowRight size={15} />
          </a>
        </header>

        <section className={`thank-you-card tone-${statusContent.tone}`}>
          <div className="thank-you-hero">
            <span className="thank-you-status-icon">
              <StatusIcon
                size={30}
                className={
                  statusState === "loading" || statusState === "confirming"
                    ? "is-spinning"
                    : ""
                }
              />
            </span>

            <div>
              <p>{statusContent.eyebrow}</p>
              <h1>{statusContent.title}</h1>
              <span>{statusContent.copy}</span>
            </div>
          </div>

          {(statusState === "loading" || statusState === "confirming") && (
            <div className="confirmation-progress" aria-label="Confirming payment">
              <span />
            </div>
          )}

          {isManual && (
            <>
              <div className="summary-grid manual-summary-grid">
                <article className="summary-panel">
                  <span>Amount to send</span>
                  <strong>{formatMoney(total, currency)}</strong>
                  <small>Send this exact amount.</small>
                </article>

                <article className="summary-panel reference-panel">
                  <span>Payment reference</span>
                  <div className="reference-value">
                    <strong>{paymentReference || "Check your email"}</strong>
                    {paymentReference && (
                      <button
                        type="button"
                        onClick={copyReference}
                        aria-label="Copy payment reference"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                  <small>Use only this reference in the payment note.</small>
                </article>
              </div>

              <div className="details-grid">
                <article className="detail-card">
                  <header>
                    <CreditCard size={17} />
                    <div>
                      <span>Payment instructions</span>
                      <strong>{manualMethodTitle}</strong>
                    </div>
                  </header>

                  <div className="detail-row">
                    <span>
                      {paymentDetails?.recipient_label ||
                        paymentDetails?.recipientLabel ||
                        manualMethodTitle}
                    </span>
                    <strong>
                      {paymentDetails?.recipient ||
                        paymentDetails?.recipient_value ||
                        paymentDetails?.recipientValue ||
                        (context?.gateway === "zelle"
                          ? "Info@phaseonelabz.com"
                          : "Phase One Labz")}
                    </strong>
                  </div>

                  {(paymentDetails?.recipient_extra ||
                    paymentDetails?.recipientExtra ||
                    paymentDetails?.extraRecipientLine) && (
                    <div className="detail-row">
                      <span>Name</span>
                      <strong>
                        {paymentDetails.recipient_extra ||
                          paymentDetails.recipientExtra ||
                          paymentDetails.extraRecipientLine}
                      </strong>
                    </div>
                  )}

                  <div className="detail-row">
                    <span>Status</span>
                    <strong>Awaiting payment</strong>
                  </div>

                  {(paymentDetails?.button_url ||
                    paymentDetails?.buttonUrl ||
                    paymentDetails?.actionHref) && (
                    <a
                      href={
                        paymentDetails.button_url ||
                        paymentDetails.buttonUrl ||
                        paymentDetails.actionHref
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="primary-action"
                    >
                      Open {manualMethodTitle}
                      <ArrowRight size={15} />
                    </a>
                  )}
                </article>

                <article className="detail-card">
                  <header>
                    <Truck size={17} />
                    <div>
                      <span>Shipping details</span>
                      <strong>{shippingName || "Shipping address"}</strong>
                    </div>
                  </header>

                  <div className="address-block">
                    {shippingAddressLines.length ? (
                      shippingAddressLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))
                    ) : (
                      <p>Your shipping address was saved on the order.</p>
                    )}
                  </div>

                  {email && (
                    <div className="detail-row">
                      <span>Email</span>
                      <strong>{email}</strong>
                    </div>
                  )}
                </article>
              </div>

              <div className="manual-warning">
                <AlertTriangle size={17} />
                <p>
                  Write only <strong>{paymentReference}</strong> in the payment
                  note. Do not include product names. Unpaid manual orders are
                  cancelled automatically after 24 hours.
                </p>
              </div>
            </>
          )}

          {!isManual && statusState !== "missing" && (
            <div className="summary-grid">
              <article className="summary-panel">
                <span>Order</span>
                <strong>{orderNumber ? `#${orderNumber}` : "Created"}</strong>
                <small>{getStatusLabel(order?.status)}</small>
              </article>

              <article className="summary-panel">
                <span>Total</span>
                <strong>{formatMoney(total, currency)}</strong>
                <small>Secure payment</small>
              </article>

              <article className="summary-panel">
                <span>Email</span>
                <strong className="compact-value">
                  {email || "Confirmation pending"}
                </strong>
                <small>Receipt and order updates</small>
              </article>
            </div>
          )}

          {items.length > 0 && (
            <article className="order-items-card">
              <header>
                <ShoppingBag size={17} />
                <div>
                  <span>Order summary</span>
                  <strong>
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </strong>
                </div>
              </header>

              <div className="order-items">
                {items.map((item, index) => (
                  <div
                    key={
                      item.id ||
                      item.product_id ||
                      item.cart_key ||
                      `${getItemName(item)}-${index}`
                    }
                  >
                    <span className="item-media">
                      <img src={getItemImage(item)} alt="" loading="lazy" />
                      <em>{getItemQuantity(item)}</em>
                    </span>

                    <span className="item-copy">
                      <strong>{getItemName(item)}</strong>
                      {item.sku && <small>SKU: {item.sku}</small>}
                    </span>

                    <b>{formatMoney(getItemTotal(item), currency)}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          <div className="fulfillment-row">
            <article>
              <PackageCheck size={18} />
              <div>
                <strong>Order received</strong>
                <span>Your order is now in our system.</span>
              </div>
            </article>

            <article>
              <Mail size={18} />
              <div>
                <strong>Email confirmation</strong>
                <span>
                  {email
                    ? `Updates will be sent to ${email}.`
                    : "Check your inbox for order updates."}
                </span>
              </div>
            </article>

            <article>
              <MapPin size={18} />
              <div>
                <strong>FedEx delivery</strong>
                <span>Tracking is sent after fulfillment.</span>
              </div>
            </article>
          </div>

          <footer className="thank-you-footer">
            <div>
              <ShieldCheck size={16} />
              <span>
                Secure payment information is handled by the payment provider.
              </span>
            </div>

            <nav>
              <a href="/shop">Continue shopping</a>
              <a href="/account">View account</a>
              <a href="/contact">Need help?</a>
            </nav>
          </footer>
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  html {
    background: #050912;
  }

  body {
    margin: 0;
    background: #050912;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .thank-you-page {
    position: relative;
    min-height: 100vh;
    overflow-x: clip;
    overflow-y: visible;
    background:
      radial-gradient(circle at 50% -16%, rgba(37, 99, 235, 0.16), transparent 33%),
      linear-gradient(180deg, #060b16 0%, #04070e 100%);
    color: #eef4ff;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .thank-you-glow {
    position: fixed;
    width: 360px;
    height: 360px;
    border-radius: 999px;
    filter: blur(110px);
    pointer-events: none;
    opacity: 0.18;
  }

  .thank-you-glow-one {
    top: 8%;
    left: -150px;
    background: #2563eb;
  }

  .thank-you-glow-two {
    right: -180px;
    bottom: 3%;
    background: #0ea5e9;
  }

  .thank-you-shell {
    position: relative;
    z-index: 1;
    width: min(1080px, calc(100% - 32px));
    margin: 0 auto;
    padding: 30px 0 64px;
  }

  .thank-you-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;
  }

  .thank-you-brand {
    display: grid;
    gap: 6px;
    color: #f8fbff;
    text-decoration: none;
  }

  .thank-you-brand > span {
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 0.2em;
  }

  .thank-you-brand small {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #697997;
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .continue-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #9eb1d0;
    font-size: 0.78rem;
    font-weight: 800;
    text-decoration: none;
    transition:
      color 160ms ease,
      transform 160ms ease;
  }

  .continue-link:hover {
    color: #ffffff;
    transform: translateX(2px);
  }

  .thank-you-card {
    padding: clamp(24px, 4vw, 42px);
    border: 1px solid #17233a;
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(10, 16, 29, 0.96), rgba(6, 11, 21, 0.98));
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.025);
  }

  .thank-you-hero {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 18px;
  }

  .thank-you-hero > div {
    min-width: 0;
  }

  .thank-you-status-icon {
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 1px solid rgba(59, 130, 246, 0.34);
    border-radius: 20px;
    background: rgba(37, 99, 235, 0.12);
    color: #69a4ff;
  }

  .tone-success .thank-you-status-icon,
  .tone-manual .thank-you-status-icon {
    border-color: rgba(34, 197, 94, 0.28);
    background: rgba(34, 197, 94, 0.1);
    color: #64db8a;
  }

  .tone-failed .thank-you-status-icon {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.16);
    color: #fb8181;
  }

  .thank-you-hero p {
    margin: 0 0 7px;
    color: #6fa8ff;
    font-size: 0.67rem;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .tone-success .thank-you-hero p,
  .tone-manual .thank-you-hero p {
    color: #6ed790;
  }

  .tone-failed .thank-you-hero p {
    color: #fb8181;
  }

  .thank-you-hero h1 {
    margin: 0;
    color: #ffffff;
    font-size: clamp(1.55rem, 4vw, 2.4rem);
    line-height: 1.08;
    letter-spacing: -0.045em;
  }

  .thank-you-hero > div > span {
    display: block;
    max-width: 680px;
    margin-top: 10px;
    color: #8191ad;
    font-size: 0.89rem;
    line-height: 1.7;
  }

  .is-spinning {
    animation: thank-you-spin 1s linear infinite;
  }

  @keyframes thank-you-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .confirmation-progress {
    height: 4px;
    margin: 26px 0 2px;
    overflow: hidden;
    border-radius: 999px;
    background: #111b2c;
  }

  .confirmation-progress span {
    display: block;
    width: 38%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #2563eb, #67a5ff);
    animation: thank-you-progress 1.35s ease-in-out infinite alternate;
  }

  @keyframes thank-you-progress {
    from {
      transform: translateX(-5%);
    }
    to {
      transform: translateX(170%);
    }
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 28px;
  }

  .manual-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-panel,
  .detail-card,
  .order-items-card,
  .fulfillment-row article {
    border: 1px solid #18243a;
    background: rgba(6, 12, 23, 0.74);
  }

  .summary-panel {
    display: grid;
    gap: 7px;
    min-width: 0;
    padding: 18px;
    border-radius: 16px;
  }

  .summary-panel > span,
  .detail-card header span,
  .order-items-card header span {
    color: #60718e;
    font-size: 0.64rem;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .summary-panel > strong {
    min-width: 0;
    overflow-wrap: anywhere;
    color: #f6f9ff;
    font-size: 1.1rem;
  }

  .summary-panel > small {
    color: #72819a;
    font-size: 0.71rem;
  }

  .compact-value {
    overflow: hidden;
    font-size: 0.84rem !important;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reference-value {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .reference-value strong {
    min-width: 0;
    overflow: hidden;
    color: #ffffff;
    font-size: 1.05rem;
    text-overflow: ellipsis;
  }

  .reference-value button {
    display: grid;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid #263653;
    border-radius: 9px;
    background: #101a2b;
    color: #82b2ff;
    cursor: pointer;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .detail-card,
  .order-items-card {
    min-width: 0;
    padding: 20px;
    border-radius: 17px;
  }

  .detail-card header,
  .order-items-card header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    color: #75a9ff;
  }

  .detail-card header div,
  .order-items-card header div {
    display: grid;
    gap: 4px;
  }

  .detail-card header strong,
  .order-items-card header strong {
    color: #f1f5fc;
    font-size: 0.9rem;
  }

  .detail-row {
    display: grid;
    grid-template-columns: minmax(100px, 0.7fr) minmax(0, 1.3fr);
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid #121d30;
  }

  .detail-row span {
    color: #65738b;
    font-size: 0.73rem;
  }

  .detail-row strong {
    overflow-wrap: anywhere;
    color: #dce6f7;
    font-size: 0.76rem;
    text-align: right;
  }

  .address-block {
    min-height: 106px;
    padding: 2px 0 14px;
  }

  .address-block p {
    margin: 0 0 7px;
    color: #9ba9bf;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .primary-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 18px;
    padding: 13px 16px;
    border-radius: 11px;
    background: #2364dc;
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 900;
    text-decoration: none;
  }

  .manual-warning {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 12px;
    padding: 15px 16px;
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: 14px;
    background: rgba(120, 53, 15, 0.13);
    color: #e4c989;
  }

  .manual-warning svg {
    flex: 0 0 auto;
    margin-top: 2px;
  }

  .manual-warning p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.65;
  }

  .order-items-card {
    margin-top: 12px;
  }

  .order-items {
    display: grid;
  }

  .order-items > div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 13px;
    padding: 13px 0;
    border-top: 1px solid #121d30;
  }

  .item-media {
    position: relative;
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    overflow: visible;
    border: 1px solid #1d2a42;
    border-radius: 12px;
    background: #0c1422;
  }

  .item-media img {
    width: 84%;
    height: 84%;
    object-fit: contain;
  }

  .item-media em {
    position: absolute;
    top: -7px;
    right: -7px;
    display: grid;
    min-width: 20px;
    height: 20px;
    place-items: center;
    padding: 0 4px;
    border-radius: 999px;
    background: #2867dc;
    color: #ffffff;
    font-size: 0.62rem;
    font-style: normal;
    font-weight: 900;
  }

  .item-copy {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .item-copy strong {
    color: #e9f0fb;
    font-size: 0.8rem;
  }

  .item-copy small {
    color: #60708a;
    font-size: 0.66rem;
  }

  .order-items b {
    color: #dce7f8;
    font-size: 0.78rem;
  }

  .fulfillment-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .fulfillment-row article {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 16px;
    border-radius: 15px;
    color: #72a9ff;
  }

  .fulfillment-row article div {
    display: grid;
    gap: 5px;
  }

  .fulfillment-row strong {
    color: #e9eff9;
    font-size: 0.76rem;
  }

  .fulfillment-row span {
    color: #697993;
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .thank-you-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-top: 26px;
    padding-top: 22px;
    border-top: 1px solid #152037;
  }

  .thank-you-footer > div {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #667690;
    font-size: 0.68rem;
  }

  .thank-you-footer nav {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
  }

  .thank-you-footer a {
    color: #8da5c9;
    font-size: 0.72rem;
    font-weight: 800;
    text-decoration: none;
  }

  .thank-you-footer a:hover {
    color: #ffffff;
  }

  @media (max-width: 920px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-grid .summary-panel:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }

    .fulfillment-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .thank-you-page {
      min-height: 100dvh;
      overflow-x: clip;
    }

    .thank-you-glow {
      width: 230px;
      height: 230px;
      filter: blur(82px);
      opacity: 0.13;
    }

    .thank-you-glow-one {
      top: 4%;
      left: -120px;
    }

    .thank-you-glow-two {
      right: -130px;
      bottom: 8%;
    }

    .thank-you-shell {
      width: calc(100% - 24px);
      max-width: none;
      padding:
        max(30px, calc(env(safe-area-inset-top) + 18px))
        0
        max(42px, calc(env(safe-area-inset-bottom) + 22px));
    }

    .thank-you-header {
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding: 0 2px;
    }

    .thank-you-brand {
      min-width: 0;
      gap: 4px;
    }

    .thank-you-brand > span {
      overflow: hidden;
      font-size: 0.78rem;
      letter-spacing: 0.14em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .thank-you-brand small {
      gap: 5px;
      font-size: 0.57rem;
      letter-spacing: 0.09em;
    }

    .continue-link {
      display: grid;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      place-items: center;
      overflow: hidden;
      border: 1px solid #1b2941;
      border-radius: 12px;
      background: rgba(10, 17, 30, 0.78);
      font-size: 0;
    }

    .continue-link svg {
      width: 18px;
      height: 18px;
    }

    .thank-you-card {
      min-width: 0;
      padding: 24px 18px;
      border-radius: 22px;
      box-shadow:
        0 18px 46px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.025);
    }

    .thank-you-hero {
      grid-template-columns: 46px minmax(0, 1fr);
      align-items: start;
      gap: 12px;
    }

    .thank-you-status-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
    }

    .thank-you-status-icon svg {
      width: 24px;
      height: 24px;
    }

    .thank-you-hero p {
      margin-bottom: 5px;
      font-size: 0.59rem;
      letter-spacing: 0.11em;
    }

    .thank-you-hero h1 {
      max-width: 100%;
      overflow-wrap: anywhere;
      font-size: clamp(1.55rem, 7.8vw, 2rem);
      line-height: 1.12;
      letter-spacing: -0.035em;
    }

    .thank-you-hero > div > span {
      margin-top: 8px;
      font-size: 0.8rem;
      line-height: 1.55;
    }

    .confirmation-progress {
      margin-top: 20px;
    }

    .summary-grid,
    .manual-summary-grid,
    .details-grid,
    .fulfillment-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }

    .summary-grid {
      margin-top: 20px;
    }

    .summary-grid .summary-panel:last-child:nth-child(odd) {
      grid-column: auto;
    }

    .summary-panel {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "label value"
        "helper helper";
      align-items: center;
      gap: 5px 12px;
      padding: 14px;
      border-radius: 14px;
    }

    .summary-panel > span {
      grid-area: label;
    }

    .summary-panel > strong {
      grid-area: value;
      max-width: min(62vw, 270px);
      font-size: 0.96rem;
      text-align: right;
    }

    .summary-panel > small {
      grid-area: helper;
      padding-top: 2px;
    }

    .compact-value {
      max-width: min(58vw, 250px) !important;
      font-size: 0.77rem !important;
    }

    .reference-value {
      min-width: 0;
      justify-content: flex-end;
      gap: 7px;
    }

    .reference-value strong {
      max-width: min(52vw, 230px);
      font-size: 0.9rem;
    }

    .reference-value button {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }

    .details-grid {
      margin-top: 10px;
    }

    .detail-card,
    .order-items-card {
      padding: 16px 14px;
      border-radius: 15px;
    }

    .detail-card header,
    .order-items-card header {
      gap: 9px;
      margin-bottom: 14px;
    }

    .detail-card header strong,
    .order-items-card header strong {
      overflow-wrap: anywhere;
      font-size: 0.84rem;
    }

    .detail-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 5px;
      padding: 11px 0;
    }

    .detail-row strong {
      overflow-wrap: anywhere;
      font-size: 0.76rem;
      text-align: left;
    }

    .address-block {
      min-height: 0;
      padding-bottom: 10px;
    }

    .address-block p {
      font-size: 0.76rem;
    }

    .primary-action {
      width: 100%;
      min-height: 46px;
      margin-top: 14px;
      padding: 12px 14px;
    }

    .manual-warning {
      gap: 9px;
      padding: 13px;
      border-radius: 13px;
    }

    .manual-warning p {
      overflow-wrap: anywhere;
      font-size: 0.71rem;
      line-height: 1.55;
    }

    .order-items-card {
      margin-top: 10px;
    }

    .order-items > div {
      grid-template-columns: 46px minmax(0, 1fr) auto;
      gap: 10px;
      padding: 12px 0;
    }

    .item-media {
      width: 46px;
      height: 46px;
      border-radius: 11px;
    }

    .item-media em {
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 3px;
      font-size: 0.57rem;
    }

    .item-copy strong {
      overflow-wrap: anywhere;
      font-size: 0.76rem;
      line-height: 1.35;
    }

    .item-copy small {
      overflow-wrap: anywhere;
      font-size: 0.62rem;
    }

    .order-items b {
      min-width: 0;
      max-width: 92px;
      overflow-wrap: anywhere;
      font-size: 0.73rem;
      text-align: right;
    }

    .fulfillment-row {
      margin-top: 10px;
    }

    .fulfillment-row article {
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 14px;
    }

    .fulfillment-row article svg {
      flex: 0 0 auto;
    }

    .fulfillment-row strong {
      font-size: 0.74rem;
    }

    .fulfillment-row span {
      font-size: 0.66rem;
    }

    .thank-you-footer {
      align-items: stretch;
      flex-direction: column;
      gap: 16px;
      margin-top: 22px;
      padding-top: 18px;
    }

    .thank-you-footer > div {
      align-items: flex-start;
      line-height: 1.5;
    }

    .thank-you-footer > div svg {
      flex: 0 0 auto;
      margin-top: 1px;
    }

    .thank-you-footer nav {
      display: grid;
      width: 100%;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .thank-you-footer nav a {
      display: flex;
      min-width: 0;
      min-height: 42px;
      align-items: center;
      justify-content: center;
      padding: 9px 7px;
      border: 1px solid #1a2941;
      border-radius: 11px;
      background: rgba(9, 16, 29, 0.72);
      font-size: 0.64rem;
      line-height: 1.3;
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .thank-you-shell {
      width: calc(100% - 16px);
    }

    .thank-you-card {
      padding: 22px 15px;
      border-radius: 17px;
    }

    .thank-you-hero {
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 10px;
    }

    .thank-you-status-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }

    .thank-you-status-icon svg {
      width: 22px;
      height: 22px;
    }

    .summary-panel {
      padding: 13px 12px;
    }

    .summary-panel > strong {
      max-width: 56vw;
    }

    .order-items > div {
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 9px;
    }

    .item-media {
      width: 42px;
      height: 42px;
    }

    .order-items b {
      grid-column: 2;
      max-width: 100%;
      justify-self: start;
      padding-top: 2px;
      text-align: left;
    }

    .thank-you-footer nav {
      grid-template-columns: minmax(0, 1fr);
    }

    .thank-you-footer nav a {
      min-height: 44px;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 360px) {
    .thank-you-brand > span {
      font-size: 0.72rem;
      letter-spacing: 0.1em;
    }

    .thank-you-brand small {
      font-size: 0.52rem;
    }

    .thank-you-hero h1 {
      font-size: 1.28rem;
    }

    .summary-panel {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "label"
        "value"
        "helper";
    }

    .summary-panel > strong,
    .compact-value {
      max-width: 100% !important;
      text-align: left;
    }

    .reference-value {
      justify-content: flex-start;
    }

    .reference-value strong {
      max-width: calc(100% - 44px);
    }
  }
`;