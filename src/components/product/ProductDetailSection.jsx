import "./ProductDetailSection.styles.css";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  Layers3,
  Loader2,
  Mail,
  MessageSquare,
  Minus,
  PackageCheck,
  Palette,
  Plus,
  Ruler,
  ScanLine,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { getProductPurchaseLimit, useCart } from "../cart/CartContext";
import DispatchCutoff from "../shipping/DispatchCutoff";
import {
  findCoaForWooProduct,
  getCoaTestingPanel,
} from "../../lib/coaModel.js";
import { loadPublicCoaCatalog } from "../../lib/publicCoaClient.js";

const CoaEducationGuide = lazy(() => import("../coa/CoaEducationGuide.jsx"));

function formatMoney(value) {
  const number = Number(value || 0);

  if (Number.isNaN(number) || number <= 0) {
    return "Price available at checkout";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeWooHtml(value = "") {
  return String(value || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COA_PANEL_META = {
  "3x": { label: "3X Testing", className: "is-3x" },
  "4x": { label: "4X Tested", className: "is-4x" },
  "7x": { label: "7X Testing", className: "is-7x" },
  "8x": { label: "7X Testing", className: "is-7x" },
  standard: { label: "3X Testing", className: "is-standard" },
  full: { label: "7X Testing", className: "is-full" },
};

function toCoaPanelArray(value) {
  if (Array.isArray(value)) return value.flat(Infinity);
  if (value === null || value === undefined || value === "") return [];

  if (typeof value === "string") {
    return value
      .split(/[\n,|/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
}

function normalizeCoaPanelType(value) {
  const compact = normalizeText(value).replace(/\s+/g, "");

  if (!compact) return "";
  if (compact === "full" || compact.includes("fullpanel")) return "full";
  if (compact === "standard" || compact.includes("standardpanel")) {
    return "standard";
  }

  const regularMatch = compact.match(/(\d{1,2})x/);
  const reversedMatch = compact.match(/^x(\d{1,2})/);
  const numericMatch = compact.match(/^(\d{1,2})$/);
  const amount =
    regularMatch?.[1] || reversedMatch?.[1] || numericMatch?.[1];

  return amount ? `${Number(amount)}x` : "";
}

function getCoaPanelTypes(record) {
  if (!record || typeof record !== "object") return [];

  const testingPanel = getCoaTestingPanel(record);
  if (testingPanel) return [testingPanel.type];

  const currentCoa =
    record.currentCoa && typeof record.currentCoa === "object"
      ? record.currentCoa
      : record.current_coa && typeof record.current_coa === "object"
        ? record.current_coa
        : {};

  const explicit = [record, currentCoa].flatMap((source) =>
    toCoaPanelArray(
      source.panelTypes ||
        source.panel_types ||
        source.reportPanels ||
        source.report_panels ||
        source.panelType ||
        source.panel_type
    )
  );

  const candidates = explicit.length
    ? explicit
    : [
        currentCoa.label,
        currentCoa.tested,
        currentCoa.method,
        record.tested,
        record.method,
        ...toCoaPanelArray(record.keywords),
      ];

  return Array.from(
    new Set(candidates.map(normalizeCoaPanelType).filter(Boolean))
  ).sort((left, right) => {
    const rank = (panel) => {
      if (/^\d+x$/.test(panel)) return Number(panel.slice(0, -1));
      if (panel === "standard") return 100;
      if (panel === "full") return 101;
      return 999;
    };

    return rank(left) - rank(right);
  });
}

function getCoaPanelMeta(panelType) {
  if (COA_PANEL_META[panelType]) return COA_PANEL_META[panelType];

  const amount = String(panelType || "").match(/^(\d{1,2})x$/)?.[1];

  return {
    label: amount ? `${amount}X Tested` : String(panelType || "Panel"),
    className: "is-dynamic",
  };
}

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOption(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeAttributeKey(value = "") {
  return normalizeSlug(
    String(value || "")
      .replace(/^attribute_/i, "")
      .replace(/^pa[_-]/i, "")
  );
}

function getProductImage(product) {
  return (
    product?.images?.[0]?.src ||
    product?.image ||
    product?.featuredImage ||
    "/tarro.png"
  );
}

function getGallery(product) {
  const images = Array.isArray(product?.images) ? product.images : [];

  if (images.length > 0) {
    return images
      .filter((image) => image?.src || image?.url)
      .map((image, index) => ({
        id: image.id || `${image.src || image.url}-${index}`,
        src: image.src || image.url,
        thumbnail: image.thumbnail || image.src || image.url,
        srcSet: image.srcset || image.srcSet || "",
        sizes: image.sizes || "",
        alt: image.alt || product?.name || "Product image",
        label: index === 0 ? "Main" : `View ${index + 1}`,
      }));
  }

  return [
    {
      id: "main",
      src: getProductImage(product),
      alt: product?.name || "Product image",
      label: "Main",
    },
  ];
}

function getCategories(product) {
  if (!Array.isArray(product?.categories)) return [];

  return product.categories
    .map((category) => category?.name || "")
    .filter(Boolean);
}

function getStockStatus(product) {
  const status = String(product?.stock_status || "").toLowerCase();

  if (status === "instock") return "In stock";
  if (status === "outofstock") return "Out of stock";
  if (status === "onbackorder") return "Backorder";

  return product?.in_stock === false ? "Out of stock" : "In stock";
}

function getAttributeGroups(product) {
  const attributes = Array.isArray(product?.attributes)
    ? product.attributes
    : [];

  return attributes
    .filter(
      (attribute) =>
        attribute?.name &&
        Array.isArray(attribute?.options) &&
        attribute.options.length > 0
    )
    .map((attribute) => ({
      id: attribute.id || attribute.slug || attribute.name,
      name: attribute.name,
      slug: attribute.slug || normalizeSlug(attribute.name),
      options: attribute.options,
      variation: Boolean(attribute.variation),
    }));
}

function getInitialSelectedAttributes(attributeGroups = []) {
  return attributeGroups.reduce((acc, attribute) => {
    acc[attribute.slug] = attribute.options?.[0] || "";
    return acc;
  }, {});
}

function getVariationObjects(product) {
  const variations = Array.isArray(product?.variations)
    ? product.variations
    : [];

  return variations.filter(
    (variation) => variation && typeof variation === "object"
  );
}

function getVariationAttributes(variation) {
  const raw = variation?.attributes;

  if (!raw) return {};

  const addAttribute = (acc, key, value) => {
    if (!key || value === undefined || value === null || value === "") {
      return acc;
    }

    const cleanKey = normalizeAttributeKey(key);
    const slugKey = normalizeSlug(key);
    const cleanValue = String(value);

    if (cleanKey) acc[cleanKey] = cleanValue;
    if (slugKey) acc[slugKey] = cleanValue;

    const withoutPa = slugKey.replace(/^pa-/, "").replace(/^pa_/, "");
    if (withoutPa) acc[withoutPa] = cleanValue;

    return acc;
  };

  if (Array.isArray(raw)) {
    return raw.reduce((acc, item) => {
      const value = item?.option || item?.value || "";

      const possibleKeys = [
        item?.slug,
        item?.name,
        item?.id ? String(item.id) : "",
      ].filter(Boolean);

      possibleKeys.forEach((key) => addAttribute(acc, key, value));

      return acc;
    }, {});
  }

  if (typeof raw === "object") {
    return Object.entries(raw).reduce((acc, [key, value]) => {
      addAttribute(acc, key, value);
      return acc;
    }, {});
  }

  return {};
}

function variationMatchesSelection(variation, selectedAttributes) {
  const variationAttributes = getVariationAttributes(variation);

  const selectedEntries = Object.entries(selectedAttributes || {}).filter(
    ([, value]) => value
  );

  if (!selectedEntries.length) return false;

  return selectedEntries.every(([selectedKey, selectedValue]) => {
    const cleanSelectedKey = normalizeAttributeKey(selectedKey);
    const slugSelectedKey = normalizeSlug(selectedKey);
    const selectedOption = normalizeOption(selectedValue);

    const directValue =
      variationAttributes[cleanSelectedKey] ||
      variationAttributes[slugSelectedKey] ||
      variationAttributes[`pa-${slugSelectedKey}`] ||
      variationAttributes[`pa_${slugSelectedKey}`];

    if (directValue) {
      return normalizeOption(directValue) === selectedOption;
    }

    return Object.values(variationAttributes).some((value) => {
      return normalizeOption(value) === selectedOption;
    });
  });
}

function getSelectedVariation(product, selectedAttributes) {
  const variations = getVariationObjects(product);

  if (!variations.length) return null;

  return (
    variations.find((variation) =>
      variationMatchesSelection(variation, selectedAttributes)
    ) || null
  );
}

function getVariationImage(variation) {
  if (!variation) return "";

  if (typeof variation?.image === "string") {
    return variation.image;
  }

  return variation?.image?.src || variation?.image?.url || "";
}

function getCurrentPrice(product, selectedVariation) {
  return (
    selectedVariation?.price ||
    selectedVariation?.sale_price ||
    selectedVariation?.regular_price ||
    product?.price ||
    product?.regular_price ||
    product?.sale_price ||
    0
  );
}

function getCurrentRegularPrice(product, selectedVariation) {
  return (
    selectedVariation?.regular_price ||
    product?.regular_price ||
    product?.price ||
    0
  );
}

function getNumericPrice(product) {
  return Number(
    product?.price ||
      product?.sale_price ||
      product?.regular_price ||
      0
  );
}

function getWooVariationPayload(attributeGroups, selectedAttributes) {
  return attributeGroups.reduce((acc, attribute) => {
    const value = selectedAttributes?.[attribute.slug];

    if (!value) return acc;

    const globalKey = attribute.slug?.startsWith("pa_")
      ? `attribute_${attribute.slug}`
      : `attribute_${attribute.slug}`;

    acc[globalKey] = value;
    acc[`attribute_${normalizeSlug(attribute.name)}`] = value;

    return acc;
  }, {});
}

function getSelectedOptionLabel(attributeGroups, selectedAttributes) {
  return attributeGroups
    .map((attribute) => {
      const value = selectedAttributes?.[attribute.slug];
      return value ? `${attribute.name}: ${value}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}


function getSelectedOptionValue(selectedOptionLabel = "") {
  const parts = String(selectedOptionLabel || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const last = parts[parts.length - 1] || "";
  const value = last.includes(":") ? last.split(":").pop() : last;

  return String(value || "").trim();
}

function getRestockDisplayName(parentName = "", selectedOptionLabel = "") {
  const cleanParentName = String(parentName || "this item").trim();
  const optionValue = getSelectedOptionValue(selectedOptionLabel);

  if (!optionValue) return cleanParentName;

  const baseName = cleanParentName
    .replace(/\s*[—–-]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b\s*$/i, "")
    .replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b\s*$/i, "")
    .trim();

  return `${baseName || cleanParentName} ${optionValue}`.replace(/\s+/g, " ").trim();
}

function isAccessoryProduct(product) {
  const name = normalizeText(product?.name || "");
  const categories = getCategories(product).map((category) =>
    normalizeText(category)
  );

  const accessoryTerms = [
    "accessory",
    "accessories",
    "supplies",
    "supply",
    "water",
    "bacteriostatic",
    "bacteriostatic water",
    "bac water",
    "sterile",
    "kit",
    "syringe",
    "vial",
    "needle",
    "case",
    "storage",
    "solution",
  ];

  return accessoryTerms.some((term) => {
    return (
      name.includes(term) ||
      categories.some((category) => category.includes(term))
    );
  });
}

function scoreRecommendedProduct(currentProduct, recommendedProduct) {
  if (!currentProduct || !recommendedProduct) return 0;

  const currentCategories = getCategories(currentProduct).map(normalizeText);
  const recommendedCategories =
    getCategories(recommendedProduct).map(normalizeText);
  const recommendedName = normalizeText(recommendedProduct?.name || "");

  let score = 0;

  if (isAccessoryProduct(recommendedProduct)) score += 80;

  if (
    recommendedName.includes("water") ||
    recommendedName.includes("bacteriostatic") ||
    recommendedName.includes("solution") ||
    recommendedName.includes("vial") ||
    recommendedName.includes("case") ||
    recommendedName.includes("storage") ||
    recommendedName.includes("kit") ||
    recommendedName.includes("syringe") ||
    recommendedName.includes("needle")
  ) {
    score += 90;
  }

  currentCategories.forEach((category) => {
    if (recommendedCategories.includes(category)) {
      score += 25;
    }
  });

  if (getNumericPrice(recommendedProduct) > 0) {
    score += 10;
  }

  return score;
}

function getRecommendedProducts(currentProduct, products = []) {
  if (!currentProduct || !Array.isArray(products)) return [];

  const currentId = String(currentProduct?.id || "");

  return products
    .filter((item) => {
      if (!item?.id) return false;
      if (String(item.id) === currentId) return false;
      return getNumericPrice(item) > 0;
    })
    .map((item) => ({
      product: item,
      score: scoreRecommendedProduct(currentProduct, item),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.product);
}

function getTechnicalFacts(product) {
  const facts = [];

  if (product?.sku) {
    facts.push({ label: "SKU", value: product.sku });
  }

  if (product?.type) {
    facts.push({ label: "Product type", value: product.type });
  }

  if (product?.weight) {
    facts.push({ label: "Weight", value: product.weight });
  }

  const dimensions = product?.dimensions || {};
  const dimensionValue = [dimensions.length, dimensions.width, dimensions.height]
    .filter(Boolean)
    .join(" × ");

  if (dimensionValue) {
    facts.push({ label: "Dimensions", value: dimensionValue });
  }

  if (
    product?.stock_quantity !== null &&
    product?.stock_quantity !== undefined
  ) {
    facts.push({ label: "Inventory", value: `${product.stock_quantity} units` });
  }

  return facts;
}

function normalizeId(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getRecordUrl(record) {
  if (!record) return "";

  const isValidUrl = (value) => {
    if (typeof value !== "string") return false;

    const clean = value.trim();

    return (
      clean.startsWith("http://") ||
      clean.startsWith("https://") ||
      clean.startsWith("/") ||
      clean.endsWith(".pdf")
    );
  };

  const cleanUrl = (value) => {
    if (typeof value !== "string") return "";

    return value.trim();
  };

  const direct =
    record?.document?.viewUrl ||
    record?.coaUrl ||
    record?.verifyUrl ||
    record?.currentCoa?.verifyUrl ||
    record?.currentCoa?.url ||
    record?.currentCoa?.href ||
    record?.currentCoa?.link ||
    record?.current_coa?.verifyUrl ||
    record?.current_coa?.url ||
    record?.current_coa?.href ||
    record?.current_coa?.link ||
    record?.coa_url ||
    record?.coaURL ||
    record?.coa_link ||
    record?.coaLink ||
    record?.coaFile ||
    record?.coa_file ||
    record?.coa_file_url ||
    record?.coaFileUrl ||
    record?.coa ||
    record?.certificateUrl ||
    record?.certificate_url ||
    record?.certificateLink ||
    record?.certificate_link ||
    record?.certificate ||
    record?.pdfUrl ||
    record?.pdf_url ||
    record?.pdfLink ||
    record?.pdf_link ||
    record?.pdf ||
    record?.fileUrl ||
    record?.file_url ||
    record?.fileLink ||
    record?.file_link ||
    record?.file ||
    record?.downloadUrl ||
    record?.download_url ||
    record?.documentUrl ||
    record?.document_url ||
    record?.document ||
    record?.reportUrl ||
    record?.report_url ||
    record?.report ||
    record?.labReportUrl ||
    record?.lab_report_url ||
    record?.lab_report ||
    record?.link ||
    record?.permalink ||
    record?.sourceUrl ||
    record?.source_url ||
    record?.mediaUrl ||
    record?.media_url ||
    record?.url ||
    record?.href ||
    "";

  if (isValidUrl(direct)) return cleanUrl(direct);

  if (direct?.url && isValidUrl(direct.url)) return cleanUrl(direct.url);
  if (direct?.src && isValidUrl(direct.src)) return cleanUrl(direct.src);
  if (direct?.href && isValidUrl(direct.href)) return cleanUrl(direct.href);
  if (direct?.link && isValidUrl(direct.link)) return cleanUrl(direct.link);

  const possibleContainers = [
    record?.meta,
    record?.acf,
    record?.fields,
    record?.customFields,
    record?.custom_fields,
    record?.attributes,
    record?.data,
  ].filter(Boolean);

  for (const container of possibleContainers) {
    const found = findUrlDeep(container);

    if (found) return found;
  }

  const foundAnywhere = findUrlDeep(record);

  return foundAnywhere || "";
}

function findUrlDeep(value, seen = new Set()) {
  if (!value) return "";

  if (typeof value === "string") {
    const clean = value.trim();

    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://") ||
      clean.startsWith("/") ||
      clean.endsWith(".pdf")
    ) {
      return clean;
    }

    return "";
  }

  if (typeof value !== "object") return "";

  if (seen.has(value)) return "";
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlDeep(item, seen);

      if (found) return found;
    }

    return "";
  }

  const priorityKeys = [
    "coaUrl",
    "coa_url",
    "verifyUrl",
    "verify_url",
    "koveraVerifyUrl",
    "kovera_verify_url",
    "coaLink",
    "coa_link",
    "pdfUrl",
    "pdf_url",
    "fileUrl",
    "file_url",
    "downloadUrl",
    "download_url",
    "documentUrl",
    "document_url",
    "reportUrl",
    "report_url",
    "url",
    "href",
    "src",
    "link",
  ];

  for (const key of priorityKeys) {
    if (value[key]) {
      const found = findUrlDeep(value[key], seen);

      if (found) return found;
    }
  }

  for (const item of Object.values(value)) {
    const found = findUrlDeep(item, seen);

    if (found) return found;
  }

  return "";
}

function getRecordLot(record) {
  return (
    record?.lot ||
    record?.lotNumber ||
    record?.lot_number ||
    record?.batch ||
    record?.batchNumber ||
    record?.batch_number ||
    record?.currentLot ||
    record?.current_lot ||
    "Current shipping lot"
  );
}

function getRecordDate(record) {
  return (
    record?.testingDate ||
    record?.currentCoa?.date ||
    record?.current_coa?.date ||
    record?.date ||
    record?.testedAt ||
    record?.tested_at ||
    record?.createdAt ||
    record?.created_at ||
    record?.publishedAt ||
    record?.published_at ||
    ""
  );
}

function extractStrengthText(...values) {
  const joined = values
    .flat(Infinity)
    .filter(Boolean)
    .join(" ");

  const match = String(joined).match(
    /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)\b/i
  );

  // WooCommerce product names often omit the unit separator (for example
  // `10ML`), while the COA Manager returns `10 mL`. Store both forms as the
  // same canonical value so an exact product/variation match is not rejected.
  return match ? `${match[1]}${match[2].toLowerCase()}` : "";
}

function getSelectedCoaStrengthText(
  product,
  selectedVariation = null,
  selectedOptionLabel = "",
  selectedAttributes = {}
) {
  const variationAttributes = getVariationAttributes(selectedVariation);

  return extractStrengthText(
    selectedOptionLabel,
    Object.values(selectedAttributes || {}),
    Object.values(variationAttributes || {}),
    selectedVariation?.name,
    selectedVariation?.slug,
    selectedVariation?.sku,
    selectedVariation?.description,
    selectedVariation?.short_description,
    product?.name,
    product?.slug,
    product?.sku,
    product?.short_description
  );
}

function findCurrentCoaRecord(
  product,
  records = [],
  selectedVariation = null,
  selectedOptionLabel = "",
  selectedAttributes = {}
) {
  if (!product || !Array.isArray(records)) return null;

  return findCoaForWooProduct({
    records,
    productId: product?.id || product?.product_id,
    parentProductId:
      product?.parent_id || product?.parentId || product?.parent,
    variationId:
      selectedVariation?.id ||
      selectedVariation?.variation_id ||
      selectedVariation?.variationId,
    productSku: product?.sku,
    variationSku: selectedVariation?.sku,
    strength: getSelectedCoaStrengthText(
      product,
      selectedVariation,
      selectedOptionLabel,
      selectedAttributes
    ),
    currentOnly: true,
  });
}
const CUSTOM_ORDER_PRODUCT_IDS = [591];
const CUSTOM_ORDER_FALLBACK_EMAIL = "support@phaseonelabz.com";

function isCustomOrderProduct(product) {
  return CUSTOM_ORDER_PRODUCT_IDS.includes(
    Number(product?.id || product?.product_id || 0)
  );
}

function getCustomOrderEndpoint() {
  const explicitEndpoint = import.meta.env.PUBLIC_CUSTOM_ORDER_REQUEST_API_URL;

  if (explicitEndpoint) return explicitEndpoint;

  const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;

  if (!wpSiteUrl) return "";

  return `${String(wpSiteUrl).replace(
    /\/$/,
    ""
  )}/wp-json/phase/v1/custom-order-request`;
}

function buildCustomOrderEmailBody(payload) {
  return [
    "Custom Order Request",
    "",
    `Product: ${payload.productName || ""}`,
    `Product ID: ${payload.productId || ""}`,
    `SKU: ${payload.sku || ""}`,
    "",
    `Product Type: ${payload.productType || ""}`,
    `Quantity Needed: ${payload.quantityNeeded || ""}`,
    `Color Requested: ${payload.colorRequested || ""}`,
    `Finish Preference: ${payload.finishPreference || ""}`,
    `Timeline: ${payload.timeline || ""}`,
    "",
    "Custom Details:",
    payload.customDetails || "",
    "",
    "Contact Information:",
    `Name: ${payload.fullName || ""}`,
    `Email: ${payload.email || ""}`,
    `Phone: ${payload.phone || ""}`,
  ].join("\n");
}

function CustomOrderRequestModal({
  product,
  productName,
  account,
  accountEmail: accountEmailProp = "",
  accountName: accountNameProp = "",
  onClose,
}) {
  const initialAccount = normalizeAccountPayload(account);
  const initialEmail = accountEmailProp || getAccountEmail(initialAccount);
  const initialName = accountNameProp || getAccountName(initialAccount);

  const [form, setForm] = useState({
    productType: "",
    quantityNeeded: "",
    colorRequested: "",
    finishPreference: "",
    customDetails: "",
    timeline: "",
    acceptedTerms: false,
    fullName: initialName || "",
    email: initialEmail || "",
    phone: "",
  });

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (status !== "loading") {
      setStatus("idle");
      setMessage("");
      setRequestId("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.acceptedTerms) {
      setStatus("error");
      setMessage("Please confirm the custom order terms before submitting.");
      return;
    }

    const payload = {
      ...form,
      productId: Number(product?.id || product?.product_id || 0),
      productName: productName || product?.name || "Custom product",
      sku: product?.sku || "",
      productUrl:
        typeof window !== "undefined"
          ? window.location.href
          : product?.permalink || "",
      source: "product_detail_custom_order",
    };

    try {
      setStatus("loading");
      setMessage("");
      setRequestId("");

      const endpoint = getCustomOrderEndpoint();

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message || "Unable to submit your custom request right now."
          );
        }

        setRequestId(data?.requestId ? String(data.requestId) : "");
        setStatus("success");
        setMessage(
          "Your custom request has been received. Our team will review the details and contact you with pricing and lead time."
        );
        return;
      }

      const subject = encodeURIComponent(
        `Custom Order Request — ${payload.productName}`
      );
      const body = encodeURIComponent(buildCustomOrderEmailBody(payload));

      window.location.href = `mailto:${CUSTOM_ORDER_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;

      setStatus("success");
      setMessage(
        "Your email app is opening with the request details. Send the email to submit your custom order request."
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error.message || "Something went wrong. Please try again in a moment."
      );
    }
  };

  const productTypeOptions = [
    "3ML Vial Caps",
    "10ML/30ML Vial Caps",
  ];

  const quantityOptions = [
    "25–50",
    "51–100",
    "101–250",
    "251–500",
    "501–1,000",
    "1,000+",
  ];

  const colorOptions = [
    "Black",
    "White",
    "Blue",
    "Red",
    "Gray",
    "Other",
  ];

  const finishOptions = [
    "Flexible TPU (Standard)",
  ];

  const timelineOptions = [
    "No Rush",
    "Within 1 Week",
    "Within 2 Weeks",
    "Within 30 Days",
    "Specific Date",
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pdp-custom-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close custom order form"
        className="pdp-custom-modal-backdrop"
        onClick={onClose}
      />

      <div className="pdp-custom-modal-shell">
        <div className="pdp-custom-modal-head">
          <div>
            <span>Phase One Labz</span>
            <h2>Custom Order Request</h2>
            <p>
              Tell us what you need. Our team will review your request and get
              back to you with pricing and lead time.
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form className="pdp-custom-form" onSubmit={handleSubmit}>
          <div className="pdp-custom-grid">
            <label>
              <span>
                <PackageCheck size={13} />
                Product type
              </span>

              <select
                required
                value={form.productType}
                onChange={(event) =>
                  updateField("productType", event.target.value)
                }
              >
                <option value="">Select product type</option>
                {productTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <Ruler size={13} />
                Quantity needed
              </span>

              <select
                required
                value={form.quantityNeeded}
                onChange={(event) =>
                  updateField("quantityNeeded", event.target.value)
                }
              >
                <option value="">Select quantity</option>
                {quantityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <Palette size={13} />
                Color requested
              </span>

              <select
                required
                value={form.colorRequested}
                onChange={(event) =>
                  updateField("colorRequested", event.target.value)
                }
              >
                <option value="">Select color</option>
                {colorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <Sparkles size={13} />
                Finish preference
              </span>

              <select
                required
                value={form.finishPreference}
                onChange={(event) =>
                  updateField("finishPreference", event.target.value)
                }
              >
                <option value="">Select finish</option>
                {finishOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {form.finishPreference && (
                <small className="pdp-custom-field-note">
                  All custom orders are produced using Flexible TPU.
                </small>
              )}
            </label>
          </div>

          <label>
            <span>
              <MessageSquare size={13} />
              Custom details
            </span>

            <textarea
              value={form.customDetails}
              onChange={(event) =>
                updateField("customDetails", event.target.value)
              }
              placeholder="Tell us dimensions, use case, packaging details, color notes, or anything specific you want."
              rows={4}
            />
          </label>

          <label>
            <span>
              <CalendarDays size={13} />
              Deadline / needed by
            </span>

            <select
              required
              value={form.timeline}
              onChange={(event) => updateField("timeline", event.target.value)}
            >
              <option value="">Select timeline</option>
              {timelineOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="pdp-custom-terms">
            <ShieldCheck size={18} />

            <input
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={(event) =>
                updateField("acceptedTerms", event.target.checked)
              }
            />

            <span>
              I understand this is a custom-made 3D printed product manufactured
              specifically to my request. All custom orders are final sale and
              cannot be returned, refunded, or exchanged once production begins.
            </span>
          </label>

          <div className="pdp-custom-contact-title">Contact information</div>

          <label>
            <span>Full name</span>

            <input
              type="text"
              required
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </label>

          <label>
            <span>Email address</span>

            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Phone number optional</span>

            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Enter your phone number"
              autoComplete="tel"
            />
          </label>

          {message && (
            <div
              className={`pdp-custom-message ${
                status === "success" ? "is-success" : "is-error"
              }`}
              role={status === "success" ? "status" : "alert"}
            >
              {status === "success" ? (
                <>
                  <div className="pdp-custom-message-icon">
                    <CheckCircle2 size={21} />
                  </div>

                  <div className="pdp-custom-message-content">
                    <div className="pdp-custom-message-kicker">
                      Request received
                    </div>

                    <strong>Your custom order request is in review.</strong>

                    <p>{message}</p>

                    <div className="pdp-custom-message-steps">
                      <span>Saved in WordPress</span>
                      <span>Email confirmation sent</span>
                      <span>Team review next</span>
                    </div>

                    {requestId && (
                      <small>Reference #{requestId}</small>
                    )}
                  </div>

                  <button
                    type="button"
                    className="pdp-custom-message-close"
                    onClick={onClose}
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="pdp-custom-message-icon">
                    <ShieldCheck size={21} />
                  </div>

                  <div className="pdp-custom-message-content">
                    <div className="pdp-custom-message-kicker">
                      Action needed
                    </div>

                    <strong>We could not submit the request.</strong>

                    <p>{message}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="pdp-custom-submit"
          >
            {status === "loading" ? (
              <>
                <Loader2 size={16} className="pdp-spin" />
                Submitting request
              </>
            ) : (
              <>
                <Send size={16} />
                Submit custom request
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InfoRow({ icon: Icon, children }) {
  return (
    <div className="pdp-info-row">
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

const ACCOUNT_ENDPOINT = "/api/account";

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem("lab_auth_token") ||
    window.sessionStorage.getItem("lab_auth_token") ||
    ""
  );
}

function normalizeAccountPayload(data = {}) {
  const account =
    data?.user ||
    data?.account ||
    data?.customer ||
    data?.data?.user ||
    data?.data?.account ||
    data?.data?.customer ||
    data?.data ||
    data ||
    {};

  return account && typeof account === "object" ? account : {};
}

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredCustomerIdentity() {
  if (typeof window === "undefined") {
    return {};
  }

  const storageSources = [window.localStorage, window.sessionStorage].filter(Boolean);

  const objectKeys = [
    "phaseone_auth",
    "phaseone_user",
    "phaseone_account",
    "phaseone_customer",
    "phaseone_profile",
    "lab_auth",
    "lab_user",
    "lab_account",
    "lab_customer",
    "lab_profile",
    "cart_account",
    "customer",
    "account",
    "user",
    "auth",
    "profile",
  ];

  const storedObjects = [];

  storageSources.forEach((storage) => {
    objectKeys.forEach((key) => {
      const parsed = safeJsonParse(storage.getItem(key), null);

      if (parsed && typeof parsed === "object") {
        storedObjects.push(normalizeAccountPayload(parsed));
      }
    });
  });

  const getStorageValue = (...keys) => {
    for (const storage of storageSources) {
      for (const key of keys) {
        const value = storage.getItem(key);

        if (value) return value;
      }
    }

    return "";
  };

  const params = new URLSearchParams(window.location.search);

  const individual = {
    email:
      params.get("customer_email") ||
      params.get("billing_email") ||
      getStorageValue(
        "phaseone_customer_email",
        "phaseone_email",
        "lab_customer_email",
        "lab_email",
        "customer_email",
        "billing_email",
        "email",
        "user_email"
      ),
    name:
      params.get("customer_name") ||
      getStorageValue(
        "phaseone_customer_name",
        "phaseone_name",
        "lab_customer_name",
        "lab_name",
        "customer_name",
        "billing_name",
        "display_name",
        "name"
      ),
    first_name:
      params.get("billing_first_name") ||
      getStorageValue(
        "billing_first_name",
        "first_name",
        "firstName",
        "phaseone_first_name",
        "lab_first_name"
      ),
    last_name:
      params.get("billing_last_name") ||
      getStorageValue(
        "billing_last_name",
        "last_name",
        "lastName",
        "phaseone_last_name",
        "lab_last_name"
      ),
  };

  return storedObjects.reduce((acc, item) => ({ ...acc, ...item }), individual);
}

function getAccountEmail(account = {}) {
  const normalized = normalizeAccountPayload(account);
  const stored = getStoredCustomerIdentity();

  return (
    normalized?.email ||
    normalized?.user_email ||
    normalized?.billing_email ||
    normalized?.billing?.email ||
    normalized?.billingAddress?.email ||
    normalized?.customer?.email ||
    normalized?.account?.email ||
    normalized?.profile?.email ||
    stored?.email ||
    stored?.user_email ||
    stored?.billing_email ||
    stored?.billing?.email ||
    stored?.billingAddress?.email ||
    stored?.customer?.email ||
    stored?.account?.email ||
    stored?.profile?.email ||
    ""
  );
}

function getAccountName(account = {}) {
  const normalized = normalizeAccountPayload(account);
  const stored = getStoredCustomerIdentity();

  const directName =
    normalized?.name ||
    normalized?.display_name ||
    normalized?.customer_name ||
    normalized?.full_name ||
    normalized?.customer?.name ||
    normalized?.customer?.display_name ||
    normalized?.account?.name ||
    normalized?.profile?.name ||
    stored?.name ||
    stored?.display_name ||
    stored?.customer_name ||
    stored?.full_name ||
    stored?.customer?.name ||
    stored?.customer?.display_name ||
    stored?.account?.name ||
    stored?.profile?.name ||
    "";

  if (directName) return String(directName).trim();

  const first =
    normalized?.first_name ||
    normalized?.firstName ||
    normalized?.billing_first_name ||
    normalized?.billing?.first_name ||
    normalized?.billing?.firstName ||
    normalized?.billingAddress?.first_name ||
    normalized?.billingAddress?.firstName ||
    normalized?.customer?.first_name ||
    normalized?.customer?.firstName ||
    stored?.first_name ||
    stored?.firstName ||
    stored?.billing_first_name ||
    stored?.billing?.first_name ||
    stored?.billing?.firstName ||
    stored?.billingAddress?.first_name ||
    stored?.billingAddress?.firstName ||
    stored?.customer?.first_name ||
    stored?.customer?.firstName ||
    "";

  const last =
    normalized?.last_name ||
    normalized?.lastName ||
    normalized?.billing_last_name ||
    normalized?.billing?.last_name ||
    normalized?.billing?.lastName ||
    normalized?.billingAddress?.last_name ||
    normalized?.billingAddress?.lastName ||
    normalized?.customer?.last_name ||
    normalized?.customer?.lastName ||
    stored?.last_name ||
    stored?.lastName ||
    stored?.billing_last_name ||
    stored?.billing?.last_name ||
    stored?.billing?.lastName ||
    stored?.billingAddress?.last_name ||
    stored?.billingAddress?.lastName ||
    stored?.customer?.last_name ||
    stored?.customer?.lastName ||
    "";

  return `${first} ${last}`.trim();
}

function getRestockSubscribeEndpoint() {
  const explicitEndpoint = import.meta.env.PUBLIC_RESTOCK_SUBSCRIBE_API_URL;

  if (explicitEndpoint) return explicitEndpoint;

  const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;

  if (!wpSiteUrl) return "";

  return `${String(wpSiteUrl).replace(/\/$/, "")}/wp-json/phase/v1/restock-subscribe`;
}

function SoldOutNotifyCard({
  product,
  selectedVariation,
  selectedAttributes = {},
  selectedOptionLabel = "",
  variationPayload = {},
  productName,
  account,
  accountEmail: accountEmailProp = "",
  accountName: accountNameProp = "",
}) {
  const [identity, setIdentity] = useState(() => {
    const initialAccount = normalizeAccountPayload(account);
    const initialEmail = accountEmailProp || getAccountEmail(initialAccount);
    const initialName = accountNameProp || getAccountName(initialAccount);

    return {
      email: initialEmail,
      name: initialName,
    };
  });

  const [email, setEmail] = useState(identity.email || "");
  const [name, setName] = useState(identity.name || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [messageTitle, setMessageTitle] = useState("");

  const syncIdentity = (nextIdentity = {}) => {
    const nextEmail = String(nextIdentity.email || "").trim();
    const nextName = String(nextIdentity.name || "").trim();

    if (!nextEmail && !nextName) return;

    setIdentity((current) => ({
      email: current.email || nextEmail,
      name: current.name || nextName,
    }));

    if (nextEmail) setEmail((current) => current || nextEmail);
    if (nextName) setName((current) => current || nextName);
  };

  useEffect(() => {
    const freshAccount = normalizeAccountPayload(account);

    syncIdentity({
      email: accountEmailProp || getAccountEmail(freshAccount),
      name: accountNameProp || getAccountName(freshAccount),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, accountEmailProp, accountNameProp]);

  useEffect(() => {
    let active = true;

    async function loadAccountFromSession() {
      try {
        const token = getSavedAuthToken();

        const response = await fetch(`${ACCOUNT_ENDPOINT}?optional=1&ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json().catch(() => null);

        if (!active || !response.ok || !data) return;

        const accountData = normalizeAccountPayload(data);

        syncIdentity({
          email: getAccountEmail(accountData),
          name: getAccountName(accountData),
        });
      } catch {
        // Silent: the email input still works manually.
      }
    }

    loadAccountFromSession();

    const handleIdentityUpdate = () => loadAccountFromSession();

    window.addEventListener("focus", handleIdentityUpdate);
    window.addEventListener("storage", handleIdentityUpdate);
    window.addEventListener("lab-auth-updated", handleIdentityUpdate);
    window.addEventListener("phaseone:account-updated", handleIdentityUpdate);
    window.addEventListener("phaseone:customer-updated", handleIdentityUpdate);

    return () => {
      active = false;
      window.removeEventListener("focus", handleIdentityUpdate);
      window.removeEventListener("storage", handleIdentityUpdate);
      window.removeEventListener("lab-auth-updated", handleIdentityUpdate);
      window.removeEventListener("phaseone:account-updated", handleIdentityUpdate);
      window.removeEventListener("phaseone:customer-updated", handleIdentityUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, accountEmailProp, accountNameProp]);

  const parentProductId = Number(product?.id || product?.product_id || 0);
  const variationId = Number(selectedVariation?.id || 0);

  // IMPORTANT:
  // For restock alerts, the main productId must be the selected variation ID.
  // If this stays as the parent product ID, WordPress saves the alert under
  // the parent/default option, which is why 100 MG was arriving as 50 MG.
  const restockProductId = variationId || parentProductId;

  const cleanSelectedOptionValue = getSelectedOptionValue(selectedOptionLabel);
  const cleanProductName = getRestockDisplayName(
    productName || product?.name || "this item",
    selectedOptionLabel
  );

  const selectedVariationSku = selectedVariation?.sku || product?.sku || "";

  const resetMessage = () => {
    if (status !== "loading") {
      setStatus("idle");
      setMessage("");
      setMessageTitle("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!restockProductId) {
      setStatus("error");
      setMessageTitle("Notification unavailable");
      setMessage("This product option is not ready for notifications yet.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      setMessageTitle("");

      const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;

      if (!wpSiteUrl) {
        throw new Error("PUBLIC_WP_SITE_URL is missing in your .env file.");
      }

      const endpoint = `${wpSiteUrl.replace(
        /\/$/,
        ""
      )}/wp-json/phase/v1/restock-subscribe`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        /*
         * Same flow as RestockStatusPanel:
         * email + productId + productName go to the existing WordPress
         * /phase/v1/restock-subscribe endpoint.
         *
         * name and variationId are extra metadata. If the backend ignores them,
         * nothing breaks.
         */
        body: JSON.stringify({
          email,
          name,

          // Main target for the existing WordPress restock endpoint.
          // When the product is variable, this is the exact variation ID.
          productId: restockProductId,
          product_id: restockProductId,
          targetProductId: restockProductId,
          stockTargetId: restockProductId,

          // Parent product kept only as reference.
          parentProductId,
          parent_product_id: parentProductId,
          parentProductName: productName || product?.name || "this item",
          parent_product_name: productName || product?.name || "this item",

          // Exact selected variation metadata.
          variationId,
          variation_id: variationId,
          selectedVariationId: variationId,
          selected_variation_id: variationId,
          variationSku: selectedVariationSku,
          variation_sku: selectedVariationSku,

          selectedOption: cleanSelectedOptionValue,
          selected_option: cleanSelectedOptionValue,
          selectedOptionLabel,
          selected_option_label: selectedOptionLabel,
          selectedOptions: selectedAttributes,
          selected_options: selectedAttributes,
          selectedAttributes,
          selected_attributes: selectedAttributes,
          variationAttributes: variationPayload,
          variation_attributes: variationPayload,

          // Human-readable name for emails/admin screens.
          productName: cleanProductName,
          product_name: cleanProductName,
          notificationProductName: cleanProductName,
          notification_product_name: cleanProductName,

          source: "product_detail_sold_out",
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();

        console.error("Expected JSON but received:", text.slice(0, 300));
        console.error("Endpoint used:", endpoint);

        throw new Error(
          "The server returned HTML instead of JSON. Check your WordPress endpoint URL."
        );
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to save notification.");
      }

      setStatus("success");

      if (data.alreadySubscribed) {
        setMessageTitle("You're already on the list");
        setMessage(
          "This email is already registered for this exact option. We'll notify you when it becomes available."
        );
      } else {
        setMessageTitle("You're on the list");
        setMessage(
          "We saved your email successfully for this exact option. We'll notify you as soon as it becomes available."
        );
      }
    } catch (error) {
      setStatus("error");
      setMessageTitle("Something went wrong");
      setMessage(
        error.message ||
          "Something went wrong. Please try again or use the restock status page."
      );
    }
  };

  const hasMessage = message && status !== "loading";

  return (
    <div className="pdp-restock-card">
      <div className="pdp-restock-head">
        <div className="pdp-restock-icon">
          <BellRing size={18} />
        </div>

        <div>
          <span>Restock Alert</span>
          <h3>Notify me about {cleanProductName}</h3>
          <p>Enter your email to receive a restock alert for this exact option.</p>
        </div>
      </div>

      {hasMessage && (
        <div
          className={`pdp-restock-status-message ${
            status === "success" ? "is-success" : "is-error"
          }`}
        >
          <div>
            {status === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <ShieldCheck size={19} />
            )}
          </div>

          <div>
            <strong>{messageTitle}</strong>
            <p>{message}</p>
          </div>
        </div>
      )}

      <form className="pdp-restock-form" onSubmit={handleSubmit}>
        {!identity.name && (
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              resetMessage();
            }}
            placeholder="Your name (optional)"
          />
        )}

        <div className="pdp-restock-email-row">
          <label>
            <Mail size={15} />

            <input
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                resetMessage();
              }}
              placeholder="Email address"
              autoComplete="email"
            />
          </label>

          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Loader2 size={14} className="pdp-spin" />
                Saving
              </>
            ) : (
              <>
                <BellRing size={14} />
                Notify Me
              </>
            )}
          </button>
        </div>

        {email ? (
          <p className="pdp-restock-note">
            Notification email: <strong>{email}</strong>
            {cleanSelectedOptionValue ? (
              <>
                <br />
                Selected option: <strong>{cleanSelectedOptionValue}</strong>
              </>
            ) : null}
          </p>
        ) : (
          <p className="pdp-restock-note">
            We’ll only use your email for this exact product option restock alert.
          </p>
        )}
      </form>
    </div>
  );
}

function FrequentlyResearchedTogether({
  product,
  recommendations = [],
  addToCart,
  canAddMainProduct,
  onAddMainProduct,
}) {
  const [selectedMap, setSelectedMap] = useState({});
  const [bundleMessage, setBundleMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  if (!recommendations.length) return null;

  const selectedProducts = recommendations.filter((item) => {
    const key = String(item.id);
    return selectedMap[key] ?? true;
  });

  const mainPrice = getNumericPrice(product);
  const selectedTotal = selectedProducts.reduce((total, item) => {
    return total + getNumericPrice(item);
  }, 0);

  const bundleTotal = mainPrice + selectedTotal;

  const toggleProduct = (id) => {
    const key = String(id);

    setBundleMessage("");

    setSelectedMap((current) => ({
      ...current,
      [key]: !(current[key] ?? true),
    }));
  };

  const handleAddBundle = () => {
    setBundleMessage("");

    if (!addToCart || !canAddMainProduct) {
      setBundleMessage("Choose a valid product option before adding the bundle.");
      return;
    }

    onAddMainProduct?.();

    selectedProducts.forEach((item) => {
      addToCart({
        ...item,
        id: item.id,
        product_id: item.id,
        parent_id: item.id,
        variation_id: 0,
        variationId: 0,
        selectedVariationId: 0,
        quantity: 1,
        selectedOption: "",
        selectedOptions: {},
        selectedAttributes: {},
        variation: {},
        variation_attributes: {},
        price: getNumericPrice(item),
        regular_price: item?.regular_price || item?.price || "",
        sale_price: item?.sale_price || "",
        image: getProductImage(item),
        images: item.images,
        cart_name: item.name,
        name: item.name,
        sku: item.sku,
      });
    });

    setBundleMessage("Selected products added to cart.");
  };

  return (
    <div className={`pdp-bundle ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="pdp-bundle-head"
        aria-expanded={isOpen}
        aria-controls="pdp-researched-together-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div>
          <Layers3 size={18} />
        </div>

        <span className="pdp-bundle-head-copy">
          <strong>Frequently researched together</strong>
          <small>
            {recommendations.length} recommendation{recommendations.length === 1 ? "" : "s"}
          </small>
        </span>

        <span className="pdp-bundle-toggle" aria-hidden="true">
          <em>{isOpen ? "Close" : "View"}</em>
          <ChevronDown size={17} />
        </span>
      </button>

      <div
        id="pdp-researched-together-panel"
        className="pdp-bundle-panel"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="pdp-bundle-panel-inner">
          <div className="pdp-bundle-list">
            <div className="pdp-bundle-row is-main">
              <div className="pdp-bundle-dot is-locked">
                <Check size={12} />
              </div>

              <div className="pdp-bundle-copy">
                <strong>{product?.name || "Current product"}</strong>
                <span>Selected item</span>
              </div>

              <em>{formatMoney(mainPrice)}</em>
            </div>

            {recommendations.map((item) => {
              const key = String(item.id);
              const isSelected = selectedMap[key] ?? true;
              const itemCategories = getCategories(item);
              const itemType = itemCategories[0] || "Complement";

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pdp-bundle-row ${isSelected ? "is-selected" : ""}`}
                  onClick={() => toggleProduct(item.id)}
                >
                  <div className="pdp-bundle-dot">
                    {isSelected && <Check size={12} />}
                  </div>

                  <div className="pdp-bundle-copy">
                    <strong>{item.name}</strong>
                    <span>{itemType}</span>
                  </div>

                  <em>{formatMoney(getNumericPrice(item))}</em>
                </button>
              );
            })}
          </div>

          <div className="pdp-bundle-footer">
            <div>
              <small>Bundle total</small>
              <strong>{formatMoney(bundleTotal)}</strong>
            </div>

            <button
              type="button"
              onClick={handleAddBundle}
              disabled={!canAddMainProduct || !addToCart}
            >
              <ShoppingCart size={16} />
              Add selected
            </button>
          </div>

          {bundleMessage && <p className="pdp-bundle-message">{bundleMessage}</p>}
        </div>
      </div>
    </div>
  );
}


function getProductUrl(product) {
  return product?.permalink || (product?.slug ? `/product/${product.slug}` : "/shop");
}

function getFeaturedProducts(currentProduct, products = []) {
  if (!currentProduct || !Array.isArray(products)) return [];

  const currentId = String(currentProduct?.id || "");

  const scoredProducts = products
    .filter((item) => {
      if (!item?.id) return false;
      if (String(item.id) === currentId) return false;
      return getNumericPrice(item) > 0;
    })
    .map((item, index) => ({
      product: item,
      score: scoreRecommendedProduct(currentProduct, item) + Math.max(0, 12 - index),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);

  return scoredProducts.slice(0, 4);
}

function FeaturedProductsSection({ products = [], addToCart }) {
  if (!products.length) return null;

  const handleAddFeatured = (product) => {
    if (!addToCart) return;

    const productType = String(product?.type || "").toLowerCase();
    const isVariable =
      productType === "variable" ||
      (Array.isArray(product?.variations) && product.variations.length > 0);

    if (isVariable) {
      window.location.href = getProductUrl(product);
      return;
    }

    addToCart({
      ...product,
      id: product.id,
      product_id: product.id,
      parent_id: product.id,
      variation_id: 0,
      variationId: 0,
      selectedVariationId: 0,
      quantity: 1,
      selectedOption: "",
      selectedOptions: {},
      selectedAttributes: {},
      variation: {},
      variation_attributes: {},
      price: getNumericPrice(product),
      regular_price: product?.regular_price || product?.price || "",
      sale_price: product?.sale_price || "",
      image: getProductImage(product),
      images: product?.images,
      cart_name: product?.name,
      name: product?.name,
      sku: product?.sku,
    });
  };
}

function BundleCoaSection({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="pdp-bundle-coas" aria-labelledby="bundle-coas-heading">
      <div className="pdp-bundle-coas-head">
        <div className="pdp-bundle-coas-icon">
          <Layers3 size={18} />
        </div>

        <div>
          <small>Bundle documentation</small>
          <h2 id="bundle-coas-heading">COAs for the products in this bundle</h2>
          <p>Each product has its own current-lot certificate.</p>
        </div>

        <span>{items.length} COAs</span>
      </div>

      <div className="pdp-bundle-coa-list">
        {items.map((item, index) => {
          const panelTypes = item.record ? getCoaPanelTypes(item.record) : [];

          return (
            <article className="pdp-bundle-coa-item" key={item.key}>
              <div className="pdp-bundle-coa-number">{String(index + 1).padStart(2, "0")}</div>

              <div className="pdp-bundle-coa-copy">
                <div className="pdp-bundle-coa-title">
                  <strong>{item.name}</strong>
                  {item.record ? (
                    <span className="is-available">
                      <CheckCircle2 size={12} /> Current lot
                    </span>
                  ) : (
                    <span className="is-pending">COA not available</span>
                  )}
                </div>

                {item.record ? (
                  <p>
                    {item.strength ? `${item.strength} · ` : ""}
                    {item.lot}
                    {item.date ? ` · ${item.date}` : ""}
                  </p>
                ) : (
                  <p>The current certificate for this product is being updated.</p>
                )}

                {panelTypes.length > 0 && (
                  <div className="pdp-bundle-coa-panels">
                    {panelTypes.map((panelType) => {
                      const panel = getCoaPanelMeta(panelType);

                      return (
                        <span key={panelType} className={`pdp-panel-badge ${panel.className}`}>
                          <i />
                          {panel.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="pdp-file-action pdp-bundle-coa-action"
                  aria-label={`View COA for ${item.name}`}
                >
                  View COA
                  <ArrowUpRight size={14} />
                </a>
              ) : (
                <span className="pdp-bundle-coa-unavailable">Unavailable</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductDetailSection({
  product,
  recommendedProducts = [],
}) {
  const cart = useCart();
  const addToCart = cart?.addToCart;

  const gallery = useMemo(() => getGallery(product), [product]);
  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [coaEducationOpen, setCoaEducationOpen] = useState(false);
  const [liveCoaRecords, setLiveCoaRecords] = useState([]);
  const [coaLibraryStatus, setCoaLibraryStatus] = useState("loading");

  const attributeGroups = useMemo(() => getAttributeGroups(product), [product]);

  const [selectedAttributes, setSelectedAttributes] = useState(() =>
    getInitialSelectedAttributes(attributeGroups)
  );

  const selectedVariation = useMemo(
    () => getSelectedVariation(product, selectedAttributes),
    [product, selectedAttributes]
  );

  useEffect(() => {
    let active = true;

    async function loadLiveCoaLibrary() {
      setCoaLibraryStatus("loading");

      try {
        const payload = await loadPublicCoaCatalog();
        const records = Array.isArray(payload?.records) ? payload.records : [];

        if (!active) return;

        setLiveCoaRecords(records);
        setCoaLibraryStatus("ready");
      } catch (error) {
        if (!active) return;

        setLiveCoaRecords([]);
        setCoaLibraryStatus("error");
        console.error("Could not load the live COA library:", error);
      }
    }

    loadLiveCoaLibrary();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const variationImage = getVariationImage(selectedVariation);

    if (!variationImage) return;

    setActiveImage({
      id: `variation-${selectedVariation?.id || variationImage}`,
      src: variationImage,
      alt: product?.name || "Selected product option",
      label: "Selected option",
    });
  }, [selectedVariation, product?.name]);

  const technicalFacts = useMemo(() => getTechnicalFacts(product), [product]);

  const bundleRecommendations = useMemo(() => {
    return getRecommendedProducts(product, recommendedProducts);
  }, [product, recommendedProducts]);

  const featuredProducts = useMemo(() => {
    return getFeaturedProducts(product, recommendedProducts);
  }, [product, recommendedProducts]);

  if (!product) {
    return (
      <section className="pdp">
        <div className="pdp-error">
          <p>Product Error</p>
          <h1>Product not found</h1>
          <span>This product could not be loaded.</span>
          <a href="/shop">Back to shop</a>
        </div>
      </section>
    );
  }

  const name = product?.name || "Research Product";
  const categories = getCategories(product);
  const category = categories[0] || "Research Product";

  const productPrice = getCurrentPrice(product, selectedVariation);
  const regularPrice = getCurrentRegularPrice(product, selectedVariation);
  const price = formatMoney(productPrice);
  const regularPriceFormatted = formatMoney(regularPrice);

  const productIsAccessory = isAccessoryProduct(product);
  const productType = String(product?.type || "").toLowerCase();
  const variationObjects = getVariationObjects(product);
  const isVariableProduct =
    productType === "variable" || attributeGroups.length > 0;

  const showCustomOrderRequest = isCustomOrderProduct(product);

  const needsVariationMatch = isVariableProduct && variationObjects.length > 0;
  const hasValidVariation = needsVariationMatch
    ? Boolean(selectedVariation)
    : true;

  const variationPayload = getWooVariationPayload(
    attributeGroups,
    selectedAttributes
  );

  const selectedOptionLabel = getSelectedOptionLabel(
    attributeGroups,
    selectedAttributes
  );

  // Accessories can also have laboratory documentation. Recon Water was
  // previously blocked here because its name contains "water".
  const currentCoaRecord = findCurrentCoaRecord(
    product,
    liveCoaRecords,
    selectedVariation,
    selectedOptionLabel,
    selectedAttributes
  );
  const coaGuideProduct = useMemo(
    () => ({
      ...product,
      variation_id: selectedVariation?.id || 0,
      variationId: selectedVariation?.id || 0,
      selectedVariationId: selectedVariation?.id || 0,
      variationSku: selectedVariation?.sku || "",
      selectedOption: selectedOptionLabel,
      strength: selectedOptionLabel,
    }),
    [product, selectedOptionLabel, selectedVariation?.id, selectedVariation?.sku]
  );

  const currentCoaUrl = currentCoaRecord ? getRecordUrl(currentCoaRecord) : "";
  const currentCoaLot = currentCoaRecord ? getRecordLot(currentCoaRecord) : "";
  const currentCoaDate = currentCoaRecord ? getRecordDate(currentCoaRecord) : "";
  const currentCoaPanelTypes = currentCoaRecord
    ? getCoaPanelTypes(currentCoaRecord)
    : [];

  const bundleProducts = useMemo(
    () => getBundleProducts(product, recommendedProducts),
    [product, recommendedProducts]
  );

  const bundleCoaItems = useMemo(
    () =>
      bundleProducts.map((bundleProduct, index) => {
        const strength = getBundleComponentStrength(product, bundleProduct);
        const record = findCurrentCoaRecord(
          bundleProduct,
          liveCoaRecords,
          null,
          strength
        );

        return {
          key: String(
            bundleProduct?.id || bundleProduct?.sku || bundleProduct?.slug || index
          ),
          name: bundleProduct?.name || bundleProduct?.product_name || `Product ${index + 1}`,
          strength,
          record,
          lot: record ? getRecordLot(record) : "",
          date: record ? getRecordDate(record) : "",
          url: record ? getRecordUrl(record) : "",
        };
      }),
    [bundleProducts, liveCoaRecords]
  );

  const showCurrentCoa = Boolean(currentCoaRecord);
  // A bundle has its own organized list of product-level COAs. Showing a
  // separate COA for the bundle itself above that list is redundant.
  const showStandaloneCoa = showCurrentCoa && bundleCoaItems.length === 0;
  const points = Math.max(Math.floor(Number(productPrice || 0)), 0);

  const shortDescription = sanitizeWooHtml(product?.short_description || "");
  const fullDescription = sanitizeWooHtml(product?.description || "");
  const fallbackDescription =
    stripHtml(product?.description) ||
    stripHtml(product?.short_description) ||
    "Product details are provided for research catalog review and ordering reference.";

  const selectedInventoryTarget =
    needsVariationMatch && selectedVariation ? selectedVariation : product;
  const selectedPurchaseLimit = getProductPurchaseLimit({
    ...product,
    stock_quantity:
      selectedInventoryTarget?.stock_quantity ?? product?.stock_quantity,
    stockQuantity:
      selectedInventoryTarget?.stockQuantity ?? product?.stockQuantity,
    manage_stock:
      selectedInventoryTarget?.manage_stock ?? product?.manage_stock,
    backorders:
      selectedInventoryTarget?.backorders ?? product?.backorders,
    backorders_allowed:
      selectedInventoryTarget?.backorders_allowed ??
      product?.backorders_allowed,
    sold_individually:
      selectedInventoryTarget?.sold_individually ?? product?.sold_individually,
    add_to_cart:
      selectedInventoryTarget?.add_to_cart ?? product?.add_to_cart,
    variation_id: selectedVariation?.id || 0,
    variationId: selectedVariation?.id || 0,
  });
  const selectedProductId = Number(product?.id || 0);
  const selectedVariationId = Number(selectedVariation?.id || 0);
  const selectedCartQuantity = (cart?.cartItems || []).reduce((total, item) => {
    const itemProductId = Number(
      item?.product_id || item?.parent_id || item?.productId || item?.id || 0,
    );
    const itemVariationId = Number(
      item?.variation_id || item?.variationId || item?.selectedVariationId || 0,
    );

    return itemProductId === selectedProductId &&
      itemVariationId === selectedVariationId
      ? total + Number(item?.quantity || 0)
      : total;
  }, 0);
  const remainingPurchaseQuantity = selectedPurchaseLimit
    ? Math.max(selectedPurchaseLimit - selectedCartQuantity, 0)
    : null;
  const effectiveQuantity = remainingPurchaseQuantity !== null
    ? Math.min(quantity, remainingPurchaseQuantity)
    : quantity;

  const stockStatus =
    needsVariationMatch && !selectedVariation
      ? "Out of stock"
      : getStockStatus(selectedInventoryTarget);

  const isAvailable =
    hasValidVariation && stockStatus.toLowerCase() === "in stock";

  const displayImage = activeImage?.src || getProductImage(product);

  useEffect(() => {
    if (
      remainingPurchaseQuantity !== null &&
      remainingPurchaseQuantity > 0 &&
      quantity > remainingPurchaseQuantity
    ) {
      setQuantity(remainingPurchaseQuantity);
    }
  }, [quantity, remainingPurchaseQuantity]);

  const handleSelectAttribute = (attributeSlug, option) => {
    setSelectedAttributes((current) => ({
      ...current,
      [attributeSlug]: option,
    }));

    setCartMessage("");
  };

  const handleAddToCart = async () => {
    setCartMessage("");

    if (!addToCart) {
      setCartMessage("Cart is not ready. Refresh the page and try again.");
      return;
    }

    if (!isAvailable) {
      setCartMessage("This product is currently not available.");
      return;
    }

    if (!hasValidVariation) {
      setCartMessage("Please choose a valid product option before adding to cart.");
      return;
    }

    if (remainingPurchaseQuantity === 0) {
      setCartMessage(
        `You already have all ${selectedPurchaseLimit} available unit${selectedPurchaseLimit === 1 ? "" : "s"} in your cart.`,
      );
      cart?.setIsCartOpen?.(true);
      return;
    }

    const cartItem = {
      ...product,

      id: product.id,
      product_id: product.id,
      parent_id: product.id,

      variation_id: selectedVariation?.id || 0,
      variationId: selectedVariation?.id || 0,
      selectedVariationId: selectedVariation?.id || 0,

      quantity: effectiveQuantity,
      selectedOption: selectedOptionLabel,
      selectedOptions: selectedAttributes,
      selectedAttributes,
      variation: variationPayload,
      variation_attributes: variationPayload,

      price: productPrice,
      regular_price: regularPrice,
      sale_price: selectedVariation?.sale_price || product?.sale_price || "",

      image: displayImage,
      images: product?.images,

      cart_name: selectedOptionLabel
        ? `${name} — ${selectedOptionLabel}`
        : name,
      name,
      sku: selectedVariation?.sku || product?.sku,
      stock_quantity:
        selectedInventoryTarget?.stock_quantity ?? product?.stock_quantity,
      stockQuantity:
        selectedInventoryTarget?.stockQuantity ?? product?.stockQuantity,
      manage_stock:
        selectedInventoryTarget?.manage_stock ?? product?.manage_stock,
      backorders:
        selectedInventoryTarget?.backorders ?? product?.backorders,
      backorders_allowed:
        selectedInventoryTarget?.backorders_allowed ??
        product?.backorders_allowed,
      sold_individually:
        selectedInventoryTarget?.sold_individually ?? product?.sold_individually,
      add_to_cart:
        selectedInventoryTarget?.add_to_cart ?? product?.add_to_cart,
    };

    const result = await addToCart(cartItem);

    if (!result || result.addedQuantity > 0) {
      setCartMessage(result?.message || "Added to cart.");
    } else {
      setCartMessage(result.message || "No more units are currently available.");
    }
  };

  return (
    <section className="pdp">
      <div className="pdp-noise" />
      <div className="pdp-glow pdp-glow-a" />
      <div className="pdp-glow pdp-glow-b" />

      <div className="pdp-shell">
        <div className="pdp-hero">
          <div className="pdp-gallery">
            <div className="pdp-stage">
              {showStandaloneCoa && (
                <div className="pdp-lot">
                  <ShieldCheck size={14} />
                  Current lot
                </div>
              )}

              <img
                src={displayImage}
                alt={activeImage?.alt || name}
                width="900"
                height="900"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            <button
              type="button"
              className="pdp-coa-education"
              onClick={() => setCoaEducationOpen(true)}
              aria-label={`Open guide: How to read the COA for ${name}`}
            >
              <span className="pdp-coa-education__mark"><ScanLine size={17} /></span>
              <span className="pdp-coa-education__copy">
                <small>COA field guide</small>
                <strong>How to read your COA</strong>
              </span>
              <span className="pdp-coa-education__meta">Interactive · 60 sec</span>
              <ArrowUpRight size={16} className="pdp-coa-education__arrow" />
            </button>

            {gallery.length > 1 && (
              <div className="pdp-gallery-rail" aria-label="Product gallery">
                {gallery.slice(0, 8).map((image) => {
                  const isActive = activeImage?.id === image.id;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      className={`pdp-gallery-dot ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() => setActiveImage(image)}
                      aria-label={`Show ${image.label}`}
                    >
                      <img
                        src={image.thumbnail || image.src}
                        srcSet={image.srcSet || undefined}
                        sizes={image.sizes || "72px"}
                        alt={image.alt}
                        width="72"
                        height="72"
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.onerror = null;
                          target.src = image.src;
                          target.removeAttribute("srcset");
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pdp-info">
            <div className="pdp-lab-sheet">
              <div className="pdp-lab-top">
                <div>
                  <p className="pdp-lab-overline">{category}</p>
                  <h1>{name}</h1>
                </div>

                <div className={`pdp-stock-pill ${!isAvailable ? "is-out" : ""}`}>
                  <span />
                  {stockStatus}
                </div>
              </div>

              <div className="pdp-price-band">
                <div>
                  <small>Catalog price</small>

                  <div className="pdp-price-value">
                    {regularPrice && regularPrice !== productPrice && (
                      <em>{regularPriceFormatted}</em>
                    )}

                    <strong>{price}</strong>
                  </div>
                </div>

                <div className="pdp-points-chip">
                  <Sparkles size={15} />
                  {points} pts
                </div>
              </div>

              <div className="pdp-brief">
                <div className="pdp-brief-index">01</div>

                <div>
                  <small>Research brief</small>

                  {shortDescription ? (
                    <div
                      className="pdp-short"
                      dangerouslySetInnerHTML={{ __html: shortDescription }}
                    />
                  ) : (
                    <p className="pdp-short-text">{fallbackDescription}</p>
                  )}
                </div>
              </div>

              {showStandaloneCoa && (
                <div
                  className="pdp-file-row"
                  data-coa-layout="inline-panels-v3"
                >
                  <div className="pdp-file-mark">
                    <FileCheck2 size={20} />
                    <Check size={12} />
                  </div>

                  <div className="pdp-file-copy">
                    <div className="pdp-file-kicker-row">
                      <small>
                        <Layers3 size={11} />
                        Latest COA
                      </small>

                      {currentCoaPanelTypes.length > 0 && (
                        <div
                          className="pdp-file-panels"
                          aria-label="Panels active on the latest COA"
                        >
                          {currentCoaPanelTypes.map((panelType) => {
                            const panel = getCoaPanelMeta(panelType);

                            return (
                              <span
                                key={panelType}
                                className={`pdp-panel-badge ${panel.className}`}
                                title={panel.label}
                              >
                                <i />
                                {panel.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <strong>{currentCoaLot}</strong>

                    <span className="pdp-file-meta">
                      {currentCoaDate
                        ? `Most recent certificate · ${currentCoaDate}`
                        : "Most recent certificate matched from the live COA library"}
                    </span>
                  </div>

                  {currentCoaUrl ? (
                    <a
                      href={currentCoaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="pdp-file-action"
                    >
                      View COA
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="pdp-file-action is-disabled"
                      disabled
                      title="This current COA record was found, but no URL field was detected."
                    >
                      COA link missing
                    </button>
                  )}
                </div>
              )}

              {!productIsAccessory && coaLibraryStatus === "loading" && (
                <div className="pdp-file-row is-loading">
                  <div className="pdp-file-mark">
                    <Loader2 size={20} className="pdp-spin" />
                  </div>

                  <div className="pdp-file-copy">
                    <small>Live COA library</small>
                    <strong>Checking the current shipping lot…</strong>
                    <span>Reading the WordPress COA endpoint</span>
                  </div>
                </div>
              )}

              <BundleCoaSection items={bundleCoaItems} />

              <DispatchCutoff variant="product" />

              <div className="pdp-order-console">
                <div className="pdp-console-head">
                  <span>Order console</span>
                  <em>Secure checkout</em>
                </div>

                {attributeGroups.length > 0 && (
                  <div className="pdp-variant-stack">
                    {attributeGroups.map((attribute) => (
                      <div className="pdp-variant-module" key={attribute.id}>
                        <div className="pdp-variant-head">
                          <span>{attribute.name}</span>
                          <em>{selectedAttributes?.[attribute.slug]}</em>
                        </div>

                        <div className="pdp-variant-grid" role="radiogroup">
                          {attribute.options.map((option) => {
                            const active =
                              selectedAttributes?.[attribute.slug] === option;

                            return (
                              <button
                                key={`${attribute.slug}-${option}`}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`pdp-variant-pill ${
                                  active ? "is-active" : ""
                                }`}
                                onClick={() =>
                                  handleSelectAttribute(attribute.slug, option)
                                }
                              >
                                <span>{option}</span>

                                {active && (
                                  <strong>
                                    <Check size={13} />
                                  </strong>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {needsVariationMatch && !selectedVariation && (
                      <p className="pdp-option-warning">
                        This option combination is not available. Choose another
                        option.
                      </p>
                    )}
                  </div>
                )}

                {isAvailable ? (
                  <>
                    <div className="pdp-buyline">
                    <div className="pdp-qty">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.max(current - 1, 1))
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <span>{quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            selectedPurchaseLimit
                              ? Math.min(
                                  current + 1,
                                  Math.max(remainingPurchaseQuantity || 1, 1),
                                )
                              : current + 1
                          )
                        }
                        aria-label="Increase quantity"
                        disabled={
                          remainingPurchaseQuantity !== null &&
                          (remainingPurchaseQuantity === 0 ||
                            quantity >= remainingPurchaseQuantity)
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pdp-add"
                      onClick={handleAddToCart}
                      disabled={
                        !addToCart ||
                        !hasValidVariation ||
                        remainingPurchaseQuantity === 0
                      }
                    >
                      <ShoppingCart size={16} />
                      Add to cart
                    </button>

                    {selectedPurchaseLimit && (
                      <div
                        className={`pdp-quantity-note ${
                          remainingPurchaseQuantity === 0 ? "is-limit" : ""
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        <span className="pdp-quantity-note-icon" aria-hidden="true">
                          <PackageCheck size={16} />
                        </span>

                        <span className="pdp-quantity-note-copy">
                          <strong>
                            {remainingPurchaseQuantity === 0
                              ? "Cart limit reached"
                              : "Available to add"}
                          </strong>
                          <small>
                            {selectedCartQuantity > 0
                              ? `${selectedCartQuantity} already in cart`
                              : "Current inventory"}
                          </small>
                        </span>

                        <span className="pdp-quantity-note-value">
                          {remainingPurchaseQuantity}
                          <small>
                            {remainingPurchaseQuantity === 1 ? "unit" : "units"}
                          </small>
                        </span>
                      </div>
                    )}
                  </div>

                  {showCustomOrderRequest && (
                    <div className="pdp-custom-request-card is-below-cart">
                      <button
                        type="button"
                        className="pdp-custom-request-button"
                        onClick={() => setCustomOrderOpen(true)}
                      >
                        <ClipboardCheck size={17} />
                        Request custom order
                        <ArrowUpRight size={14} />
                      </button>

                      <div className="pdp-custom-request-copy">
                        <strong>Need a custom color or bulk quantity?</strong>
                        <p>
                          Submit your specifications and our team will review
                          pricing, production lead time, and availability.
                        </p>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <SoldOutNotifyCard
                    key={`${product?.id || "product"}-${
                      selectedVariation?.id || selectedOptionLabel || "no-variation"
                    }`}
                    product={product}
                    selectedVariation={selectedVariation}
                    selectedAttributes={selectedAttributes}
                    selectedOptionLabel={selectedOptionLabel}
                    variationPayload={variationPayload}
                    productName={name}
                    account={cart?.account}
                    accountEmail={cart?.accountEmail}
                    accountName={cart?.accountName}
                  />
                )}

                {cartMessage && (
                  <p className="pdp-cart-message">{cartMessage}</p>
                )}
              </div>

              <FrequentlyResearchedTogether
                product={product}
                recommendations={bundleRecommendations}
                addToCart={addToCart}
                canAddMainProduct={
                  isAvailable && Boolean(addToCart) && hasValidVariation
                }
                onAddMainProduct={handleAddToCart}
              />

              <div className="pdp-assurance-grid">
                <InfoRow icon={PackageCheck}>{stockStatus}</InfoRow>
                <InfoRow icon={Truck}>Shipping calculated at checkout</InfoRow>
                {showStandaloneCoa && (
                  <InfoRow icon={BadgeCheck}>Current lot COA available</InfoRow>
                )}
              </div>

              <div className="pdp-policy-note">
                <ShieldCheck size={17} />
                <p>
                  <strong>All sales are final.</strong> Due to the nature of the product,
                  no returns, refunds, or exchanges are accepted once an order is placed.
                </p>
              </div>

              <div className="pdp-meta-line">
                {product?.sku && (
                  <span>
                    <strong>SKU:</strong> {product.sku}
                  </span>
                )}

                {categories.length > 0 && (
                  <span>
                    <strong>Categories:</strong> {categories.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pdp-usage">
          <div>
            <ShieldCheck size={18} />
          </div>

          <p>
            <strong>Product Usage:</strong> For research use only. This product
            is not intended for human consumption, veterinary use, diagnosis,
            treatment, cure, or prevention of disease.
          </p>
        </div>

        <div className="pdp-body">
          <article className="pdp-description">
            <div className="pdp-section-head">
              <p>Description</p>
              <h2>Product details</h2>
            </div>

            {fullDescription ? (
              <div
                className="pdp-woo"
                dangerouslySetInnerHTML={{ __html: fullDescription }}
              />
            ) : (
              <p className="pdp-fallback">{fallbackDescription}</p>
            )}
          </article>

          {(technicalFacts.length > 0 || attributeGroups.length > 0) && (
            <aside className="pdp-details">
              <div className="pdp-section-head">
                <p>Specs</p>
                <h2>Quick info</h2>
              </div>

              <div className="pdp-detail-list">
                {technicalFacts.map((fact) => (
                  <div key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}

                {attributeGroups.map((attribute) => (
                  <div key={attribute.id}>
                    <span>{attribute.name}</span>

                    <div className="pdp-tags">
                      {attribute.options.map((option) => (
                        <em key={option}>{option}</em>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        <FeaturedProductsSection
          products={featuredProducts}
          addToCart={addToCart}
        />
      </div>

      {showCustomOrderRequest && customOrderOpen && (
        <CustomOrderRequestModal
          product={product}
          productName={name}
          account={cart?.account}
          accountEmail={cart?.accountEmail}
          accountName={cart?.accountName}
          onClose={() => setCustomOrderOpen(false)}
        />
      )}

      {coaEducationOpen ? (
        <Suspense fallback={null}>
          <CoaEducationGuide
            product={coaGuideProduct}
            productName={currentCoaRecord?.product?.name || name}
            productImage={{
              src: displayImage,
              alt: activeImage?.alt || name,
            }}
            record={currentCoaRecord}
            onClose={() => setCoaEducationOpen(false)}
            onOpenCertificate={(record) => {
              const certificateUrl = getRecordUrl(record) || currentCoaUrl;
              setCoaEducationOpen(false);
              if (certificateUrl) {
                window.open(certificateUrl, "_blank", "noopener,noreferrer");
              }
            }}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

function isBundleProduct(product = {}) {
  const productType = normalizeText(product?.type || "");
  const bundleTypes = ["bundle", "bundled", "grouped", "composite", "mix and match"];
  const bundleIdentity = normalizeText(
    [product?.name, product?.slug, ...getCategories(product)].filter(Boolean).join(" ")
  );

  return bundleTypes.some(
    (type) => productType === type || productType.includes(type)
  ) || /\bbundle\b/.test(bundleIdentity);
}

function toBundleReferenceArray(value) {
  if (value === null || value === undefined || value === "") return [];

  if (Array.isArray(value)) return value.flatMap(toBundleReferenceArray);

  if (typeof value === "string") {
    const cleanValue = value.trim();

    if (!cleanValue) return [];

    try {
      const parsed = JSON.parse(cleanValue);
      if (parsed !== cleanValue) return toBundleReferenceArray(parsed);
    } catch {
      // Some WooCommerce bundle plugins store a comma-separated ID list.
    }

    return cleanValue.split(",").map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "object") {
    const productReference =
      value?.product_id ||
      value?.productId ||
      value?.product_ids ||
      value?.productIds ||
      value?.assigned_ids ||
      value?.assignedIds ||
      value?.products ||
      value?.product;

    if (productReference !== undefined && productReference !== null) {
      return toBundleReferenceArray(productReference);
    }

    if (value?.id || value?.name || value?.sku || value?.slug) return [value];

    return Object.values(value).flatMap(toBundleReferenceArray);
  }

  return [];
}

function getBundleReferences(product = {}) {
  const metaData = Array.isArray(product?.meta_data) ? product.meta_data : [];
  const bundleKeys = new Set([
    "bundled_items",
    "bundle_items",
    "bundle_products",
    "grouped_products",
    "composite_components",
    "components",
    "products",
  ]);

  const topLevelValues = [
    product?.bundled_items,
    product?.bundledItems,
    product?.bundle_items,
    product?.bundleItems,
    product?.bundle_products,
    product?.bundleProducts,
    product?.grouped_products,
    product?.groupedProducts,
    product?.composite_components,
    product?.compositeComponents,
    product?.components,
  ];

  const metaValues = metaData
    .filter((item) => {
      const key = normalizeText(item?.key).replace(/\s+/g, "_");

      return (
        bundleKeys.has(key) ||
        (key.includes("bundle") &&
          (key.includes("item") ||
            key.includes("data") ||
            key.includes("product") ||
            key.includes("component"))) ||
        (key.includes("composite") && key.includes("component"))
      );
    })
    .map((item) => item?.value);

  return [...topLevelValues, ...metaValues].flatMap(toBundleReferenceArray);
}

function getBundleReferenceProduct(reference, products = []) {
  if (!reference) return null;

  if (typeof reference === "object") {
    const id = normalizeId(
      reference?.product_id ||
        reference?.productId ||
        reference?.id ||
        reference?.bundled_item_id
    );

    const matchingProduct = products.find(
      (item) => normalizeId(item?.id) === id
    );

    return matchingProduct || reference;
  }

  const referenceText = String(reference || "").trim();
  const referenceId = normalizeId(referenceText);
  const normalizedReference = normalizeText(referenceText);

  return (
    products.find((item) => normalizeId(item?.id) === referenceId) ||
    products.find((item) => normalizeText(item?.sku) === normalizedReference) ||
    products.find((item) => normalizeSlug(item?.slug) === normalizeSlug(referenceText)) ||
    products.find((item) => normalizeText(item?.name) === normalizedReference) ||
    { id: referenceId || referenceText, name: referenceText }
  );
}

function getBundleProducts(product, products = []) {
  if (!product) return [];

  const references = getBundleReferences(product);
  const resolvedProducts = references
    .map((reference) => getBundleReferenceProduct(reference, products))
    // A stock-component ID can be a variation ID rather than a catalog
    // product. Keep only entries with an identity the customer can read;
    // the bundle description supplies the matching parent product below.
    .filter((item) => Boolean(item?.name || item?.product_name));

  // If a bundle plugin exposes only its marketing description, match the
  // included catalog products by name. This keeps COA access working across
  // the common WooCommerce bundle plugins.
  const descriptionText = normalizeText(
    [product?.short_description, product?.description].filter(Boolean).join(" ")
  );
  const descriptionProducts =
    isBundleProduct(product) && descriptionText
      ? products.filter((item) => {
          if (String(item?.id || "") === String(product?.id || "")) return false;
          const itemName = normalizeText(item?.name || "");
          return itemName.length > 2 && descriptionText.includes(itemName);
        })
      : [];

  const seen = new Set();

  return [...resolvedProducts, ...descriptionProducts]
    .filter((item) => {
      const key = String(item?.id || item?.sku || item?.slug || item?.name || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function getBundleComponentStrength(bundle = {}, component = {}) {
  const bundleText = stripHtml(
    [bundle?.short_description, bundle?.description].filter(Boolean).join(" ")
  );

  const aliases = [component?.name, component?.slug]
    .map(normalizeText)
    .filter(Boolean);

  for (const alias of aliases) {
    const parts = alias.split(/\s+/).filter(Boolean);
    if (!parts.length) continue;

    const productPattern = parts
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^a-z0-9]{0,8}");
    const match = bundleText.match(
      new RegExp(
        `(?:^|[^a-z0-9])${productPattern}[^a-z0-9]{0,10}(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|ml|iu))\\b`,
        "i"
      )
    );

    if (match?.[1]) return normalizeText(match[1]);
  }

  // Simple products sometimes have the concentration in their catalog name
  // or slug, while variable products receive it from the bundle description.
  return extractStrengthText(component?.name, component?.slug);
}
