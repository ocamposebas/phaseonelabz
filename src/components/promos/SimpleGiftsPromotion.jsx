import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Gift, Timer, X } from "lucide-react";
import {
  formatGiftThreshold,
  normalizeSimpleGiftPromotion,
} from "../../lib/simpleGiftPromotion.js";
import { usePromoRemaining, useSiteControlPromo } from "./useSiteControlPromo.js";

function TimeUnit({ value, label }) {
  return (
    <span className="simple-gifts-time-unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{label}</small>
    </span>
  );
}

function PromotionCountdown({ remaining }) {
  return (
    <div className="simple-gifts-countdown">
      <p>
        <Timer size={13} aria-hidden="true" />
        Offer ends in
      </p>
      <div className="simple-gifts-clock" aria-label={`${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds remaining`}>
        <TimeUnit value={remaining.hours} label="Hrs" />
        <i aria-hidden="true">:</i>
        <TimeUnit value={remaining.minutes} label="Min" />
        <i aria-hidden="true">:</i>
        <TimeUnit value={remaining.seconds} label="Sec" />
      </div>
    </div>
  );
}

function RewardOptions({ reward }) {
  const isChoice = reward.mode === "choose_one";
  const label = isChoice
    ? "Choose one"
    : reward.options.length === 1
      ? "Free gift"
      : "Free gifts";

  return (
    <div className={`simple-gifts-reward simple-gifts-reward--${reward.mode}`}>
      <div className="simple-gifts-options">
        {reward.options.map((option, index) => (
          <span className="simple-gifts-option-group" key={`${option.name}-${index}`}>
            {index > 0 && (
              <em aria-label={isChoice ? "or" : "plus"}>
                {isChoice ? "OR" : "+"}
              </em>
            )}
            <strong>{option.name}</strong>
          </span>
        ))}
      </div>
      <p>{label}</p>
    </div>
  );
}

function GiftTier({ tier, currency, position }) {
  const threshold = formatGiftThreshold(tier.threshold, currency);

  return (
    <article className="simple-gifts-tier" aria-label={`Spend ${threshold} tier`}>
      <span className="simple-gifts-tier-index" aria-hidden="true">
        {String(position + 1).padStart(2, "0")}
      </span>
      <h3>{threshold}</h3>

      <div className="simple-gifts-reward-stack">
        {tier.rewards.map((reward, index) => (
          <div className="simple-gifts-reward-group" key={`${reward.mode}-${index}`}>
            {index > 0 && <span className="simple-gifts-plus">Plus</span>}
            <RewardOptions reward={reward} />
          </div>
        ))}
      </div>
    </article>
  );
}

function GiftPromotionDetails({ promotion, remaining, headingId, context }) {
  const hasCountdown = Boolean(promotion.endsAt && remaining.totalSeconds > 0);
  const columnCount = Math.min(promotion.tiers.length, 4);
  const hasManyTiers = promotion.tiers.length > 4;

  return (
    <div className={`simple-gifts-details simple-gifts-details--${context}`}>
      <header className="simple-gifts-heading">
        {promotion.sitewideLabel && (
          <p className="simple-gifts-sitewide">{promotion.sitewideLabel}</p>
        )}
        {!promotion.sitewideLabel && promotion.eyebrow && (
          <p className="simple-gifts-sitewide">{promotion.eyebrow}</p>
        )}
        <h2 id={headingId}>{promotion.title}</h2>
        {promotion.info && <span>{promotion.info}</span>}
      </header>

      <div
        className={`simple-gifts-tier-grid simple-gifts-tier-grid--${columnCount}${hasManyTiers ? " simple-gifts-tier-grid--many" : ""}`}
        style={{ "--simple-gifts-columns": columnCount }}
      >
        {promotion.tiers.map((tier, index) => (
          <GiftTier
            key={tier.key}
            tier={tier}
            currency={promotion.currency}
            position={index}
          />
        ))}
      </div>

      <footer className="simple-gifts-footer">
        {hasCountdown && <PromotionCountdown remaining={remaining} />}
        {promotion.ctaLabel && promotion.ctaUrl && (
          <a className="simple-gifts-cta" href={promotion.ctaUrl}>
            <span>{promotion.ctaLabel}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        )}
      </footer>
    </div>
  );
}

function useSimpleGifts(promo) {
  const currentPromo = useSiteControlPromo(promo);
  const promotion = useMemo(
    () => normalizeSimpleGiftPromotion(currentPromo),
    [currentPromo],
  );
  const remaining = usePromoRemaining(Boolean(promotion), promotion?.endsAt);
  const expired = Boolean(
    promotion?.endsAt && remaining.totalSeconds <= 0,
  );

  return {
    promotion: expired ? null : promotion,
    remaining,
  };
}

function SimpleGiftsStyles() {
  return (
    <style>{`
      .simple-gifts-large {
        position: relative;
        z-index: 6;
        overflow: hidden;
        padding: clamp(148px, 12vw, 190px) 20px clamp(70px, 8vw, 118px);
        background: rgba(2, 6, 23, 0.58);
        width: 100%;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }

      .simple-gifts-large::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% 0%, rgba(103, 232, 249, 0.1), transparent 38%),
          linear-gradient(rgba(148, 211, 255, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 211, 255, 0.02) 1px, transparent 1px);
        background-size: auto, 90px 90px, 90px 90px;
        mask-image: linear-gradient(to bottom, black, transparent 92%);
      }

      .simple-gifts-large-shell {
        position: relative;
        width: min(100%, 1280px);
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid var(--line-strong, rgba(148, 211, 255, 0.18));
        border-radius: 34px;
        background: rgba(3, 10, 23, 0.88);
        padding: clamp(38px, 5vw, 70px);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.055),
          0 38px 100px rgba(0, 0, 0, 0.34);
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }

      .simple-gifts-large-shell::after {
        content: "";
        position: absolute;
        top: -180px;
        left: 50%;
        width: 520px;
        height: 300px;
        transform: translateX(-50%);
        border-radius: 50%;
        background: rgba(34, 211, 238, 0.08);
        filter: blur(70px);
        pointer-events: none;
      }

      .simple-gifts-details {
        position: relative;
        z-index: 1;
        color: var(--text, #f3f8ff);
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      .simple-gifts-heading {
        width: min(100%, 760px);
        margin: 0 auto clamp(34px, 4.5vw, 58px);
        text-align: center;
      }

      .simple-gifts-sitewide {
        display: inline-flex;
        min-height: 30px;
        align-items: center;
        justify-content: center;
        margin: 0 0 18px;
        border: 1px solid rgba(103, 232, 249, 0.28);
        border-radius: 999px;
        background: rgba(103, 232, 249, 0.075);
        padding: 0 13px;
        color: #a5f3fc;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .simple-gifts-heading h2 {
        margin: 0;
        color: #f8fcff;
        font-size: clamp(34px, 5.2vw, 72px);
        font-weight: 820;
        line-height: 0.93;
        letter-spacing: -0.065em;
        text-wrap: balance;
        text-transform: uppercase;
      }

      .simple-gifts-heading > span {
        display: block;
        max-width: 630px;
        margin: 18px auto 0;
        color: rgba(226, 232, 240, 0.68);
        font-size: 14px;
        line-height: 1.75;
        text-wrap: balance;
      }

      .simple-gifts-tier-grid {
        display: grid;
        grid-template-columns: repeat(var(--simple-gifts-columns), minmax(0, 1fr));
        gap: 1px;
        overflow: hidden;
        border: 1px solid rgba(148, 211, 255, 0.13);
        border-radius: 26px;
        background: rgba(148, 211, 255, 0.12);
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      .simple-gifts-tier-grid--1 {
        width: min(100%, 440px);
        margin-inline: auto;
      }

      .simple-gifts-tier-grid--4 .simple-gifts-tier {
        padding-inline: clamp(18px, 2.5vw, 34px);
      }

      .simple-gifts-tier-grid--many {
        display: flex;
        flex-wrap: wrap;
      }

      .simple-gifts-tier-grid--many .simple-gifts-tier {
        flex: 1 1 280px;
      }

      .simple-gifts-tier {
        position: relative;
        min-width: 0;
        min-height: 325px;
        overflow: hidden;
        background: rgba(4, 14, 29, 0.94);
        padding: clamp(30px, 3.5vw, 48px);
        text-align: center;
      }

      .simple-gifts-tier::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(103, 232, 249, 0.05), transparent 38%);
        opacity: 0;
        transition: opacity 180ms ease;
      }

      .simple-gifts-tier:hover::before { opacity: 1; }

      .simple-gifts-tier-index {
        position: absolute;
        top: 18px;
        right: 20px;
        color: rgba(148, 211, 255, 0.28);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.16em;
      }

      .simple-gifts-tier h3 {
        position: relative;
        margin: 0;
        color: #a5f3fc;
        font-size: clamp(38px, 4.3vw, 58px);
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.065em;
        text-shadow: 0 0 30px rgba(34, 211, 238, 0.14);
      }

      .simple-gifts-tier h3::after {
        content: "";
        display: block;
        width: 34px;
        height: 1px;
        margin: 24px auto 22px;
        background: rgba(103, 232, 249, 0.38);
      }

      .simple-gifts-reward-stack {
        position: relative;
        display: grid;
        gap: 17px;
      }

      .simple-gifts-reward-group { display: grid; gap: 15px; }

      .simple-gifts-plus {
        color: rgba(186, 230, 253, 0.48);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }

      .simple-gifts-options {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 7px 10px;
      }

      .simple-gifts-option-group {
        display: inline-flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
      }

      .simple-gifts-option-group strong {
        min-width: 0;
        overflow-wrap: anywhere;
        color: #f8fafc;
        font-size: clamp(19px, 2.1vw, 28px);
        font-weight: 820;
        line-height: 1.08;
        letter-spacing: -0.035em;
      }

      .simple-gifts-option-group em {
        color: rgba(103, 232, 249, 0.62);
        font-size: 7px;
        font-style: normal;
        font-weight: 900;
        letter-spacing: 0.14em;
      }

      .simple-gifts-reward > p {
        margin: 9px 0 0;
        color: rgba(186, 230, 253, 0.56);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.21em;
        text-transform: uppercase;
      }

      .simple-gifts-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: clamp(32px, 4vw, 48px);
        gap: 24px;
      }

      .simple-gifts-countdown { text-align: center; }

      .simple-gifts-countdown > p {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 0 0 10px;
        color: rgba(207, 250, 254, 0.72);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .simple-gifts-clock {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .simple-gifts-clock > i {
        color: rgba(103, 232, 249, 0.56);
        font-size: 18px;
        font-style: normal;
        font-weight: 800;
      }

      .simple-gifts-time-unit { display: grid; min-width: 50px; }

      .simple-gifts-time-unit strong {
        color: #e0f2fe;
        font-size: 25px;
        font-variant-numeric: tabular-nums;
        font-weight: 850;
        line-height: 1;
        letter-spacing: -0.035em;
      }

      .simple-gifts-time-unit small {
        margin-top: 5px;
        color: rgba(148, 163, 184, 0.65);
        font-size: 6px;
        font-weight: 900;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      .simple-gifts-cta {
        display: inline-flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border: 1px solid rgba(207, 250, 254, 0.72);
        border-radius: 999px;
        background: #67e8f9;
        padding: 0 24px;
        color: #082f49;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        box-shadow: 0 14px 34px rgba(34, 211, 238, 0.16);
        transition: background 160ms ease, transform 160ms ease;
      }

      .simple-gifts-cta:hover { background: #a5f3fc; transform: translateY(-1px); }
      .simple-gifts-cta:focus-visible,
      .simple-gifts-strip:focus-visible,
      .simple-gifts-modal-close:focus-visible {
        outline: 2px solid #67e8f9;
        outline-offset: 3px;
      }

      .simple-gifts-strip-wrap {
        position: relative;
        z-index: 30;
        width: min(100%, 1240px);
        margin: 0 auto;
        padding: 18px 20px 0;
      }

      .simple-gifts-strip {
        display: grid;
        width: 100%;
        min-height: 64px;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        border: 1px solid rgba(103, 232, 249, 0.24);
        border-radius: 18px;
        background: rgba(3, 12, 26, 0.9);
        padding: 11px 16px;
        color: white;
        text-align: left;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 16px 42px rgba(0,0,0,0.22);
        cursor: pointer;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      .simple-gifts-strip:hover {
        transform: translateY(-1px);
        border-color: rgba(103, 232, 249, 0.44);
        background: rgba(5, 19, 37, 0.94);
      }

      .simple-gifts-strip-icon {
        display: grid;
        width: 40px;
        height: 40px;
        place-items: center;
        border-radius: 13px;
        background: rgba(103, 232, 249, 0.09);
        color: #a5f3fc;
      }

      .simple-gifts-strip-copy {
        display: flex;
        min-width: 0;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px 10px;
      }

      .simple-gifts-strip-copy strong,
      .simple-gifts-strip-copy span {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .simple-gifts-strip-copy strong { color: #a5f3fc; }
      .simple-gifts-strip-copy span { color: rgba(241, 245, 249, 0.8); }
      .simple-gifts-strip-copy i { color: rgba(103, 232, 249, 0.38); font-style: normal; }

      .simple-gifts-strip-action {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: rgba(207, 250, 254, 0.78);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      .simple-gifts-modal-overlay {
        position: fixed;
        z-index: 10020;
        inset: 0;
        display: grid;
        place-items: center;
        overflow-y: auto;
        background: rgba(0, 3, 10, 0.82);
        padding: 24px;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .simple-gifts-modal {
        position: relative;
        width: min(100%, 1160px);
        max-height: min(900px, calc(100dvh - 48px));
        overflow-y: auto;
        border: 1px solid rgba(103, 232, 249, 0.24);
        border-radius: 30px;
        background: #030b19;
        padding: clamp(38px, 5vw, 68px);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 42px 120px rgba(0,0,0,0.62);
        overscroll-behavior: contain;
      }

      .simple-gifts-modal-close {
        position: absolute;
        z-index: 2;
        top: 18px;
        right: 18px;
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border: 1px solid rgba(148, 211, 255, 0.16);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: rgba(240, 249, 255, 0.82);
        cursor: pointer;
      }

      .simple-gifts-details--modal .simple-gifts-heading {
        margin-bottom: 36px;
        padding-inline: 34px;
      }

      .simple-gifts-details--modal .simple-gifts-heading h2 {
        font-size: clamp(30px, 4.2vw, 56px);
      }

      .simple-gifts-details--modal .simple-gifts-tier { min-height: 285px; }

      @media (max-width: 1024px) {
        .simple-gifts-tier-grid:not(.simple-gifts-tier-grid--many) {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .simple-gifts-large { padding: 132px 12px 54px; }
        .simple-gifts-large-shell { border-radius: 25px; padding: 34px 13px 20px; }
        .simple-gifts-heading { margin-bottom: 28px; padding-inline: 8px; }
        .simple-gifts-sitewide { min-height: 28px; margin-bottom: 15px; font-size: 8px; }
        .simple-gifts-heading h2 { font-size: clamp(31px, 10.5vw, 44px); line-height: 0.96; }
        .simple-gifts-heading > span { margin-top: 14px; font-size: 12px; line-height: 1.6; }
        .simple-gifts-tier-grid {
          display: grid;
          grid-template-columns: 1fr;
          border-radius: 20px;
        }
        .simple-gifts-heading h2,
        .simple-gifts-heading > span { overflow-wrap: anywhere; }
        .simple-gifts-tier { min-height: 0; padding: 34px 20px 36px; }
        .simple-gifts-tier h3 { font-size: clamp(42px, 14vw, 58px); }
        .simple-gifts-tier h3::after { margin-block: 20px 19px; }
        .simple-gifts-option-group strong { font-size: clamp(21px, 7vw, 28px); }
        .simple-gifts-footer { margin-top: 30px; gap: 21px; }
        .simple-gifts-cta { width: 100%; min-height: 52px; }

        .simple-gifts-strip-wrap { padding: 12px 10px 0; }
        .simple-gifts-strip { min-height: 70px; grid-template-columns: auto minmax(0, 1fr); gap: 11px; border-radius: 16px; padding: 10px 12px; }
        .simple-gifts-strip-icon { width: 38px; height: 38px; border-radius: 12px; }
        .simple-gifts-strip-copy { display: grid; gap: 3px; }
        .simple-gifts-strip-copy i { display: none; }
        .simple-gifts-strip-copy strong, .simple-gifts-strip-copy span { font-size: 7.5px; line-height: 1.35; letter-spacing: 0.11em; }
        .simple-gifts-strip-action { display: none; }

        .simple-gifts-modal-overlay { align-items: end; padding: 0; }
        .simple-gifts-modal {
          width: 100%;
          max-height: calc(100dvh - 24px);
          border-right: 0;
          border-bottom: 0;
          border-left: 0;
          border-radius: 26px 26px 0 0;
          padding: 52px 12px max(22px, env(safe-area-inset-bottom));
        }
        .simple-gifts-modal-close { top: 12px; right: 14px; }
        .simple-gifts-details--modal .simple-gifts-heading { margin-bottom: 28px; padding-inline: 18px; }
        .simple-gifts-details--modal .simple-gifts-heading h2 { font-size: clamp(29px, 9.5vw, 40px); }
        .simple-gifts-details--modal .simple-gifts-tier { min-height: 0; }
      }

      @media (max-width: 340px) {
        .simple-gifts-large { padding-inline: 8px; }
        .simple-gifts-large-shell { padding-inline: 9px; }
        .simple-gifts-tier { padding-inline: 14px; }
        .simple-gifts-option-group strong { font-size: 20px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .simple-gifts-tier::before,
        .simple-gifts-strip,
        .simple-gifts-cta { transition: none; }
      }
    `}</style>
  );
}

export function SimpleGiftsPromotion({ promo }) {
  const headingId = useId();
  const { promotion, remaining } = useSimpleGifts(promo);

  if (!promotion) return null;

  return (
    <>
      <section className="simple-gifts-large" aria-labelledby={headingId}>
        <div className="simple-gifts-large-shell">
          <GiftPromotionDetails
            promotion={promotion}
            remaining={remaining}
            headingId={headingId}
            context="large"
          />
        </div>
      </section>
      <SimpleGiftsStyles />
    </>
  );
}

function PromotionModal({ promotion, remaining, onClose, triggerRef }) {
  const headingId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      (triggerRef.current || previousFocus)?.focus?.();
    };
  }, [onClose, triggerRef]);

  return createPortal(
    <div
      className="simple-gifts-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="simple-gifts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <button
          ref={closeRef}
          type="button"
          className="simple-gifts-modal-close"
          onClick={onClose}
          aria-label="Close promotion details"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <GiftPromotionDetails
          promotion={promotion}
          remaining={remaining}
          headingId={headingId}
          context="modal"
        />
      </div>
    </div>,
    document.body,
  );
}

export function SimpleGiftsPromoStrip({ promo, className = "" }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { promotion, remaining } = useSimpleGifts(promo);
  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!promotion) setOpen(false);
  }, [promotion]);

  if (!promotion) return null;

  const firstTier = promotion.tiers[0];
  const lastTier = promotion.tiers[promotion.tiers.length - 1];
  const firstThreshold = formatGiftThreshold(firstTier.threshold, promotion.currency);
  const lastThreshold = formatGiftThreshold(lastTier.threshold, promotion.currency);

  return (
    <>
      <div className={`simple-gifts-strip-wrap ${className}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          className="simple-gifts-strip"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="simple-gifts-strip-icon" aria-hidden="true">
            <Gift size={19} />
          </span>
          <span className="simple-gifts-strip-copy">
            {promotion.sitewideLabel && <strong>{promotion.sitewideLabel}</strong>}
            {promotion.sitewideLabel && <i aria-hidden="true">•</i>}
            <span>Free gift at {firstThreshold}</span>
            {promotion.tiers.length > 1 && (
              <>
                <i aria-hidden="true">•</i>
                <span>More at {lastThreshold}</span>
              </>
            )}
          </span>
          <span className="simple-gifts-strip-action" aria-hidden="true">
            View offer
            <ArrowRight size={13} />
          </span>
        </button>
      </div>

      {mounted && open && (
        <PromotionModal
          promotion={promotion}
          remaining={remaining}
          onClose={closeModal}
          triggerRef={triggerRef}
        />
      )}
      <SimpleGiftsStyles />
    </>
  );
}
