import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { formatCoaDate } from "../../lib/coaModel.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export default function CoaCertificateViewer({ record, productName, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.("change", update);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter(
        (element) => !element.hasAttribute("disabled")
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
      media.removeEventListener?.("change", update);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  if (!record) return null;
  const documentRecord = record.document || {};
  const title = `${productName || record.product.name} — ${record.batch || "COA"}`;
  const canPreviewPdf = documentRecord.kind === "pdf" && !compact;
  const canPreviewImage = documentRecord.kind === "image";

  return (
    <div
      className="coa-viewer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="coa-viewer__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coa-viewer-title"
      >
        <header className="coa-viewer__header">
          <div>
            <span>Certificate record</span>
            <h2 id="coa-viewer-title">{title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="coa-viewer__close"
            onClick={onClose}
            aria-label="Close certificate viewer"
          >
            <X size={19} />
          </button>
        </header>

        <div className="coa-viewer__facts" aria-label="Certificate details">
          <div>
            <span>Batch / lot</span>
            <strong>{record.batch || "Not reported"}</strong>
          </div>
          <div>
            <span>Testing date</span>
            <strong>{formatCoaDate(record.testingDate)}</strong>
          </div>
          <div>
            <span>Primary result</span>
            <strong>{record.purity || "See COA"}</strong>
          </div>
          <div>
            <span>Laboratory</span>
            <strong>{record.laboratory || "Not reported"}</strong>
          </div>
        </div>

        <div className="coa-viewer__actions">
          {documentRecord.viewUrl ? (
            <a
              href={documentRecord.viewUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={15} /> Open certificate
            </a>
          ) : null}
          {documentRecord.downloadUrl ? (
            <a
              href={documentRecord.downloadUrl}
              target="_blank"
              rel="noreferrer noopener"
              download
            >
              <Download size={15} /> Download PDF
            </a>
          ) : null}
          {documentRecord.verificationUrl ? (
            <a
              href={documentRecord.verificationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="is-secondary"
            >
              Laboratory source <ExternalLink size={14} />
            </a>
          ) : null}
        </div>

        <div className="coa-viewer__content">
          {canPreviewPdf ? (
            <iframe
              src={`${documentRecord.previewUrl}#toolbar=1&navpanes=0&view=FitH`}
              title={`${title} PDF`}
              className="coa-viewer__pdf"
            />
          ) : canPreviewImage ? (
            <img
              src={documentRecord.previewUrl}
              alt={`${title} certificate`}
              className="coa-viewer__image"
            />
          ) : (
            <div className="coa-viewer__handoff">
              <FileText size={30} aria-hidden="true" />
              <h3>
                {documentRecord.kind === "external"
                  ? "External laboratory certificate"
                  : "Open the PDF in your browser"}
              </h3>
              <p>
                {documentRecord.kind === "external"
                  ? "This record is hosted by the laboratory verifier and cannot be embedded safely."
                  : "The mobile view keeps the product and batch details visible before opening the full document."}
              </p>
              {documentRecord.viewUrl ? (
                <a
                  href={documentRecord.viewUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open certificate <ExternalLink size={15} />
                </a>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
