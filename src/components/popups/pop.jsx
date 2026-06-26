import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Copy, Loader2, Mail, Sparkles, X } from "lucide-react";

const LAUNCH_CODE = "PHASE20";
const EXTRA_CODE = "WELCOME10";
const POPUP_SEEN_KEY = "phaseone_launch_offer_seen_v1";

export default function Popups() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setMounted(true);

    const hasSeenPopup = localStorage.getItem(POPUP_SEEN_KEY);

    if (hasSeenPopup === "true") {
      setOpen(false);
      return;
    }

    localStorage.setItem(POPUP_SEEN_KEY, "true");
    setOpen(true);
  }, []);

  useEffect(() => {
    const closeWhenCartOpens = (event) => {
      if (event?.detail?.open) {
        setOpen(false);
      }
    };

    window.addEventListener("phase-cart-state", closeWhenCartOpens);

    return () => {
      window.removeEventListener("phase-cart-state", closeWhenCartOpens);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
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

  if (!mounted) return null;

  return createPortal(
    <>
      {!open && (
        <button
          type="button"
          className="phase-saved-tab"
          onClick={() => {
            if (document.body.classList.contains("phase-cart-open")) return;
            setOpen(true);
          }}
          aria-label="Open saved 20 percent offer"
        >
          <span className="phase-saved-tab-glow" />
          <span className="phase-saved-tab-main">20%</span>
          <span className="phase-saved-tab-text">saved</span>
        </button>
      )}

      {open && (
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
                    order. Available until supplies last.
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
                      Offer available until supplies last.
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
                  Your launch discount is already active. Use your subscriber
                  code below for the extra bonus at checkout.
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

                <p className="phase-success-note">
                  Offer available until supplies last.
                </p>

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
      )}

      <style>{`
        .phase-modal-overlay,
        .phase-modal-overlay *,
        .phase-modal-overlay *::before,
        .phase-modal-overlay *::after,
        .phase-saved-tab,
        .phase-saved-tab *,
        .phase-saved-tab *::before,
        .phase-saved-tab *::after {
          box-sizing: border-box;
        }

        body.phase-cart-open .phase-saved-tab,
        html.phase-cart-open .phase-saved-tab,
        body.phase-cart-open .phase-modal-overlay,
        html.phase-cart-open .phase-modal-overlay {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
          transform: translateY(8px);
        }

        .phase-saved-tab {
          position: fixed;
          right: max(16px, env(safe-area-inset-right));
          bottom: max(18px, env(safe-area-inset-bottom));
          z-index: 80;
          width: 74px;
          height: 46px;
          border: 1px solid rgba(165, 243, 252, 0.2);
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.94);
          color: #ffffff;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          transition: opacity 140ms ease, transform 140ms ease, border-color 140ms ease;
        }

        .phase-saved-tab:hover {
          transform: translateY(-2px);
          border-color: rgba(165, 243, 252, 0.46);
        }

        .phase-saved-tab-glow {
          position: absolute;
          inset: -18px;
          pointer-events: none;
          display: none;
        }

        .phase-saved-tab-main {
          position: relative;
          z-index: 1;
          font-size: 19px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .phase-saved-tab-text {
          position: relative;
          z-index: 1;
          color: rgba(207, 250, 254, 0.82);
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .phase-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9997;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(14px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
          background:
            radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.18), transparent 34%),
            rgba(1, 6, 15, 0.86);
          backdrop-filter: none;
          color: #ffffff;
        }

        .phase-modal {
          position: relative;
          width: min(100%, 440px);
          max-height: min(92vh, 720px);
          overflow-y: auto;
          overscroll-behavior: contain;
          border-radius: 28px;
          border: 1px solid rgba(186, 230, 253, 0.16);
          background:
            radial-gradient(circle at 20% 0%, rgba(103, 232, 249, 0.14), transparent 38%),
            linear-gradient(145deg, #07111f 0%, #081827 54%, #030712 100%);
          box-shadow:
            0 34px 110px rgba(0, 0, 0, 0.66),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          scrollbar-width: none;
        }

        .phase-modal::-webkit-scrollbar {
          display: none;
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

        .phase-modal-top {
          padding-right: 38px;
        }

        .phase-modal-top h2 {
          margin: 16px 0 0;
          max-width: 340px;
          color: #ffffff;
          font-size: clamp(30px, 7vw, 34px);
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
          white-space: nowrap;
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
          gap: 14px;
          color: #ffffff;
          cursor: pointer;
          box-shadow:
            0 18px 54px rgba(14, 165, 233, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          transition: 160ms ease;
          text-align: left;
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
          font-size: clamp(27px, 8vw, 32px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.12em;
          word-break: break-word;
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
          font-size: clamp(23px, 6vw, 25px);
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
          pointer-events: none;
        }

        .phase-input input {
          width: 100%;
          min-height: 52px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          padding: 0 16px 0 42px;
          font-size: 16px;
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
          font-size: clamp(30px, 7vw, 34px);
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
          gap: 14px;
          cursor: pointer;
          box-shadow:
            0 18px 54px rgba(14, 165, 233, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          transition: 160ms ease;
          text-align: left;
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
          font-size: clamp(28px, 8vw, 34px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.12em;
          word-break: break-word;
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
          min-width: 0;
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
          word-break: break-word;
        }

        .phase-secondary-code button {
          flex: 0 0 auto;
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

        .phase-success-note {
          margin-top: 10px !important;
          color: #64748b !important;
          font-size: 10px !important;
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
          .phase-saved-tab {
            right: max(12px, env(safe-area-inset-right));
            bottom: max(14px, env(safe-area-inset-bottom));
            width: 66px;
            height: 42px;
          }

          .phase-saved-tab-main {
            font-size: 17px;
          }

          .phase-modal-overlay {
            align-items: flex-end;
            padding: 10px;
          }

          .phase-modal {
            width: 100%;
            max-height: calc(100svh - 20px);
            border-radius: 24px;
          }

          .phase-modal-inner,
          .phase-success-v2 {
            padding: 24px 18px 18px;
          }

          .phase-modal-top {
            padding-right: 34px;
          }

          .phase-code-box,
          .phase-main-code {
            border-radius: 19px;
            padding: 15px;
          }

          .phase-copy-circle,
          .phase-main-code-icon {
            width: 38px;
            height: 38px;
          }

          .phase-secondary-code {
            align-items: flex-start;
          }
        }

        @media (max-width: 380px) {
          .phase-saved-tab {
            width: 60px;
            height: 40px;
          }

          .phase-saved-tab-main {
            font-size: 16px;
          }

          .phase-saved-tab-text {
            font-size: 8px;
          }

          .phase-modal-overlay {
            padding: 8px;
          }

          .phase-modal {
            max-height: calc(100svh - 16px);
            border-radius: 22px;
          }

          .phase-modal-inner,
          .phase-success-v2 {
            padding: 22px 15px 15px;
          }

          .phase-modal-top h2,
          .phase-success-v2 h2 {
            font-size: 28px;
          }

          .phase-code-box strong,
          .phase-main-code strong {
            font-size: 25px;
            letter-spacing: 0.1em;
          }

          .phase-secondary-code {
            flex-direction: column;
            gap: 9px;
          }

          .phase-secondary-code button {
            width: 100%;
          }
        }
      `}</style>
    </>,
    document.body
  );
}