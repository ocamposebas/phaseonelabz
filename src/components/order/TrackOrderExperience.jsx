import "./TrackOrderExperience.styles.css";
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
    </section>
  );
}