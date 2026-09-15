import "./PromoCountdownBar.styles.css";
import { useEffect, useState } from "react";
import { ArrowRight, BadgePercent, FlaskConical, Timer } from "lucide-react";

function emptyRemaining() {
  return { totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 };
}

function remainingUntil(endsAt, now = Date.now()) {
  const end = new Date(endsAt || 0).getTime();
  const timestamp = Number(now);
  if (!Number.isFinite(end) || !Number.isFinite(timestamp)) {
    return emptyRemaining();
  }
  const totalSeconds = Math.max(0, Math.floor((end - timestamp) / 1000));

  return {
    totalSeconds,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

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

function formatGiftThreshold(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}+`;
}

function resolvePromoCtaUrl(promo = {}, product = null) {
  const label = String(promo?.ctaLabel || "").trim();
  const configuredUrl = String(product?.url || promo?.ctaUrl || "").trim();
  const isShopCta = /^shop(?:\s+(?:now|catalog|promotion))?$/i.test(label);

  if (isShopCta) return "/shop";
  if (/^\/catalog\/?(?:[?#].*)?$/i.test(configuredUrl)) return "/shop";

  return configuredUrl;
}

export default function PromoCountdownBar({ promo, initialNow = 0 }) {
  const [currentPromo, setCurrentPromo] = useState(promo || {});
  const [remaining, setRemaining] = useState(() =>
    Number(initialNow) > 0
      ? remainingUntil(promo?.endsAt, Number(initialNow))
      : emptyRemaining(),
  );

  useEffect(() => {
    let active = true;
    let refreshTimer = 0;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/site-control?ts=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await response.json();
        if (active && response.ok && data?.promo) setCurrentPromo(data.promo);
      } catch {
        // Keep the latest valid promotion state when the control API is unavailable.
      }
    };

    const scheduleRefresh = (delay = 15_000) => {
      window.clearTimeout(refreshTimer);
      if (document.hidden) return;

      refreshTimer = window.setTimeout(async () => {
        await refresh();
        if (active) scheduleRefresh();
      }, delay);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(refreshTimer);
        return;
      }

      scheduleRefresh(0);
    };

    scheduleRefresh();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!currentPromo?.enabled || !currentPromo?.endsAt) {
      setRemaining(remainingUntil(0));
      return undefined;
    }

    const update = () => setRemaining(remainingUntil(currentPromo.endsAt));
    let timer = 0;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      stop();
      update();
      if (!document.hidden) timer = window.setInterval(update, 1000);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [currentPromo?.enabled, currentPromo?.endsAt]);

  if (!currentPromo?.enabled || !currentPromo?.endsAt || remaining.totalSeconds <= 0) {
    return null;
  }

  const isProductPromo = currentPromo.type === "product" && currentPromo.product;
  const isSimpleGifts =
    currentPromo.type === "simple_gifts" && currentPromo.simpleGifts;
  const product = isProductPromo ? currentPromo.product : null;
  const ctaHref = resolvePromoCtaUrl(currentPromo, product);
  const hasPrices = Boolean(product?.originalPrice && product?.promoPrice);
  const originalPrice = hasPrices
    ? formatPrice(product.originalPrice, product.currency)
    : "";
  const promoPrice = hasPrices ? formatPrice(product.promoPrice, product.currency) : "";
  const Wrapper = isProductPromo && ctaHref ? "a" : "aside";
  const wrapperProps =
    Wrapper === "a"
      ? {
          href: ctaHref,
          "aria-label": `${currentPromo.ctaLabel || "Shop promotion"}: ${product.name}`,
        }
      : { "aria-label": "Limited-time promotion" };

  return (
    <Wrapper
      className={`promo-countdown-shell${isProductPromo ? " promo-countdown-product" : ""}${isSimpleGifts ? " promo-countdown-simple-gifts" : ""}`}
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
          <p>{isSimpleGifts ? "Sitewide + gifts" : currentPromo.eyebrow}</p>
          <h2>
            {isSimpleGifts
              ? currentPromo.simpleGifts.sitewideLabel
              : isProductPromo
                ? product.name
                : currentPromo.title}
          </h2>
          {isSimpleGifts ? (
            <div className="promo-simple-gifts-tiers">
              {currentPromo.simpleGifts.tiers.map((tier) => (
                <div className="promo-simple-gifts-tier" key={tier.key}>
                  <span>{formatGiftThreshold(tier.threshold)}</span>
                  <div className="promo-simple-gifts-rewards">
                    {tier.rewards.map((reward, rewardIndex) => (
                      <div className="promo-simple-gifts-reward" key={`${tier.key}-${rewardIndex}`}>
                        {rewardIndex > 0 && <i>Plus</i>}
                        <div>
                          {reward.options.map((name, optionIndex) => (
                            <span key={`${name}-${optionIndex}`}>
                              {optionIndex > 0 && (
                                <em>{reward.mode === "choose_one" ? "OR" : "+"}</em>
                              )}
                              <strong>{name}</strong>
                            </span>
                          ))}
                        </div>
                        <small>
                          {reward.mode === "choose_one" ? "Choose one" : "Free gift"}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : isProductPromo ? (
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

        {isProductPromo && ctaHref ? (
          <span className="promo-countdown-cta promo-product-cta" aria-hidden="true">
            <span>{currentPromo.ctaLabel || "Shop now"}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        ) : currentPromo.ctaLabel && ctaHref ? (
          <a className="promo-countdown-cta" href={ctaHref}>
            <span>{currentPromo.ctaLabel}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </Wrapper>
  );
}
