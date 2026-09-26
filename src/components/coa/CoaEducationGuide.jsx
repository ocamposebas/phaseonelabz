import "./coa-education-guide.css";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ExternalLink,
  FileSearch,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { formatCoaDate, getCoaTestingPanel } from "../../lib/coaModel.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const NOOP = () => {};

function cleanText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function compactList(values, maximum = 4) {
  const items = Array.isArray(values)
    ? values.map((value) => cleanText(value)).filter(Boolean)
    : [];

  if (items.length <= maximum) return items.join(" · ");
  return `${items.slice(0, maximum).join(" · ")} +${items.length - maximum}`;
}

export function buildCoaGuideFields(record = {}, productName = "") {
  const panel = getCoaTestingPanel(record || {});
  const reportedAssays = Array.isArray(record?.assays) && record.assays.length
    ? record.assays.map((assay) => cleanText(assay)).filter(Boolean)
    : [];
  const assays = panel?.assays?.length ? panel.assays : reportedAssays;
  const identity = cleanText(
    productName || record?.product?.name || record?.product?.familyName,
    "See issued certificate",
  );
  const batch = cleanText(record?.batch, "See issued certificate");
  const purity = cleanText(record?.purity, "See issued certificate");
  const method = cleanText(record?.method, "Method shown on certificate");
  const testSummary = panel?.label ||
    (assays.length
      ? `${assays.length} reported test${assays.length === 1 ? "" : "s"}`
      : method);
  const laboratory = cleanText(record?.laboratory, "See issuing laboratory");
  const testingDate = formatCoaDate(record?.testingDate, "Date shown on certificate");
  const coaNumber = cleanText(record?.coaNumber, "COA number shown on certificate");

  return [
    {
      id: "identity",
      mapLabel: "PRODUCT / IDENTITY",
      title: "Confirm the compound identity.",
      value: identity,
      detail: cleanText(record?.product?.strength),
      description:
        "Find the product name or declared identity near the top of the issued certificate.",
      check: "It must describe the same compound and presentation you selected.",
      Icon: FlaskConical,
    },
    {
      id: "batch",
      mapLabel: "BATCH / LOT",
      title: "Match the batch exactly.",
      value: batch,
      detail: "Compare every letter and number",
      description:
        "Locate the lot or batch field. This connects the certificate to one production batch.",
      check: "A different lot means a different certificate, even when the product name matches.",
      Icon: Tag,
    },
    {
      id: "purity",
      mapLabel: "PURITY RESULT",
      title: "Read the reported purity.",
      value: purity,
      detail: method,
      description:
        "Read the result and its analytical method together. Purity is not the quantity in the vial.",
      check: "Use the result printed by the laboratory; do not infer a value from the product label.",
      Icon: FileSearch,
    },
    {
      id: "tests",
      mapLabel: "TESTING PANEL",
      title: "Review what was actually tested.",
      value: testSummary,
      detail: compactList(assays) || method,
      description:
        "The testing section lists the analyses included in this specific certificate.",
      check: "Only treat a test as completed when it appears in the issued COA.",
      items: assays,
      Icon: Microscope,
    },
    {
      id: "verification",
      mapLabel: "ISSUER / DATE",
      title: "Verify the issuing record.",
      value: laboratory,
      detail: `${testingDate} · ${coaNumber}`,
      description:
        "Finish by checking the laboratory, analysis date and certificate identifier.",
      check: "Open the original document for signatures, methods and complete laboratory details.",
      Icon: Building2,
    },
  ];
}

function CertificateMap({ activeIndex, fields, onSelect, record }) {
  const certificateNumber = cleanText(record?.coaNumber, "CERTIFICATE RECORD");

  return (
    <div className="coa-guide-map" aria-label="Interactive map of the selected COA">
      <header className="coa-guide-map__header">
        <div>
          <span>Certificate of Analysis</span>
          <strong>{certificateNumber}</strong>
        </div>
        <ShieldCheck size={24} aria-hidden="true" />
      </header>

      <div className="coa-guide-map__rule" />

      <div className="coa-guide-map__fields">
        {fields.map((field, index) => {
          const active = index === activeIndex;

          return (
            <button
              key={field.id}
              type="button"
              className={`coa-guide-map__field ${active ? "is-active" : ""}`}
              aria-current={active ? "step" : undefined}
              aria-label={`Show field ${index + 1}: ${field.mapLabel}`}
              onClick={() => onSelect(index)}
            >
              <span className="coa-guide-map__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="coa-guide-map__copy">
                <small>{field.mapLabel}</small>
                <strong>{field.value}</strong>
                {field.detail ? <em>{field.detail}</em> : null}
              </span>
              <span className="coa-guide-map__target" aria-hidden={!active}>
                <ArrowLeft size={14} /> Look here
              </span>
            </button>
          );
        })}
      </div>

      <footer className="coa-guide-map__footer">
        <span><Check size={13} /> Selected COA data</span>
        <small>Compare each highlighted field with the original document.</small>
      </footer>
    </div>
  );
}

function FieldTabs({ activeIndex, fields, onSelect }) {
  return (
    <nav className="coa-guide-tabs" aria-label="COA fields">
      {fields.map((field, index) => {
        const Icon = field.Icon;
        return (
          <button
            key={field.id}
            type="button"
            aria-current={index === activeIndex ? "step" : undefined}
            aria-label={`Field ${index + 1}: ${field.mapLabel}`}
            onClick={() => onSelect(index)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function CoaEducationGuide({
  initialStep = 0,
  onClose = NOOP,
  onOpenCertificate,
  productName,
  record = {},
}) {
  const fields = useMemo(
    () => buildCoaGuideFields(record, productName),
    [productName, record],
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const requested = Number(initialStep);
    return Number.isFinite(requested)
      ? Math.max(0, Math.min(fields.length - 1, Math.trunc(requested)))
      : 0;
  });
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const activeField = fields[activeIndex];
  const ActiveIcon = activeField.Icon;
  const documentUrl = record?.document?.viewUrl || "";
  const progress = ((activeIndex + 1) / fields.length) * 100;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("coa-education-open");
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(fields.length - 1, current + 1));
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (!focusable.length) return;
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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("coa-education-open");
      restoreFocusRef.current?.focus?.();
    };
  }, [fields.length]);

  const moveTo = (index) => {
    setActiveIndex(Math.max(0, Math.min(fields.length - 1, index)));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="coa-guide"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="coa-guide__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="coa-guide__header">
          <div className="coa-guide__brand">
            <span><FileSearch size={19} aria-hidden="true" /></span>
            <div>
              <strong>COA FIELD GUIDE</strong>
              <small>{cleanText(productName || record?.product?.name, "Selected certificate")}</small>
            </div>
          </div>

          <div className="coa-guide__progress" aria-label={`Field ${activeIndex + 1} of ${fields.length}`}>
            <span>Field {activeIndex + 1} of {fields.length}</span>
            <i><b style={{ width: `${progress}%` }} /></i>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="coa-guide__close"
            onClick={onClose}
            aria-label="Close COA field guide"
          >
            <X size={19} />
          </button>
        </header>

        <div className="coa-guide__body">
          <section className="coa-guide__visual" aria-label="Highlighted certificate field">
            <div className="coa-guide__visual-heading">
              <div>
                <span>INTERACTIVE CERTIFICATE MAP</span>
                <strong>The cyan frame is the field to check now.</strong>
              </div>
              <span className="coa-guide__live"><i /> Selected record</span>
            </div>

            <CertificateMap
              activeIndex={activeIndex}
              fields={fields}
              onSelect={moveTo}
              record={record}
            />
          </section>

          <aside className="coa-guide__lesson" aria-live="polite">
            <FieldTabs activeIndex={activeIndex} fields={fields} onSelect={moveTo} />

            <div className="coa-guide__lesson-step" key={activeField.id}>
              <div className="coa-guide__lesson-index">
                <span><ActiveIcon size={18} aria-hidden="true" /></span>
                <small>{activeField.mapLabel}</small>
              </div>

              <h2 id={titleId}>{activeField.title}</h2>
              <p id={descriptionId}>{activeField.description}</p>

              <div className="coa-guide__expected">
                <small>CHECK THIS FIELD</small>
                <strong>{activeField.value}</strong>
                {activeField.detail ? <span>{activeField.detail}</span> : null}
              </div>

              <div className="coa-guide__check">
                <Check size={15} aria-hidden="true" />
                <p>{activeField.check}</p>
              </div>

              {activeField.id === "tests" && activeField.items?.length ? (
                <ul className="coa-guide__tests" aria-label="Reported tests">
                  {activeField.items.slice(0, 6).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </aside>
        </div>

        <footer className="coa-guide__footer">
          <div className="coa-guide__original">
            {documentUrl ? (
              onOpenCertificate ? (
                <button type="button" onClick={() => onOpenCertificate(record)}>
                  <ExternalLink size={15} /> Open original COA
                </button>
              ) : (
                <a href={documentUrl} target="_blank" rel="noreferrer noopener">
                  <ExternalLink size={15} /> Open original COA
                </a>
              )
            ) : (
              <span>Original document unavailable</span>
            )}
          </div>

          <div className="coa-guide__navigation">
            <button
              type="button"
              className="coa-guide__back"
              onClick={() => moveTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous COA field"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              className="coa-guide__next"
              onClick={() => {
                if (activeIndex === fields.length - 1) onClose();
                else moveTo(activeIndex + 1);
              }}
            >
              {activeIndex === fields.length - 1 ? "Done" : "Next field"}
              {activeIndex === fields.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
