import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
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
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { useCart } from "../cart/CartContext";

const COA_LIBRARY_PATH = "/wp-json/phaseone/v1/coas";

function getCoaLibraryEndpoint() {
  const explicitEndpoint =
    import.meta.env.PUBLIC_COA_API_URL ||
    import.meta.env.PUBLIC_COA_ENDPOINT;

  if (explicitEndpoint) {
    return String(explicitEndpoint).trim();
  }

  const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;

  if (wpSiteUrl) {
    return `${String(wpSiteUrl).replace(/\/$/, "")}${COA_LIBRARY_PATH}`;
  }

  if (typeof window !== "undefined") {
    return new URL(COA_LIBRARY_PATH, window.location.origin).toString();
  }

  return COA_LIBRARY_PATH;
}

function normalizeCoaLibraryPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.coas)) return payload.coas;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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
  "3x": { label: "3X Tested", className: "is-3x" },
  "4x": { label: "4X Tested", className: "is-4x" },
  "8x": { label: "8X Tested", className: "is-8x" },
  standard: { label: "Standard Panel", className: "is-standard" },
  full: { label: "Full Panel", className: "is-full" },
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

function getRecordProductName(record) {
  return (
    record?.productName ||
    record?.product_name ||
    record?.product ||
    record?.compound ||
    record?.title ||
    record?.name ||
    ""
  );
}

function getRecordProductSlug(record) {
  return (
    record?.productSlug ||
    record?.product_slug ||
    record?.slug ||
    record?.handle ||
    ""
  );
}

function getRecordSku(record) {
  return (
    record?.sku ||
    record?.productSku ||
    record?.product_sku ||
    (Array.isArray(record?.skus) ? record.skus[0] : "") ||
    ""
  );
}

function normalizeId(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getRecordIdList(record, ...keys) {
  return keys
    .flatMap((key) => {
      const value = record?.[key];

      if (Array.isArray(value)) return value;
      if (value !== undefined && value !== null && value !== "") return [value];

      return [];
    })
    .map(normalizeId)
    .filter(Boolean);
}

function getRecordSkuList(record) {
  return [
    record?.sku,
    record?.productSku,
    record?.product_sku,
    ...(Array.isArray(record?.skus) ? record.skus : []),
  ]
    .filter(Boolean)
    .map((sku) => normalizeText(sku));
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

function isCurrentCoaRecord(record) {
  const status = normalizeText(
    [
      record?.status,
      record?.badge,
      record?.lotStatus,
      record?.lot_status,
      record?.shippingStatus,
      record?.shipping_status,
      record?.label,
      record?.tag,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return Boolean(
    record?.current === true ||
      record?.isCurrent === true ||
      record?.is_current === true ||
      record?.currentShippingLot === true ||
      record?.current_shipping_lot === true ||
      record?.active === true ||
      status.includes("current") ||
      status.includes("currently shipping") ||
      status.includes("shipping lot")
  );
}

function extractStrengthText(...values) {
  const joined = values
    .flat(Infinity)
    .filter(Boolean)
    .join(" ");

  const match = String(joined).match(
    /\b\d+(?:\.\d+)?\s*(mg|mcg|g|ml|iu)\b/i
  );

  return match ? normalizeText(match[0]) : "";
}

function getRecordAliases(record) {
  const aliases = Array.isArray(record?.aliases) ? record.aliases : [];

  return [
    getRecordProductName(record),
    record?.compound,
    record?.productName,
    record?.product_name,
    record?.name,
    record?.title,
    record?.strength ? `${getRecordProductName(record)} ${record.strength}` : "",
    ...aliases,
  ]
    .filter(Boolean)
    .map(normalizeText);
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

function getRecordStrengthText(record) {
  return extractStrengthText(
    record?.strength,
    record?.batch,
    record?.productName,
    record?.compound,
    Array.isArray(record?.aliases) ? record.aliases : []
  );
}


function getCanonicalCoaKey(...values) {
  const clean = normalizeText(values.flat(Infinity).filter(Boolean).join(" "));

  if (!clean) return "";

  const hasBpc =
    /\bbpc\b/.test(clean) ||
    /\bbpc157\b/.test(clean) ||
    clean.includes("bpc 157");

  const hasTb =
    /\btb\b/.test(clean) ||
    /\btb500\b/.test(clean) ||
    clean.includes("tb 500") ||
    clean.includes("thymosin b4");

  if (hasBpc && hasTb) return "bpc-157-tb-500";
  if (hasBpc) return "bpc-157";

  if (
    clean.includes("tirzepatide") ||
    /\btirz\b/.test(clean) ||
    /\btz2\b/.test(clean)
  ) {
    return "tirzepatide";
  }

  if (
    clean.includes("retatrutide") ||
    /\breta\b/.test(clean) ||
    /\brt3\b/.test(clean)
  ) {
    return "retatrutide";
  }

  if (/\bklow\b/.test(clean) || clean.includes("k low")) return "klow";

  if (
    clean.includes("ghk cu") ||
    clean.includes("ghk-cu") ||
    /\bghkcu\b/.test(clean) ||
    /\bghk\b/.test(clean)
  ) {
    return "ghk-cu";
  }

  if (
    clean.includes("mots c") ||
    clean.includes("mots-c") ||
    /\bmotsc\b/.test(clean)
  ) {
    return "mots-c";
  }

  if (/\bnad\b/.test(clean) || clean.includes("nad plus")) return "nad-plus";

  // Recon Water can appear under several legacy/store names.
  if (
    clean.includes("recon water") ||
    clean.includes("reconstitution water") ||
    clean.includes("reconstitution solution") ||
    clean.includes("bacteriostatic water") ||
    clean.includes("bac water") ||
    clean.includes("p1 water") ||
    clean.includes("sterile water")
  ) {
    return "recon-water";
  }

  return "";
}

function getRecordCanonicalKey(record) {
  return getCanonicalCoaKey(
    getRecordProductName(record),
    record?.compound,
    record?.productName,
    record?.product_name,
    record?.name,
    record?.title,
    record?.batch,
    Array.isArray(record?.aliases) ? record.aliases : []
  );
}

function getProductCanonicalKey(
  product,
  selectedVariation = null,
  selectedOptionLabel = "",
  selectedAttributes = {}
) {
  return getCanonicalCoaKey(
    product?.name,
    product?.slug,
    product?.sku,
    product?.short_description,
    selectedVariation?.name,
    selectedVariation?.slug,
    selectedVariation?.sku,
    selectedOptionLabel,
    Object.values(selectedAttributes || {})
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

  const productId = normalizeId(product?.id || product?.product_id);
  const parentProductId = normalizeId(
    product?.parent_id || product?.parentId || product?.parent
  );

  const selectedVariationId = normalizeId(
    selectedVariation?.id ||
      selectedVariation?.variation_id ||
      selectedVariation?.variationId
  );

  const productName = normalizeText(product?.name || "");
  const productSlug = normalizeSlug(product?.slug || product?.name || "");
  const productSku = normalizeText(product?.sku || "");
  const variationSku = normalizeText(selectedVariation?.sku || "");

  const selectedStrength = getSelectedCoaStrengthText(
    product,
    selectedVariation,
    selectedOptionLabel,
    selectedAttributes
  );

  const variationName = normalizeText(
    [
      selectedVariation?.name,
      selectedVariation?.slug,
      selectedOptionLabel,
      Object.values(selectedAttributes || {}).join(" "),
      product?.name,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const productCoaKey = getProductCanonicalKey(
    product,
    selectedVariation,
    selectedOptionLabel,
    selectedAttributes
  );

  const currentRecords = records.filter(isCurrentCoaRecord);

  if (selectedVariationId) {
    const exactVariationMatch = currentRecords.find((record) => {
      const variationIds = getRecordIdList(
        record,
        "variationIds",
        "variationId",
        "variation_id"
      );
      const wooIds = getRecordIdList(record, "wooIds", "wooId", "woo_id");

      return (
        variationIds.includes(selectedVariationId) ||
        wooIds.includes(selectedVariationId)
      );
    });

    if (exactVariationMatch) return exactVariationMatch;

    // Do not stop here. Some COAs are connected to the parent product, SKU,
    // or family alias instead of one exact WooCommerce variation ID.
  }

  if (variationSku || productSku) {
    const exactSkuMatch = currentRecords.find((record) => {
      const recordSkus = getRecordSkuList(record);

      return Boolean(
        (variationSku && recordSkus.includes(variationSku)) ||
          (productSku && recordSkus.includes(productSku))
      );
    });

    if (exactSkuMatch) return exactSkuMatch;
  }

  if (productId) {
    const exactProductMatch = currentRecords.find((record) => {
      const productIds = getRecordIdList(
        record,
        "productIds",
        "productId",
        "product_id"
      );
      const wooIds = getRecordIdList(record, "wooIds", "wooId", "woo_id");

      return productIds.includes(productId) || wooIds.includes(productId);
    });

    if (exactProductMatch) return exactProductMatch;
  }


  if (parentProductId || productId) {
    const lookupParentId = parentProductId || productId;

    const exactParentMatch = currentRecords.find((record) => {
      const parentIds = getRecordIdList(
        record,
        "parentProductIds",
        "parentProductId",
        "parent_product_id"
      );

      const recordVariationIds = getRecordIdList(
        record,
        "variationIds",
        "variationId",
        "variation_id"
      );

      if (recordVariationIds.length > 0) return false;

      return parentIds.includes(lookupParentId);
    });

    if (exactParentMatch) return exactParentMatch;
  }

  const candidateRecords = currentRecords.filter((record) => {
    const recordName = normalizeText(getRecordProductName(record));
    const recordSlug = normalizeSlug(getRecordProductSlug(record) || recordName);
    const recordAliases = getRecordAliases(record);
    const recordCoaKey = getRecordCanonicalKey(record);

    if (productCoaKey || recordCoaKey) {
      return Boolean(
        productCoaKey && recordCoaKey && productCoaKey === recordCoaKey
      );
    }

    const slugMatch = productSlug && recordSlug && productSlug === recordSlug;
    const directNameMatch =
      productName && recordName && productName === recordName;

    const aliasMatch = recordAliases.some((alias) => {
      if (!alias) return false;

      return (
        (productName &&
          (productName === alias ||
            ` ${productName} `.includes(` ${alias} `) ||
            alias.includes(productName))) ||
        (variationName &&
          (variationName === alias ||
            ` ${variationName} `.includes(` ${alias} `) ||
            alias.includes(variationName)))
      );
    });

    return slugMatch || directNameMatch || aliasMatch;
  });

  if (!candidateRecords.length) return null;

  if (selectedStrength) {
    const exactStrengthMatch = candidateRecords.find((record) => {
      const recordStrength = getRecordStrengthText(record);
      return recordStrength && recordStrength === selectedStrength;
    });

    return exactStrengthMatch || null;
  }

  return candidateRecords[0] || null;
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

        const response = await fetch(`${ACCOUNT_ENDPOINT}?ts=${Date.now()}`, {
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
    <div className="pdp-bundle">
      <div className="pdp-bundle-head">
        <div>
          <Layers3 size={18} />
        </div>

        <span>Frequently researched together</span>
      </div>

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
    const controller = new AbortController();
    let active = true;

    async function loadLiveCoaLibrary() {
      const endpoint = getCoaLibraryEndpoint();
      const separator = endpoint.includes("?") ? "&" : "?";
      const requestUrl = `${endpoint}${separator}currentShippingLot=true&_=${Date.now()}`;

      setCoaLibraryStatus("loading");

      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`COA endpoint returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        const records = normalizeCoaLibraryPayload(payload);

        if (!active) return;

        setLiveCoaRecords(records);
        setCoaLibraryStatus("ready");
      } catch (error) {
        if (!active || error?.name === "AbortError") return;

        setLiveCoaRecords([]);
        setCoaLibraryStatus("error");
        console.error("Could not load the live COA library:", error);
      }
    }

    loadLiveCoaLibrary();

    return () => {
      active = false;
      controller.abort();
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

  const currentCoaUrl = currentCoaRecord ? getRecordUrl(currentCoaRecord) : "";
  const currentCoaLot = currentCoaRecord ? getRecordLot(currentCoaRecord) : "";
  const currentCoaDate = currentCoaRecord ? getRecordDate(currentCoaRecord) : "";
  const currentCoaPanelTypes = currentCoaRecord
    ? getCoaPanelTypes(currentCoaRecord)
    : [];

  const showCurrentCoa = Boolean(currentCoaRecord);
  const points = Math.max(Math.floor(Number(productPrice || 0)), 0);

  const shortDescription = sanitizeWooHtml(product?.short_description || "");
  const fullDescription = sanitizeWooHtml(product?.description || "");
  const fallbackDescription =
    stripHtml(product?.description) ||
    stripHtml(product?.short_description) ||
    "Product details are provided for research catalog review and ordering reference.";

  const selectedInventoryTarget =
    needsVariationMatch && selectedVariation ? selectedVariation : product;

  const stockStatus =
    needsVariationMatch && !selectedVariation
      ? "Out of stock"
      : getStockStatus(selectedInventoryTarget);

  const isAvailable =
    hasValidVariation && stockStatus.toLowerCase() === "in stock";

  const displayImage = activeImage?.src || getProductImage(product);

  const handleSelectAttribute = (attributeSlug, option) => {
    setSelectedAttributes((current) => ({
      ...current,
      [attributeSlug]: option,
    }));

    setCartMessage("");
  };

  const handleAddToCart = () => {
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

    const cartItem = {
      ...product,

      id: product.id,
      product_id: product.id,
      parent_id: product.id,

      variation_id: selectedVariation?.id || 0,
      variationId: selectedVariation?.id || 0,
      selectedVariationId: selectedVariation?.id || 0,

      quantity,
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
    };

    addToCart(cartItem);
    setCartMessage("Added to cart.");
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
              {showCurrentCoa && (
                <div className="pdp-lot">
                  <ShieldCheck size={14} />
                  Current lot
                </div>
              )}

              <img src={displayImage} alt={activeImage?.alt || name} />
            </div>

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
                      <img src={image.src} alt={image.alt} />
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

              {showCurrentCoa && (
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
                        onClick={() => setQuantity((current) => current + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pdp-add"
                      onClick={handleAddToCart}
                      disabled={!addToCart || !hasValidVariation}
                    >
                      <ShoppingCart size={16} />
                      Add to cart
                    </button>
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
                {showCurrentCoa && (
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

      <style>{`
        .pdp {
          position: relative;
          overflow: visible;
          padding: 82px 20px 90px;
          color: white;
          contain: paint;
        }

        .pdp-noise {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px);
          background-size: 88px 88px;
          mask-image: radial-gradient(circle at 50% 20%, black, transparent 72%);
        }

        .pdp-glow {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          opacity: 0.55;
        }

        .pdp-glow-a {
          left: -16%;
          top: 6%;
          width: 440px;
          height: 440px;
          background: radial-gradient(circle, rgba(103, 232, 249, 0.08), transparent 70%);
        }

        .pdp-glow-b {
          right: -16%;
          top: 24%;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.07), transparent 70%);
        }

        .pdp-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .pdp-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: clamp(30px, 4.2vw, 64px);
          align-items: center;
        }

        .pdp-gallery {
          position: sticky;
          top: 104px;
          align-self: start;
          display: grid;
          gap: 14px;
          min-width: 0;
          padding-top: 24px;
          z-index: 2;
        }

        .pdp-stage {
          position: relative;
          display: grid;
          min-height: clamp(430px, 42vw, 600px);
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: clamp(28px, 3vw, 42px);
          background:
            radial-gradient(circle at 50% 18%, rgba(103, 232, 249, 0.1), transparent 32%),
            linear-gradient(145deg, rgba(4, 12, 24, 0.96), rgba(7, 27, 41, 0.74), rgba(2, 6, 23, 0.96));
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
          padding: clamp(28px, 4vw, 48px);
          transform: translateZ(0);
          will-change: transform;
        }

        .pdp-stage img {
          position: relative;
          z-index: 2;
          max-width: min(82%, 520px);
          max-height: clamp(300px, 34vw, 480px);
          object-fit: contain;
          filter: drop-shadow(0 24px 34px rgba(0, 0, 0, 0.34));
        }

        .pdp-gallery-rail {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .pdp-gallery-dot {
          display: grid;
          height: 74px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.11);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.026);
          cursor: pointer;
          padding: 8px;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .pdp-gallery-dot:hover,
        .pdp-gallery-dot.is-active {
          transform: translateY(-2px);
          border-color: rgba(165, 243, 252, 0.45);
          background: rgba(103, 232, 249, 0.075);
        }

        .pdp-gallery-dot img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .pdp-lot {
          position: absolute;
          left: 22px;
          top: 22px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.08);
          padding: 10px 13px;
          color: rgba(236, 254, 255, 0.9);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .pdp-info {
          min-width: 0;
          padding-top: 28px;
        }

        .pdp-lab-sheet {
          position: relative;
          overflow: hidden;
          border-radius: 34px;
          border: 1px solid rgba(165, 243, 252, 0.11);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)),
            rgba(2, 6, 23, 0.56);
          padding: clamp(22px, 2.7vw, 34px);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
          transform: translateZ(0);
        }

        .pdp-lab-sheet::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(103, 232, 249, 0.9),
            rgba(103, 232, 249, 0.08)
          );
        }

        .pdp-lab-sheet::after {
          content: "PHASE ONE LAPZ";
          position: absolute;
          right: 22px;
          bottom: 18px;
          color: rgba(165, 243, 252, 0.04);
          font-size: 50px;
          font-weight: 950;
          letter-spacing: -0.08em;
          pointer-events: none;
        }

        .pdp-lab-top {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: start;
        }

        .pdp-lab-overline {
          margin: 0 0 12px;
          color: rgba(165, 243, 252, 0.75);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .pdp-lab-top h1 {
          margin: 0;
          color: white;
          font-size: clamp(28px, 3vw, 48px);
          font-weight: 680;
          letter-spacing: -0.07em;
          line-height: 0.95;
        }

        .pdp-stock-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(165, 243, 252, 0.14);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.065);
          padding: 10px 12px;
          color: rgba(236, 254, 255, 0.9);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pdp-stock-pill span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 12px rgba(103, 232, 249, 0.62);
        }

        .pdp-price-band {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-top: 26px;
          border-block: 1px solid rgba(165, 243, 252, 0.12);
          padding-block: 20px;
        }

        .pdp-price-band small,
        .pdp-brief small,
        .pdp-console-head span,
        .pdp-file-copy small,
        .pdp-variant-head span {
          display: block;
          color: rgba(148, 163, 184, 0.66);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .pdp-price-value {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: baseline;
          margin-top: 7px;
        }

        .pdp-price-value em {
          color: rgba(148, 163, 184, 0.5);
          font-size: 22px;
          font-style: normal;
          font-weight: 750;
          text-decoration: line-through;
        }

        .pdp-price-value strong {
          color: rgb(165, 243, 252);
          font-size: clamp(24px, 2.8vw, 38px);
          font-weight: 800;
          letter-spacing: -0.07em;
          line-height: 0.95;
          text-shadow: 0 0 22px rgba(103, 232, 249, 0.14);
        }

        .pdp-points-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.055);
          padding: 10px 13px;
          color: rgba(236, 254, 255, 0.88);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .pdp-points-chip svg {
          color: rgb(165, 243, 252);
        }

        .pdp-brief {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 15px;
          margin-top: 20px;
        }

        .pdp-brief-index {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-radius: 16px;
          background: rgba(103, 232, 249, 0.08);
          color: rgb(165, 243, 252);
          font-size: 11px;
          font-weight: 950;
        }

        .pdp-short,
        .pdp-short-text {
          margin: 7px 0 0;
          color: rgba(203, 213, 225, 0.78);
          font-size: 15px;
          line-height: 1.75;
        }

        .pdp-short :where(p, span, div) {
          margin: 0;
          color: rgba(203, 213, 225, 0.78);
        }

        .pdp-file-row {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: start;
          overflow: hidden;
          margin-top: 20px;
          border: 1px solid rgba(165, 243, 252, 0.15);
          border-radius: 18px;
          background:
            linear-gradient(105deg, rgba(103, 232, 249, 0.05), rgba(255, 255, 255, 0.012));
          padding: 13px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.022);
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .pdp-file-row::before {
          content: "";
          position: absolute;
          inset: 12px auto 12px 0;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgb(103, 232, 249), transparent);
          opacity: 0.72;
        }

        .pdp-file-row:hover {
          transform: translateY(-2px);
          border-color: rgba(165, 243, 252, 0.34);
          background:
            linear-gradient(105deg, rgba(103, 232, 249, 0.075), rgba(255, 255, 255, 0.018));
        }

        .pdp-file-mark {
          position: relative;
          display: grid;
          width: 50px;
          height: 50px;
          place-items: center;
          border-radius: 18px;
          background: rgba(103, 232, 249, 0.1);
          color: rgb(165, 243, 252);
        }

        .pdp-file-mark svg:last-child {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 20px;
          height: 20px;
          padding: 4px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          color: rgb(2, 6, 23);
        }

        .pdp-file-copy {
          min-width: 0;
        }

        .pdp-file-kicker-row {
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 10px;
        }

        .pdp-file-kicker-row > small {
          display: inline-flex;
          min-width: 0;
          flex: 0 0 auto;
          align-items: center;
          gap: 5px;
          margin: 0;
          color: rgba(191, 219, 254, 0.65);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pdp-file-kicker-row > small svg {
          color: rgb(147, 197, 253);
        }

        .pdp-file-panels {
          display: flex;
          min-width: 0;
          flex: 1 1 auto;
          flex-wrap: wrap;
          align-items: center;
          gap: 5px;
        }

        .pdp-file-heading {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .pdp-file-title {
          min-width: 0;
        }

        .pdp-file-status {
          display: inline-flex;
          min-height: 27px;
          flex: 0 0 auto;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(110, 231, 183, 0.16);
          border-radius: 999px;
          background: rgba(52, 211, 153, 0.065);
          padding: 5px 9px;
          color: rgba(209, 250, 229, 0.88);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.11em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pdp-file-status i {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgb(110, 231, 183);
          box-shadow: 0 0 9px rgba(110, 231, 183, 0.9);
        }

        .pdp-file-copy strong {
          display: block;
          margin-top: 7px;
          color: white;
          font-size: 15px;
          font-weight: 850;
        }

        .pdp-file-copy > span {
          display: block;
          margin-top: 4px;
          color: rgba(203, 213, 225, 0.62);
          font-size: 12px;
          line-height: 1.45;
        }

        .pdp-coa-panels {
          position: relative;
          overflow: hidden;
          margin-top: 12px;
          border: 1px solid rgba(148, 163, 184, 0.095);
          border-radius: 15px;
          background: rgba(2, 6, 23, 0.34);
          padding: 9px;
        }

        .pdp-coa-panels::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(110deg, transparent 18%, rgba(255, 255, 255, 0.025) 48%, transparent 72%);
        }

        .pdp-coa-panels-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pdp-coa-panels-head span {
          display: inline-flex;
          min-width: 0;
          align-items: center;
          gap: 6px;
          color: rgba(191, 219, 254, 0.68);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .pdp-coa-panels-head svg {
          color: rgb(147, 197, 253);
        }

        .pdp-coa-panels-head em {
          flex: 0 0 auto;
          color: rgba(148, 163, 184, 0.48);
          font-size: 7px;
          font-style: normal;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pdp-coa-panel-list {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .pdp-panel-badge {
          --pdp-panel-rgb: 103 232 249;
          display: inline-flex;
          min-height: 22px;
          max-width: 100%;
          align-items: center;
          gap: 5px;
          border: 1px solid rgb(var(--pdp-panel-rgb) / 0.22);
          border-radius: 999px;
          background: rgb(var(--pdp-panel-rgb) / 0.08);
          padding: 4px 7px;
          color: rgb(var(--pdp-panel-rgb));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 0 20px rgb(var(--pdp-panel-rgb) / 0.035);
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 0.1em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pdp-panel-badge i {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 8px currentColor;
        }

        .pdp-panel-badge.is-3x {
          --pdp-panel-rgb: 251 191 36;
        }

        .pdp-panel-badge.is-4x {
          --pdp-panel-rgb: 167 139 250;
        }

        .pdp-panel-badge.is-8x {
          --pdp-panel-rgb: 147 197 253;
        }

        .pdp-panel-badge.is-standard {
          --pdp-panel-rgb: 103 232 249;
        }

        .pdp-panel-badge.is-full {
          --pdp-panel-rgb: 240 171 252;
        }

        .pdp-file-action {
          display: inline-flex;
          min-height: 40px;
          align-self: center;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 13px;
          background: rgba(103, 232, 249, 0.07);
          padding: 0 13px;
          color: rgb(165, 243, 252);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
          transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .pdp-file-action:hover {
          border-color: rgba(165, 243, 252, 0.34);
          background: rgba(103, 232, 249, 0.13);
          color: white;
        }

        .pdp-file-action.is-disabled {
          opacity: 0.45;
          pointer-events: none;
          cursor: not-allowed;
        }

        .pdp-order-console {
          position: relative;
          z-index: 1;
          margin-top: 22px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.48);
          padding: 16px;
        }

        .pdp-console-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .pdp-console-head em {
          color: rgba(165, 243, 252, 0.72);
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .pdp-variant-stack {
          display: grid;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pdp-variant-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 10px;
        }

        .pdp-variant-head em {
          color: rgba(236, 254, 255, 0.72);
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .pdp-variant-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pdp-variant-pill {
          position: relative;
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(165, 243, 252, 0.11);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          padding: 0 15px;
          color: rgba(236, 254, 255, 0.78);
          cursor: pointer;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: -0.01em;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .pdp-variant-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.28);
          background: rgba(103, 232, 249, 0.07);
          color: white;
        }

        .pdp-variant-pill.is-active {
          border-color: rgba(165, 243, 252, 0.48);
          background: rgba(103, 232, 249, 0.13);
          color: white;
          box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.08);
        }

        .pdp-variant-pill strong {
          display: grid;
          width: 18px;
          height: 18px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          color: rgb(2, 6, 23);
        }

        .pdp-option-warning,
        .pdp-cart-message {
          margin: 12px 0 0;
          color: rgba(254, 202, 202, 0.86);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
        }

        .pdp-cart-message {
          color: rgba(165, 243, 252, 0.9);
        }

        .pdp-stock-pill.is-out {
          border-color: rgba(251, 191, 36, 0.2);
          background: rgba(251, 191, 36, 0.075);
          color: rgba(254, 243, 199, 0.92);
        }

        .pdp-stock-pill.is-out span {
          background: rgb(251, 191, 36);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.62);
        }

        .pdp-restock-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.15);
          border-radius: 22px;
          background:
            radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.105), transparent 34%),
            linear-gradient(180deg, rgba(251, 191, 36, 0.055), rgba(255, 255, 255, 0.012)),
            rgba(2, 6, 23, 0.58);
          padding: 16px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.18);
        }

        .pdp-restock-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: 0.32;
          mask-image: radial-gradient(circle at 20% 0%, black, transparent 70%);
        }

        .pdp-restock-head {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 13px;
          align-items: start;
        }

        .pdp-restock-icon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 17px;
          background: rgba(251, 191, 36, 0.09);
          color: rgba(254, 243, 199, 0.96);
        }

        .pdp-restock-head span {
          display: inline-flex;
          width: fit-content;
          border: 1px solid rgba(251, 191, 36, 0.18);
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.075);
          padding: 5px 8px;
          color: rgba(254, 243, 199, 0.86);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .pdp-restock-head h3 {
          margin: 10px 0 0;
          color: white;
          font-size: 19px;
          font-weight: 760;
          letter-spacing: -0.04em;
          line-height: 1.05;
        }

        .pdp-restock-head p {
          margin: 8px 0 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          line-height: 1.65;
        }

        .pdp-restock-head strong {
          color: rgba(254, 243, 199, 0.95);
          font-weight: 850;
        }

        .pdp-restock-status-message {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          margin-top: 14px;
          border: 1px solid;
          border-radius: 20px;
          padding: 13px;
        }

        .pdp-restock-status-message > div:first-child {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 15px;
        }

        .pdp-restock-status-message.is-success {
          border-color: rgba(251, 191, 36, 0.22);
          background:
            linear-gradient(180deg, rgba(251, 191, 36, 0.095), rgba(103, 232, 249, 0.035)),
            rgba(2, 6, 23, 0.48);
        }

        .pdp-restock-status-message.is-success > div:first-child {
          background: rgba(251, 191, 36, 0.12);
          color: rgba(254, 243, 199, 0.96);
        }

        .pdp-restock-status-message.is-error {
          border-color: rgba(248, 113, 113, 0.18);
          background: rgba(248, 113, 113, 0.075);
        }

        .pdp-restock-status-message.is-error > div:first-child {
          background: rgba(248, 113, 113, 0.12);
          color: rgba(254, 202, 202, 0.95);
        }

        .pdp-restock-status-message strong {
          display: block;
          color: white;
          font-size: 14px;
          font-weight: 850;
        }

        .pdp-restock-status-message p {
          margin: 4px 0 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          line-height: 1.55;
        }

        .pdp-restock-form,
        .pdp-restock-success {
          position: relative;
          z-index: 1;
          margin-top: 14px;
        }

        .pdp-restock-form {
          display: grid;
          gap: 10px;
        }

        .pdp-restock-form > input,
        .pdp-restock-email-row label {
          min-height: 50px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 16px;
          background: rgba(2, 6, 23, 0.72);
        }

        .pdp-restock-form > input {
          width: 100%;
          padding: 0 15px;
          color: white;
          outline: none;
          font-size: 13px;
        }

        .pdp-restock-email-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .pdp-restock-email-row label {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          overflow: hidden;
        }

        .pdp-restock-email-row label svg {
          justify-self: center;
          color: rgba(148, 163, 184, 0.85);
        }

        .pdp-restock-email-row input {
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          color: white;
          outline: none;
          font-size: 13px;
        }

        .pdp-restock-email-row input::placeholder,
        .pdp-restock-form > input::placeholder {
          color: rgba(148, 163, 184, 0.58);
        }

        .pdp-restock-email-row button {
          display: inline-flex;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 16px;
          background: rgb(103, 232, 249);
          padding: 0 18px;
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          transition: transform 180ms ease, background 180ms ease;
        }

        .pdp-restock-email-row button:hover {
          transform: translateY(-1px);
          background: white;
        }

        .pdp-restock-email-row button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .pdp-restock-note {
          margin: 0;
          color: rgba(148, 163, 184, 0.72);
          font-size: 11px;
          line-height: 1.55;
        }

        .pdp-restock-note strong {
          color: rgba(236, 254, 255, 0.9);
        }

        .pdp-restock-error {
          margin: 0;
          border: 1px solid rgba(248, 113, 113, 0.18);
          border-radius: 16px;
          background: rgba(248, 113, 113, 0.075);
          padding: 12px;
          color: rgba(254, 202, 202, 0.92);
          font-size: 12px;
          line-height: 1.55;
        }

        .pdp-restock-success {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 10px;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(251, 191, 36, 0.095), rgba(103, 232, 249, 0.035)),
            rgba(2, 6, 23, 0.48);
          padding: 13px;
          color: rgba(254, 243, 199, 0.92);
        }

        .pdp-restock-success svg {
          margin-top: 2px;
          color: rgba(254, 243, 199, 0.95);
        }

        .pdp-restock-success p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
        }

        .pdp-spin {
          animation: pdpSpin 0.85s linear infinite;
        }

        @keyframes pdpSpin {
          to {
            transform: rotate(360deg);
          }
        }


        .pdp-custom-request-card {
          position: relative;
          overflow: hidden;
          margin-top: 14px;
          border: 1px solid rgba(165, 243, 252, 0.15);
          border-radius: 20px;
          background:
            radial-gradient(circle at 100% 0%, rgba(103, 232, 249, 0.13), transparent 42%),
            rgba(2, 6, 23, 0.52);
          padding: 14px;
        }

        .pdp-custom-request-card.is-below-cart {
          margin-bottom: 0;
        }

        .pdp-custom-request-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(103, 232, 249, 0.08), transparent 70%);
        }

        .pdp-custom-request-button {
          position: relative;
          z-index: 1;
          display: inline-flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(165, 243, 252, 0.24);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.065);
          color: rgba(236, 254, 255, 0.95);
          cursor: pointer;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .pdp-custom-request-button:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.48);
          background: rgba(103, 232, 249, 0.12);
        }

        .pdp-custom-request-copy {
          position: relative;
          z-index: 1;
          margin-top: 12px;
        }

        .pdp-custom-request-copy strong {
          display: block;
          color: white;
          font-size: 13px;
          font-weight: 850;
        }

        .pdp-custom-request-copy p {
          margin: 5px 0 0;
          color: rgba(203, 213, 225, 0.66);
          font-size: 12px;
          line-height: 1.55;
        }

        .pdp-custom-modal {
          position: fixed;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          padding: 18px;
          isolation: isolate;
          overflow: hidden;
        }

        .pdp-custom-modal-backdrop {
          position: fixed;
          inset: 0;
          border: 0;
          background: rgba(2, 6, 23, 0.76);
          cursor: pointer;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .pdp-custom-modal-shell {
          position: relative;
          z-index: 1;
          width: min(860px, calc(100vw - 36px));
          max-height: min(86dvh, 820px);
          margin: auto;
          overflow-y: auto;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 30px;
          background:
            radial-gradient(circle at 8% 0%, rgba(103, 232, 249, 0.11), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012)),
            #06111d;
          box-shadow: 0 34px 120px rgba(0, 0, 0, 0.58);
        }

        .pdp-custom-modal-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: start;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding: 28px 28px 22px;
        }

        .pdp-custom-modal-head span,
        .pdp-custom-contact-title,
        .pdp-custom-form label > span {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(165, 243, 252, 0.72);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pdp-custom-modal-head h2 {
          margin: 10px 0 0;
          color: white;
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 720;
          letter-spacing: -0.065em;
          line-height: 0.96;
        }

        .pdp-custom-modal-head p {
          max-width: 620px;
          margin: 12px 0 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 15px;
          line-height: 1.7;
        }

        .pdp-custom-modal-head button {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(236, 254, 255, 0.82);
          cursor: pointer;
          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }

        .pdp-custom-modal-head button:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.32);
          background: rgba(103, 232, 249, 0.08);
        }

        .pdp-custom-form {
          display: grid;
          gap: 16px;
          padding: 26px 28px 30px;
        }

        .pdp-custom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .pdp-custom-form label {
          display: grid;
          gap: 9px;
        }

        .pdp-custom-form input,
        .pdp-custom-form select,
        .pdp-custom-form textarea {
          width: 100%;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.62);
          color: white;
          outline: none;
          padding: 0 16px;
          font-size: 14px;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .pdp-custom-form input:focus,
        .pdp-custom-form select:focus,
        .pdp-custom-form textarea:focus {
          border-color: rgba(165, 243, 252, 0.38);
          background: rgba(2, 6, 23, 0.82);
          box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.055);
        }

        .pdp-custom-form input,
        .pdp-custom-form select {
          min-height: 56px;
        }

        .pdp-custom-form textarea {
          min-height: 118px;
          resize: vertical;
          padding-block: 16px;
          line-height: 1.55;
        }

        .pdp-custom-form input::placeholder,
        .pdp-custom-form textarea::placeholder {
          color: rgba(148, 163, 184, 0.58);
        }

        .pdp-custom-form select option {
          background: #07111d;
          color: white;
        }

        .pdp-custom-field-note {
          display: block;
          margin-top: -3px;
          color: rgba(148, 163, 184, 0.72);
          font-size: 11px;
          font-weight: 650;
          line-height: 1.45;
        }

        .pdp-custom-terms {
          grid-template-columns: 26px 22px 1fr;
          align-items: start;
          gap: 12px !important;
          border: 1px solid rgba(103, 232, 249, 0.18);
          border-radius: 20px;
          background: rgba(103, 232, 249, 0.045);
          padding: 16px;
        }

        .pdp-custom-terms > svg {
          margin-top: 3px;
          color: rgb(103, 232, 249);
        }

        .pdp-custom-terms input {
          width: 20px;
          height: 20px;
          min-height: 20px;
          margin-top: 3px;
          accent-color: rgb(103, 232, 249);
        }

        .pdp-custom-terms span {
          color: rgba(226, 232, 240, 0.84) !important;
          font-size: 13px !important;
          font-weight: 650 !important;
          letter-spacing: 0 !important;
          line-height: 1.65;
          text-transform: none !important;
        }

        .pdp-custom-contact-title {
          margin-top: 4px;
          color: rgb(103, 232, 249);
        }

        .pdp-custom-message {
          position: relative;
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          overflow: hidden;
          margin: 0;
          border-radius: 22px;
          padding: 16px;
          font-size: 13px;
          line-height: 1.55;
        }

        .pdp-custom-message::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.82;
        }

        .pdp-custom-message.is-success {
          border: 1px solid rgba(103, 232, 249, 0.24);
          background:
            radial-gradient(circle at 0% 0%, rgba(103, 232, 249, 0.16), transparent 34%),
            linear-gradient(135deg, rgba(103, 232, 249, 0.09), rgba(255, 255, 255, 0.018)),
            rgba(2, 6, 23, 0.72);
          color: rgba(207, 250, 254, 0.94);
          box-shadow:
            0 20px 70px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.055);
        }

        .pdp-custom-message.is-success::before {
          background:
            linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.014) 1px, transparent 1px);
          background-size: 30px 30px;
          mask-image: radial-gradient(circle at 0% 0%, black, transparent 70%);
        }

        .pdp-custom-message.is-error {
          grid-template-columns: 48px minmax(0, 1fr);
          border: 1px solid rgba(248, 113, 113, 0.2);
          background:
            radial-gradient(circle at 0% 0%, rgba(248, 113, 113, 0.13), transparent 34%),
            rgba(248, 113, 113, 0.075);
          color: rgba(254, 202, 202, 0.94);
        }

        .pdp-custom-message-icon,
        .pdp-custom-message-content,
        .pdp-custom-message-close {
          position: relative;
          z-index: 1;
        }

        .pdp-custom-message-icon {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          border-radius: 18px;
          flex: 0 0 auto;
        }

        .pdp-custom-message.is-success .pdp-custom-message-icon {
          border: 1px solid rgba(103, 232, 249, 0.22);
          background: rgba(103, 232, 249, 0.11);
          color: rgb(103, 232, 249);
          box-shadow: 0 0 28px rgba(103, 232, 249, 0.09);
        }

        .pdp-custom-message.is-error .pdp-custom-message-icon {
          border: 1px solid rgba(248, 113, 113, 0.22);
          background: rgba(248, 113, 113, 0.12);
          color: rgba(254, 202, 202, 0.95);
        }

        .pdp-custom-message-content {
          min-width: 0;
        }

        .pdp-custom-message-kicker {
          margin-bottom: 5px;
          color: rgba(165, 243, 252, 0.76);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.18em;
          line-height: 1;
          text-transform: uppercase;
        }

        .pdp-custom-message.is-error .pdp-custom-message-kicker {
          color: rgba(254, 202, 202, 0.78);
        }

        .pdp-custom-message-content strong {
          display: block;
          color: white;
          font-size: 15px;
          font-weight: 860;
          letter-spacing: -0.025em;
          line-height: 1.18;
        }

        .pdp-custom-message-content p {
          margin: 7px 0 0;
          color: rgba(203, 213, 225, 0.74);
          font-size: 13px;
          font-weight: 650;
          line-height: 1.62;
        }

        .pdp-custom-message.is-error .pdp-custom-message-content p {
          color: rgba(254, 202, 202, 0.84);
        }

        .pdp-custom-message-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .pdp-custom-message-steps span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(103, 232, 249, 0.14);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.06);
          color: rgba(207, 250, 254, 0.82);
          padding: 6px 8px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .pdp-custom-message-steps span::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 12px rgba(103, 232, 249, 0.5);
        }

        .pdp-custom-message-content small {
          display: block;
          margin-top: 10px;
          color: rgba(148, 163, 184, 0.72);
          font-size: 11px;
          font-weight: 800;
        }

        .pdp-custom-message-close {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(103, 232, 249, 0.2);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.1);
          color: rgba(207, 250, 254, 0.94);
          cursor: pointer;
          padding: 0 14px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .pdp-custom-message-close:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.38);
          background: rgb(103, 232, 249);
          color: rgb(2, 6, 23);
        }

        .pdp-custom-submit {
          display: inline-flex;
          min-height: 58px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 0;
          border-radius: 18px;
          background: rgb(103, 232, 249);
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          transition:
            transform 180ms ease,
            background 180ms ease;
        }

        .pdp-custom-submit:hover {
          transform: translateY(-2px);
          background: white;
        }

        .pdp-custom-submit:disabled {
          cursor: not-allowed;
          opacity: 0.62;
          transform: none;
        }

        @media (max-width: 768px) {
          .pdp-custom-modal {
            align-items: center;
            justify-content: center;
            padding: 12px;
          }

          .pdp-custom-modal-shell {
            width: min(100%, calc(100vw - 24px));
            max-height: 86dvh;
            border-radius: 26px;
          }

          .pdp-custom-modal-head {
            padding: 22px 20px 18px;
          }

          .pdp-custom-form {
            padding: 20px;
          }

          .pdp-custom-grid {
            grid-template-columns: 1fr;
          }

          .pdp-custom-terms {
            grid-template-columns: 24px 1fr;
          }

          .pdp-custom-terms input {
            grid-column: 1;
          }

          .pdp-custom-terms span {
            grid-column: 2;
            grid-row: 1 / span 2;
          }

          .pdp-custom-message {
            grid-template-columns: 42px minmax(0, 1fr);
            align-items: start;
            border-radius: 20px;
            padding: 14px;
          }

          .pdp-custom-message-icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .pdp-custom-message-close {
            grid-column: 1 / -1;
            width: 100%;
            margin-top: 2px;
          }

          .pdp-custom-message-steps {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .pdp-custom-message-steps span {
            justify-content: flex-start;
            width: 100%;
          }
        }


        /* FIX — Custom order modal field alignment / no deformation */
        .pdp-custom-modal-shell {
          width: min(920px, calc(100vw - 36px)) !important;
        }

        .pdp-custom-form {
          align-items: stretch !important;
        }

        .pdp-custom-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          gap: 18px !important;
          align-items: start !important;
          width: 100% !important;
        }

        .pdp-custom-grid label,
        .pdp-custom-form > label {
          min-width: 0 !important;
          width: 100% !important;
        }

        .pdp-custom-form label {
          display: grid !important;
          gap: 9px !important;
          align-content: start !important;
        }

        .pdp-custom-form input,
        .pdp-custom-form select,
        .pdp-custom-form textarea {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          border: 1px solid rgba(165, 243, 252, 0.12) !important;
          border-radius: 18px !important;
          background-color: rgba(2, 6, 23, 0.72) !important;
          color: #ffffff !important;
          outline: none !important;
          font-family: inherit !important;
          font-size: 14px !important;
          font-weight: 650 !important;
        }

        .pdp-custom-form input,
        .pdp-custom-form select {
          display: block !important;
          height: 56px !important;
          min-height: 56px !important;
          max-height: 56px !important;
          line-height: 56px !important;
          padding: 0 44px 0 16px !important;
        }

        .pdp-custom-form select {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          cursor: pointer !important;
          background-image:
            linear-gradient(45deg, transparent 50%, rgba(226, 232, 240, 0.9) 50%),
            linear-gradient(135deg, rgba(226, 232, 240, 0.9) 50%, transparent 50%) !important;
          background-position:
            calc(100% - 21px) 50%,
            calc(100% - 15px) 50% !important;
          background-size:
            6px 6px,
            6px 6px !important;
          background-repeat: no-repeat !important;
        }

        .pdp-custom-form textarea {
          display: block !important;
          min-height: 118px !important;
          max-height: 180px !important;
          resize: vertical !important;
          padding: 16px !important;
          line-height: 1.55 !important;
        }

        .pdp-custom-form input:focus,
        .pdp-custom-form select:focus,
        .pdp-custom-form textarea:focus {
          border-color: rgba(165, 243, 252, 0.38) !important;
          background-color: rgba(2, 6, 23, 0.86) !important;
          box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.055) !important;
        }

        .pdp-custom-field-note {
          display: block !important;
          min-height: 16px !important;
          margin-top: -2px !important;
          color: rgba(148, 163, 184, 0.72) !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          line-height: 1.45 !important;
        }

        .pdp-custom-contact-title {
          margin-top: 2px !important;
        }

        @media (max-width: 768px) {
          .pdp-custom-modal-shell {
            width: min(100%, calc(100vw - 24px)) !important;
          }

          .pdp-custom-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .pdp-custom-form input,
          .pdp-custom-form select {
            height: 54px !important;
            min-height: 54px !important;
            max-height: 54px !important;
            line-height: 54px !important;
          }
        }


        .pdp-buyline {
          display: grid;
          grid-template-columns: 138px 1fr;
          gap: 12px;
        }

        .pdp-qty {
          display: inline-flex;
          min-height: 56px;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(165, 243, 252, 0.14);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          padding: 5px;
        }

        .pdp-qty button {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: rgba(148, 163, 184, 0.9);
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease;
        }

        .pdp-qty button:hover {
          background: rgba(103, 232, 249, 0.08);
          color: rgb(165, 243, 252);
        }

        .pdp-qty span {
          color: white;
          font-size: 15px;
          font-weight: 950;
        }

        .pdp-add {
          display: inline-flex;
          min-height: 56px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 16px;
          background: rgb(103, 232, 249);
          padding: 0 24px;
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          transition: transform 180ms ease, background 180ms ease;
        }

        .pdp-add:hover {
          transform: translateY(-2px);
          background: white;
        }

        .pdp-add:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .pdp-bundle {
          position: relative;
          z-index: 1;
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(103, 232, 249, 0.045), rgba(255, 255, 255, 0.012)),
            rgba(2, 6, 23, 0.5);
        }

        .pdp-bundle::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 0%, rgba(103, 232, 249, 0.12), transparent 38%),
            radial-gradient(circle at 100% 100%, rgba(37, 99, 235, 0.1), transparent 42%);
        }

        .pdp-bundle-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 13px;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          padding: 16px;
        }

        .pdp-bundle-head div {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.14);
          border-radius: 14px;
          background: rgba(103, 232, 249, 0.08);
          color: rgb(165, 243, 252);
        }

        .pdp-bundle-head span {
          color: rgba(236, 254, 255, 0.88);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .pdp-bundle-list {
          position: relative;
          z-index: 1;
          display: grid;
          padding: 8px 16px 4px;
        }

        .pdp-bundle-row {
          display: grid;
          grid-template-columns: 24px 1fr auto;
          gap: 12px;
          align-items: center;
          width: 100%;
          border: 0;
          border-bottom: 1px solid rgba(165, 243, 252, 0.08);
          background: transparent;
          padding: 13px 0;
          color: white;
          cursor: pointer;
          text-align: left;
        }

        .pdp-bundle-row:last-child {
          border-bottom: 0;
        }

        .pdp-bundle-row.is-main {
          cursor: default;
        }

        .pdp-bundle-dot {
          display: grid;
          width: 18px;
          height: 18px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: rgb(2, 6, 23);
          transition: background 180ms ease, border-color 180ms ease;
        }

        .pdp-bundle-row.is-selected .pdp-bundle-dot,
        .pdp-bundle-dot.is-locked {
          border-color: rgba(103, 232, 249, 0.75);
          background: rgb(103, 232, 249);
        }

        .pdp-bundle-copy {
          min-width: 0;
        }

        .pdp-bundle-copy strong {
          display: block;
          overflow: hidden;
          color: white;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pdp-bundle-copy span {
          display: block;
          margin-top: 3px;
          color: rgba(148, 163, 184, 0.72);
          font-size: 12px;
          line-height: 1.3;
        }

        .pdp-bundle-row em {
          color: rgba(236, 254, 255, 0.92);
          font-size: 13px;
          font-style: normal;
          font-weight: 900;
          white-space: nowrap;
        }

        .pdp-bundle-row:not(.is-main):hover .pdp-bundle-copy strong {
          color: rgb(165, 243, 252);
        }

        .pdp-bundle-footer {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
          border-top: 1px solid rgba(165, 243, 252, 0.1);
          padding: 16px;
        }

        .pdp-bundle-footer small {
          display: block;
          color: rgba(148, 163, 184, 0.68);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .pdp-bundle-footer strong {
          display: block;
          margin-top: 5px;
          color: rgb(165, 243, 252);
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.06em;
          line-height: 0.95;
        }

        .pdp-bundle-footer button {
          display: inline-flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(165, 243, 252, 0.18);
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding: 0 22px;
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          transition: transform 180ms ease, background 180ms ease;
          white-space: nowrap;
        }

        .pdp-bundle-footer button:hover {
          transform: translateY(-2px);
          background: white;
        }

        .pdp-bundle-footer button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .pdp-bundle-message {
          position: relative;
          z-index: 1;
          margin: 0;
          border-top: 1px solid rgba(165, 243, 252, 0.08);
          padding: 12px 16px 16px;
          color: rgba(165, 243, 252, 0.9);
          font-size: 12px;
          font-weight: 800;
        }

        .pdp-assurance-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .pdp-info-row {
          display: flex;
          align-items: center;
          gap: 11px;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          font-weight: 750;
        }

        .pdp-info-row svg {
          color: rgb(165, 243, 252);
          flex: 0 0 auto;
        }

        .pdp-policy-note {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 13px;
          margin-top: 18px;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 22px;
          background: rgba(103, 232, 249, 0.038);
          padding: 16px;
        }

        .pdp-policy-note svg {
          color: rgb(165, 243, 252);
          margin-top: 2px;
        }

        .pdp-policy-note p {
          margin: 0;
          color: rgba(236, 254, 255, 0.75);
          font-size: 13px;
          line-height: 1.65;
        }

        .pdp-policy-note strong {
          color: white;
        }

        .pdp-meta-line {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px 22px;
          margin-top: 18px;
          border-top: 1px solid rgba(165, 243, 252, 0.12);
          padding-top: 16px;
          color: rgba(203, 213, 225, 0.68);
          font-size: 13px;
          line-height: 1.6;
        }

        .pdp-meta-line strong {
          color: white;
        }

        .pdp-usage {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 15px;
          margin-top: 34px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.022);
          padding: 17px;
        }

        .pdp-usage div {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 15px;
          background: rgba(103, 232, 249, 0.08);
          color: rgb(165, 243, 252);
        }

        .pdp-usage p {
          margin: 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          line-height: 1.75;
        }

        .pdp-usage strong {
          color: white;
        }

        .pdp-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 28px;
          margin-top: 34px;
          align-items: start;
        }

        .pdp-description,
        .pdp-details {
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.018);
        }

        .pdp-description {
          padding: 32px;
        }

        .pdp-details {
          padding: 24px;
        }

        .pdp-section-head p {
          margin: 0;
          color: rgba(165, 243, 252, 0.62);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pdp-section-head h2 {
          margin: 8px 0 0;
          color: white;
          font-size: 28px;
          font-weight: 650;
          letter-spacing: -0.055em;
          line-height: 1;
        }

        .pdp-woo {
          margin-top: 26px;
          color: rgba(203, 213, 225, 0.74);
          font-size: 15px;
          line-height: 1.9;
        }

        .pdp-woo :where(h1, h2, h3, h4) {
          margin: 0 0 14px;
          color: white;
          font-weight: 700;
          letter-spacing: -0.045em;
          line-height: 1.08;
        }

        .pdp-woo h1 {
          font-size: clamp(30px, 4vw, 52px);
        }

        .pdp-woo h2 {
          margin-top: 34px;
          font-size: clamp(24px, 3vw, 38px);
        }

        .pdp-woo h3 {
          margin-top: 28px;
          font-size: clamp(19px, 2vw, 26px);
        }

        .pdp-woo p {
          margin: 0 0 18px;
        }

        .pdp-woo strong,
        .pdp-woo b {
          color: rgba(236, 254, 255, 0.94);
        }

        .pdp-woo ul,
        .pdp-woo ol {
          display: grid;
          gap: 10px;
          margin: 18px 0;
          padding-left: 20px;
        }

        .pdp-woo a {
          color: rgb(165, 243, 252);
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .pdp-woo table {
          width: 100%;
          margin-top: 22px;
          overflow: hidden;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.45);
        }

        .pdp-woo td,
        .pdp-woo th {
          border-bottom: 1px solid rgba(165, 243, 252, 0.08);
          padding: 14px;
          text-align: left;
        }

        .pdp-woo tr:last-child td {
          border-bottom: 0;
        }

        .pdp-fallback {
          margin-top: 24px;
          color: rgba(203, 213, 225, 0.74);
          font-size: 15px;
          line-height: 1.9;
        }

        .pdp-detail-list {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .pdp-detail-list > div {
          border: 1px solid rgba(165, 243, 252, 0.08);
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.45);
          padding: 14px;
        }

        .pdp-detail-list span {
          display: block;
          color: rgba(148, 163, 184, 0.65);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .pdp-detail-list strong {
          display: block;
          margin-top: 6px;
          color: white;
          font-size: 13px;
          line-height: 1.5;
        }

        .pdp-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
        }

        .pdp-tags em {
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.055);
          padding: 5px 9px;
          color: rgba(236, 254, 255, 0.82);
          font-size: 11px;
          font-style: normal;
          font-weight: 750;
        }


        .pdp-featured {
          position: relative;
          z-index: 1;
          margin-top: 34px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 32px;
          background:
            radial-gradient(circle at 8% 0%, rgba(103, 232, 249, 0.06), transparent 34%),
            rgba(255, 255, 255, 0.018);
          padding: clamp(20px, 2.4vw, 30px);
          overflow: hidden;
        }

        .pdp-featured::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: 0.42;
          mask-image: linear-gradient(to bottom, black, transparent 78%);
        }

        .pdp-featured-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .pdp-featured-head p {
          margin: 0;
          color: rgba(165, 243, 252, 0.62);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pdp-featured-head h2 {
          margin: 8px 0 0;
          color: white;
          font-size: clamp(24px, 2.8vw, 34px);
          font-weight: 650;
          letter-spacing: -0.06em;
          line-height: 0.96;
        }

        .pdp-featured-all {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.055);
          padding: 11px 14px;
          color: rgb(165, 243, 252);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .pdp-featured-all:hover {
          transform: translateY(-2px);
          border-color: rgba(165, 243, 252, 0.35);
          background: rgba(103, 232, 249, 0.1);
          color: white;
        }

        .pdp-featured-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .pdp-featured-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.54);
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .pdp-featured-card:hover {
          transform: translateY(-3px);
          border-color: rgba(165, 243, 252, 0.28);
          background: rgba(4, 16, 30, 0.72);
        }

        .pdp-featured-image {
          display: grid;
          height: 176px;
          place-items: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(165, 243, 252, 0.08);
          background:
            radial-gradient(circle at 50% 18%, rgba(103, 232, 249, 0.09), transparent 38%),
            rgba(255, 255, 255, 0.018);
          padding: 18px;
        }

        .pdp-featured-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.3));
          transition: transform 240ms ease;
        }

        .pdp-featured-card:hover .pdp-featured-image img {
          transform: scale(1.035);
        }

        .pdp-featured-copy {
          display: grid;
          gap: 12px;
          padding: 15px;
        }

        .pdp-featured-kicker {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pdp-featured-kicker span,
        .pdp-featured-kicker em {
          display: inline-flex;
          color: rgba(148, 163, 184, 0.72);
          font-size: 8px;
          font-style: normal;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .pdp-featured-kicker em {
          border: 1px solid rgba(251, 191, 36, 0.18);
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.07);
          padding: 5px 7px;
          color: rgba(254, 243, 199, 0.9);
          white-space: nowrap;
        }

        .pdp-featured-name {
          display: -webkit-box;
          min-height: 42px;
          overflow: hidden;
          color: white;
          font-size: 14px;
          font-weight: 850;
          letter-spacing: -0.035em;
          line-height: 1.35;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          transition: color 180ms ease;
        }

        .pdp-featured-name:hover {
          color: rgb(165, 243, 252);
        }

        .pdp-featured-bottom {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          border-top: 1px solid rgba(165, 243, 252, 0.08);
          padding-top: 12px;
        }

        .pdp-featured-bottom strong {
          color: rgb(165, 243, 252);
          font-size: 16px;
          font-weight: 850;
          letter-spacing: -0.05em;
          white-space: nowrap;
        }

        .pdp-featured-bottom button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding: 0 13px;
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: transform 180ms ease, background 180ms ease;
          white-space: nowrap;
        }

        .pdp-featured-bottom button:hover {
          transform: translateY(-1px);
          background: white;
        }

        .pdp-featured-bottom button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .pdp-error {
          width: min(760px, 100%);
          margin: 80px auto;
          border: 1px solid rgba(248, 113, 113, 0.15);
          border-radius: 32px;
          background: rgba(239, 68, 68, 0.08);
          padding: 36px;
          text-align: center;
        }

        .pdp-error p {
          color: rgba(254, 202, 202, 0.85);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pdp-error h1 {
          margin-top: 12px;
          color: white;
          font-size: 34px;
        }

        .pdp-error span {
          display: block;
          margin-top: 10px;
          color: rgba(254, 202, 202, 0.7);
        }

        .pdp-error a {
          display: inline-flex;
          margin-top: 24px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding: 12px 18px;
          color: rgb(2, 6, 23);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }


        @media (max-width: 1024px) {
          .pdp-featured-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1180px) {
          .pdp {
            padding-top: 74px;
          }

          .pdp-hero {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 28px;
          }

          .pdp-gallery {
            top: 92px;
            padding-top: 18px;
          }

          .pdp-info {
            padding-top: 18px;
          }

          .pdp-lab-sheet {
            padding: 22px;
          }

          .pdp-lab-top {
            grid-template-columns: 1fr;
          }

          .pdp-stock-pill {
            width: fit-content;
          }

          .pdp-lab-top h1 {
            font-size: clamp(38px, 4.6vw, 58px);
          }

          .pdp-price-band {
            align-items: flex-start;
            flex-direction: column;
          }

          .pdp-file-row {
            grid-template-columns: 52px 1fr;
          }

          .pdp-file-action {
            grid-column: 2;
          }

          .pdp-stage {
            min-height: 500px;
          }

          .pdp-stage img {
            max-height: 400px;
          }

          .pdp-gallery-rail {
            grid-template-columns: repeat(4, 1fr);
          }

          .pdp-body {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .pdp {
            overflow: hidden;
            padding-top: 241px !important;
            contain: none;
          }

          .pdp-hero {
            grid-template-columns: 1fr;
          }

          .pdp-gallery {
            position: relative;
            top: auto;
            order: 1;
            padding-top: 0;
          }

          .pdp-info {
            order: 2;
            padding-top: 8px;
          }

          .pdp-stage {
            min-height: 460px;
          }

          .pdp-stage img {
            max-height: 360px;
          }

          .pdp-gallery-rail {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        @media (max-width: 768px) {
          .pdp-featured {
            border-radius: 26px;
            padding: 20px;
          }

          .pdp-featured-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .pdp-featured-all {
            width: 100%;
            justify-content: center;
          }

          .pdp-featured-image {
            height: 158px;
          }

          .pdp {
            padding: 64px 14px 70px;
          }

          .pdp-lab-sheet {
            border-radius: 28px;
            padding: 18px;
          }

          .pdp-lab-sheet::after {
            font-size: 36px;
            right: 18px;
            bottom: 14px;
          }

          .pdp-lab-top h1 {
            font-size: clamp(36px, 10.8vw, 52px);
          }

          .pdp-brief {
            grid-template-columns: 1fr;
          }

          .pdp-file-row {
            grid-template-columns: 48px minmax(0, 1fr);
            align-items: start;
            gap: 12px;
            border-radius: 20px;
            padding: 13px;
          }

          .pdp-file-action {
            grid-column: 1 / -1;
            width: 100%;
            min-height: 46px;
          }

          .pdp-file-mark {
            width: 48px;
            height: 48px;
            border-radius: 16px;
          }

          .pdp-file-heading {
            flex-wrap: wrap;
          }

          .pdp-file-kicker-row {
            align-items: flex-start;
          }

          .pdp-file-panels {
            flex-basis: 100%;
            margin-top: 2px;
          }

          .pdp-coa-panels {
            margin-top: 10px;
            padding: 9px;
          }

          .pdp-panel-badge {
            min-height: 28px;
            font-size: 7px;
          }

          .pdp-stock-pill.is-out {
          border-color: rgba(251, 191, 36, 0.2);
          background: rgba(251, 191, 36, 0.075);
          color: rgba(254, 243, 199, 0.92);
        }

        .pdp-stock-pill.is-out span {
          background: rgb(251, 191, 36);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.62);
        }

        .pdp-restock-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.15);
          border-radius: 22px;
          background:
            radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.105), transparent 34%),
            linear-gradient(180deg, rgba(251, 191, 36, 0.055), rgba(255, 255, 255, 0.012)),
            rgba(2, 6, 23, 0.58);
          padding: 16px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.18);
        }

        .pdp-restock-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: 0.32;
          mask-image: radial-gradient(circle at 20% 0%, black, transparent 70%);
        }

        .pdp-restock-head {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 13px;
          align-items: start;
        }

        .pdp-restock-icon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 17px;
          background: rgba(251, 191, 36, 0.09);
          color: rgba(254, 243, 199, 0.96);
        }

        .pdp-restock-head span {
          display: inline-flex;
          width: fit-content;
          border: 1px solid rgba(251, 191, 36, 0.18);
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.075);
          padding: 5px 8px;
          color: rgba(254, 243, 199, 0.86);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .pdp-restock-head h3 {
          margin: 10px 0 0;
          color: white;
          font-size: 19px;
          font-weight: 760;
          letter-spacing: -0.04em;
          line-height: 1.05;
        }

        .pdp-restock-head p {
          margin: 8px 0 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          line-height: 1.65;
        }

        .pdp-restock-head strong {
          color: rgba(254, 243, 199, 0.95);
          font-weight: 850;
        }

        .pdp-restock-status-message {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          margin-top: 14px;
          border: 1px solid;
          border-radius: 20px;
          padding: 13px;
        }

        .pdp-restock-status-message > div:first-child {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 15px;
        }

        .pdp-restock-status-message.is-success {
          border-color: rgba(251, 191, 36, 0.22);
          background:
            linear-gradient(180deg, rgba(251, 191, 36, 0.095), rgba(103, 232, 249, 0.035)),
            rgba(2, 6, 23, 0.48);
        }

        .pdp-restock-status-message.is-success > div:first-child {
          background: rgba(251, 191, 36, 0.12);
          color: rgba(254, 243, 199, 0.96);
        }

        .pdp-restock-status-message.is-error {
          border-color: rgba(248, 113, 113, 0.18);
          background: rgba(248, 113, 113, 0.075);
        }

        .pdp-restock-status-message.is-error > div:first-child {
          background: rgba(248, 113, 113, 0.12);
          color: rgba(254, 202, 202, 0.95);
        }

        .pdp-restock-status-message strong {
          display: block;
          color: white;
          font-size: 14px;
          font-weight: 850;
        }

        .pdp-restock-status-message p {
          margin: 4px 0 0;
          color: rgba(203, 213, 225, 0.72);
          font-size: 13px;
          line-height: 1.55;
        }

        .pdp-restock-form,
        .pdp-restock-success {
          position: relative;
          z-index: 1;
          margin-top: 14px;
        }

        .pdp-restock-form {
          display: grid;
          gap: 10px;
        }

        .pdp-restock-form > input,
        .pdp-restock-email-row label {
          min-height: 50px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 16px;
          background: rgba(2, 6, 23, 0.72);
        }

        .pdp-restock-form > input {
          width: 100%;
          padding: 0 15px;
          color: white;
          outline: none;
          font-size: 13px;
        }

        .pdp-restock-email-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .pdp-restock-email-row label {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          overflow: hidden;
        }

        .pdp-restock-email-row label svg {
          justify-self: center;
          color: rgba(148, 163, 184, 0.85);
        }

        .pdp-restock-email-row input {
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          color: white;
          outline: none;
          font-size: 13px;
        }

        .pdp-restock-email-row input::placeholder,
        .pdp-restock-form > input::placeholder {
          color: rgba(148, 163, 184, 0.58);
        }

        .pdp-restock-email-row button {
          display: inline-flex;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 16px;
          background: rgb(103, 232, 249);
          padding: 0 18px;
          color: rgb(2, 6, 23);
          cursor: pointer;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
          transition: transform 180ms ease, background 180ms ease;
        }

        .pdp-restock-email-row button:hover {
          transform: translateY(-1px);
          background: white;
        }

        .pdp-restock-email-row button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .pdp-restock-note {
          margin: 0;
          color: rgba(148, 163, 184, 0.72);
          font-size: 11px;
          line-height: 1.55;
        }

        .pdp-restock-note strong {
          color: rgba(236, 254, 255, 0.9);
        }

        .pdp-restock-error {
          margin: 0;
          border: 1px solid rgba(248, 113, 113, 0.18);
          border-radius: 16px;
          background: rgba(248, 113, 113, 0.075);
          padding: 12px;
          color: rgba(254, 202, 202, 0.92);
          font-size: 12px;
          line-height: 1.55;
        }

        .pdp-restock-success {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 10px;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(251, 191, 36, 0.095), rgba(103, 232, 249, 0.035)),
            rgba(2, 6, 23, 0.48);
          padding: 13px;
          color: rgba(254, 243, 199, 0.92);
        }

        .pdp-restock-success svg {
          margin-top: 2px;
          color: rgba(254, 243, 199, 0.95);
        }

        .pdp-restock-success p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
        }

        .pdp-spin {
          animation: pdpSpin 0.85s linear infinite;
        }

        @keyframes pdpSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .pdp-buyline {
            grid-template-columns: 1fr;
          }

          .pdp-qty {
            width: 100%;
          }

          .pdp-bundle-footer {
            grid-template-columns: 1fr;
          }

          .pdp-bundle-footer button {
            width: 100%;
          }

          .pdp-bundle-copy strong {
            white-space: normal;
          }

          .pdp-variant-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .pdp-variant-pill {
            width: 100%;
          }

          .pdp-policy-note {
            grid-template-columns: 1fr;
          }

          .pdp-stage {
            min-height: 360px;
            border-radius: 32px;
            padding: 28px;
          }

          .pdp-stage img {
            max-height: 285px;
            max-width: 88%;
          }

          .pdp-gallery-rail {
            grid-template-columns: repeat(4, 1fr);
          }

          .pdp-gallery-dot {
            height: 66px;
          }

          .pdp-usage {
            grid-template-columns: 1fr;
          }

          .pdp-description,
          .pdp-details {
            border-radius: 26px;
            padding: 22px;
          }

          .pdp-section-head h2 {
            font-size: 24px;
          }

          .pdp-woo {
            font-size: 13.5px;
            line-height: 1.8;
          }
        }

        @media (max-width: 430px) {
          .pdp-file-row {
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 10px;
            padding: 12px;
          }

          .pdp-file-row:hover {
            transform: none;
          }

          .pdp-file-mark {
            width: 42px;
            height: 42px;
            border-radius: 14px;
          }

          .pdp-file-heading {
            display: block;
          }

          .pdp-file-kicker-row {
            display: block;
          }

          .pdp-file-panels {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
            margin-top: 8px;
          }

          .pdp-file-status {
            margin-top: 8px;
          }

          .pdp-file-copy strong {
            overflow-wrap: anywhere;
            font-size: 14px;
          }

          .pdp-file-copy > span {
            font-size: 11px;
          }

          .pdp-coa-panels {
            grid-column: 1 / -1;
          }

          .pdp-coa-panels-head {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .pdp-coa-panel-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pdp-panel-badge {
            min-width: 0;
            justify-content: center;
            overflow: hidden;
            padding-inline: 7px;
            text-overflow: ellipsis;
          }

          .pdp-panel-badge:last-child:nth-child(odd) {
            grid-column: 1 / -1;
          }

          .pdp-restock-email-row {
            grid-template-columns: 1fr;
          }

          .pdp-restock-email-row button {
            width: 100%;
          }

          .pdp-featured-grid {
            grid-template-columns: 1fr;
          }

          .pdp-featured-card {
            display: grid;
            grid-template-columns: 118px 1fr;
          }

          .pdp-featured-image {
            height: 100%;
            min-height: 156px;
            border-right: 1px solid rgba(165, 243, 252, 0.08);
            border-bottom: 0;
            padding: 12px;
          }

          .pdp-featured-copy {
            padding: 13px;
          }

          .pdp-featured-bottom {
            grid-template-columns: 1fr;
          }

          .pdp-featured-bottom button {
            width: 100%;
          }

          .pdp {
            padding-top: 58px;
          }

          .pdp-stage {
            min-height: 320px;
            padding: 22px;
          }

          .pdp-stage img {
            max-height: 250px;
          }

          .pdp-gallery-rail {
            grid-template-columns: repeat(3, 1fr);
          }

          .pdp-variant-grid {
            grid-template-columns: 1fr;
          }

          .pdp-add {
            width: 100%;
            padding-inline: 16px;
          }

          .pdp-bundle-row {
            grid-template-columns: 22px 1fr;
          }

          .pdp-bundle-row em {
            grid-column: 2;
          }
        }
      `}</style>
    </section>
  );
}