import { ArrowRight, BadgePercent, FlaskConical, Timer } from "lucide-react";
import { usePromoRemaining, useSiteControlPromo } from "./useSiteControlPromo.js";

function TimeUnit({ value, label }) {
  return (
    <div className="promo-countdown-unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

function formatPrice(value, currency) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const amount = Number(raw);
  const currencyCode = String(currency || "").trim().toUpperCase();
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(currencyCode)) return raw;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${raw}`;
  }
}

export default function PromoCountdownBar({ promo }) {
  const currentPromo = useSiteControlPromo(promo);
  const remaining = usePromoRemaining(
    currentPromo?.enabled,
    currentPromo?.endsAt,
  );

  if (
    !currentPromo?.enabled ||
    currentPromo.type === "simple_gifts" ||
    !currentPromo?.endsAt ||
    remaining.totalSeconds <= 0
  ) {
    return null;
  }

  const isProductPromo = currentPromo.type === "product" && currentPromo.product;
  const product = isProductPromo ? currentPromo.product : null;
  const productHref = product?.url || currentPromo.ctaUrl || "";
  const hasPrices = Boolean(product?.originalPrice && product?.promoPrice);
  const originalPrice = hasPrices
    ? formatPrice(product.originalPrice, product.currency)
    : "";
  const promoPrice = hasPrices ? formatPrice(product.promoPrice, product.currency) : "";
  const Wrapper = isProductPromo && productHref ? "a" : "aside";
  const wrapperProps =
    Wrapper === "a"
      ? {
          href: productHref,
          "aria-label": `${currentPromo.ctaLabel || "Shop promotion"}: ${product.name}`,
        }
      : { "aria-label": "Limited-time promotion" };

  return (
    <Wrapper
      className={`promo-countdown-shell${isProductPromo ? " promo-countdown-product" : ""}`}
      {...wrapperProps}
    >
      <div className="promo-countdown-glow" aria-hidden="true" />

      <div className="promo-countdown-content">
        <div className="promo-countdown-icon" aria-hidden="true">
          {isProductPromo ? (
            <BadgePercent size={26} strokeWidth={1.7} />
          ) : (
            <FlaskConical size={24} strokeWidth={1.7} />
          )}
        </div>

        <div className="promo-countdown-copy">
          <p>{currentPromo.eyebrow}</p>
          <h2>{isProductPromo ? product.name : currentPromo.title}</h2>
          {isProductPromo ? (
            <div className="promo-product-details">
              {hasPrices && (
                <div className="promo-product-prices" aria-label={`Now ${promoPrice}, previously ${originalPrice}`}>
                  <del>{originalPrice}</del>
                  <strong>{promoPrice}</strong>
                </div>
              )}
              {product.saleScope === "single" && product.variationLabel && (
                <span className="promo-product-variation">{product.variationLabel}</span>
              )}
              {product.saleScope === "all" && (
                <span className="promo-product-variation">All variants</span>
              )}
              {product.salePriceActive && (
                <span className="promo-product-live">Sale active</span>
              )}
            </div>
          ) : (
            currentPromo.info && <span>{currentPromo.info}</span>
          )}
        </div>

        <div className="promo-countdown-timer-wrap">
          <div className="promo-countdown-label">
            <Timer size={13} aria-hidden="true" />
            Offer ends in
          </div>

          <div className="promo-countdown-timer" aria-live="off">
            <TimeUnit value={remaining.hours} label="Hrs" />
            <b aria-hidden="true">:</b>
            <TimeUnit value={remaining.minutes} label="Mins" />
            <b aria-hidden="true">:</b>
            <TimeUnit value={remaining.seconds} label="Secs" />
          </div>
        </div>

        {isProductPromo && productHref ? (
          <span className="promo-countdown-cta promo-product-cta" aria-hidden="true">
            <span>{currentPromo.ctaLabel || "Shop now"}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        ) : currentPromo.ctaLabel && currentPromo.ctaUrl ? (
          <a className="promo-countdown-cta" href={currentPromo.ctaUrl}>
            <span>{currentPromo.ctaLabel}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <style>{`
        .promo-countdown-shell {
          position: absolute;
          z-index: 30;
          top: 106px;
          left: 50%;
          width: min(calc(100% - 32px), 1180px);
          transform: translateX(-50%);
          overflow: hidden;
          border: 1px solid rgba(103, 232, 249, 0.35);
          border-radius: 20px;
          background: linear-gradient(105deg, rgba(2, 6, 23, 0.93), rgba(4, 20, 42, 0.88) 55%, rgba(2, 6, 23, 0.94));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 18px 60px rgba(0,0,0,0.38), 0 0 42px rgba(14,165,233,0.09);
          color: white;
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
        }

        a.promo-countdown-shell {
          text-decoration: none;
          cursor: pointer;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        a.promo-countdown-shell:hover {
          border-color: rgba(165, 243, 252, 0.62);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), 0 22px 68px rgba(0,0,0,0.42), 0 0 48px rgba(14,165,233,0.16);
          transform: translateX(-50%) translateY(-2px);
        }

        a.promo-countdown-shell:focus-visible {
          outline: 2px solid #67e8f9;
          outline-offset: 3px;
        }

        .promo-countdown-product {
          border-color: rgba(103, 232, 249, 0.48);
          background: linear-gradient(108deg, rgba(2, 6, 23, 0.96), rgba(4, 24, 48, 0.94) 52%, rgba(8, 35, 57, 0.93));
        }

        .promo-countdown-shell::before,
        .promo-countdown-shell::after {
          content: "";
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #67e8f9;
          box-shadow: 0 0 18px rgba(103,232,249,0.9);
          opacity: 0.8;
        }

        .promo-countdown-shell::before { left: 14px; top: 14px; }
        .promo-countdown-shell::after { right: 14px; bottom: 14px; }

        .promo-countdown-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 24% 0%, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at 78% 100%, rgba(59,130,246,0.12), transparent 38%);
        }

        .promo-countdown-content {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(250px, 1fr) auto auto;
          min-height: 112px;
          align-items: center;
          gap: 22px;
          padding: 16px 20px;
        }

        .promo-countdown-icon {
          display: grid;
          width: 56px;
          height: 72px;
          place-items: center;
          border-right: 1px solid rgba(103,232,249,0.2);
          color: #67e8f9;
          filter: drop-shadow(0 0 12px rgba(34,211,238,0.35));
        }

        .promo-countdown-copy p,
        .promo-countdown-copy h2,
        .promo-countdown-copy span,
        .promo-countdown-label { margin: 0; }

        .promo-countdown-copy p {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(207,250,254,0.72);
        }

        .promo-countdown-copy h2 {
          margin-top: 5px;
          font-size: clamp(22px, 2.35vw, 34px);
          font-weight: 850;
          line-height: 0.95;
          letter-spacing: -0.045em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #67e8f9, #bae6fd 58%, #fff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .promo-countdown-copy > span {
          display: block;
          max-width: 470px;
          margin-top: 6px;
          overflow: hidden;
          color: rgba(226,232,240,0.62);
          font-size: 10px;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .promo-product-details,
        .promo-product-prices {
          display: flex;
          align-items: center;
        }

        .promo-product-details {
          min-height: 25px;
          flex-wrap: wrap;
          gap: 7px 10px;
          margin-top: 7px;
        }

        .promo-product-prices { gap: 9px; }

        .promo-product-prices del {
          color: rgba(226, 232, 240, 0.52);
          font-size: 13px;
          font-weight: 750;
          text-decoration-color: rgba(248, 113, 113, 0.88);
          text-decoration-thickness: 1.5px;
        }

        .promo-product-prices strong {
          color: #a5f3fc;
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.035em;
          text-shadow: 0 0 18px rgba(34, 211, 238, 0.28);
        }

        .promo-product-variation,
        .promo-product-live {
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
          line-height: 1;
          text-transform: uppercase;
        }

        .promo-product-variation {
          border: 1px solid rgba(125, 211, 252, 0.22);
          color: rgba(224, 242, 254, 0.76);
        }

        .promo-product-live {
          border: 1px solid rgba(74, 222, 128, 0.26);
          background: rgba(34, 197, 94, 0.09);
          color: #86efac;
        }

        .promo-countdown-timer-wrap { min-width: 270px; }

        .promo-countdown-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-bottom: 7px;
          color: rgba(240,249,255,0.82);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .promo-countdown-timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .promo-countdown-timer > b {
          color: #38bdf8;
          font-size: 20px;
          font-weight: 900;
        }

        .promo-countdown-unit {
          display: grid;
          min-width: 66px;
          place-items: center;
          border: 1px solid rgba(34,211,238,0.28);
          border-radius: 12px;
          background: rgba(2,6,23,0.48);
          padding: 7px 7px 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.045);
        }

        .promo-countdown-unit strong {
          font-variant-numeric: tabular-nums;
          color: #7dd3fc;
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          text-shadow: 0 0 18px rgba(56,189,248,0.25);
        }

        .promo-countdown-unit span {
          margin-top: 3px;
          color: rgba(226,232,240,0.7);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .promo-countdown-cta {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(165,243,252,0.32);
          border-radius: 999px;
          background: rgba(34,211,238,0.1);
          padding: 0 16px;
          color: #cffafe;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .promo-countdown-cta:hover {
          transform: translateY(-1px);
          border-color: rgba(165,243,252,0.58);
          background: rgba(34,211,238,0.16);
        }

        .promo-product-cta { pointer-events: none; }

        a.promo-countdown-shell:hover .promo-product-cta {
          border-color: rgba(165,243,252,0.58);
          background: rgba(34,211,238,0.16);
        }

        @media (max-width: 900px) {
          .promo-countdown-content { grid-template-columns: minmax(0, 1fr) auto; gap: 14px; }
          .promo-countdown-icon, .promo-countdown-cta { display: none; }
          .promo-countdown-copy > span { max-width: 330px; }
        }

        @media (max-width: 640px) {
          .promo-countdown-shell {
            top: 88px;
            width: calc(100% - 20px);
            border-radius: 17px;
          }

          .promo-countdown-content {
            grid-template-columns: 1fr;
            min-height: 0;
            gap: 10px;
            padding: 13px 14px 14px;
            text-align: center;
          }

          .promo-countdown-copy p { font-size: 7px; letter-spacing: 0.2em; }
          .promo-countdown-copy h2 { margin-top: 3px; font-size: clamp(20px, 6.8vw, 27px); }
          .promo-countdown-copy > span { display: none; }
          .promo-product-details { justify-content: center; margin-top: 6px; }
          .promo-product-prices del { font-size: 11px; }
          .promo-product-prices strong { font-size: 19px; }
          .promo-product-variation, .promo-product-live { font-size: 6px; }
          .promo-countdown-timer-wrap { min-width: 0; }
          .promo-countdown-label { margin-bottom: 5px; font-size: 7px; }
          .promo-countdown-timer { gap: 6px; }
          .promo-countdown-timer > b { font-size: 16px; }
          .promo-countdown-unit { min-width: 61px; border-radius: 10px; padding: 6px 5px 5px; }
          .promo-countdown-unit strong { font-size: 21px; }
          .promo-countdown-unit span { font-size: 6.5px; }

          .promo-countdown-shell ~ .hero-inner {
            padding-top: calc(238px + env(safe-area-inset-top)) !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .promo-countdown-cta, a.promo-countdown-shell { transition: none; }
        }
      `}</style>
    </Wrapper>
  );
}
