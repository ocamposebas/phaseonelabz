import "./pop.styles.css";
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
    </>,
    document.body
  );
}