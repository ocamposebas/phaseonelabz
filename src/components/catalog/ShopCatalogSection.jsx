import "./shop-catalog-section.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Beaker,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  FlaskConical,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useCart } from "../cart/CartContext";
import DispatchCutoff from "../shipping/DispatchCutoff";

const RECON_WATER_IDENTIFIERS = new Set([
  "recon-water",
  "recon-water-30ml",
]);

const BUNDLE_TIERS = [
  { quantity: 5, discountPercent: 10 },
  { quantity: 10, discountPercent: 30 },
];

function isReconWaterProduct(product = {}) {
  return [product.slug, product.product_slug, product.sku, product.name, product.title]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .some(
      (identifier) =>
        RECON_WATER_IDENTIFIERS.has(identifier) ||
        identifier.startsWith("recon-water-"),
    );
}

const categoryFilters = [
  "All Products",
  "Accessories",
  "Recon Water",
  "Cosmetic & Skin",
  "Healing & Recovery",
  "Longevity & Other",
  "Metabolic Research",
  "Research Blends",
  "Research Peptides",
];

const priceFilters = [
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50–$100", min: 50, max: 100 },
  { label: "$100–$200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: Infinity },
];

const collectionChips = [
  {
    label: "Most Requested",
    value: "favorites",
    caption: "Popular picks",
    icon: Sparkles,
  },
  {
    label: "Limited Deals",
    value: "sale",
    caption: "Active offers",
    icon: Tag,
  },
  {
    label: "Core Essentials",
    value: "exclusive",
    caption: "Selected catalog",
    icon: Beaker,
  },
  {
    label: "Next Drops",
    value: "coming-soon",
    caption: "Soon available",
    icon: FlaskConical,
  },
];

const sortOptions = [
  { label: "Most popular", value: "popular" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "A–Z", value: "az" },
];


const customProductOrder = [
  {
    rank: 1,
    groups: [
      ["pl", "rt"],
      ["pl rt"],
      ["r3ta"],
      ["rt3"],
      ["reta"],
      ["retatrutide"],
    ],
  },
  {
    rank: 2,
    groups: [
      ["pl", "tirz"],
      ["pl tirz"],
      ["tirz"],
      ["pl tz"],
      ["tz2"],
      ["tirzepatide"],
    ],
  },
  {
    rank: 3,
    groups: [["H- Recon Water"]],
  },

  {
    rank: 4,
    groups: [["eloralintide"]],
  },

  {
    rank: 5,
    groups: [["mitoprime"]],
  },
  {
    rank: 5,
    groups: [
      ["recon", "water", "30ml"],
      ["recon", "water"],
      ["reconstitution", "water", "30ml"],
      ["reconstitution", "water"],
      ["p1", "water"],
      ["phase one", "water"],
      ["p1", "bacteriostatic"],
    ],
    exclude: ["hospira", "3ml"],
  },
  {
    rank: 6,
    groups: [["adamax"]],
  },

  // Los tres bundles ocuparán los puestos 7, 8 y 9.
  {
    rank: 7,
    groups: [
      ["bundle"],
      ["kit"],
      ["stack"],
    ],
  },

  {
    rank: 10,
    groups: [["glow"]],
  },
  {
    rank: 11,
    groups: [["klow"]],
  },
  {
    rank: 12,
    groups: [
      ["ghk cu"],
      ["ghk-cu"],
      ["ghk"],
    ],
    exclude: ["glow", "klow"],
  },
  {
    rank: 13,
    groups: [
      ["tesa"],
      ["tesamorelin"],
    ],
  },
  {
    rank: 14,
    groups: [["cartalax", "bpc", "tb500"]],
  },
];
function normalizeProductOrderText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCatalogFilterText(value = "") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized === "accesories" ||
    normalized === "accesory" ||
    normalized === "accessory"
  ) {
    return "accessories";
  }

  // Growth Hormone is no longer shown as its own filter.
  // Products assigned to that former category now belong to Research Peptides.
  if (normalized === "growth hormone" || normalized === "growth hormones") {
    return "research peptides";
  }

  // Keep compatibility with the old WooCommerce category and old catalog URLs,
  // while presenting the new customer-facing category name everywhere.
  if (
    normalized === "bacteriostatic water" ||
    normalized === "bacteriostatic waters" ||
    normalized === "reconstitution solution" ||
    normalized === "reconstitution solutions" ||
    normalized === "recon waters"
  ) {
    return "recon water";
  }

  return normalized;
}

function includesOrderTerm(searchable, term) {
  const cleanTerm = normalizeProductOrderText(term);

  if (!cleanTerm) return false;

  return ` ${searchable} `.includes(` ${cleanTerm} `);
}

function textMatchesCustomRule(searchable, rule) {
  if (rule.exclude?.some((term) => includesOrderTerm(searchable, term))) {
    return false;
  }

  return rule.groups.some((group) =>
    group.every((term) => includesOrderTerm(searchable, term))
  );
}

function getCustomProductRankFromText(searchable) {
  const matchedRule = customProductOrder.find((rule) =>
    textMatchesCustomRule(searchable, rule)
  );

  return matchedRule?.rank || 9999;
}

function getProductMgFromText(searchable) {
  const match = searchable.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*mg(?:\s|$)/i);

  return match ? Number(match[1]) : 9999;
}

function getTermValue(term) {
  if (!term) return "";

  if (typeof term === "string") return term;

  return term?.name || term?.slug || term?.label || "";
}

function getProductKey(product) {
  return String(product?.id || product?.slug || product?.name || product?.title);
}

function getProductImage(product) {
  return (
    product?.image ||
    product?.images?.[0]?.src ||
    product?.images?.[0]?.url ||
    product?.featuredImage ||
    "/placeholder-product.png"
  );
}

function getProductCategory(product) {
  const rawCategory =
    getTermValue(product?.category) ||
    (Array.isArray(product?.categories) && product.categories.length > 0
      ? getTermValue(product.categories[0])
      : "") ||
    "Research Peptides";

  const normalizedCategory = normalizeCatalogFilterText(rawCategory);

  if (normalizedCategory === "research peptides") return "Research Peptides";
  if (normalizedCategory === "recon water") {
    return "Recon Water";
  }

  return rawCategory;
}

function parseProductPriceNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/,/g, "")
    .trim();

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  const number = Number(match?.[0] || 0);

  return Number.isFinite(number) ? number : 0;
}

function getObjectPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function getFirstPositivePrice(source, paths, parser = parseProductPriceNumber) {
  for (const path of paths) {
    const price = parser(getObjectPath(source, path), source);

    if (price > 0) return price;
  }

  return 0;
}

function getStoreApiPriceNumber(value, source = {}) {
  const number = parseProductPriceNumber(value);

  if (number <= 0) return 0;

  const minorUnit = Number(
    source?.prices?.currency_minor_unit ??
      source?.prices?.currencyMinorUnit ??
      source?.currency_minor_unit ??
      source?.currencyMinorUnit
  );

  if (!Number.isFinite(minorUnit) || minorUnit <= 0) return number;

  return number / 10 ** minorUnit;
}

function decodePriceHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#36;|&dollar;/gi, "$")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPriceNumbers(value = "") {
  const cleanText = decodePriceHtml(value).replace(/,/g, "");
  const matches = cleanText.match(/\d+(?:\.\d+)?/g) || [];

  return matches
    .map((match) => Number(match))
    .filter((number) => Number.isFinite(number) && number > 0);
}

function getMetaValue(source = {}, acceptedKeys = []) {
  const normalizedKeys = acceptedKeys.map((key) => String(key).toLowerCase());
  const metadata = source?.meta_data || source?.metaData || source?.metadata || [];

  if (Array.isArray(metadata)) {
    const matched = metadata.find((entry) => {
      const key = String(entry?.key || entry?.name || "").toLowerCase();

      return normalizedKeys.includes(key);
    });

    if (matched) return matched?.value ?? matched?.data ?? matched?.meta_value;
  }

  return undefined;
}

function getExplicitDiscountPercent(source = {}) {
  const directPaths = [
    "discount_percent",
    "discountPercent",
    "discount_percentage",
    "discountPercentage",
    "sale_percent",
    "salePercent",
    "sale_percentage",
    "salePercentage",
    "active_discount_percent",
    "activeDiscountPercent",
    "active_discount_percentage",
    "activeDiscountPercentage",
    "percent_off",
    "percentOff",
    "discount.percent",
    "discount.percentage",
    "active_discount.percent",
    "active_discount.percentage",
    "activeDiscount.percent",
    "activeDiscount.percentage",
  ];

  for (const path of directPaths) {
    const percent = parseProductPriceNumber(getObjectPath(source, path));

    if (percent > 0 && percent < 100) return percent;
  }

  const metaPercent = parseProductPriceNumber(
    getMetaValue(source, [
      "_discount_percent",
      "discount_percent",
      "_discount_percentage",
      "discount_percentage",
      "_sale_percent",
      "sale_percent",
      "_sale_percentage",
      "sale_percentage",
      "_active_discount_percent",
      "active_discount_percent",
      "_active_discount_percentage",
      "active_discount_percentage",
      "_percent_off",
      "percent_off",
    ])
  );

  return metaPercent > 0 && metaPercent < 100 ? metaPercent : 0;
}

function createDiscountCandidate(
  regularPrice,
  currentPrice,
  explicitPercent = 0,
  source = "unknown"
) {
  const regular = Number(regularPrice || 0);
  const current = Number(currentPrice || 0);

  if (
    !Number.isFinite(regular) ||
    !Number.isFinite(current) ||
    regular <= 0 ||
    current <= 0 ||
    current >= regular - 0.001
  ) {
    return null;
  }

  const calculatedPercent = ((regular - current) / regular) * 100;
  const discountPercent = Math.max(
    1,
    Math.min(
      99,
      Math.round(
        explicitPercent > 0 && explicitPercent < 100
          ? explicitPercent
          : calculatedPercent
      )
    )
  );

  return {
    regularPrice: regular,
    currentPrice: current,
    salePrice: current,
    discountPercent,
    source,
  };
}

function getHtmlDiscountCandidate(source = {}) {
  const priceHtml = String(source?.price_html || source?.priceHtml || "");

  if (!priceHtml) return null;

  const delMatch = priceHtml.match(/<del\b[^>]*>([\s\S]*?)<\/del>/i);
  const insMatch = priceHtml.match(/<ins\b[^>]*>([\s\S]*?)<\/ins>/i);

  if (delMatch && insMatch) {
    const regularPrices = extractPriceNumbers(delMatch[1]);
    const salePrices = extractPriceNumbers(insMatch[1]);
    const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
    const salePrice = salePrices.length ? Math.min(...salePrices) : 0;

    return createDiscountCandidate(
      regularPrice,
      salePrice,
      getExplicitDiscountPercent(source),
      "price-html"
    );
  }

  const cleanText = decodePriceHtml(priceHtml);
  const originalMatch = cleanText.match(
    /original\s+price(?:\s+was)?\s*:?\s*\$?\s*([0-9,.]+)/i
  );
  const currentMatch = cleanText.match(
    /current\s+price(?:\s+is)?\s*:?\s*\$?\s*([0-9,.]+)/i
  );

  if (originalMatch && currentMatch) {
    return createDiscountCandidate(
      parseProductPriceNumber(originalMatch[1]),
      parseProductPriceNumber(currentMatch[1]),
      getExplicitDiscountPercent(source),
      "price-html-text"
    );
  }

  if (source?.on_sale === true || source?.onSale === true) {
    const prices = extractPriceNumbers(priceHtml);

    // Only use the fallback when the HTML contains exactly one regular/sale pair.
    // With variable products, combining the highest regular price with the lowest
    // sale price from different variations creates an incorrect percentage.
    if (prices.length === 2) {
      const [firstPrice, secondPrice] = prices;
      const regularPrice = Math.max(firstPrice, secondPrice);
      const salePrice = Math.min(firstPrice, secondPrice);

      return createDiscountCandidate(
        regularPrice,
        salePrice,
        getExplicitDiscountPercent(source),
        "price-html-fallback"
      );
    }
  }

  return null;
}

function getEntityDiscountCandidates(source = {}) {
  if (!source || typeof source !== "object") return [];

  const candidates = [];
  const explicitPercent = getExplicitDiscountPercent(source);

  const pushCandidate = (regularPrice, currentPrice, candidateSource) => {
    const candidate = createDiscountCandidate(
      regularPrice,
      currentPrice,
      explicitPercent,
      candidateSource
    );

    if (candidate) candidates.push(candidate);
  };

  const directRegular = getFirstPositivePrice(source, [
    "regular_price",
    "regularPrice",
    "display_regular_price",
    "displayRegularPrice",
    "variation_regular_price",
    "variationRegularPrice",
    "original_price",
    "originalPrice",
    "compare_at_price",
    "compareAtPrice",
  ]);

  const directSale = getFirstPositivePrice(source, [
    "sale_price",
    "salePrice",
    "discounted_price",
    "discountedPrice",
  ]);

  const directCurrent = getFirstPositivePrice(source, [
    "price",
    "current_price",
    "currentPrice",
    "display_price",
    "displayPrice",
    "variation_price",
    "variationPrice",
  ]);

  pushCandidate(
    directRegular,
    directSale > 0 ? directSale : directCurrent,
    "direct"
  );

  const storeRegular = getFirstPositivePrice(
    source,
    ["prices.regular_price", "prices.regularPrice"],
    getStoreApiPriceNumber
  );
  const storeSale = getFirstPositivePrice(
    source,
    ["prices.sale_price", "prices.salePrice"],
    getStoreApiPriceNumber
  );
  const storeCurrent = getFirstPositivePrice(
    source,
    ["prices.price", "prices.current_price", "prices.currentPrice"],
    getStoreApiPriceNumber
  );

  pushCandidate(
    storeRegular,
    storeSale > 0 ? storeSale : storeCurrent,
    "store-api"
  );

  const rangeRegular = getFirstPositivePrice(source, [
    "min_regular_price",
    "minRegularPrice",
    "regular_price_min",
    "regularPriceMin",
    "price_range.regular_price",
    "priceRange.regularPrice",
    "price_range.regular.min",
    "priceRange.regular.min",
    "prices.price_range.regular_price",
    "prices.price_range.regularPrice",
    "prices.price_range.regular.min",
  ]);

  const rangeSale = getFirstPositivePrice(source, [
    "min_sale_price",
    "minSalePrice",
    "sale_price_min",
    "salePriceMin",
    "price_range.sale_price",
    "priceRange.salePrice",
    "price_range.sale.min",
    "priceRange.sale.min",
    "prices.price_range.sale_price",
    "prices.price_range.salePrice",
    "prices.price_range.sale.min",
  ]);

  const rangeCurrent = getFirstPositivePrice(source, [
    "min_price",
    "minPrice",
    "price_min",
    "priceMin",
    "price_range.min",
    "priceRange.min",
    "price_range.min_price",
    "priceRange.minPrice",
  ]);

  pushCandidate(
    rangeRegular,
    rangeSale > 0 ? rangeSale : rangeCurrent,
    "price-range"
  );

  const metaRegular = parseProductPriceNumber(
    getMetaValue(source, [
      "_regular_price",
      "regular_price",
      "_original_price",
      "original_price",
      "_compare_at_price",
      "compare_at_price",
    ])
  );
  const metaSale = parseProductPriceNumber(
    getMetaValue(source, [
      "_sale_price",
      "sale_price",
      "_discounted_price",
      "discounted_price",
      "_price",
      "price",
    ])
  );

  pushCandidate(metaRegular, metaSale, "metadata");

  const htmlCandidate = getHtmlDiscountCandidate(source);

  if (htmlCandidate) candidates.push(htmlCandidate);

  const currentPrice = directCurrent || storeCurrent || rangeCurrent || metaSale;

  if (explicitPercent > 0 && currentPrice > 0) {
    const computedRegular = currentPrice / (1 - explicitPercent / 100);

    pushCandidate(computedRegular, currentPrice, "explicit-percent");
  }

  return candidates;
}

function getVariationPriceMatrixCandidates(product = {}) {
  const matrix =
    product?.variation_prices ||
    product?.variationPrices ||
    product?.prices_by_variation ||
    product?.pricesByVariation;

  if (!matrix || typeof matrix !== "object" || Array.isArray(matrix)) return [];

  const regularMap = matrix?.regular_price || matrix?.regularPrice || {};
  const saleMap = matrix?.sale_price || matrix?.salePrice || {};
  const currentMap = matrix?.price || matrix?.current_price || matrix?.currentPrice || {};
  const ids = new Set([
    ...Object.keys(regularMap || {}),
    ...Object.keys(saleMap || {}),
    ...Object.keys(currentMap || {}),
  ]);

  return [...ids]
    .map((id) => {
      const regularPrice = parseProductPriceNumber(regularMap?.[id]);
      const salePrice = parseProductPriceNumber(saleMap?.[id]);
      const currentPrice = parseProductPriceNumber(currentMap?.[id]);

      return createDiscountCandidate(
        regularPrice,
        salePrice > 0 ? salePrice : currentPrice,
        getExplicitDiscountPercent(product),
        "variation-price-matrix"
      );
    })
    .filter(Boolean);
}

function getProductPrice(product) {
  const directPrice = getFirstPositivePrice(product, [
    "price",
    "current_price",
    "currentPrice",
    "sale_price",
    "salePrice",
    "regular_price",
    "regularPrice",
    "min_price",
    "minPrice",
    "price_min",
    "priceMin",
  ]);

  if (directPrice > 0) return directPrice;

  const storePrice = getFirstPositivePrice(
    product,
    ["prices.price", "prices.sale_price", "prices.regular_price"],
    getStoreApiPriceNumber
  );

  if (storePrice > 0) return storePrice;

  const variationPrices = getProductVariationObjects(product)
    .map((variation) => {
      return getFirstPositivePrice(variation, [
        "price",
        "current_price",
        "currentPrice",
        "sale_price",
        "salePrice",
        "regular_price",
        "regularPrice",
      ]);
    })
    .filter((price) => price > 0);

  if (variationPrices.length > 0) return Math.min(...variationPrices);

  const htmlPrices = extractPriceNumbers(
    product?.price_html || product?.priceHtml || ""
  );

  return htmlPrices.length ? Math.min(...htmlPrices) : 0;
}


function entityHasActiveSale(source = {}) {
  if (!source || typeof source !== "object") return false;

  if (source?.on_sale === true || source?.onSale === true) return true;
  if (getExplicitDiscountPercent(source) > 0) return true;

  const directRegular = getFirstPositivePrice(source, [
    "regular_price",
    "regularPrice",
    "display_regular_price",
    "displayRegularPrice",
    "variation_regular_price",
    "variationRegularPrice",
  ]);

  const directSale = getFirstPositivePrice(source, [
    "sale_price",
    "salePrice",
    "discounted_price",
    "discountedPrice",
  ]);

  const directCurrent = getFirstPositivePrice(source, [
    "price",
    "current_price",
    "currentPrice",
    "display_price",
    "displayPrice",
    "variation_price",
    "variationPrice",
  ]);

  if (
    directRegular > 0 &&
    (directSale > 0 ? directSale : directCurrent) > 0 &&
    (directSale > 0 ? directSale : directCurrent) < directRegular
  ) {
    return true;
  }

  const storeRegular = getFirstPositivePrice(
    source,
    ["prices.regular_price", "prices.regularPrice"],
    getStoreApiPriceNumber
  );
  const storeSale = getFirstPositivePrice(
    source,
    ["prices.sale_price", "prices.salePrice"],
    getStoreApiPriceNumber
  );
  const storeCurrent = getFirstPositivePrice(
    source,
    ["prices.price", "prices.current_price", "prices.currentPrice"],
    getStoreApiPriceNumber
  );

  if (
    storeRegular > 0 &&
    (storeSale > 0 ? storeSale : storeCurrent) > 0 &&
    (storeSale > 0 ? storeSale : storeCurrent) < storeRegular
  ) {
    return true;
  }

  const priceHtml = String(source?.price_html || source?.priceHtml || "");

  return /<del\b[^>]*>[\s\S]*?<\/del>[\s\S]*?<ins\b[^>]*>[\s\S]*?<\/ins>/i.test(
    priceHtml
  );
}

function hasProductSaleSignal(product = {}) {
  if (entityHasActiveSale(product)) return true;
  if (getVariationPriceMatrixCandidates(product).length > 0) return true;

  return getProductVariationObjects(product).some(entityHasActiveSale);
}

function chooseCandidateClosestToCatalogPrice(candidates = [], catalogPrice = 0) {
  if (!candidates.length) return null;

  const exactCandidates =
    catalogPrice > 0
      ? candidates.filter(
          (candidate) => Math.abs(candidate.currentPrice - catalogPrice) <= 0.05
        )
      : [];

  const pool = exactCandidates.length ? exactCandidates : candidates;

  return [...pool].sort((a, b) => {
    const sourcePriority = {
      direct: 0,
      "store-api": 1,
      metadata: 2,
      "price-html": 3,
      "price-html-text": 4,
      "price-range": 5,
      "variation-price-matrix": 6,
      "variation-direct": 7,
      "variation-store-api": 8,
      "variation-price-html": 9,
      "variation-price-html-text": 10,
      "explicit-percent": 11,
      "price-html-fallback": 30,
      "variation-price-html-fallback": 31,
    };

    const priorityDifference =
      (sourcePriority[a.source] ?? 20) - (sourcePriority[b.source] ?? 20);

    if (priorityDifference !== 0) return priorityDifference;

    const aDifference = a.regularPrice - a.currentPrice;
    const bDifference = b.regularPrice - b.currentPrice;

    if (Math.abs(aDifference - bDifference) > 0.001) {
      return aDifference - bDifference;
    }

    return a.regularPrice - b.regularPrice;
  })[0];
}

function getReliableProductDiscountPercent(product = {}) {
  const explicitPercent = getExplicitDiscountPercent(product);

  if (explicitPercent > 0) return Math.round(explicitPercent);

  const catalogPrice = getProductPrice(product);
  const productCandidates = getEntityDiscountCandidates(product).filter(
    (candidate) =>
      candidate.source !== "price-html-fallback" &&
      candidate.source !== "explicit-percent"
  );

  const matrixCandidates = getVariationPriceMatrixCandidates(product);
  const variationCandidates = getProductVariationObjects(product).flatMap(
    (variation) =>
      getEntityDiscountCandidates(variation)
        .filter(
          (candidate) =>
            candidate.source !== "price-html-fallback" &&
            candidate.source !== "explicit-percent"
        )
        .map((candidate) => ({
          ...candidate,
          source: `variation-${candidate.source}`,
        }))
  );

  const selected = chooseCandidateClosestToCatalogPrice(
    [...productCandidates, ...matrixCandidates, ...variationCandidates],
    catalogPrice
  );

  return selected?.discountPercent || 0;
}

function getDominantCatalogDiscountPercent(products = []) {
  const tally = new Map();

  const addPercent = (percent, weight = 1) => {
    const normalizedPercent = Math.round(Number(percent || 0));

    if (normalizedPercent <= 0 || normalizedPercent >= 100) return;

    tally.set(normalizedPercent, (tally.get(normalizedPercent) || 0) + weight);
  };

  products.forEach((product) => {
    if (!hasProductSaleSignal(product)) return;
    if (isVariableCatalogProduct(product)) return;

    addPercent(getReliableProductDiscountPercent(product), 6);
  });

  if (tally.size === 0) {
    products.forEach((product) => {
      if (!hasProductSaleSignal(product)) return;

      addPercent(getReliableProductDiscountPercent(product), 1);
    });
  }

  const result = [...tally.entries()].sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];

    return a[0] - b[0];
  })[0];

  return result?.[0] || 0;
}

function getProductPricing(product = {}, activeCatalogDiscountPercent = 0) {
  const catalogPrice = getProductPrice(product);
  const explicitPercent = getExplicitDiscountPercent(product);
  const productCandidates = getEntityDiscountCandidates(product);
  const matrixCandidates = getVariationPriceMatrixCandidates(product);
  const variationCandidates = getProductVariationObjects(product).flatMap(
    (variation) =>
      getEntityDiscountCandidates(variation).map((candidate) => ({
        ...candidate,
        source: `variation-${candidate.source}`,
      }))
  );

  const candidates = [
    ...productCandidates,
    ...matrixCandidates,
    ...variationCandidates,
  ];

  if (explicitPercent > 0 && catalogPrice > 0) {
    const computedRegularPrice = catalogPrice / (1 - explicitPercent / 100);
    const explicitCandidate = createDiscountCandidate(
      computedRegularPrice,
      catalogPrice,
      explicitPercent,
      "product-explicit-percent"
    );

    if (explicitCandidate) candidates.unshift(explicitCandidate);
  }

  const uniqueCandidates = candidates.filter((candidate, index, all) => {
    return (
      all.findIndex(
        (item) =>
          Math.abs(item.regularPrice - candidate.regularPrice) < 0.001 &&
          Math.abs(item.currentPrice - candidate.currentPrice) < 0.001 &&
          item.discountPercent === candidate.discountPercent
      ) === index
    );
  });

  const sourcePriority = {
    "product-explicit-percent": 0,
    "variation-price-matrix": 1,
    "variation-direct": 2,
    "variation-store-api": 3,
    "variation-price-html": 4,
    "variation-price-html-text": 5,
    "price-range": 6,
    "price-html": 7,
    "price-html-text": 8,
    "direct": 9,
    "store-api": 10,
    "metadata": 11,
    "explicit-percent": 12,
    "price-html-fallback": 30,
    "variation-price-html-fallback": 31,
  };

  const rankCandidate = (candidate) =>
    sourcePriority[candidate.source] ?? 20;

  const exactCandidates =
    catalogPrice > 0
      ? uniqueCandidates.filter(
          (candidate) => Math.abs(candidate.currentPrice - catalogPrice) <= 0.05
        )
      : [];

  const exactCandidate = exactCandidates.sort((a, b) => {
    const priorityDifference = rankCandidate(a) - rankCandidate(b);

    if (priorityDifference !== 0) return priorityDifference;

    // When several variations share the same displayed minimum sale price,
    // use the closest matching regular price instead of the largest discount.
    const aDifference = a.regularPrice - a.currentPrice;
    const bDifference = b.regularPrice - b.currentPrice;

    if (Math.abs(aDifference - bDifference) > 0.001) {
      return aDifference - bDifference;
    }

    return a.regularPrice - b.regularPrice;
  })[0];

  const directCandidate = uniqueCandidates
    .filter((candidate) =>
      [
        "product-explicit-percent",
        "direct",
        "store-api",
        "price-range",
        "price-html",
        "price-html-text",
        "metadata",
        "explicit-percent",
      ].includes(candidate.source)
    )
    .sort((a, b) => {
      const priorityDifference = rankCandidate(a) - rankCandidate(b);

      if (priorityDifference !== 0) return priorityDifference;

      return a.regularPrice - b.regularPrice;
    })[0];

  const selectedCandidate = exactCandidate || directCandidate || null;
  const saleSignal = hasProductSaleSignal(product);
  const normalizedActivePercent = Math.round(
    Number(activeCatalogDiscountPercent || 0)
  );
  const shouldUseCatalogPercent =
    saleSignal &&
    isVariableCatalogProduct(product) &&
    catalogPrice > 0 &&
    normalizedActivePercent > 0 &&
    normalizedActivePercent < 100 &&
    (!selectedCandidate ||
      Math.abs(selectedCandidate.discountPercent - normalizedActivePercent) > 2);

  if (shouldUseCatalogPercent) {
    const computedRegularPrice =
      catalogPrice / (1 - normalizedActivePercent / 100);
    const catalogPercentCandidate = createDiscountCandidate(
      computedRegularPrice,
      catalogPrice,
      normalizedActivePercent,
      "catalog-active-percent"
    );

    if (catalogPercentCandidate) {
      return {
        ...catalogPercentCandidate,
        hasDiscount: true,
      };
    }
  }

  if (selectedCandidate) {
    return {
      ...selectedCandidate,
      hasDiscount: true,
    };
  }

  return {
    regularPrice: catalogPrice,
    currentPrice: catalogPrice,
    salePrice: 0,
    discountPercent: 0,
    hasDiscount: false,
    source: "catalog-price",
  };
}

function isProductDiscounted(product) {
  return getProductPricing(product).hasDiscount;
}

function formatPrice(price) {
  const number = Number(price || 0);

  if (Number.isNaN(number) || number <= 0) return "Request Price";

  return `$${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function getProductTags(product) {
  const rawTags = product?.tags || product?.labels || [];

  if (!Array.isArray(rawTags)) return [];

  return rawTags
    .map((tag) =>
      typeof tag === "string" ? tag.toLowerCase() : tag?.name?.toLowerCase()
    )
    .filter(Boolean);
}

function getProductCategoryFilterTerms(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories.map(getTermValue)
    : [];

  const tags = Array.isArray(product?.tags)
    ? product.tags.map(getTermValue)
    : [];

  const labels = Array.isArray(product?.labels)
    ? product.labels.map(getTermValue)
    : [];

  return [
    product?.category,
    product?.category_slug,
    product?.categorySlug,
    ...categories,
    ...tags,
    ...labels,
  ]
    .map(normalizeCatalogFilterText)
    .filter(Boolean);
}

function getProductAvailability(product, cachedTags) {
  const tags = cachedTags || getProductTags(product);

  const stockStatus = String(product?.stock_status || product?.stockStatus || "")
    .toLowerCase()
    .trim();

  const manageStock =
    product?.manage_stock === true || product?.manageStock === true;

  const stockQuantity =
    product?.stock_quantity ??
    product?.stockQuantity ??
    product?.quantity ??
    null;

  const isComingSoon =
    tags.includes("coming soon") ||
    tags.includes("coming-soon") ||
    stockStatus === "coming-soon";

  const isSoldOut =
    stockStatus === "outofstock" ||
    stockStatus === "out-of-stock" ||
    stockStatus === "out of stock" ||
    stockStatus === "soldout" ||
    stockStatus === "sold-out" ||
    stockStatus === "sold out" ||
    product?.in_stock === false ||
    product?.inStock === false ||
    product?.is_in_stock === false ||
    product?.isInStock === false ||
    product?.purchasable === false ||
    product?.is_purchasable === false ||
    tags.includes("sold out") ||
    tags.includes("sold-out") ||
    tags.includes("out of stock") ||
    tags.includes("out-of-stock") ||
    (manageStock && Number(stockQuantity) <= 0);

  const isUnavailable = isComingSoon || isSoldOut;

  return {
    isComingSoon,
    isSoldOut,
    isUnavailable,
    isAvailable: !isUnavailable,
    unavailableLabel: isComingSoon ? "Coming Soon" : "Sold Out",
  };
}

function getProductUrl(product) {
  return product?.slug ? `/product/${product.slug}` : `/product/${product?.id}`;
}

function getProductOrderSearchText(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories.map((category) => category?.name || category?.slug || "")
    : [];

  const tags = Array.isArray(product?.tags)
    ? product.tags.map((tag) =>
        typeof tag === "string" ? tag : tag?.name || tag?.slug || ""
      )
    : [];

  const attributes = Array.isArray(product?.attributes)
    ? product.attributes.flatMap((attribute) => [
        attribute?.name || "",
        attribute?.slug || "",
        ...(attribute?.options || []),
      ])
    : [];

  return normalizeProductOrderText(
    [
      product?.name,
      product?.title,
      product?.slug,
      product?.sku,
      ...categories,
      ...tags,
      ...attributes,
    ].join(" ")
  );
}

function getCategoryFromUrl() {
  if (typeof window === "undefined") return "All Products";

  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");

  if (!categoryParam) return "All Products";

  const normalizedParam = normalizeCatalogFilterText(categoryParam);

  const matchedCategory = categoryFilters.find(
    (category) => normalizeCatalogFilterText(category) === normalizedParam
  );

  return matchedCategory || "All Products";
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];

  if (currentPage > 3) {
    pages.push("start-ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("end-ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

function prepareProductForCatalog(product, activeCatalogDiscountPercent = 0) {
  const name = product?.name || product?.title || "Product";
  const category = getProductCategory(product);
  const pricing = getProductPricing(product, activeCatalogDiscountPercent);
  const price = pricing.currentPrice || getProductPrice(product);
  const image = getProductImage(product);
  const url = getProductUrl(product);
  const key = getProductKey(product);
  const tags = getProductTags(product);
  const availability = getProductAvailability(product, tags);
  const orderText = getProductOrderSearchText(product);
  const categoryTerms = getProductCategoryFilterTerms(product);

  const searchText = normalizeCatalogFilterText(
    [
      product?.name,
      product?.title,
      product?.sku,
      product?.slug,
      product?.short_description,
      product?.description,
      product?.catalog_search_text,
      category,
      ...categoryTerms,
      ...tags,
    ].join(" ")
  );

  const newestRaw =
    product?.date_created ||
    product?.dateCreated ||
    product?.created_at ||
    product?.createdAt ||
    0;

  return {
    product,
    key,
    name,
    category,
    price,
    pricing,
    image,
    url,
    tags,
    availability,
    orderText,
    categoryTerms,
    searchText,
    rank: getCustomProductRankFromText(orderText),
    mg: getProductMgFromText(orderText),
    onSale: pricing.hasDiscount || hasProductSaleSignal(product),
    newestTime: newestRaw ? new Date(newestRaw).getTime() || 0 : 0,
  };
}

function productMatchesCategoryMeta(item, activeCategory) {
  const target = normalizeCatalogFilterText(activeCategory);

  if (!target || target === "all products") return true;

  return (
    item.categoryTerms.some((term) => term === target) ||
    target.split(" ").every((word) => item.searchText.includes(word))
  );
}

function isVariableCatalogProduct(product = {}) {
  const productType = String(
    product?.type || product?.product_type || product?.productType || ""
  )
    .toLowerCase()
    .trim();

  if (productType.includes("variable")) return true;

  if (product?.has_options === true || product?.hasOptions === true) return true;

  const variationCollections = [
    product?.variations,
    product?.variation_ids,
    product?.variationIds,
    product?.children,
  ];

  if (
    variationCollections.some(
      (collection) => Array.isArray(collection) && collection.length > 0
    )
  ) {
    return true;
  }

  if (
    Array.isArray(product?.attributes) &&
    product.attributes.some(
      (attribute) =>
        attribute?.variation === true ||
        attribute?.is_variation === true ||
        attribute?.isVariation === true
    )
  ) {
    return true;
  }

  const parseRangeNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const parsed = String(value).replace(/[^0-9.]/g, "");
    return Number(parsed || 0);
  };

  const priceRangePairs = [
    [product?.min_price, product?.max_price],
    [product?.minPrice, product?.maxPrice],
    [product?.price_min, product?.price_max],
    [product?.priceMin, product?.priceMax],
    [product?.regular_price_min, product?.regular_price_max],
    [product?.regularPriceMin, product?.regularPriceMax],
    [product?.price_range?.min, product?.price_range?.max],
    [product?.priceRange?.min, product?.priceRange?.max],
  ];

  if (
    priceRangePairs.some(([min, max]) => {
      const cleanMin = parseRangeNumber(min);
      const cleanMax = parseRangeNumber(max);

      return cleanMin > 0 && cleanMax > 0 && cleanMax !== cleanMin;
    })
  ) {
    return true;
  }

  const priceRangeText = [
    product?.price,
    product?.price_html,
    product?.priceHtml,
    product?.price_range,
    product?.priceRange,
    product?.display_price,
    product?.displayPrice,
  ]
    .filter(Boolean)
    .join(" ");

  return /(&ndash;|&#8211;|–|—|\s-\s|\sto\s)/i.test(priceRangeText);
}


function getCartItemQuantity(item) {
  const rawQuantity =
    item?.quantity ??
    item?.qty ??
    item?.cart_quantity ??
    item?.cartQuantity ??
    1;

  const quantity = Number(rawQuantity);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}


function getPositiveWooId(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const normalizedValue =
      typeof value === "string" ? value.trim() : value;
    const numericValue = Number(normalizedValue);

    if (Number.isInteger(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return 0;
}

function getWooProductId(product = {}) {
  return getPositiveWooId(
    product?.parent_id,
    product?.parentId,
    product?.product_id,
    product?.productId,
    product?.id
  );
}

const variationOptionsRequestCache = new Map();

function getStoreProductsEndpoint(value = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return "";

  try {
    const fallbackOrigin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(rawValue, fallbackOrigin);
    const productsPathMatch = url.pathname.match(
      /^(.*\/wp-json\/wc\/store\/v\d+\/products)(?:\/.*)?$/i
    );

    if (productsPathMatch) {
      url.pathname = productsPathMatch[1];
    } else {
      const storeVersionPathMatch = url.pathname.match(
        /^(.*\/wp-json\/wc\/store\/v\d+)(?:\/.*)?$/i
      );

      url.pathname = storeVersionPathMatch
        ? `${storeVersionPathMatch[1]}/products`
        : "/wp-json/wc/store/v1/products";
    }

    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return "";
  }
}

function getVariationRequestUrls(product = {}, productId = 0) {
  if (!productId) return [];

  const publicWordPressUrl =
    import.meta.env.PUBLIC_WP_URL ||
    import.meta.env.PUBLIC_WC_STORE_URL ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
    "";
  const candidates = [
    product?._links?.collection?.[0]?.href,
    product?._links?.self?.[0]?.href,
    product?.store_api_url,
    product?.storeApiUrl,
    product?.api_url,
    product?.apiUrl,
    publicWordPressUrl,
    product?.permalink,
    typeof window !== "undefined" ? window.location.origin : "",
  ];
  const uniqueEndpoints = [
    ...new Set(candidates.map(getStoreProductsEndpoint).filter(Boolean)),
  ];

  return uniqueEndpoints.map((endpoint) => {
    const url = new URL(endpoint);

    url.searchParams.set("type", "variation");
    url.searchParams.set("parent", String(productId));
    url.searchParams.set("per_page", "100");
    url.searchParams.set("orderby", "menu_order");
    url.searchParams.set("order", "asc");

    return url.toString();
  });
}

async function fetchWooVariationOptions(product = {}) {
  const productId = getWooProductId(product);

  if (!productId) {
    throw new Error("This product is missing its WooCommerce ID.");
  }

  if (variationOptionsRequestCache.has(productId)) {
    return variationOptionsRequestCache.get(productId);
  }

  const request = (async () => {
    const requestUrls = getVariationRequestUrls(product, productId);
    let lastError = null;

    for (const requestUrl of requestUrls) {
      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(`WooCommerce returned ${response.status}.`);
        }

        const payload = await response.json();
        const variations = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
            ? payload.products
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
        const availableVariations = variations.filter((variation) => {
          const variationId = getPositiveWooId(
            variation?.variation_id,
            variation?.variationId,
            variation?.id
          );

          return variationId && !getProductAvailability(variation).isUnavailable;
        });
        const options = getProductMgOptions({
          ...product,
          variations: availableVariations,
          variation_objects: availableVariations,
          variationObjects: availableVariations,
          available_variations: availableVariations,
          availableVariations,
          children: [],
          attributes: [],
        }).filter((option) => option.variationId);

        if (options.length > 0) return options;

        lastError = new Error("WooCommerce returned no available variations.");
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("The MG options could not be loaded.");
  })();

  variationOptionsRequestCache.set(productId, request);

  try {
    return await request;
  } catch (error) {
    variationOptionsRequestCache.delete(productId);
    throw error;
  }
}

function getVariationSelection(variation = {}, fallbackLabel = "") {
  const attributes = Array.isArray(variation?.attributes)
    ? variation.attributes
    : [];

  if (attributes.length > 0) {
    return attributes.reduce((selection, attribute) => {
      if (!attribute || typeof attribute !== "object") return selection;

      const rawName =
        attribute?.slug ||
        attribute?.taxonomy ||
        attribute?.attribute ||
        attribute?.name ||
        attribute?.label ||
        "";
      const rawValue =
        attribute?.option ?? attribute?.value ?? attribute?.term ?? "";

      if (!rawName || rawValue === "") return selection;

      const cleanName = String(rawName)
        .trim()
        .toLowerCase()
        .replace(/^attribute_/, "")
        .replace(/\s+/g, "-");
      const key = cleanName.startsWith("pa_")
        ? `attribute_${cleanName}`
        : `attribute_${cleanName}`;

      selection[key] = String(rawValue).trim();
      return selection;
    }, {});
  }

  const embeddedSelection =
    variation?.variation ||
    variation?.variation_data ||
    variation?.variationData;

  if (
    embeddedSelection &&
    typeof embeddedSelection === "object" &&
    !Array.isArray(embeddedSelection)
  ) {
    return { ...embeddedSelection };
  }

  if (
    variation &&
    typeof variation === "object" &&
    !Array.isArray(variation)
  ) {
    const directAttributes = Object.entries(variation).reduce(
      (selection, [key, value]) => {
        if (!key.startsWith("attribute_") || value === "") return selection;

        selection[key] = value;
        return selection;
      },
      {}
    );

    if (Object.keys(directAttributes).length > 0) {
      return directAttributes;
    }
  }

  return fallbackLabel ? { selected_option: fallbackLabel } : {};
}


function normalizeOptionText(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function getOptionMgValue(value = "") {
  const match = normalizeOptionText(value).match(/(\d+(?:\.\d+)?)\s*mg/i);

  return match ? Number(match[1]) : 999999;
}

function getProductVariationObjects(product = {}) {
  const possibleCollections = [
    product?.variations,
    product?.variation_objects,
    product?.variationObjects,
    product?.available_variations,
    product?.availableVariations,
    product?.variation_data,
    product?.variationData,
    product?.variations_data,
    product?.variationsData,
    product?.children,
  ];

  return possibleCollections
    .flatMap((collection) => {
      if (Array.isArray(collection)) return collection;
      if (collection && typeof collection === "object") {
        return Object.values(collection);
      }

      return [];
    })
    .filter((variation) => variation && typeof variation === "object");
}

function getVariationLabel(variation = {}) {
  const attributes = Array.isArray(variation?.attributes)
    ? variation.attributes
    : [];

  const attributeText = attributes
    .map((attribute) => {
      if (typeof attribute === "string") return attribute;

      return (
        attribute?.option ||
        attribute?.value ||
        attribute?.name ||
        attribute?.label ||
        ""
      );
    })
    .filter(Boolean)
    .join(" ");

  const storeApiVariationLabel =
    typeof variation?.variation === "string" ? variation.variation : "";

  return normalizeOptionText(
    attributeText ||
      storeApiVariationLabel ||
      variation?.name ||
      variation?.title ||
      variation?.label ||
      variation?.option ||
      variation?.attributes_text ||
      variation?.attributesText ||
      attributeText ||
      variation?.sku ||
      ""
  );
}

function getProductMgOptions(product = {}) {
  const optionsByKey = new Map();

  const pushOption = (option) => {
    const label = normalizeOptionText(option?.label || option?.name || option?.value);

    if (!label) return;

    const variationId = getPositiveWooId(
      option?.variationId,
      option?.variation_id,
      option?.variation?.variation_id,
      option?.variation?.variationId,
      option?.variation?.id
    );
    const mgValue = getOptionMgValue(label);
    const key =
      mgValue !== 999999
        ? `mg:${mgValue}`
        : normalizeCatalogFilterText(label);
    const nextOption = {
      label,
      value: option?.value || label,
      variationId,
      variation: option?.variation || null,
      variationSelection: getVariationSelection(
        option?.variation || {},
        label
      ),
      price: option?.price,
      image: option?.image,
      mgValue,
    };
    const currentOption = optionsByKey.get(key);

    // WooCommerce exposes variation objects and parent attributes separately.
    // Keep only one option per MG and always prefer the option that carries the
    // real numeric variation ID. This prevents an ID-less attribute option from
    // replacing/duplicating the valid variation.
    if (!currentOption || (!currentOption.variationId && variationId)) {
      optionsByKey.set(key, nextOption);
    }
  };

  getProductVariationObjects(product).forEach((variation) => {
    const label = getVariationLabel(variation);

    if (!label) return;

    const variationPrice =
      variation?.price ||
      variation?.sale_price ||
      variation?.salePrice ||
      variation?.regular_price ||
      variation?.regularPrice ||
      getProductPrice(variation);

    const variationImage =
      variation?.image?.src ||
      variation?.image?.url ||
      (typeof variation?.image === "string" ? variation.image : "") ||
      variation?.images?.[0]?.src ||
      variation?.images?.[0]?.url;

    pushOption({
      label,
      value: label,
      variationId: variation?.id || variation?.variation_id || variation?.variationId || 0,
      variation,
      price: variationPrice,
      image: variationImage,
    });
  });

  if (Array.isArray(product?.attributes)) {
    product.attributes.forEach((attribute) => {
      const attributeName = normalizeCatalogFilterText(
        attribute?.name || attribute?.slug || ""
      );

      const looksLikeMgAttribute =
        attributeName.includes("mg") ||
        attributeName.includes("size") ||
        attributeName.includes("dose") ||
        attributeName.includes("dosage") ||
        attributeName.includes("strength") ||
        attributeName.includes("specification");

      const isVariationAttribute =
        attribute?.variation === true ||
        attribute?.is_variation === true ||
        attribute?.isVariation === true;

      if (!looksLikeMgAttribute && !isVariationAttribute) return;

      const rawOptions = Array.isArray(attribute?.options)
        ? attribute.options
        : [];

      rawOptions.forEach((rawOption) => {
        const label =
          typeof rawOption === "string"
            ? rawOption
            : rawOption?.name || rawOption?.label || rawOption?.value || "";

        if (!label) return;

        pushOption({
          label,
          value: label,
          variationId:
            typeof rawOption === "object"
              ? getPositiveWooId(
                  rawOption?.variation_id,
                  rawOption?.variationId,
                  rawOption?.id
                )
              : 0,
          variation: {
            [attribute?.slug || attribute?.name || "mg"]: label,
          },
        });
      });
    });
  }

  return [...optionsByKey.values()].sort((a, b) => {
    if (a.mgValue !== b.mgValue) return a.mgValue - b.mgValue;

    return a.label.localeCompare(b.label);
  });
}

function productNeedsMgSelection(product = {}) {
  return getProductMgOptions(product).length > 0;
}


const ProductCard = memo(function ProductCard({
  item,
  addToCart,
  onBundleAdd,
}) {
  const { product, name, category, price, pricing, image, url, availability } = item;
  const { isUnavailable, unavailableLabel } = availability;
  const isVariableProduct = isVariableCatalogProduct(product);
  const canSelectBundle = !isUnavailable;
  const showBundleButton = true;
  const actionLabel = isVariableProduct ? "Select Options" : "Add to cart";
  const initialMgOptions = useMemo(() => getProductMgOptions(product), [product]);
  const [resolvedMgOptions, setResolvedMgOptions] = useState(null);
  const [mgOptionsLoading, setMgOptionsLoading] = useState(false);
  const [mgOptionsError, setMgOptionsError] = useState("");
  const mgOptions = resolvedMgOptions || initialMgOptions;
  const selectableMgOptions = mgOptions.filter((option) => option.variationId);
  const needsMgSelection = isVariableProduct || initialMgOptions.length > 0;
  const [mgSelectorOpen, setMgSelectorOpen] = useState(false);

  const goToProduct = useCallback(() => {
    window.location.href = url;
  }, [url]);

  const closeMgSelector = useCallback(() => {
    setMgSelectorOpen(false);
    setMgOptionsError("");
  }, []);

  const loadMgOptions = useCallback(async () => {
    const embeddedOptions = initialMgOptions.filter(
      (option) => option.variationId
    );
    const embeddedOptionsAreComplete =
      embeddedOptions.length > 0 &&
      embeddedOptions.length === initialMgOptions.length;

    if (embeddedOptionsAreComplete) {
      setResolvedMgOptions(embeddedOptions);
      setMgOptionsError("");
      return embeddedOptions;
    }

    setMgOptionsLoading(true);
    setMgOptionsError("");

    try {
      const liveOptions = await fetchWooVariationOptions(product);

      if (!liveOptions.length) {
        throw new Error("No available MG options were found.");
      }

      setResolvedMgOptions(liveOptions);
      return liveOptions;
    } catch (error) {
      if (embeddedOptions.length > 0) {
        setResolvedMgOptions(embeddedOptions);
        return embeddedOptions;
      }

      setResolvedMgOptions([]);
      setMgOptionsError(
        "We couldn't load the MG options. Please try again."
      );
      return [];
    } finally {
      setMgOptionsLoading(false);
    }
  }, [initialMgOptions, product]);

  const handleCardKeyDown = useCallback(
    (event) => {
      const target = event.target;

      if (target?.closest?.("button,a,input,select,textarea")) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToProduct();
      }
    },
    [goToProduct]
  );

  const handleAddToCart = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isUnavailable) return;

      if (isVariableProduct) {
        goToProduct();
        return;
      }

      const productId = getWooProductId(product);

      if (!productId) {
        console.error("Cannot add product: missing numeric WooCommerce ID", product);
        return;
      }

      addToCart({
        ...product,
        id: productId,
        cartItemId: `wc:${productId}:0`,
        product_id: productId,
        parent_id: productId,
        variation_id: 0,
        woo_product_id: productId,
        woo_variation_id: 0,
        variation: product.variation || {},
        name,
        price,
        image,
        category,

        bundleEligible: !isReconWaterProduct(product),
        bundleDiscount: 30,
        bundleDiscountTiers: BUNDLE_TIERS,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "quantity-discount-tiers",
      });
    },
    [
      addToCart,
      category,
      goToProduct,
      image,
      isUnavailable,
      isVariableProduct,
      name,
      price,
      product,
    ]
  );

  const handleBundleAdd = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isUnavailable) return;

      if (needsMgSelection) {
        const shouldOpen = !mgSelectorOpen;

        setMgSelectorOpen(shouldOpen);

        if (shouldOpen && isVariableProduct) {
          await loadMgOptions();
        }

        return;
      }

      if (isVariableProduct) {
        goToProduct();
        return;
      }

      onBundleAdd(product);
    },
    [
      goToProduct,
      isUnavailable,
      isVariableProduct,
      loadMgOptions,
      mgSelectorOpen,
      needsMgSelection,
      onBundleAdd,
      product,
    ]
  );

  const handleBundleMgSelect = useCallback(
    async (event, option) => {
      event.preventDefault();
      event.stopPropagation();

      if (isUnavailable) return;

      if (!option?.variationId) {
        await loadMgOptions();
        return;
      }

      onBundleAdd(product, option);
      setMgSelectorOpen(false);
    },
    [isUnavailable, loadMgOptions, onBundleAdd, product]
  );

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={goToProduct}
      onKeyDown={handleCardKeyDown}
      aria-label={`View details for ${name}`}
      className={`product-float-card group cursor-pointer ${
        isUnavailable ? "product-float-card-unavailable" : ""
      }`}
    >
      <div className="product-float-visual">
        <div className="visual-glow visual-glow-1" />
        <div className="visual-glow visual-glow-2" />
        <div className="visual-grid" />

        <div className="product-float-topbar">
          <span className="product-float-pill">{category}</span>

          <div className="product-float-top-actions">
            {isUnavailable && (
              <span className="product-stock-badge">{unavailableLabel}</span>
            )}

            <a
              href={url}
              onClick={(event) => {
                event.stopPropagation();
              }}
              aria-label={`View details for ${name}`}
              className="product-float-eye"
            >
              <Eye size={15} />
            </a>
          </div>
        </div>

        <div className="product-float-image-wrap">
          <div className="product-float-shadow" />

          <img
            src={image}
            alt={name}
            className="product-float-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="product-float-body">
        <h3 className="product-float-title">{name}</h3>

        <p className="product-float-subtitle">
          Research use only · Batch documentation available
        </p>

        {pricing?.hasDiscount ? (
          <p className="product-float-price product-float-price-discounted">
            <span className="product-float-price-regular">
              {formatPrice(pricing.regularPrice)}
            </span>

            <span className="product-float-price-current">
              {formatPrice(pricing.currentPrice)}
            </span>

            <span className="product-float-discount-badge">
              {pricing.discountPercent}% OFF
            </span>
          </p>
        ) : (
          <p className="product-float-price">{formatPrice(price)}</p>
        )}

        <div className="product-float-actions">
          {isUnavailable ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              className="product-float-button-disabled"
            >
              {unavailableLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="product-float-button"
              aria-label={
                isVariableProduct
                  ? `Select options for ${name}`
                  : `Add ${name} to cart`
              }
            >
              <ShoppingBag size={14} />
              <span>{actionLabel}</span>
              <ArrowRight size={14} className="product-float-arrow" />
            </button>
          )}

          {showBundleButton && (
            <button
              type="button"
              onClick={handleBundleAdd}
              disabled={!canSelectBundle}
              aria-disabled={!canSelectBundle}
              className={`product-bundle-select ${
                !canSelectBundle ? "product-bundle-select-disabled" : ""
              } ${mgSelectorOpen ? "product-bundle-select-active" : ""}`}
              aria-label={`Add ${name} toward the 5-product and 10-product quantity discounts`}
            >
              <span />
              {needsMgSelection ? "Choose MG" : "Add to Bundle"}
            </button>
          )}
        </div>

        {mgSelectorOpen && (
          <div
            className="product-mg-selector"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={`Choose MG for ${name}`}
          >
            <div className="product-mg-selector-head">
              <div>
                <p className="product-mg-kicker">Select MG</p>
                <p className="product-mg-title">Choose your option</p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMgSelector();
                }}
                className="product-mg-close"
                aria-label="Close MG selector"
              >
                <X size={13} />
              </button>
            </div>

            <div className="product-mg-options">
              {mgOptionsLoading ? (
                <div className="product-mg-status" aria-live="polite">
                  <span className="product-mg-spinner" aria-hidden="true" />
                  <span>Loading MG options...</span>
                </div>
              ) : mgOptionsError ? (
                <div className="product-mg-status product-mg-status-error">
                  <span>{mgOptionsError}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      loadMgOptions();
                    }}
                    className="product-mg-retry"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                selectableMgOptions.map((option) => (
                  <button
                    key={`${option.label}-${option.variationId}`}
                    type="button"
                    onClick={(event) => handleBundleMgSelect(event, option)}
                    className="product-mg-option"
                  >
                    <span>{option.label}</span>
                    <ArrowRight size={12} />
                  </button>
                ))
              )}
            </div>

            <p
              className={`product-mg-note ${
                isReconWaterProduct(product) ? "!text-red-400" : ""
              }`}
            >
              {isReconWaterProduct(product)
                ? "Recon Water does not count toward quantity discount tiers."
                : "This option counts toward both quantity discount tiers."}
            </p>
          </div>
        )}
      </div>
    </article>
  );
});

const FilterPanel = memo(function FilterPanel({
  activeCategory,
  activePrice,
  onCategoryChange,
  onPriceChange,
  onClear,
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55">
            Category
          </p>

          <button
            type="button"
            onClick={onClear}
            className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:text-cyan-100"
          >
            Clear
          </button>
        </div>

        <div className="space-y-1.5">
          {categoryFilters.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                activeCategory === category
                  ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100"
                  : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"
              }`}
            >
              <span className="text-[12px] font-semibold leading-5">
                {category}
              </span>

              {activeCategory === category && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55">
          Price
        </p>

        <div className="space-y-1.5">
          {priceFilters.map((price) => (
            <button
              key={price.label}
              type="button"
              onClick={() => onPriceChange(price)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                activePrice?.label === price.label
                  ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100"
                  : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"
              }`}
            >
              <span className="text-[12px] font-semibold leading-5">
                {price.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100"
      >
        Clear Filters
      </button>
    </div>
  );
});

export default function ShopCatalogSection({
  products = [],
  productsPerPage = 20,
}) {
  const cartApi = useCart();
  const addToCart = cartApi?.addToCart;
  const cartItems =
    cartApi?.cartItems || cartApi?.items || cartApi?.cart || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(() => getCategoryFromUrl());
  const [activePrice, setActivePrice] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [sortBy, setSortBy] = useState("popular");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const catalogResultsRef = useRef(null);
  const scrollAfterPageChangeRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const activeCatalogDiscountPercent = useMemo(() => {
    return getDominantCatalogDiscountPercent(products);
  }, [products]);

  const preparedProducts = useMemo(() => {
    return products.map((product) =>
      prepareProductForCatalog(product, activeCatalogDiscountPercent)
    );
  }, [products, activeCatalogDiscountPercent]);

  const bundleEligibleProductsCount = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (isReconWaterProduct(item)) return total;

      return total + getCartItemQuantity(item);
    }, 0);
  }, [cartItems]);

  const activeBundleTier = [...BUNDLE_TIERS]
    .reverse()
    .find((tier) => bundleEligibleProductsCount >= tier.quantity) || null;
  const nextBundleTier = BUNDLE_TIERS.find(
    (tier) => bundleEligibleProductsCount < tier.quantity,
  ) || null;
  const bundleProgressWidth = Math.min(
    (bundleEligibleProductsCount / 10) * 100,
    100
  );

  const addBundleItemToCart = useCallback(
    (product, selectedOption = null) => {
      const availability = getProductAvailability(product);

      if (availability.isUnavailable) return;

      const productName = product?.name || product?.title || "Product";
      const category = getProductCategory(product);
      const selectedLabel = selectedOption?.label || "";
      const selectedPrice = parseProductPriceNumber(selectedOption?.price);
      const basePrice = getProductPrice(product);
      const finalPrice = selectedPrice > 0 ? selectedPrice : basePrice;
      const image = selectedOption?.image || getProductImage(product);
      const productId = getWooProductId(product);
      const variationId = getPositiveWooId(
        selectedOption?.variationId,
        product?.variation_id,
        product?.variationId
      );
      const isVariableProduct = isVariableCatalogProduct(product);

      if (!productId) {
        console.error("Cannot add bundle item: missing numeric WooCommerce product ID", product);
        return;
      }

      if (isVariableProduct && !variationId) {
        console.error(
          "Cannot add bundle item: missing numeric WooCommerce variation ID",
          { productId, selectedOption }
        );
        return;
      }

      const variationSelection = variationId
        ? selectedOption?.variationSelection ||
          getVariationSelection(selectedOption?.variation || {}, selectedLabel)
        : {};

      addToCart({
        ...product,
        ...(selectedOption?.variation || {}),
        // `id` must remain a real WooCommerce ID. The old composite string
        // (`product-variation-label`) was later sent as a product ID.
        id: variationId || productId,
        cartItemId: `wc:${productId}:${variationId || 0}`,
        product_id: productId,
        parent_id: productId,
        variation_id: variationId,
        woo_product_id: productId,
        woo_variation_id: variationId,
        variation: variationSelection,
        variation_data: variationSelection,
        selectedOption: selectedLabel,
        selectedMg: selectedLabel,
        name: selectedLabel ? `${productName} - ${selectedLabel}` : productName,
        price: finalPrice,
        image,
        category,

        bundleEligible: !isReconWaterProduct(product),
        bundleDiscount: 30,
        bundleDiscountTiers: BUNDLE_TIERS,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "quantity-discount-tiers",
      });
    },
    [addToCart]
  );

  const filteredItems = useMemo(() => {
    const cleanSearch = normalizeCatalogFilterText(debouncedSearchQuery);

    const result = preparedProducts.filter((item) => {
      if (cleanSearch && !item.searchText.includes(cleanSearch)) {
        return false;
      }

      if (!productMatchesCategoryMeta(item, activeCategory)) {
        return false;
      }

      if (activePrice) {
        if (item.price < activePrice.min || item.price >= activePrice.max) {
          return false;
        }
      }

      if (activeCollection) {
        if (activeCollection === "sale") {
          return item.onSale;
        }

        if (activeCollection === "coming-soon") {
          return item.availability.isComingSoon;
        }

        return item.tags.includes(activeCollection);
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "popular") {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.mg !== b.mg) return a.mg - b.mg;
        return a.name.localeCompare(b.name);
      }

      if (a.availability.isAvailable && !b.availability.isAvailable) return -1;
      if (!a.availability.isAvailable && b.availability.isAvailable) return 1;

      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return b.newestTime - a.newestTime;

      if (a.rank !== b.rank) return a.rank - b.rank;

      return a.name.localeCompare(b.name);
    });

    return result;
  }, [
    preparedProducts,
    debouncedSearchQuery,
    activeCategory,
    activePrice,
    activeCollection,
    sortBy,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / productsPerPage)
  );

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * productsPerPage;

    return filteredItems.slice(start, start + productsPerPage);
  }, [filteredItems, currentPage, productsPerPage, totalPages]);

  const paginationPages = useMemo(() => {
    return getPaginationPages(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const showingStart =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * productsPerPage + 1;

  const showingEnd = Math.min(
    currentPage * productsPerPage,
    filteredItems.length
  );

  useEffect(() => {
    const handlePopStateCategorySync = () => {
      setActiveCategory(getCategoryFromUrl());
    };

    window.addEventListener("popstate", handlePopStateCategorySync);

    return () => {
      window.removeEventListener("popstate", handlePopStateCategorySync);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeCategory, activePrice, activeCollection, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!scrollAfterPageChangeRef.current) return;

    scrollAfterPageChangeRef.current = false;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    catalogResultsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [currentPage]);

  const goToPage = useCallback(
    (page) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);

      if (nextPage === currentPage) return;

      scrollAfterPageChangeRef.current = true;
      setCurrentPage(nextPage);
    },
    [currentPage, totalPages]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setActiveCategory("All Products");
    setActivePrice(null);
    setActiveCollection(null);
    setSortBy("popular");
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const handlePriceChange = useCallback((price) => {
    setActivePrice((currentPrice) =>
      currentPrice?.label === price.label ? null : price
    );
  }, []);

  return (
    <section className="product-catalog-section relative px-3 py-10 text-white sm:px-6 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="catalog-hero mb-8 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
              Shop Catalog
            </span>
          </div>

          <h2 className="mx-auto max-w-[520px] text-[38px] font-semibold leading-[1] tracking-[-0.055em] text-white sm:max-w-4xl sm:text-[50px] md:mx-0 lg:text-[54px]">
            Research products,
            <span className="text-slate-400"> clearly organized.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-sm md:mx-0">
            Filter products by category, price range, catalog status, and
            research collection.
          </p>
        </div>

        <DispatchCutoff variant="catalog" />

        <div className="bundle-summary mb-7 overflow-hidden rounded-[1.35rem] border border-cyan-200/12 bg-[#121E2E]/55 p-4 sm:mb-8 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,.9fr)] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-300/[0.055] px-3 py-1.5">
                <Sparkles size={13} className="text-cyan-200" />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
                  Automatic quantity savings
                </span>
              </div>

              <h3 className="text-xl font-semibold tracking-[-0.045em] text-white sm:text-2xl">
                Add 5 for 10% off. Reach 10 and upgrade to 30% off.
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Every eligible catalog product counts. The discount upgrades
                automatically at 10 products—the 10% and 30% offers never stack.
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-red-400">
                Recon Water is excluded: it does not count as a bundle product
                and does not receive the bundle discount.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-3.5 sm:p-4">
              <div className="grid grid-cols-2 gap-2.5">
                {BUNDLE_TIERS.map((tier) => {
                  const isActive = activeBundleTier?.quantity === tier.quantity;
                  const isReplaced = tier.quantity === 5 && bundleEligibleProductsCount >= 10;
                  const remaining = Math.max(0, tier.quantity - bundleEligibleProductsCount);

                  return (
                    <div
                      key={tier.quantity}
                      className={`rounded-xl border px-3 py-3 transition ${
                        isActive
                          ? "border-emerald-300/25 bg-emerald-300/[0.08]"
                          : "border-cyan-200/10 bg-white/[0.025]"
                      }`}
                    >
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Tier {tier.quantity === 5 ? "one" : "two"}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {tier.quantity} products
                      </p>
                      <p className={`mt-0.5 text-xs font-bold ${isActive ? "text-emerald-200" : "text-cyan-200/70"}`}>
                        {tier.discountPercent}% off
                      </p>
                      <p className="mt-2 text-[9px] leading-4 text-slate-500">
                        {isReplaced
                          ? "Upgraded to the 30% tier."
                          : isActive
                            ? "Active in your cart now."
                            : `${remaining} more product${remaining === 1 ? "" : "s"} needed.`}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Your progress
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-300">
                    {activeBundleTier?.discountPercent === 30
                      ? "30% discount active"
                      : activeBundleTier?.discountPercent === 10
                        ? `10% active · ${nextBundleTier.quantity - bundleEligibleProductsCount} more to upgrade`
                        : `${nextBundleTier.quantity - bundleEligibleProductsCount} more to unlock 10%`}
                  </p>
                </div>
                <span className="rounded-full border border-cyan-200/12 bg-white/[0.03] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                  {Math.min(bundleEligibleProductsCount, 10)}/10
                </span>
              </div>

              <div className="relative mt-3 h-2 rounded-full bg-white/[0.06]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-300"
                  style={{ width: `${bundleProgressWidth}%` }}
                />
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-[#07111f]" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-3 sm:mb-8 lg:grid-cols-4">
          {collectionChips.map((chip) => {
            const Icon = chip.icon;
            const active = activeCollection === chip.value;

            return (
              <button
                key={chip.value}
                type="button"
                onClick={() =>
                  setActiveCollection(active ? null : chip.value)
                }
                className={`group relative overflow-hidden rounded-[1.15rem] border px-3.5 py-3.5 text-left transition sm:rounded-[1.4rem] sm:px-5 sm:py-4 ${
                  active
                    ? "border-cyan-200/30 bg-cyan-300/[0.075]"
                    : "border-cyan-200/10 bg-white/[0.018] hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />

                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-base">
                      {chip.label}
                    </p>

                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]">
                      {chip.caption}
                    </p>
                  </div>

                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition sm:h-10 sm:w-10 ${
                      active
                        ? "border-cyan-200/25 bg-cyan-300/[0.1] text-cyan-100"
                        : "border-cyan-200/10 bg-[#121E2E] text-cyan-200/70 group-hover:text-cyan-100"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-6 grid gap-3 lg:flex lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/55"
            />

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search products, category, SKU..."
              className="min-h-[50px] w-full rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#121E2E] sm:min-h-[52px] sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3 lg:flex">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:text-cyan-100 lg:hidden"
            >
              <Filter size={15} />
              Filters
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-h-[50px] w-full appearance-none rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 px-4 pr-10 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 outline-none transition focus:border-cyan-200/35 sm:min-h-[52px] sm:px-5 sm:pr-11 sm:text-[10px] sm:tracking-[0.16em]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[1.25rem] border border-cyan-200/10 bg-[#121E2E]/55 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
                  <SlidersHorizontal size={17} />
                </span>

                <div>
                  <p className="text-sm font-semibold text-white">Filters</p>
                  <p className="text-xs text-slate-600">
                    Refine catalog results
                  </p>
                </div>
              </div>

              <FilterPanel
                activeCategory={activeCategory}
                activePrice={activePrice}
                onCategoryChange={handleCategoryChange}
                onPriceChange={handlePriceChange}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <div ref={catalogResultsRef} className="scroll-mt-24 sm:scroll-mt-28">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <p className="text-[12px] text-slate-500 sm:text-sm">
                Showing{" "}
                <span className="font-semibold text-white">
                  {showingStart}-{showingEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-white">
                  {filteredItems.length}
                </span>{" "}
                results
              </p>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                Manual catalog order active in Most popular
              </p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-[1.6rem] border border-cyan-200/10 bg-[#121E2E]/45 p-8 text-center sm:p-10">
                <p className="text-xl font-semibold text-white">
                  No products found
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Try clearing filters or searching another term.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.14]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="product-catalog-grid">
                  {paginatedItems.map((item) => (
                    <ProductCard
                      key={item.key}
                      item={item}
                      addToCart={addToCart}
                      onBundleAdd={addBundleItemToCart}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-cyan-200/10 pt-6 sm:flex-row">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.025] text-slate-300 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {paginationPages.map((page) => {
                        if (typeof page === "string") {
                          return (
                            <span
                              key={page}
                              className="grid h-10 min-w-10 place-items-center text-[11px] font-black text-slate-700"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-[11px] font-black transition ${
                              currentPage === page
                                ? "bg-cyan-300 text-slate-950"
                                : "border border-cyan-200/10 bg-white/[0.025] text-slate-400 hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.025] text-slate-300 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-cyan-200/10 bg-[#07111D] p-6 shadow-[0_-30px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">Filters</p>
                <p className="text-sm text-slate-500">Refine shop results</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-white/[0.035] text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <FilterPanel
              activeCategory={activeCategory}
              activePrice={activePrice}
              onCategoryChange={handleCategoryChange}
              onPriceChange={handlePriceChange}
              onClear={clearFilters}
            />

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
