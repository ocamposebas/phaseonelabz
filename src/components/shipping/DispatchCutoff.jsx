import { useEffect, useState } from "react";
import { Clock3, PackageCheck, Truck } from "lucide-react";
import { getDispatchCutoffState, padDispatchTime } from "./dispatchCutoffTime";

function TimeUnit({ value, label }) {
  return (
    <span className="dispatch-notice__unit">
      <b>{value}</b>
      <small>{label}</small>
    </span>
  );
}

export default function DispatchCutoff({ variant = "product" }) {
  const [dispatch, setDispatch] = useState(null);

  useEffect(() => {
    const refresh = () => setDispatch(getDispatchCutoffState(new Date()));
    refresh();

    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isClosed = dispatch?.beforeCutoff === false;
  const hours = padDispatchTime(dispatch?.hours || 0);
  const minutes = padDispatchTime(dispatch?.minutes || 0);
  const seconds = padDispatchTime(dispatch?.seconds || 0);

  return (
    <section
      className={`dispatch-notice dispatch-notice--${variant} ${
        isClosed ? "is-closed" : "is-open"
      }`}
      aria-label="Daily order processing window"
      aria-live={isClosed ? "polite" : "off"}
    >
      <div className="dispatch-notice__accent" aria-hidden="true" />

      <div className="dispatch-notice__icon" aria-hidden="true">
        {isClosed ? <PackageCheck size={21} /> : <Truck size={21} />}
      </div>

      <div className="dispatch-notice__copy">
        <span className="dispatch-notice__kicker">
          <i />
          {isClosed ? "Next processing day" : "Processing window open"}
        </span>

        {dispatch ? (
          isClosed ? (
            <>
              <strong>Today’s 4:00 PM MT cutoff has passed</strong>
              <p>
                Orders placed now enter the processing queue for {dispatch.nextProcessingDate}.
              </p>
            </>
          ) : (
            <>
              <strong>Order before 4:00 PM Mountain Time</strong>
              <p>Complete checkout within the remaining time for processing today.</p>
            </>
          )
        ) : (
          <>
            <strong>Checking today’s processing window</strong>
            <p>Daily cutoff · 4:00 PM Mountain Time</p>
          </>
        )}
      </div>

      {dispatch?.beforeCutoff ? (
        <div
          className="dispatch-notice__timer"
          aria-label={`${hours} hours, ${minutes} minutes and ${seconds} seconds remaining`}
        >
          <TimeUnit value={hours} label="Hrs" />
          <i>:</i>
          <TimeUnit value={minutes} label="Min" />
          <i>:</i>
          <TimeUnit value={seconds} label="Sec" />
        </div>
      ) : (
        <div className="dispatch-notice__cutoff">
          <Clock3 size={14} />
          <span>4:00 PM</span>
          <small>MT</small>
        </div>
      )}

      <style>{`
        .dispatch-notice {
          --notice-accent: 103, 232, 249;
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 15px;
          overflow: hidden;
          border: 1px solid rgba(var(--notice-accent), 0.2);
          border-radius: 18px;
          background:
            radial-gradient(circle at 100% 0%, rgba(var(--notice-accent), 0.09), transparent 34%),
            linear-gradient(110deg, rgba(var(--notice-accent), 0.055), transparent 42%),
            rgba(3, 9, 20, 0.84);
          padding: 14px 15px;
          color: #f8fafc;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .dispatch-notice.is-closed {
          --notice-accent: 165, 180, 252;
        }

        .dispatch-notice__accent {
          position: absolute;
          inset: 12px auto 12px 0;
          width: 2px;
          border-radius: 999px;
          background: rgb(var(--notice-accent));
          box-shadow: 0 0 18px rgba(var(--notice-accent), 0.7);
        }

        .dispatch-notice__icon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid rgba(var(--notice-accent), 0.18);
          border-radius: 14px;
          background: rgba(var(--notice-accent), 0.07);
          color: rgb(var(--notice-accent));
        }

        .dispatch-notice__copy {
          display: grid;
          min-width: 0;
          gap: 4px;
        }

        .dispatch-notice__kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(var(--notice-accent), 0.88);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.18em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .dispatch-notice__kicker i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(var(--notice-accent), 0.09);
        }

        .dispatch-notice.is-open .dispatch-notice__kicker i {
          animation: dispatchNoticePulse 1.8s ease-in-out infinite;
        }

        .dispatch-notice__copy strong {
          overflow: hidden;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.018em;
          line-height: 1.3;
          text-overflow: ellipsis;
        }

        .dispatch-notice__copy p {
          margin: 0;
          color: rgba(148, 163, 184, 0.78);
          font-size: 9px;
          line-height: 1.45;
        }

        .dispatch-notice__timer {
          display: flex;
          align-items: center;
          gap: 5px;
          border-left: 1px solid rgba(148, 163, 184, 0.12);
          padding-left: 14px;
          font-variant-numeric: tabular-nums;
        }

        .dispatch-notice__timer > i {
          margin-top: -12px;
          color: rgba(var(--notice-accent), 0.56);
          font-size: 13px;
          font-style: normal;
          font-weight: 900;
        }

        .dispatch-notice__unit {
          display: grid;
          width: 40px;
          min-height: 44px;
          place-items: center;
          align-content: center;
          border: 1px solid rgba(var(--notice-accent), 0.13);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .dispatch-notice__unit b {
          color: rgb(var(--notice-accent));
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        .dispatch-notice__unit small {
          margin-top: 4px;
          color: rgba(148, 163, 184, 0.58);
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .dispatch-notice__cutoff {
          display: grid;
          grid-template-columns: auto auto;
          align-items: center;
          gap: 2px 6px;
          border-left: 1px solid rgba(148, 163, 184, 0.12);
          padding-left: 15px;
          color: rgb(var(--notice-accent));
        }

        .dispatch-notice__cutoff span {
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .dispatch-notice__cutoff small {
          grid-column: 1 / -1;
          color: #64748b;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-align: right;
        }

        .dispatch-notice--product {
          margin-top: 18px;
        }

        .dispatch-notice--catalog {
          margin: 0 0 28px;
          min-height: 94px;
          border-radius: 22px;
          padding: 17px 19px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .dispatch-notice--catalog .dispatch-notice__icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
        }

        .dispatch-notice--catalog .dispatch-notice__copy strong,
        .dispatch-notice--checkout .dispatch-notice__copy strong {
          font-size: 15px;
        }

        .dispatch-notice--catalog .dispatch-notice__copy p,
        .dispatch-notice--checkout .dispatch-notice__copy p {
          font-size: 10px;
        }

        .dispatch-notice--catalog .dispatch-notice__unit,
        .dispatch-notice--checkout .dispatch-notice__unit {
          width: 46px;
          min-height: 49px;
        }

        .dispatch-notice--catalog .dispatch-notice__unit b,
        .dispatch-notice--checkout .dispatch-notice__unit b {
          font-size: 15px;
        }

        .dispatch-notice--checkout {
          margin: 0 0 22px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 100% 0%, rgba(var(--notice-accent), 0.1), transparent 30%),
            linear-gradient(100deg, rgba(var(--notice-accent), 0.06), transparent 42%),
            rgba(6, 11, 22, 0.94);
          padding: 15px 17px;
          box-shadow: 0 20px 55px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        @keyframes dispatchNoticePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.52; transform: scale(0.8); }
        }

        @media (max-width: 680px) {
          .dispatch-notice {
            grid-template-columns: auto minmax(0, 1fr);
            gap: 12px;
          }

          .dispatch-notice__timer,
          .dispatch-notice__cutoff {
            grid-column: 1 / -1;
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            border-left: 0;
            padding-top: 11px;
            padding-left: 0;
          }

          .dispatch-notice__timer {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
            width: 100%;
            gap: 7px;
          }

          .dispatch-notice__unit,
          .dispatch-notice--catalog .dispatch-notice__unit,
          .dispatch-notice--checkout .dispatch-notice__unit {
            width: 100%;
            min-height: 64px;
            border-radius: 14px;
          }

          .dispatch-notice__unit b,
          .dispatch-notice--catalog .dispatch-notice__unit b,
          .dispatch-notice--checkout .dispatch-notice__unit b {
            font-size: 22px;
          }

          .dispatch-notice__unit small {
            margin-top: 6px;
            font-size: 7px;
          }

          .dispatch-notice__timer > i {
            margin-top: -15px;
            font-size: 18px;
          }

          .dispatch-notice__cutoff {
            display: flex;
            justify-content: center;
          }

          .dispatch-notice__cutoff small {
            grid-column: auto;
          }

          .dispatch-notice--catalog,
          .dispatch-notice--checkout {
            min-height: 0;
            border-radius: 18px;
            padding: 15px;
          }
        }

        @media (max-width: 380px) {
          .dispatch-notice__timer {
            gap: 4px;
          }

          .dispatch-notice__unit,
          .dispatch-notice--catalog .dispatch-notice__unit,
          .dispatch-notice--checkout .dispatch-notice__unit {
            min-height: 58px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dispatch-notice.is-open .dispatch-notice__kicker i {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
