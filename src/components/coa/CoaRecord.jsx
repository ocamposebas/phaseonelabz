import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  FileText,
  FlaskConical,
} from "lucide-react";
import {
  findPreferredCoaRecord,
  formatCoaDate,
  getCoaTestingPanel,
} from "../../lib/coaModel.js";
import CoaBatchHistory from "./CoaBatchHistory.jsx";

function CertificateAction({ record, onView }) {
  const documentRecord = record.document || {};
  if (!documentRecord.viewUrl) {
    return <span className="coa-family__certificate is-disabled">Certificate pending</span>;
  }

  if (documentRecord.kind === "external") {
    return (
      <a
        className="coa-family__certificate"
        href={documentRecord.viewUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        Open certificate <ExternalLink size={15} />
      </a>
    );
  }

  return (
    <button
      type="button"
      className="coa-family__certificate"
      onClick={() => onView(record)}
    >
      View certificate <FileText size={15} />
    </button>
  );
}

function presentationLabel(presentation, index) {
  return presentation.strength || presentation.skus?.[0] || `Option ${index + 1}`;
}

export default function CoaRecord({
  family,
  presentations,
  preferredPresentation,
  query,
  filter,
  onView,
}) {
  const [presentationKey, setPresentationKey] = useState(
    preferredPresentation?.key || presentations[0]?.key || ""
  );
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    setPresentationKey(preferredPresentation?.key || presentations[0]?.key || "");
  }, [preferredPresentation?.key, presentations]);

  const presentation = useMemo(
    () =>
      presentations.find((item) => item.key === presentationKey) ||
      preferredPresentation ||
      presentations[0],
    [presentationKey, preferredPresentation, presentations]
  );

  const preferredRecord = useMemo(
    () => findPreferredCoaRecord(presentation, query, filter),
    [filter, presentation, query]
  );

  useEffect(() => {
    setSelectedRecordId(preferredRecord?.id || presentation?.records?.[0]?.id || "");
  }, [preferredRecord?.id, presentation?.key]);

  const selectedRecord = useMemo(
    () =>
      presentation?.records?.find((record) => record.id === selectedRecordId) ||
      preferredRecord ||
      presentation?.records?.[0],
    [presentation, preferredRecord, selectedRecordId]
  );

  if (!presentation || !selectedRecord) return null;

  const image = selectedRecord.product.image || presentation.image || family.image || {};
  const testingPanel = getCoaTestingPanel(selectedRecord);
  const displayedAssays = testingPanel?.assays || selectedRecord.assays;
  const canCopyBatch =
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);
  const detailsAvailable = Boolean(
    selectedRecord.laboratory ||
      selectedRecord.method ||
      selectedRecord.assays.length ||
      selectedRecord.coaNumber ||
      presentation.records.length > 1
  );

  const choosePresentation = (nextPresentation) => {
    setPresentationKey(nextPresentation.key);
    setSelectedRecordId(
      findPreferredCoaRecord(nextPresentation, "", filter)?.id ||
        nextPresentation.records?.[0]?.id ||
        ""
    );
    setExpanded(false);
  };

  const copyBatch = async () => {
    if (!selectedRecord.batch || !canCopyBatch) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.batch);
      setCopyState("copied");
    } catch {
      setCopyState("unavailable");
    }
    window.setTimeout(() => setCopyState("idle"), 1400);
  };

  return (
    <article className="coa-family">
      <header className="coa-family__header">
        <figure className="coa-family__photo">
          {image.src ? (
            <img
              src={image.src}
              srcSet={image.srcSet || undefined}
              sizes="(max-width: 700px) 64px, 76px"
              alt={image.alt || family.name}
              width="76"
              height="76"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <FlaskConical size={25} aria-hidden="true" />
          )}
        </figure>

        <div className="coa-family__identity">
          <span>{family.category || "Laboratory archive"}</span>
          <h2>{family.name}</h2>
          <p>{family.presentations.length} available presentation{family.presentations.length === 1 ? "" : "s"}</p>
        </div>

        <p className={`coa-family__lot-state ${selectedRecord.isCurrentShippingLot ? "is-current" : ""}`}>
          {selectedRecord.isCurrentShippingLot ? "Current shipping lot" : "Historical lot"}
        </p>
      </header>

      <div className="coa-family__presentations" aria-label={`${family.name} presentations`}>
        <span className="coa-family__selector-label">Presentation index</span>
        <div>
          {presentations.map((item, index) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === presentation.key}
              onClick={() => choosePresentation(item)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{presentationLabel(item, index)}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="coa-family__analysis">
        <div className="coa-family__record-line">
          <span>Selected certificate</span>
          <strong>{selectedRecord.coaNumber || "Certificate record"}</strong>
        </div>
        <div className="coa-family__result">
          <span>Primary result</span>
          <strong>{selectedRecord.purity || "—"}</strong>
          <small>{selectedRecord.purity ? "Purity" : "See certificate"}</small>
        </div>

        <dl className="coa-family__trace">
          <div>
            <dt>Batch / lot</dt>
            <dd>
              <strong>{selectedRecord.batch || "Not reported"}</strong>
              {selectedRecord.batch && canCopyBatch ? (
                <button
                  type="button"
                  onClick={copyBatch}
                  aria-label={`Copy batch ${selectedRecord.batch}`}
                >
                  {copyState === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                  <span>{copyState === "copied" ? "Copied" : "Copy"}</span>
                </button>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Testing date</dt>
            <dd>{formatCoaDate(selectedRecord.testingDate)}</dd>
          </div>
        </dl>

        {displayedAssays.length ? (
          <section className="coa-family__tests">
            <div className="coa-family__tests-heading">
              <span>Tests performed</span>
              {testingPanel ? (
                <strong className={`coa-family__testing-tag is-${testingPanel.type}`}>
                  {testingPanel.label}
                </strong>
              ) : null}
            </div>
            <ul>
              {displayedAssays.map((assay) => (
                <li key={assay}>
                  <Check size={13} aria-hidden="true" />
                  <span>{assay}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="coa-family__tests-empty">Test details are available in the certificate.</p>
        )}

        <CertificateAction record={selectedRecord} onView={onView} />
      </div>

      {detailsAvailable ? (
        <footer className="coa-family__footer">
          <button
            type="button"
            className="coa-family__expand"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <span>
              {presentation.records.length > 1
                ? `Details & batch history (${presentation.records.length})`
                : "Certificate details"}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>

          {expanded ? (
            <div className="coa-family__details">
              <dl className="coa-family__metadata">
                <div>
                  <dt>Laboratory</dt>
                  <dd>{selectedRecord.laboratory || "Not reported"}</dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{selectedRecord.method || "See COA"}</dd>
                </div>
                <div>
                  <dt>COA number</dt>
                  <dd>{selectedRecord.coaNumber || "Not reported"}</dd>
                </div>
              </dl>
              <CoaBatchHistory
                records={presentation.records}
                selectedId={selectedRecord.id}
                onSelect={setSelectedRecordId}
              />
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
