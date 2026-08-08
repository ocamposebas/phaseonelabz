import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical, Timer } from "lucide-react";

function remainingUntil(endsAt) {
  const end = new Date(endsAt || 0).getTime();
  const totalSeconds = Math.max(0, Math.floor((end - Date.now()) / 1000));

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

export default function PromoCountdownBar({ promo }) {
  const [currentPromo, setCurrentPromo] = useState(promo || {});
  const [remaining, setRemaining] = useState(() => remainingUntil(promo?.endsAt));

  useEffect(() => {
    let active = true;

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

    const interval = window.setInterval(refresh, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!currentPromo?.enabled || !currentPromo?.endsAt) {
      setRemaining(remainingUntil(0));
      return undefined;
    }

    const update = () => setRemaining(remainingUntil(currentPromo.endsAt));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [currentPromo?.enabled, currentPromo?.endsAt]);

  if (!currentPromo?.enabled || !currentPromo?.endsAt || remaining.totalSeconds <= 0) {
    return null;
  }

  return (
    <aside className="promo-countdown-shell" aria-label="Limited-time promotion">
      <div className="promo-countdown-glow" aria-hidden="true" />

      <div className="promo-countdown-content">
        <div className="promo-countdown-icon" aria-hidden="true">
          <FlaskConical size={24} strokeWidth={1.7} />
        </div>

        <div className="promo-countdown-copy">
          <p>{currentPromo.eyebrow}</p>
          <h2>{currentPromo.title}</h2>
          {currentPromo.info && <span>{currentPromo.info}</span>}
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

        {currentPromo.ctaLabel && currentPromo.ctaUrl && (
          <a className="promo-countdown-cta" href={currentPromo.ctaUrl}>
            <span>{currentPromo.ctaLabel}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        )}
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
          .promo-countdown-cta { transition: none; }
        }
      `}</style>
    </aside>
  );
}
