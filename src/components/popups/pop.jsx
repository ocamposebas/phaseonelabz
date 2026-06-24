import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Copy,
  Loader2,
  Mail,
  Sparkles,
  X,
} from "lucide-react";

const LAUNCH_CODE = "PHASE20";
const EXTRA_CODE = "WELCOME10";

export default function Popups() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, open]);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 1300);
    } catch {
      setCopied("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus("error");
      setMessage("Please enter your email.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          source: "popup-extra-10",
          coupon: EXTRA_CODE,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to subscribe right now.");
      }

      setStatus("success");
      setMessage("Your extra 10% code is ready.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div
        className="phase-modal-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div
          className="phase-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Phase One Labz launch offer"
        >
          <button
            type="button"
            className="phase-modal-close"
            onClick={() => setOpen(false)}
            aria-label="Close popup"
          >
            <X size={16} />
          </button>

          {status !== "success" ? (
            <div className="phase-modal-inner">
              <div className="phase-modal-top">
                <div className="phase-modal-badge">
                  <Sparkles size={12} />
                  Launch Offer
                </div>

                <h2>Welcome to Phase One Labz.</h2>

                <p>
                  Use your launch code at checkout and get 20% off your first
                  order.
                </p>
              </div>

              <button
                type="button"
                className="phase-code-box"
                onClick={() => copyCode(LAUNCH_CODE)}
              >
                <span>
                  <small>20% launch code</small>
                  <strong>{LAUNCH_CODE}</strong>
                </span>

                <span className="phase-copy-circle">
                  <Copy size={15} />
                </span>
              </button>

              {copied === LAUNCH_CODE && (
                <p className="phase-copied">PHASE20 copied.</p>
              )}

              <div className="phase-divider" />

              <div className="phase-extra">
                <h3>Want an extra 10%?</h3>

                <p>
                  Join the list and unlock a private subscriber bonus for your
                  order.
                </p>

                <form className="phase-form" onSubmit={handleSubmit}>
                  <label className="phase-input">
                    <Mail size={15} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);

                        if (status !== "loading") {
                          setStatus("idle");
                          setMessage("");
                        }
                      }}
                      placeholder="Email Address *"
                    />
                  </label>

                  <button
                    type="submit"
                    className="phase-submit"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 size={14} className="phase-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        Unlock Extra 10%
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <p className="phase-small">
                    No spam. Only launch updates, restocks, and COA notices.
                  </p>

                  {message && (
                    <p
                      className={`phase-message ${
                        status === "error"
                          ? "phase-message-error"
                          : "phase-message-success"
                      }`}
                    >
                      {message}
                    </p>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className="phase-success phase-success-v2">
              <div className="phase-success-topline">
                <span>Subscriber bonus unlocked</span>
              </div>

              <h2>Extra 10% unlocked.</h2>

              <p>
                Your launch discount is already active. Use your subscriber code
                below for the extra bonus at checkout.
              </p>

              <button
                type="button"
                className="phase-main-code"
                onClick={() => copyCode(EXTRA_CODE)}
              >
                <span>
                  <small>Extra 10% code</small>
                  <strong>{EXTRA_CODE}</strong>
                </span>

                <span className="phase-main-code-icon">
                  <Copy size={16} />
                </span>
              </button>

              <div className="phase-secondary-code">
                <span>
                  Launch code:
                  <strong>{LAUNCH_CODE}</strong>
                </span>

                <button type="button" onClick={() => copyCode(LAUNCH_CODE)}>
                  Copy
                </button>
              </div>

              {copied && <p className="phase-copied">Code copied.</p>}

              <button
                type="button"
                className="phase-shop"
                onClick={() => setOpen(false)}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .phase-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.18), transparent 34%),
            rgba(1, 6, 15, 0.86);
          backdrop-filter: blur(14px);
          color: #ffffff;
        }

        .phase-modal {
          position: relative;
          width: min(100%, 440px);
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(186, 230, 253, 0.16);
          background:
            radial-gradient(circle at 20% 0%, rgba(103, 232, 249, 0.14), transparent 38%),
            linear-gradient(145deg, #07111f 0%, #081827 54%, #030712 100%);
          box-shadow:
            0 34px 110px rgba(0, 0, 0, 0.66),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .phase-modal::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), transparent 34%, rgba(103,232,249,0.04)),
            radial-gradient(circle at 85% 15%, rgba(59,130,246,0.12), transparent 32%);
        }

        .phase-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 20;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(226, 232, 240, 0.9);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 160ms ease;
        }

        .phase-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(165, 243, 252, 0.34);
          color: #ffffff;
        }

        .phase-modal-inner,
        .phase-success {
          position: relative;
          z-index: 2;
          padding: 28px;
        }

        .phase-modal-top h2 {
          margin: 16px 0 0;
          max-width: 340px;
          color: #ffffff;
          font-size: 34px;
          line-height: 0.98;
          font-weight: 650;
          letter-spacing: -0.055em;
        }

        .phase-modal-top p,
        .phase-extra p {
          margin: 13px 0 0;
          color: rgba(203, 213, 225, 0.76);
          font-size: 13.5px;
          line-height: 1.65;
        }

        .phase-modal-badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.075);
          padding: 7px 10px;
          color: rgba(207, 250, 254, 0.9);
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .phase-code-box {
          width: 100%;
          margin-top: 22px;
          border: 1px solid rgba(165, 243, 252, 0.24);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            rgba(2, 6, 23, 0.72);
          padding: 16px 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ffffff;
          cursor: pointer;
          box-shadow:
            0 18px 54px rgba(14, 165, 233, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          transition: 160ms ease;
        }

        .phase-code-box:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.38);
        }

        .phase-code-box small {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }

        .phase-code-box strong {
          display: block;
          margin-top: 5px;
          color: #ffffff;
          font-size: 32px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .phase-copy-circle {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: #67e8f9;
          color: #020617;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .phase-divider {
          height: 1px;
          margin: 24px 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(165, 243, 252, 0.18),
            transparent
          );
        }

        .phase-extra h3 {
          margin: 0;
          color: #ffffff;
          font-size: 25px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: -0.045em;
        }

        .phase-form {
          margin-top: 18px;
        }

        .phase-input {
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          background: rgba(2, 6, 23, 0.66);
        }

        .phase-input svg {
          position: absolute;
          left: 15px;
          color: #64748b;
        }

        .phase-input input {
          width: 100%;
          min-height: 52px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          padding: 0 16px 0 42px;
          font-size: 13.5px;
          font-weight: 600;
        }

        .phase-input input::placeholder {
          color: #64748b;
        }

        .phase-submit,
        .phase-shop {
          width: 100%;
          min-height: 52px;
          margin-top: 11px;
          border: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, #e0faff, #67e8f9 48%, #38bdf8);
          color: #020617;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.13em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: 160ms ease;
        }

        .phase-submit:hover,
        .phase-shop:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }

        .phase-submit:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
        }

        .phase-small {
          margin: 10px 0 0 !important;
          color: #64748b !important;
          font-size: 9.5px !important;
          line-height: 1.7 !important;
        }

        .phase-message {
          margin: 11px 0 0;
          border-radius: 13px;
          padding: 11px 13px;
          font-size: 12px;
          line-height: 1.55;
        }

        .phase-message-error {
          border: 1px solid rgba(252, 165, 165, 0.16);
          background: rgba(239, 68, 68, 0.08);
          color: #fecaca;
        }

        .phase-message-success {
          border: 1px solid rgba(165, 243, 252, 0.16);
          background: rgba(103, 232, 249, 0.08);
          color: #cffafe;
        }

        .phase-success-v2 {
          position: relative;
          z-index: 2;
          padding: 30px 28px 26px;
          text-align: left;
        }

        .phase-success-topline {
          width: fit-content;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.075);
          padding: 7px 10px;
        }

        .phase-success-topline span {
          color: rgba(207, 250, 254, 0.9);
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .phase-success-v2 h2 {
          margin: 18px 0 0;
          color: #ffffff;
          font-size: 34px;
          line-height: 0.95;
          font-weight: 680;
          letter-spacing: -0.06em;
        }

        .phase-success-v2 p {
          margin: 12px 0 0;
          max-width: 340px;
          color: rgba(203, 213, 225, 0.76);
          font-size: 13.5px;
          line-height: 1.65;
        }

        .phase-main-code {
          width: 100%;
          margin-top: 22px;
          border: 1px solid rgba(165, 243, 252, 0.3);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(103, 232, 249, 0.13), rgba(255, 255, 255, 0.02)),
            rgba(2, 6, 23, 0.78);
          padding: 18px;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          box-shadow:
            0 18px 54px rgba(14, 165, 233, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          transition: 160ms ease;
        }

        .phase-main-code:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.46);
        }

        .phase-main-code small {
          display: block;
          color: #8bdfff;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }

        .phase-main-code strong {
          display: block;
          margin-top: 6px;
          color: #ffffff;
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .phase-main-code-icon {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #67e8f9;
          color: #020617;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .phase-secondary-code {
          margin-top: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
          padding: 12px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .phase-secondary-code span {
          color: rgba(203, 213, 225, 0.74);
          font-size: 12px;
          font-weight: 700;
        }

        .phase-secondary-code strong {
          margin-left: 6px;
          color: #cffafe;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .phase-secondary-code button {
          border: 0;
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.12);
          color: #a5f3fc;
          padding: 7px 10px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          cursor: pointer;
        }

        .phase-copied {
          margin: 10px 0 0;
          color: #a5f3fc;
          font-size: 12px;
          font-weight: 800;
        }

        .phase-spin {
          animation: phaseSpin 0.9s linear infinite;
        }

        @keyframes phaseSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 520px) {
          .phase-modal-overlay {
            align-items: flex-end;
            padding: 10px;
          }

          .phase-modal {
            width: 100%;
            max-height: calc(100vh - 20px);
            overflow-y: auto;
            border-radius: 24px;
          }

          .phase-modal-inner,
          .phase-success-v2 {
            padding: 24px 18px 18px;
          }

          .phase-modal-top h2,
          .phase-success-v2 h2 {
            font-size: 30px;
          }

          .phase-code-box strong {
            font-size: 27px;
          }

          .phase-main-code strong {
            font-size: 28px;
          }

          .phase-extra h3 {
            font-size: 23px;
          }
        }
      `}</style>
    </>,
    document.body
  );
}