import "./coa-education-guide.css";

import {
  useCallback,
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  LoaderCircle,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { findCoaForWooProduct } from "../../lib/coaModel.js";

const loadCoaPdfCanvas = () => import("./CoaPdfCanvas.jsx");
const CoaPdfCanvas = lazy(loadCoaPdfCanvas);

const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const NOOP = () => {};
const QR_IMAGE = "/coa-guide/vial-qr-cutout.webp";
const BATCH_IMAGE = "/coa-guide/vial-batch-cutout.webp";
const DOCUMENT_STEP_IDS = new Set(["identity", "purity", "tests"]);
const AUTO_STEP_MS = Object.freeze({
  product: 4_200,
  qr: 5_400,
  batch: 5_400,
  identity: 6_000,
  purity: 6_000,
  tests: 8_000,
});

let catalogRequest;
let catalogRequestExpiresAt = 0;

const STEPS = [
  {
    id: "product",
    number: "01",
    eyebrow: "Your selection",
    title: "This is your product.",
    body: "Start with the exact vial you selected. Every check that follows belongs to this product.",
    cue: "Confirm the name and presentation.",
    navLabel: "Product",
    navHint: "Selected vial",
    Icon: FlaskConical,
  },
  {
    id: "qr",
    number: "02",
    eyebrow: "On the vial",
    title: "Find the QR.",
    body: "Use the code on the back to open the matching laboratory record.",
    cue: "The sample QR stays partly hidden.",
    navLabel: "QR code",
    navHint: "Open record",
    Icon: QrCode,
  },
  {
    id: "batch",
    number: "03",
    eyebrow: "Traceability",
    title: "Match the batch.",
    body: "The vial and the COA must show the same batch, character for character.",
    cue: "A different batch means a different record.",
    navLabel: "Batch",
    navHint: "Match lot",
    Icon: ScanLine,
  },
  {
    id: "identity",
    number: "04",
    eyebrow: "Matching COA",
    title: "Find the compound name.",
    body: "The name printed on the COA must match the vial you selected.",
    cue: "The frame marks the exact text.",
    navLabel: "Name",
    navHint: "Confirm compound",
    Icon: FileCheck2,
  },
  {
    id: "purity",
    number: "05",
    eyebrow: "Analytical result",
    title: "Find the purity result.",
    body: "Read the reported value together with the analytical method.",
    cue: "Purity is not the vial quantity.",
    navLabel: "Purity",
    navHint: "Read assay",
    Icon: Sparkles,
  },
  {
    id: "tests",
    number: "06",
    eyebrow: "Complete test tour",
    title: "See every test performed.",
    body: "The marker moves only through tests explicitly reported in this COA.",
    cue: "Follow each reported test on the document.",
    navLabel: "Tests",
    navHint: "Review panel",
    Icon: ShieldCheck,
  },
];

function cleanLabel(value, fallback = "") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function positiveNumber(...values) {
  for (const value of values) {
    const number = Number(value || 0);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function strengthFromName(value) {
  const match = cleanLabel(value).match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml)\b/i);
  return match?.[0] || "";
}

function loadCoaCatalog() {
  const now = Date.now();
  if (!catalogRequest || now >= catalogRequestExpiresAt) {
    const request = fetch("/api/coas", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "The COA catalog could not be loaded.");
        }
        return Array.isArray(payload?.records) ? payload.records : [];
      })
      .catch((error) => {
        if (catalogRequest === request) {
          catalogRequest = null;
          catalogRequestExpiresAt = 0;
        }
        throw error;
      });
    catalogRequest = request;
    catalogRequestExpiresAt = now + 60_000;
  }
  return catalogRequest;
}

function warmCoaDocument(record = {}, productName = "") {
  const documentRecord = record?.document || {};
  if (typeof window === "undefined" || documentRecord.kind !== "pdf") return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return;

  const sourceUrl = documentRecord.previewUrl || documentRecord.viewUrl || "";
  if (!sourceUrl) return;
  const laboratoryUrl = documentRecord.verificationUrl || "";

  loadCoaPdfCanvas()
    .then((module) =>
      module.preloadPreparedCoa?.({
        sourceUrl,
        fallbackSourceUrl: laboratoryUrl,
        productName,
        batch: record.batch || "",
        purity: record.purity || "",
      }),
    )
    .catch(NOOP);
}

function resolveRecordForProduct(records, product, productName) {
  if (!product || !Array.isArray(records)) return null;

  const productId = positiveNumber(product.id, product.product_id, product.productId);
  const parentProductId = positiveNumber(
    product.parent_id,
    product.parentId,
    product.parent,
  );
  const variationId = positiveNumber(
    product.variation_id,
    product.variationId,
    product.selectedVariationId,
  );
  const strength =
    cleanLabel(product.selectedOption || product.strength) ||
    strengthFromName(productName || product.name);

  const exact = findCoaForWooProduct({
    records,
    productId,
    parentProductId,
    variationId,
    productSku: cleanLabel(product.sku),
    variationSku: cleanLabel(product.variationSku),
    strength,
    currentOnly: true,
  });
  if (exact) return exact;

  const candidateIds = new Set([productId, parentProductId].filter(Boolean));
  const productSku = cleanLabel(product.sku).toLowerCase();
  const candidates = records.filter((item) => {
    if (!item?.isCurrentShippingLot) return false;
    const identity = item.product || {};
    const ids = [
      identity.matchedProductId,
      ...(identity.productIds || []),
      ...(identity.parentProductIds || []),
    ].map(Number);
    const idMatch = ids.some((id) => candidateIds.has(id));
    const skuMatch = productSku
      ? (identity.skus || []).some(
          (sku) => cleanLabel(sku).toLowerCase() === productSku,
        )
      : false;
    return idMatch || skuMatch;
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function resolveProductImage(productImage, record, product, productName) {
  const supplied =
    typeof productImage === "string" ? { src: productImage } : productImage || {};
  const recordImage = record?.product?.image || {};
  const firstProductImage = product?.images?.[0] || {};
  return {
    src:
      supplied.src ||
      supplied.fullSrc ||
      recordImage.fullSrc ||
      recordImage.src ||
      firstProductImage.src ||
      firstProductImage.url ||
      product?.image ||
      product?.featuredImage ||
      "",
    srcSet: supplied.srcSet || recordImage.srcSet || "",
    sizes: supplied.sizes || recordImage.sizes || "",
    alt:
      cleanLabel(supplied.alt || recordImage.alt || firstProductImage.alt) ||
      `${productName} product`,
  };
}

function ScientificPrism({ variant = "product" }) {
  return (
    <svg
      className={`coa-guide-prism is-${variant}`}
      viewBox="0 0 640 520"
      aria-hidden="true"
      focusable="false"
    >
      <path className="coa-guide-prism__surface" d="M320 28 590 468 50 468Z" />
      <path className="coa-guide-prism__edge" d="M320 28 590 468 50 468Z" />
      <path className="coa-guide-prism__inner" d="M320 108 512 424 128 424Z" />
      <path className="coa-guide-prism__axis" d="M320 28v396M50 468l270-44 270 44" />
      <path className="coa-guide-prism__facet" d="m320 108-96 158 96 158 96-158Z" />
      <circle className="coa-guide-prism__node node-a" cx="320" cy="28" r="4" />
      <circle className="coa-guide-prism__node node-b" cx="50" cy="468" r="4" />
      <circle className="coa-guide-prism__node node-c" cx="590" cy="468" r="4" />
      <path className="coa-guide-prism__scan" d="M142 318h356" />
    </svg>
  );
}

function ProductStage({ image, name }) {
  const [failed, setFailed] = useState(false);
  const printedName = cleanLabel(name)
    .replace(/\s*[-·|]\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml)\b.*$/i, "")
    .trim();
  const nameFit =
    printedName.length <= 8 ? "short" : printedName.length <= 14 ? "medium" : "long";

  useEffect(() => setFailed(false), [image.src]);

  return (
    <div className="coa-guide-product-stage" data-name-fit={nameFit}>
      <ScientificPrism variant="product" />
      <div className="coa-guide-product-media">
        {image.src && !failed ? (
          <img
            src={image.src}
            srcSet={image.srcSet || undefined}
            sizes={image.sizes || undefined}
            alt={image.alt}
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="coa-guide-product-fallback" role="img" aria-label={image.alt}>
            <FlaskConical size={62} />
          </div>
        )}
        <span className="coa-guide-product-target" aria-hidden="true" />
        <div className="coa-guide-product-label" aria-hidden="true">
          <small>01 / PRODUCT ID</small>
          <strong>{name}</strong>
          <span>Printed product name</span>
        </div>
      </div>
      <div className="coa-guide-platform" aria-hidden="true" />
    </div>
  );
}

function VialStage({ onInspect, type }) {
  const isQr = type === "qr";
  const [inspected, setInspected] = useState(false);

  useEffect(() => setInspected(false), [type]);

  return (
    <div
      className={`coa-guide-vial-stage is-${type} ${inspected ? "is-inspected" : ""}`}
      data-vial-face={type}
    >
      <ScientificPrism variant={type} />
      <div className="coa-guide-vial-media">
        <div className="coa-guide-vial-turntable">
          <img
            className={`coa-guide-vial-face is-qr ${isQr ? "is-active" : ""}`}
            src={QR_IMAGE}
            alt="Back of a real vial with the QR code intentionally obscured"
            aria-hidden={!isQr}
            width="900"
            height="900"
            decoding="async"
            loading="eager"
          />
          <img
            className={`coa-guide-vial-face is-batch ${!isQr ? "is-active" : ""}`}
            src={BATCH_IMAGE}
            alt="Front of a real vial with the batch value intentionally redacted"
            aria-hidden={isQr}
            width="900"
            height="900"
            decoding="async"
            loading="eager"
          />
          <span className="coa-guide-vial-reflection" aria-hidden="true" />
        </div>
        <button
          type="button"
          className="coa-guide-vial-target"
          aria-label={
            inspected
              ? isQr
                ? "QR verification area highlighted"
                : "Batch area highlighted"
              : isQr
                ? "Inspect the verification QR area"
                : "Inspect the vial batch area"
          }
          aria-pressed={inspected}
          onClick={() => {
            setInspected((current) => {
              const next = !current;
              if (next) onInspect?.();
              return next;
            });
          }}
        >
          <span />
          <i />
        </button>
        <div className="coa-guide-vial-callout" aria-hidden="true">
          <small>{isQr ? "02 / VERIFICATION" : "03 / TRACEABILITY"}</small>
          <strong>{isQr ? "QR code" : "Batch number"}</strong>
          <span>
            {inspected
              ? "Area highlighted"
              : isQr
                ? "Tap to inspect"
                : "Tap to match"}
          </span>
        </div>
      </div>
      <span className="coa-guide-privacy-chip">
        <ShieldCheck size={13} /> Source image protected
      </span>
    </div>
  );
}

function CertificateUnavailable({ status, productName, url }) {
  const loading = status === "loading";
  return (
    <div className="coa-guide-document-state" role="status">
      <span>{loading ? <LoaderCircle className="is-spinning" /> : <FileCheck2 />}</span>
      <p>{loading ? "Matching certificate" : "Exact certificate required"}</p>
      <h3>
        {loading
          ? `Connecting ${productName} to its current COA...`
          : "Choose the exact presentation before reading its analysis."}
      </h3>
      <small>
        {loading
          ? "The product stays visible while the issued record is resolved."
          : "This product has more than one possible certificate, so the guide will not guess."}
      </small>
      {!loading && url ? (
        <a href={url} target="_blank" rel="noreferrer noopener">
          Open available record <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
}

function ExternalCertificateStage({ record, productName }) {
  const url = record?.document?.viewUrl || "";
  return (
    <div className="coa-guide-external-stage">
      <div className="coa-guide-external-sheet" aria-hidden="true">
        <span>LIVE RECORD</span>
        <FileCheck2 size={48} />
        <i />
        <i />
        <i />
      </div>
      <div>
        <small>External laboratory record</small>
        <h3>{productName}</h3>
        <dl>
          <div><dt>Batch</dt><dd>Protected in guide</dd></div>
          <div><dt>Purity</dt><dd>{record?.purity || "See record"}</dd></div>
          <div><dt>Method</dt><dd>{record?.method || "See record"}</dd></div>
        </dl>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer noopener">
            Open matching COA <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DocumentStage({ focusKey, onStatus, productName, record, status, vialImage }) {
  const documentRecord = record?.document || {};
  const sourceUrl = documentRecord.previewUrl || documentRecord.viewUrl || "";

  if (status !== "ready" || !record) {
    return (
      <CertificateUnavailable
        status={status}
        productName={productName}
        url={documentRecord.viewUrl}
      />
    );
  }

  if (documentRecord.kind === "pdf" && sourceUrl) {
    return (
      <Suspense
        fallback={
          <CertificateUnavailable status="loading" productName={productName} />
        }
      >
        <CoaPdfCanvas
          sourceUrl={sourceUrl}
          fallbackSourceUrl={documentRecord.verificationUrl || ""}
          focusKey={focusKey}
          productName={productName}
          batch={record.batch || ""}
          purity={record.purity || ""}
          vialImage={vialImage}
          onStatus={onStatus}
        />
      </Suspense>
    );
  }

  if (documentRecord.kind === "image" && sourceUrl) {
    return (
      <div className="coa-guide-image-document">
        <img src={sourceUrl} alt={`${productName} Certificate of Analysis`} />
        <span><ScanLine size={14} /> Read the highlighted field in the issued image</span>
      </div>
    );
  }

  return <ExternalCertificateStage record={record} productName={productName} />;
}

function GuideStage({ image, onDocumentStatus, onVialInspect, productName, record, status, step }) {
  const activeScene =
    step.id === "product"
      ? "product"
      : step.id === "qr" || step.id === "batch"
        ? "vial"
        : "document";
  const vialType = step.id === "batch" ? "batch" : "qr";
  const documentFocus = DOCUMENT_STEP_IDS.has(step.id) ? step.id : "identity";

  return (
    <div className="coa-guide-film" data-active-shot={activeScene}>
      <div
        className={`coa-guide-film__shot is-product ${activeScene === "product" ? "is-active" : ""}`}
        aria-hidden={activeScene !== "product"}
        inert={activeScene !== "product"}
      >
        <ProductStage image={image} name={productName} />
      </div>

      <div
        className={`coa-guide-film__shot is-vial ${activeScene === "vial" ? "is-active" : ""}`}
        aria-hidden={activeScene !== "vial"}
        inert={activeScene !== "vial"}
      >
        <VialStage onInspect={onVialInspect} type={vialType} />
      </div>

      <div
        className={`coa-guide-film__shot is-document ${activeScene === "document" ? "is-active" : ""}`}
        aria-hidden={activeScene !== "document"}
        inert={activeScene !== "document"}
      >
        <DocumentStage
          focusKey={documentFocus}
          onStatus={onDocumentStatus}
          productName={productName}
          record={record}
          status={status}
          vialImage={image}
        />
      </div>
    </div>
  );
}

function GuideRoadmap({ activeIndex, onSelect }) {
  const railRef = useRef(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    const centerCurrent = (behavior = "smooth") => {
      const current = rail.querySelector?.('[aria-current="step"]');
      if (!current) return;
      const railRect = rail.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      const centeredLeft =
        rail.scrollLeft +
        currentRect.left -
        railRect.left +
        currentRect.width / 2 -
        rail.clientWidth / 2;
      const targetLeft = Math.max(0, centeredLeft);
      if (behavior === "auto") {
        rail.scrollLeft = targetLeft;
      } else {
        rail.scrollTo?.({ behavior, left: targetLeft });
      }
    };

    const frame = window.requestAnimationFrame(() => centerCurrent("smooth"));
    const settleTimer = window.setTimeout(() => centerCurrent("auto"), 320);
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => centerCurrent("auto"))
        : null;
    observer?.observe(rail);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      observer?.disconnect();
    };
  }, [activeIndex]);

  return (
    <nav ref={railRef} className="coa-guide__roadmap" aria-label="COA reading roadmap">
      <ol>
        {STEPS.map((item, index) => {
          const Icon = item.Icon;
          const state = index === activeIndex ? "is-current" : index < activeIndex ? "is-complete" : "";
          return (
            <li key={item.id} className={state}>
              <button
                type="button"
                aria-current={index === activeIndex ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${item.title}`}
                onClick={() => onSelect(index)}
              >
                <span className="coa-guide__roadmap-icon">
                  {index < activeIndex ? <Check size={14} /> : <Icon size={15} />}
                </span>
                <span className="coa-guide__roadmap-copy">
                  <strong>{item.navLabel}</strong>
                  <small>{item.navHint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function CoaEducationGuide({
  initialStep = 0,
  onClose = NOOP,
  onOpenCertificate,
  product,
  productImage,
  productName,
  record,
}) {
  const [stepIndex, setStepIndex] = useState(() => {
    const requested = Number(initialStep);
    return Number.isFinite(requested)
      ? Math.max(0, Math.min(STEPS.length - 1, Math.trunc(requested)))
      : 0;
  });
  const [direction, setDirection] = useState("next");
  const [matchedRecord, setMatchedRecord] = useState(record || null);
  const [recordStatus, setRecordStatus] = useState(record ? "ready" : "loading");
  const [documentStatus, setDocumentStatus] = useState("idle");
  const [detectedTests, setDetectedTests] = useState([]);
  const [activeTestDetail, setActiveTestDetail] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scanIntroActive, setScanIntroActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [playbackRun, setPlaybackRun] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const step = STEPS[stepIndex];
  const resolvedName = cleanLabel(
    productName || matchedRecord?.product?.name || product?.name,
    "Selected product",
  );
  const analysisName = cleanLabel(matchedRecord?.product?.name, resolvedName);
  const resolvedImage = useMemo(
    () => resolveProductImage(productImage, matchedRecord, product, resolvedName),
    [matchedRecord, product, productImage, resolvedName],
  );
  const documentUrl = matchedRecord?.document?.viewUrl || "";
  const recordFingerprint = [
    matchedRecord?.id,
    matchedRecord?.document?.previewUrl,
    matchedRecord?.document?.viewUrl,
    matchedRecord?.batch,
    matchedRecord?.purity,
  ].filter(Boolean).join("|");
  const canOpenCertificate = Boolean(documentUrl);
  const isPdfDocument = matchedRecord?.document?.kind === "pdf";
  const documentReady = ["preview-ready", "analyzed", "ready", "error"].includes(
    documentStatus,
  );
  const documentSceneBusy =
    DOCUMENT_STEP_IDS.has(step.id) &&
    recordStatus === "ready" &&
    isPdfDocument &&
    !documentReady;
  const scanState =
    recordStatus === "error"
      ? "error"
      : scanIntroActive || recordStatus === "loading" || documentSceneBusy
        ? "scanning"
      : recordStatus !== "ready"
        ? recordStatus
        : documentStatus === "error"
          ? "fallback"
          : !isPdfDocument || ["preview-ready", "analyzed", "ready"].includes(documentStatus)
            ? "ready"
            : "scanning";
  const scanLabel =
    scanState === "ready"
      ? "Matching COA ready"
      : scanState === "scanning" || scanState === "loading"
        ? "Scanning matching COA..."
        : scanState === "fallback"
          ? "COA open in direct view"
          : scanState === "error"
            ? "Matching COA unavailable"
            : "Presentation needed";
  const sceneReady =
    !DOCUMENT_STEP_IDS.has(step.id) ||
    (recordStatus === "ready" && (!isPdfDocument || documentReady));
  const autoplayActive =
    isPlaying &&
    !prefersReducedMotion &&
    pageVisible &&
    sceneReady &&
    stepIndex < STEPS.length - 1;
  const externalTestStep = step.id === "tests" && recordStatus === "ready" && !isPdfDocument;
  const reportedTestStep =
    step.id === "tests" && isPdfDocument && activeTestDetail?.label;
  const activeTitle = externalTestStep
    ? "Review every test in the issued record."
    : reportedTestStep
      ? activeTestDetail.label
    : step.title;
  const activeBody = externalTestStep
    ? "This laboratory record does not expose a PDF for automatic row detection. Open the issued record and count only the tests printed there."
    : reportedTestStep
      ? activeTestDetail.purpose
    : step.body;
  const activeCue = externalTestStep
    ? "No test is inferred from product metadata or badges."
    : reportedTestStep
      ? activeTestDetail.interpretation
    : step.id === "tests" && detectedTests.length
      ? `${detectedTests.length} tests found in this issued COA.`
      : step.cue;

  useEffect(() => {
    let active = true;

    if (record) {
      setMatchedRecord(record);
      setRecordStatus("ready");
      return () => {
        active = false;
      };
    }

    if (!product) {
      setMatchedRecord(null);
      setRecordStatus("unavailable");
      return () => {
        active = false;
      };
    }

    setMatchedRecord(null);
    setRecordStatus("loading");
    loadCoaCatalog()
      .then((records) => {
        if (!active) return;
        const match = resolveRecordForProduct(records, product, resolvedName);
        setMatchedRecord(match);
        setRecordStatus(match ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!active) return;
        setMatchedRecord(null);
        setRecordStatus("error");
      });

    return () => {
      active = false;
    };
  }, [product, record, resolvedName]);

  useEffect(() => {
    setDocumentStatus(matchedRecord?.document?.kind === "pdf" ? "loading" : "ready");
    setDetectedTests([]);
    setActiveTestDetail(null);
    warmCoaDocument(matchedRecord, analysisName);
  }, [analysisName, recordFingerprint]);

  useEffect(() => {
    const timer = window.setTimeout(() => setScanIntroActive(false), 1_250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    [QR_IMAGE, BATCH_IMAGE].forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      const reduced = Boolean(media?.matches);
      setPrefersReducedMotion(reduced);
      if (reduced) setIsPlaying(false);
    };
    syncPreference();
    media?.addEventListener?.("change", syncPreference);
    const syncVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      media?.removeEventListener?.("change", syncPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const handleDocumentStatus = useCallback((detail = {}) => {
    if (detail.status) setDocumentStatus(detail.status);
    if (Array.isArray(detail.tests)) {
      setDetectedTests(detail.tests);
    }
    if (detail.focusKey === "tests" && detail.activeTestDetail) {
      setActiveTestDetail(detail.activeTestDetail);
    } else if (detail.focusKey && detail.focusKey !== "tests") {
      setActiveTestDetail(null);
    }
  }, []);

  const moveTo = useCallback((nextIndex, { manual = false } = {}) => {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, nextIndex));
    if (bounded === stepIndex) return;
    if (manual) setIsPlaying(false);
    setDirection(bounded > stepIndex ? "next" : "previous");
    setStepIndex(bounded);
    setPlaybackRun((value) => value + 1);
  }, [stepIndex]);

  useEffect(() => {
    if (!autoplayActive) return undefined;
    const timer = window.setTimeout(() => {
      setDirection("next");
      setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
      setPlaybackRun((value) => value + 1);
    }, AUTO_STEP_MS[step.id] || 5_500);
    return () => window.clearTimeout(timer);
  }, [autoplayActive, step.id]);

  useEffect(() => {
    if (stepIndex === STEPS.length - 1) setIsPlaying(false);
  }, [stepIndex]);

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

      if (
        event.key === "ArrowRight" &&
        !event.target?.matches?.("input, textarea, select")
      ) {
        event.preventDefault();
        setIsPlaying(false);
        setDirection("next");
        setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
        setPlaybackRun((value) => value + 1);
        return;
      }

      if (
        event.key === "ArrowLeft" &&
        !event.target?.matches?.("input, textarea, select")
      ) {
        event.preventDefault();
        setIsPlaying(false);
        setDirection("previous");
        setStepIndex((current) => Math.max(0, current - 1));
        setPlaybackRun((value) => value + 1);
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
  }, []);

  const playbackLabel = prefersReducedMotion
    ? "Manual"
    : stepIndex === STEPS.length - 1
      ? "Replay"
      : isPlaying
        ? "Pause"
        : "Resume";
  const PlaybackIcon =
    stepIndex === STEPS.length - 1
      ? RotateCcw
      : isPlaying
        ? Pause
        : Play;
  const togglePlayback = () => {
    if (prefersReducedMotion) return;
    if (stepIndex === STEPS.length - 1) {
      setDirection("previous");
      setStepIndex(0);
      setIsPlaying(true);
      setPlaybackRun((value) => value + 1);
      return;
    }
    setIsPlaying((value) => !value);
    setPlaybackRun((value) => value + 1);
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
            <span><ScanLine size={17} /></span>
            <div>
              <strong>COA READER</strong>
              <small>Interactive field guide</small>
            </div>
          </div>

          <div className="coa-guide__record-pill">
            <i className={`is-${scanState}`} />
            <span>{scanLabel}</span>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="coa-guide__close"
            onClick={onClose}
            aria-label="Close the COA reading guide"
          >
            <span>Close</span>
            <X size={18} />
          </button>
        </header>

        <div className={`coa-guide__body direction-${direction}`} data-scene={step.id}>
          <div
            className="coa-guide__visual"
            data-playback={autoplayActive ? "playing" : "paused"}
            data-scan-state={scanState}
            data-scene={step.id}
          >
            <div className="coa-guide__visual-meta">
              <span>{step.id === "product" ? "SELECTED PRODUCT" : step.id === "qr" || step.id === "batch" ? "REAL VIAL DETAIL" : "MATCHING CERTIFICATE"}</span>
              <strong>{resolvedName}</strong>
            </div>
            <div className="coa-guide__scene">
              <GuideStage
                image={resolvedImage}
                onDocumentStatus={handleDocumentStatus}
                onVialInspect={() => setIsPlaying(false)}
                productName={analysisName}
                record={matchedRecord}
                status={recordStatus}
                step={step}
              />
            </div>
          </div>

          <aside className="coa-guide__copy" aria-live="polite" key={`copy-${step.id}`}>
            <div className="coa-guide__copy-top">
              <div className="coa-guide__step-count">
                <span>{step.number}</span>
                <i>
                  <b
                    className={autoplayActive ? "is-running" : ""}
                    key={`${step.id}-${playbackRun}-${autoplayActive}`}
                    style={{ "--coa-step-duration": `${AUTO_STEP_MS[step.id] || 5_500}ms` }}
                  />
                </i>
                <small>{String(STEPS.length).padStart(2, "0")}</small>
              </div>
              <button
                type="button"
                className="coa-guide__playback"
                onClick={togglePlayback}
                disabled={prefersReducedMotion}
                aria-label={`${playbackLabel} automatic guide`}
                aria-pressed={!prefersReducedMotion && isPlaying}
              >
                <PlaybackIcon size={13} />
                <span>{playbackLabel}</span>
              </button>
            </div>
            <p className="coa-guide__eyebrow">{step.eyebrow}</p>
            <h2 id={titleId}>{activeTitle}</h2>
            <p id={descriptionId} className="coa-guide__description">{activeBody}</p>

            <div className={`coa-guide__cue ${reportedTestStep ? "is-test-reading" : ""}`}>
              <span><Check size={14} /></span>
              {reportedTestStep ? (
                <div>
                  <small>Reported result</small>
                  <strong>{activeTestDetail.result || "See highlighted field"}</strong>
                  <p>{activeCue}</p>
                </div>
              ) : (
                <p>{activeCue}</p>
              )}
            </div>

          </aside>

          <GuideRoadmap
            activeIndex={stepIndex}
            onSelect={(index) => moveTo(index, { manual: true })}
          />
        </div>

        <footer className="coa-guide__footer">
          <p>
            <ShieldCheck size={14} />
            Read the issued record for the exact product and batch.
          </p>

          <div className="coa-guide__actions">
            {canOpenCertificate ? (
              onOpenCertificate ? (
                <button
                  type="button"
                  className="coa-guide__open"
                  onClick={() => onOpenCertificate(matchedRecord)}
                >
                  Full COA <ExternalLink size={14} />
                </button>
              ) : (
                <a
                  className="coa-guide__open"
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Full COA <ExternalLink size={14} />
                </a>
              )
            ) : null}

            <button
              type="button"
              className="coa-guide__back"
              onClick={() => moveTo(stepIndex - 1, { manual: true })}
              disabled={stepIndex === 0}
              aria-label="Previous step"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="coa-guide__next"
              onClick={() => {
                if (stepIndex === STEPS.length - 1) onClose();
                else moveTo(stepIndex + 1, { manual: true });
              }}
            >
              {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
              {stepIndex === STEPS.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
