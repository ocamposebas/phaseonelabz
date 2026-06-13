import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

function formatMoney(value, currency = "USD") {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(number);
}

function normalizeStatus(status = "") {
  return String(status || "pending")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusMeta(order = {}) {
  const key = String(order.status_key || order.status || "pending").toLowerCase();

  const hasTracking =
    Boolean(order.tracking_number) ||
    (Array.isArray(order.tracking_items) && order.tracking_items.length > 0);

  if (hasTracking && !["cancelled", "failed", "refunded"].includes(key)) {
    return {
      label: "Shipped",
      eyebrow: "Shipment active",
      message:
        order.status_message ||
        "Your package has shipping details attached. Use the tracking information below for carrier updates.",
      step: 4,
    };
  }

  if (key === "pending") {
    return {
      label: "Pending payment",
      eyebrow: "Order received",
      message:
        "Your order was received and is waiting for payment confirmation.",
      step: 1,
    };
  }

  if (key === "on-hold") {
    return {
      label: "Payment review",
      eyebrow: "Manual verification",
      message:
        "Your order is on hold while payment is manually verified. Once confirmed, it will move into processing.",
      step: 2,
    };
  }

  if (key === "processing") {
    return {
      label: "Processing",
      eyebrow: "Preparing order",
      message:
        "Payment has been confirmed and your order is being prepared for shipment.",
      step: 3,
    };
  }

  if (key === "completed") {
    return {
      label: "Completed",
      eyebrow: "Order complete",
      message: "Your order has been completed.",
      step: hasTracking ? 4 : 3,
    };
  }

  if (key === "cancelled") {
    return {
      label: "Cancelled",
      eyebrow: "Order stopped",
      message: "This order was cancelled.",
      step: 0,
    };
  }

  if (key === "failed") {
    return {
      label: "Failed",
      eyebrow: "Action needed",
      message:
        "This order failed. Please contact support if this looks incorrect.",
      step: 0,
    };
  }

  if (key === "refunded") {
    return {
      label: "Refunded",
      eyebrow: "Refund issued",
      message: "This order has been refunded.",
      step: 0,
    };
  }

  return {
    label: order.status_label || normalizeStatus(order.status),
    eyebrow: "Status update",
    message:
      order.status_message || "Your order status is currently being updated.",
    step: Number(order.status_step || 1),
  };
}

function StatusTimeline({ activeStep = 1, hasTracking = false }) {
  const steps = [
    {
      id: 1,
      label: "Order placed",
      description: "Order details received.",
    },
    {
      id: 2,
      label: "Payment review",
      description: "Manual payment verification.",
    },
    {
      id: 3,
      label: "Processing",
      description: "Order is being prepared.",
    },
    ...(hasTracking
      ? [
          {
            id: 4,
            label: "Shipped",
            description: "Tracking details available.",
          },
        ]
      : []),
  ];

  return (
    <div
      className={`track-timeline ${
        hasTracking ? "has-shipping" : "no-shipping"
      }`}
    >
      {steps.map((step) => {
        const isDone = activeStep >= step.id;
        const isCurrent = activeStep === step.id;

        return (
          <div
            key={step.id}
            className={`track-timeline-step ${isDone ? "is-done" : ""} ${
              isCurrent ? "is-current" : ""
            }`}
          >
            <div className="track-timeline-dot">
              {isDone ? <CheckCircle2 size={15} /> : step.id}
            </div>

            <div>
              <strong>{step.label}</strong>
              <span>{step.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackingBlock({ order }) {
  const trackingItems = Array.isArray(order?.tracking_items)
    ? order.tracking_items
    : [];

  const primaryTracking =
    trackingItems[0] ||
    (order?.tracking_number
      ? {
          carrier: order.tracking_carrier || "",
          tracking_number: order.tracking_number,
          tracking_url: order.tracking_url || "",
          shipped_date: order.shipped_date || "",
        }
      : null);

  const copyTracking = async () => {
    if (!primaryTracking?.tracking_number) return;

    try {
      await navigator.clipboard.writeText(primaryTracking.tracking_number);
    } catch {
      // Silent fallback.
    }
  };

  if (!primaryTracking) {
    return (
      <div className="track-shipment-card">
        <div className="track-shipment-icon">
          <Clock3 size={18} />
        </div>

        <div>
          <span>Shipment tracking</span>
          <strong>Not available yet</strong>
          <p>
            Tracking will appear once your order is packed and shipment details
            are added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-shipment-card is-live">
      <div className="track-shipment-icon">
        <Truck size={18} />
      </div>

      <div className="track-shipment-copy">
        <span>{primaryTracking.carrier || "Carrier tracking"}</span>
        <strong>{primaryTracking.tracking_number || "Tracking active"}</strong>

        {primaryTracking.shipped_date && (
          <p>Shipped {primaryTracking.shipped_date}</p>
        )}

        <div className="track-shipment-actions">
          {primaryTracking.tracking_url && (
            <a
              href={primaryTracking.tracking_url}
              target="_blank"
              rel="noreferrer"
            >
              Open tracking
              <ArrowRight size={13} />
            </a>
          )}

          {primaryTracking.tracking_number && (
            <button type="button" onClick={copyTracking}>
              <Copy size={13} />
              Copy number
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderExperience() {
  const [form, setForm] = useState({
    orderNumber: "",
    email: "",
  });

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const statusMeta = useMemo(() => getStatusMeta(order || {}), [order]);

  const hasTracking = useMemo(() => {
    return (
      Boolean(order?.tracking_number) ||
      (Array.isArray(order?.tracking_items) && order.tracking_items.length > 0)
    );
  }, [order]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setOrder(null);

    const orderNumber = String(form.orderNumber || "").trim();
    const email = String(form.email || "").trim().toLowerCase();

    if (!orderNumber || !email) {
      setError("Please enter your order number and email address.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setStatus("loading");

      const response = await fetch("/api/order/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          orderNumber,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "We could not find that order.");
      }

      setOrder(data.order);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "We could not find that order.");
    }
  };

  return (
    <section className="track-page">
      <div className="track-bg-grid" />
      <div className="track-orb track-orb-a" />
      <div className="track-orb track-orb-b" />

      <div className="track-shell">
        <div className="track-hero">
          <div className="track-hero-copy">
            <div className="track-kicker">
              <span />
              Order intelligence
            </div>

            <h1>
              Track your
              <span> order.</span>
            </h1>

            <p>
              Enter your order number and checkout email to view payment status,
              fulfillment progress, tracking details, and item summary.
            </p>
          </div>

          <div className="track-hero-panel">
            <div>
              <PackageCheck size={18} />
            </div>

            <span>Private lookup</span>

            <p>
              Order details are only shown when the order number and billing
              email match.
            </p>
          </div>
        </div>

        <div className="track-layout">
          <form onSubmit={handleSubmit} className="track-search-card">
            <div className="track-form-top">
              <div className="track-form-icon">
                <Search size={20} />
              </div>

              <div>
                <span>Track order</span>
                <h2>Find your shipment</h2>
              </div>
            </div>

            <div className="track-fields">
              <label>
                <span>Order number</span>

                <div className="track-input">
                  <ReceiptText size={17} />
                  <input
                    value={form.orderNumber}
                    onChange={(event) =>
                      updateField("orderNumber", event.target.value)
                    }
                    placeholder="Example: 232"
                    autoComplete="off"
                  />
                </div>
              </label>

              <label>
                <span>Checkout email</span>

                <div className="track-input">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="customer@email.com"
                    autoComplete="email"
                  />
                </div>
              </label>
            </div>

            {error && <p className="track-error">{error}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="track-submit"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="track-spin" />
                  Searching order
                </>
              ) : (
                <>
                  Track order
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="track-trust-note">
              <ShieldCheck size={16} />

              <p>
                You’ll find your order number in the confirmation email or on
                your receipt.
              </p>
            </div>
          </form>

          <div className="track-result-card">
            {!order ? (
              <div className="track-empty-state">
                <div className="track-empty-badge">
                  <Sparkles size={24} />
                </div>

                <span>Waiting for lookup</span>

                <h2>Real-time order status appears here.</h2>

                <p>
                  Once your order is found, this panel becomes a live shipment
                  timeline with payment state, shipping progress and tracking.
                </p>

                <StatusTimeline activeStep={1} hasTracking={false} />
              </div>
            ) : (
              <div className="track-result-state">
                <div className="track-result-header">
                  <div className="track-result-badge">
                    <CheckCircle2 size={24} />
                  </div>

                  <div>
                    <span>{statusMeta.eyebrow}</span>
                    <h2>Order #{order.number || order.id}</h2>
                  </div>
                </div>

                <div className="track-status-hero">
                  <div>
                    <span>Current status</span>
                    <strong>{statusMeta.label}</strong>
                    <p>{statusMeta.message}</p>
                  </div>

                  <div className="track-status-chip">
                    {normalizeStatus(order.status)}
                  </div>
                </div>

                <StatusTimeline
                  activeStep={statusMeta.step}
                  hasTracking={hasTracking}
                />

                <div className="track-stat-grid">
                  <div>
                    <span>Total</span>
                    <strong>{formatMoney(order.total, order.currency)}</strong>
                  </div>

                  <div>
                    <span>Payment</span>
                    <strong>{order.payment_title || "Manual payment"}</strong>
                  </div>

                  <div>
                    <span>Order date</span>
                    <strong>{order.date || "Pending"}</strong>
                  </div>
                </div>

                <TrackingBlock order={order} />

                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="track-items-card">
                    <div className="track-items-head">
                      <span>Items in this order</span>
                      <small>{order.items.length} item(s)</small>
                    </div>

                    <div className="track-items-list">
                      {order.items.map((item) => (
                        <div key={item.id || item.name} className="track-item">
                          <div className="track-item-mark">
                            <PackageCheck size={15} />
                          </div>

                          <div>
                            <p>{item.name}</p>
                            <span>Quantity × {item.quantity}</span>
                          </div>

                          <strong>
                            {item.total
                              ? formatMoney(item.total, order.currency)
                              : ""}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="track-footer-note">
                  <MapPin size={15} />

                  <p>
                    Shipment movement may take a few hours to update after a
                    carrier label is created.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .track-page {
        position: relative;
        min-height: 100vh;
        overflow: hidden;
        padding: 128px clamp(28px, 6vw, 96px) 104px;
        color: white;
        }

        .track-bg-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0.18;
        background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px);
        background-size: 86px 86px;
        mask-image: radial-gradient(circle at 50% 10%, black, transparent 72%);
        }

        .track-orb {
        position: absolute;
        pointer-events: none;
        border-radius: 999px;
        filter: blur(24px);
        }

        .track-orb-a {
        left: -12%;
        top: 4%;
        width: 520px;
        height: 520px;
        background: radial-gradient(circle, rgba(103, 232, 249, 0.12), transparent 68%);
        }

        .track-orb-b {
        right: -14%;
        top: 32%;
        width: 560px;
        height: 560px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.095), transparent 70%);
        }

        .track-shell {
        position: relative;
        z-index: 1;
        width: min(1152px, 100%);
        margin: 0 auto;
        }

        .track-hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 22px;
        align-items: end;
        margin-bottom: 30px;
        }

        .track-kicker {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: rgba(165, 243, 252, 0.72);
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        }

        .track-kicker span {
        width: 30px;
        height: 1px;
        background: rgba(103, 232, 249, 0.78);
        }

        .track-hero h1 {
        max-width: 680px;
        margin: 14px 0 0;
        color: white;
        font-size: clamp(42px, 5.2vw, 68px);
        font-weight: 760;
        letter-spacing: -0.075em;
        line-height: 0.94;
        }

        .track-hero h1 span {
        color: rgba(165, 243, 252, 0.9);
        }

        .track-hero-copy p {
        max-width: 640px;
        margin: 20px 0 0;
        color: rgba(203, 213, 225, 0.72);
        font-size: clamp(14px, 1.25vw, 16px);
        line-height: 1.75;
        }

        .track-hero-panel {
        border: 1px solid rgba(165, 243, 252, 0.13);
        border-radius: 26px;
        background:
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)),
            rgba(8, 24, 46, 0.62);
        padding: 18px;
        box-shadow: 0 24px 70px rgba(0,0,0,0.2);
        backdrop-filter: blur(18px);
        }

        .track-hero-panel div {
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 15px;
        background: rgba(103, 232, 249, 0.1);
        color: rgb(165, 243, 252);
        }

        .track-hero-panel span {
        display: block;
        margin-top: 15px;
        color: white;
        font-size: 14px;
        font-weight: 850;
        }

        .track-hero-panel p {
        margin: 8px 0 0;
        color: rgba(203, 213, 225, 0.62);
        font-size: 12.5px;
        line-height: 1.6;
        }

        .track-layout {
        display: grid;
        grid-template-columns: minmax(0, 0.78fr) minmax(380px, 1fr);
        gap: 20px;
        align-items: start;
        }

        .track-search-card,
        .track-result-card {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(165, 243, 252, 0.13);
        border-radius: 30px;
        background:
            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.017)),
            rgba(8, 24, 46, 0.72);
        box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.045),
            0 24px 80px rgba(0,0,0,0.22);
        backdrop-filter: blur(22px);
        }

        .track-search-card {
        padding: clamp(22px, 2.4vw, 30px);
        }

        .track-result-card {
        min-height: 100%;
        padding: clamp(22px, 2.4vw, 30px);
        }

        .track-form-top {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 24px;
        }

        .track-form-icon,
        .track-empty-badge,
        .track-result-badge,
        .track-shipment-icon {
        display: grid;
        width: 54px;
        height: 54px;
        place-items: center;
        border: 1px solid rgba(165, 243, 252, 0.15);
        border-radius: 19px;
        background: rgba(103, 232, 249, 0.085);
        color: rgb(165, 243, 252);
        }

        .track-form-top span,
        .track-empty-state > span,
        .track-result-header span,
        .track-status-hero span,
        .track-stat-grid span,
        .track-shipment-card span,
        .track-items-head span {
        display: block;
        color: rgba(165, 243, 252, 0.66);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        }

        .track-form-top h2 {
        margin: 5px 0 0;
        color: white;
        font-size: 24px;
        font-weight: 760;
        letter-spacing: -0.055em;
        }

        .track-fields {
        display: grid;
        gap: 14px;
        }

        .track-fields label {
        display: grid;
        gap: 9px;
        }

        .track-fields label > span {
        color: rgba(203, 213, 225, 0.72);
        font-size: 11px;
        font-weight: 850;
        }

        .track-input {
        display: flex;
        min-height: 62px;
        align-items: center;
        gap: 12px;
        border: 1px solid rgba(165, 243, 252, 0.12);
        border-radius: 19px;
        background: rgba(2, 6, 23, 0.55);
        padding: 0 16px;
        transition: 180ms ease;
        }

        .track-input:focus-within {
        border-color: rgba(103, 232, 249, 0.46);
        box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.075);
        }

        .track-input svg {
        color: rgba(165, 243, 252, 0.78);
        flex-shrink: 0;
        }

        .track-input input {
        width: 100%;
        border: 0;
        background: transparent;
        color: white;
        outline: none;
        font-size: 14px;
        }

        .track-input input::placeholder {
        color: rgba(148, 163, 184, 0.48);
        }

        .track-submit {
        display: inline-flex;
        width: 100%;
        min-height: 60px;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 18px;
        border: 0;
        border-radius: 19px;
        background: rgb(103, 232, 249);
        padding: 0 28px;
        color: rgb(2, 6, 23);
        cursor: pointer;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        transition: transform 180ms ease, background 180ms ease;
        }

        .track-submit:hover {
        transform: translateY(-2px);
        background: white;
        }

        .track-submit:disabled {
        cursor: wait;
        opacity: 0.72;
        }

        .track-spin {
        animation: trackSpin 0.75s linear infinite;
        }

        @keyframes trackSpin {
        to {
            transform: rotate(360deg);
        }
        }

        .track-error {
        margin: 14px 0 0;
        border: 1px solid rgba(248, 113, 113, 0.2);
        border-radius: 16px;
        background: rgba(248, 113, 113, 0.08);
        padding: 12px 14px;
        color: rgb(254, 202, 202);
        font-size: 13px;
        font-weight: 800;
        line-height: 1.5;
        }

        .track-trust-note,
        .track-footer-note {
        display: flex;
        gap: 11px;
        margin-top: 20px;
        border: 1px solid rgba(165, 243, 252, 0.1);
        border-radius: 18px;
        background: rgba(103, 232, 249, 0.045);
        padding: 14px;
        color: rgba(226, 232, 240, 0.7);
        font-size: 13px;
        line-height: 1.65;
        }

        .track-trust-note svg,
        .track-footer-note svg {
        color: rgb(165, 243, 252);
        flex-shrink: 0;
        margin-top: 3px;
        }

        .track-trust-note p,
        .track-footer-note p {
        margin: 0;
        }

        .track-empty-state {
        text-align: left;
        }

        .track-empty-badge {
        width: 64px;
        height: 64px;
        border-radius: 23px;
        }

        .track-empty-state > span {
        margin-top: 22px;
        }

        .track-empty-state h2,
        .track-result-header h2 {
        margin: 8px 0 0;
        color: white;
        font-size: clamp(28px, 3vw, 42px);
        font-weight: 770;
        letter-spacing: -0.065em;
        line-height: 0.98;
        }

        .track-empty-state > p {
        max-width: 540px;
        margin: 16px 0 0;
        color: rgba(203, 213, 225, 0.66);
        font-size: 14px;
        line-height: 1.7;
        }

        .track-result-header {
        display: flex;
        align-items: center;
        gap: 15px;
        }

        .track-result-badge {
        width: 62px;
        height: 62px;
        border-radius: 999px;
        background: rgb(103, 232, 249);
        color: rgb(2, 6, 23);
        box-shadow:
            0 0 0 10px rgba(103, 232, 249, 0.04),
            0 20px 60px rgba(103, 232, 249, 0.16);
        }

        .track-status-hero {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: start;
        margin-top: 22px;
        border: 1px solid rgba(165, 243, 252, 0.13);
        border-radius: 22px;
        background:
            radial-gradient(circle at 0% 0%, rgba(103, 232, 249, 0.12), transparent 42%),
            rgba(2, 6, 23, 0.48);
        padding: 18px;
        }

        .track-status-hero strong {
        display: block;
        margin-top: 8px;
        color: white;
        font-size: 24px;
        font-weight: 770;
        letter-spacing: -0.055em;
        }

        .track-status-hero p {
        margin: 10px 0 0;
        color: rgba(226, 232, 240, 0.72);
        font-size: 13px;
        line-height: 1.65;
        }

        .track-status-chip {
        border: 1px solid rgba(165, 243, 252, 0.16);
        border-radius: 999px;
        background: rgba(103, 232, 249, 0.075);
        padding: 10px 12px;
        color: rgb(165, 243, 252);
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        white-space: nowrap;
        }

        .track-timeline {
        display: grid;
        gap: 10px;
        margin-top: 22px;
        }

        .track-timeline.has-shipping {
        grid-template-columns: repeat(4, 1fr);
        }

        .track-timeline.no-shipping {
        grid-template-columns: repeat(3, 1fr);
        }

        .track-timeline-step {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(165, 243, 252, 0.1);
        border-radius: 20px;
        background:
            linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012)),
            rgba(2, 6, 23, 0.66);
        padding: 16px;
        opacity: 0.56;
        transition:
            opacity 240ms ease,
            transform 240ms ease,
            border-color 240ms ease,
            background 240ms ease,
            box-shadow 240ms ease;
        }

        .track-timeline-step::before {
        content: "";
        position: absolute;
        inset: 0;
        opacity: 0;
        pointer-events: none;
        background:
            radial-gradient(circle at 24% 0%, rgba(103, 232, 249, 0.16), transparent 46%);
        transition: opacity 240ms ease;
        }

        .track-timeline-step.is-done {
        border-color: rgba(103, 232, 249, 0.24);
        background:
            linear-gradient(180deg, rgba(103, 232, 249, 0.065), rgba(255,255,255,0.012)),
            rgba(2, 6, 23, 0.68);
        opacity: 1;
        }

        .track-timeline-step.is-done::before {
        opacity: 1;
        }

        .track-timeline-step.is-current {
        transform: translateY(-4px);
        border-color: rgba(165, 243, 252, 0.44);
        box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.22),
            0 0 34px rgba(103, 232, 249, 0.12);
        }

        .track-timeline-dot {
        position: relative;
        z-index: 1;
        display: grid;
        width: 40px;
        height: 40px;
        place-items: center;
        margin-bottom: 16px;
        border: 1px solid rgba(165, 243, 252, 0.12);
        border-radius: 999px;
        background: rgba(255,255,255,0.055);
        color: rgba(203, 213, 225, 0.72);
        font-size: 11px;
        font-weight: 950;
        }

        .track-timeline-step.is-done .track-timeline-dot {
        background: rgb(103, 232, 249);
        color: rgb(2, 6, 23);
        box-shadow:
            0 0 0 8px rgba(103, 232, 249, 0.045),
            0 0 28px rgba(103, 232, 249, 0.2);
        }

        .track-timeline-step.is-current .track-timeline-dot {
        animation: currentPulse 1.8s ease-in-out infinite;
        }

        @keyframes currentPulse {
        0% {
            box-shadow:
            0 0 0 7px rgba(103, 232, 249, 0.035),
            0 0 20px rgba(103, 232, 249, 0.12);
        }

        50% {
            box-shadow:
            0 0 0 13px rgba(103, 232, 249, 0.065),
            0 0 34px rgba(103, 232, 249, 0.22);
        }

        100% {
            box-shadow:
            0 0 0 7px rgba(103, 232, 249, 0.035),
            0 0 20px rgba(103, 232, 249, 0.12);
        }
        }

        .track-timeline strong {
        position: relative;
        z-index: 1;
        display: block;
        color: white;
        font-size: 16px;
        line-height: 1.25;
        letter-spacing: -0.04em;
        }

        .track-timeline span {
        position: relative;
        z-index: 1;
        display: block;
        margin-top: 9px;
        color: rgba(203, 213, 225, 0.54);
        font-size: 12px;
        line-height: 1.5;
        }

        .track-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 18px;
        }

        .track-stat-grid div {
        border: 1px solid rgba(165, 243, 252, 0.1);
        border-radius: 18px;
        background: rgba(255,255,255,0.024);
        padding: 15px;
        }

        .track-stat-grid strong {
        display: block;
        margin-top: 8px;
        color: white;
        font-size: 13px;
        line-height: 1.35;
        }

        .track-shipment-card {
        display: flex;
        gap: 13px;
        margin-top: 18px;
        border: 1px solid rgba(165, 243, 252, 0.11);
        border-radius: 22px;
        background: rgba(2, 6, 23, 0.48);
        padding: 16px;
        }

        .track-shipment-card.is-live {
        border-color: rgba(103, 232, 249, 0.28);
        background:
            linear-gradient(90deg, rgba(103, 232, 249, 0.09), rgba(255,255,255,0.018)),
            rgba(2, 6, 23, 0.48);
        }

        .track-shipment-icon {
        width: 44px;
        height: 44px;
        border-radius: 16px;
        flex-shrink: 0;
        }

        .track-shipment-card strong {
        display: block;
        margin-top: 6px;
        color: white;
        font-size: 15px;
        line-height: 1.35;
        }

        .track-shipment-card p {
        margin: 6px 0 0;
        color: rgba(203, 213, 225, 0.58);
        font-size: 12px;
        line-height: 1.55;
        }

        .track-shipment-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 12px;
        }

        .track-shipment-actions a,
        .track-shipment-actions button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid rgba(165, 243, 252, 0.14);
        border-radius: 999px;
        background: rgba(103, 232, 249, 0.07);
        padding: 9px 12px;
        color: rgb(165, 243, 252);
        cursor: pointer;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        }

        .track-items-card {
        margin-top: 18px;
        border: 1px solid rgba(165, 243, 252, 0.1);
        border-radius: 22px;
        background: rgba(2, 6, 23, 0.44);
        padding: 16px;
        }

        .track-items-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 12px;
        }

        .track-items-head small {
        color: rgba(203, 213, 225, 0.56);
        font-size: 12px;
        }

        .track-items-list {
        display: grid;
        gap: 10px;
        }

        .track-item {
        display: grid;
        grid-template-columns: 38px 1fr auto;
        gap: 11px;
        align-items: center;
        border-top: 1px solid rgba(165, 243, 252, 0.08);
        padding-top: 10px;
        }

        .track-item-mark {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 14px;
        background: rgba(103, 232, 249, 0.075);
        color: rgb(165, 243, 252);
        }

        .track-item p {
        margin: 0;
        color: white;
        font-size: 13px;
        line-height: 1.4;
        }

        .track-item span {
        display: block;
        margin-top: 3px;
        color: rgba(203, 213, 225, 0.52);
        font-size: 12px;
        }

        .track-item strong {
        color: rgb(165, 243, 252);
        font-size: 13px;
        white-space: nowrap;
        }

        @media (max-width: 1040px) {
        .track-page {
            padding: 118px clamp(22px, 5vw, 44px) 82px;
        }

        .track-shell {
            width: min(920px, 100%);
        }

        .track-hero {
            grid-template-columns: 1fr;
            margin-bottom: 26px;
        }

        .track-hero h1 {
            font-size: clamp(42px, 8vw, 62px);
        }

        .track-hero-panel {
            display: none;
        }

        .track-layout {
            grid-template-columns: 1fr;
        }

        .track-timeline.has-shipping,
        .track-timeline.no-shipping,
        .track-stat-grid {
            grid-template-columns: 1fr 1fr;
        }
        }

        @media (max-width: 620px) {
        .track-page {
            padding: 108px 18px 72px;
        }

        .track-shell {
            width: 100%;
        }

        .track-hero {
            margin-bottom: 22px;
        }

        .track-hero h1 {
            font-size: 42px;
            letter-spacing: -0.07em;
        }

        .track-hero-copy p {
            margin-top: 16px;
            font-size: 14px;
            line-height: 1.7;
        }

        .track-search-card,
        .track-result-card {
            border-radius: 24px;
            padding: 18px;
        }

        .track-status-hero {
            grid-template-columns: 1fr;
        }

        .track-status-chip {
            width: fit-content;
        }

        .track-timeline.has-shipping,
        .track-timeline.no-shipping,
        .track-stat-grid {
            grid-template-columns: 1fr;
        }

        .track-result-header {
            align-items: flex-start;
            flex-direction: column;
        }

        .track-item {
            grid-template-columns: 38px 1fr;
        }

        .track-item strong {
            grid-column: 2;
        }
        }
      `}</style>
    </section>
  );
}