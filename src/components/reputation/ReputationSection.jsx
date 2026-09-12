import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, PenLine, Star, X } from "lucide-react";
import { normalizeReputationPayload } from "../../lib/reputationModel.js";
import "./ReputationSection.styles.css";

const TRUSTPILOT_WIDGET_SCRIPT =
  "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";

let trustpilotScriptPromise = null;

function loadTrustpilotScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.Trustpilot) return Promise.resolve(window.Trustpilot);
  if (trustpilotScriptPromise) return trustpilotScriptPromise;

  trustpilotScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TRUSTPILOT_WIDGET_SCRIPT}"]`);
    const script = existing || document.createElement("script");

    script.addEventListener("load", () => resolve(window.Trustpilot), { once: true });
    script.addEventListener("error", () => reject(new Error("Trustpilot widget unavailable")), {
      once: true,
    });

    if (!existing) {
      script.src = TRUSTPILOT_WIDGET_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    trustpilotScriptPromise = null;
    throw error;
  });

  return trustpilotScriptPromise;
}

function TrustpilotWidget({ config }) {
  const elementRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadTrustpilotScript()
      .then((trustpilot) => {
        if (active && elementRef.current && trustpilot?.loadFromElement) {
          trustpilot.loadFromElement(elementRef.current, true);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [config.businessUnitId, config.templateId]);

  return (
    <div
      ref={elementRef}
      className="trustpilot-widget reputation-dock__trustbox"
      data-locale={config.locale}
      data-template-id={config.templateId}
      data-businessunit-id={config.businessUnitId}
      data-style-height={config.height}
      data-style-width="100%"
      data-theme={config.theme}
    >
      <a href="https://www.trustpilot.com/" target="_blank" rel="noopener noreferrer">
        Trustpilot
      </a>
    </div>
  );
}

function SourceStanding({ source }) {
  if (source.rating !== null && source.reviewCount !== null) {
    return (
      <div
        className="reputation-dock__metrics"
        aria-label={`${source.rating} out of 5 from ${source.reviewCount} reviews`}
      >
        <strong>{source.rating.toFixed(1)}</strong>
        <span>/ 5</span>
        <small>{new Intl.NumberFormat("en-US").format(source.reviewCount)} reviews</small>
      </div>
    );
  }

  if (source.widget) return <TrustpilotWidget config={source.widget} />;

  return (
    <p className="reputation-dock__source-note">
      {source.status === "stale" || source.status === "unavailable"
        ? "Live figures are temporarily unavailable."
        : "View verified feedback at the source."}
    </p>
  );
}

function ReputationSource({ source }) {
  return (
    <article className="reputation-dock__source">
      <header className="reputation-dock__source-header">
        <span className={`reputation-dock__mark is-${source.provider}`} aria-hidden="true">
          {source.logo ? (
            <img src={source.logo} alt="" loading="lazy" decoding="async" />
          ) : (
            <Star size={15} fill="currentColor" />
          )}
        </span>
        <div>
          <h3>{source.name}</h3>
          <p>{source.type}</p>
        </div>
      </header>

      <SourceStanding source={source} />

      <div className="reputation-dock__actions">
        <a href={source.publicUrl} target="_blank" rel="noopener noreferrer">
          Read reviews <ArrowUpRight size={13} aria-hidden="true" />
        </a>
        {source.leaveReviewUrl && (
          <a className="is-secondary" href={source.leaveReviewUrl} target="_blank" rel="noopener noreferrer">
            <PenLine size={12} aria-hidden="true" /> Leave a review
          </a>
        )}
      </div>
    </article>
  );
}

export default function ReputationSection() {
  const dockRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/reputation", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Reputation unavailable");
        const nextPayload = normalizeReputationPayload(await response.json());
        if (active) setPayload(nextPayload);
      } catch {
        if (active) setPayload(normalizeReputationPayload({ sources: [] }));
      }
    };

    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(load, { timeout: 1800 })
      : window.setTimeout(load, 500);

    return () => {
      active = false;
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const closeFromOutside = (event) => {
      if (!dockRef.current?.contains(event.target)) setOpen(false);
    };
    const closeFromKeyboard = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeForCart = (event) => {
      if (event.detail?.open) setOpen(false);
    };

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    window.addEventListener("phase-cart-state", closeForCart);

    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
      window.removeEventListener("phase-cart-state", closeForCart);
    };
  }, [open]);

  const sources = payload?.sources || [];
  const ratedSources = sources.filter(
    (source) => source.rating !== null && source.reviewCount !== null,
  );
  const tabSources = ratedSources.length ? ratedSources : sources;
  const activeTabSource = tabSources.length
    ? tabSources[activeSourceIndex % tabSources.length]
    : null;

  useEffect(() => {
    if (open || tabSources.length < 2) return undefined;

    const rotationTimer = window.setInterval(() => {
      setActiveSourceIndex((current) => (current + 1) % tabSources.length);
    }, 4400);

    return () => window.clearInterval(rotationTimer);
  }, [open, tabSources.length]);

  if (!sources.length) return null;

  const openFromHover = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen(true);
  };
  const closeFromHover = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setOpen(false);
  };

  return (
    <aside
      ref={dockRef}
      className={`phase-reputation-dock${open ? " is-open" : ""}`}
      aria-label="Independent customer reviews"
      onMouseEnter={openFromHover}
      onMouseLeave={closeFromHover}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div id="phase-reputation-panel" className="reputation-dock__panel" aria-hidden={!open}>
        <header className="reputation-dock__header">
          <div>
            <p>Customer confidence</p>
            <h2>Independent reviews</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close reviews panel">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="reputation-dock__sources">
          {open && sources.map((source) => <ReputationSource key={source.provider} source={source} />)}
        </div>

        <p className="reputation-dock__disclosure">
          Scores remain attached to their original source and are never combined.
        </p>
      </div>

      <button
        type="button"
        className="reputation-dock__tab"
        aria-expanded={open}
        aria-controls="phase-reputation-panel"
        aria-label={open ? "Close customer reviews" : `Open ${activeTabSource?.name || "customer"} reviews`}
        onClick={() => setOpen((current) => !current)}
      >
        <Star size={16} fill="currentColor" aria-hidden="true" />
        <span
          key={`${activeTabSource?.provider || "reviews"}-${activeSourceIndex}`}
          className="reputation-dock__tab-summary"
        >
          <strong>{activeTabSource?.name || "Reviews"}</strong>
          {activeTabSource?.rating !== null && activeTabSource?.reviewCount !== null ? (
            <small>
              <b>{activeTabSource.rating.toFixed(1)}</b> / 5 · {new Intl.NumberFormat("en-US").format(activeTabSource.reviewCount)} reviews
            </small>
          ) : (
            <small>Independent reviews</small>
          )}
        </span>
        <ChevronLeft className="reputation-dock__chevron" size={14} aria-hidden="true" />
      </button>
    </aside>
  );
}
