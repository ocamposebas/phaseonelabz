import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
    groups: [["pl rt"], ["r3ta"], ["rt3"], ["reta"], ["retatrutide"]],
  },
  {
    rank: 2,
    groups: [["tirz"], ["pl tz"], ["tz2"], ["tirzepatide"]],
  },
  {
    rank: 3,
    groups: [["hospira"]],
  },
  {
    rank: 4,
    groups: [["p1", "water"], ["phase one", "water"], ["p1", "bacteriostatic"]],
    exclude: ["hospira"],
  },
  {
    rank: 5,
    groups: [["adamax"]],
  },
  {
    rank: 6,
    groups: [["glow"]],
  },
  {
    rank: 7,
    groups: [["klow"]],
  },
  {
    rank: 8,
    groups: [["ghk"], ["ghk cu"]],
  },
  {
    rank: 9,
    groups: [["tesamorelin"]],
  },
  {
    rank: 10,
    groups: [["mots"], ["mots c"]],
  },
  {
    rank: 11,
    groups: [["wolverine"], ["bpc", "tb"], ["bpc", "tb 500"]],
  },
  {
    rank: 12,
    groups: [["ss31"], ["ss 31"]],
  },
  {
    rank: 13,
    groups: [["5 amino", "1mq"], ["5 amino"], ["1mq"]],
  },
  {
    rank: 14,
    groups: [["korean", "glutha"], ["korean", "glutathione"], ["glutha"]],
  },
  {
    rank: 15,
    groups: [["nad plus"], ["nad"]],
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


const ProductCard = memo(function ProductCard({ item, addToCart, onBundleAdd }) {
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

        bundleEligible: true,
        bundleDiscount: 10,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "any-5-products",
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
              aria-label={`Add ${name} to bundle and unlock 10% off after 5 products`}
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

            <p className="product-mg-note">
              This adds the selected option to your 5-product bundle.
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

  const cartProductsCount = useMemo(() => {
    return cartItems.reduce((total, item) => {
      return total + getCartItemQuantity(item);
    }, 0);
  }, [cartItems]);

  const bundleGoal = 5;
  const remainingBundleProducts = Math.max(0, bundleGoal - cartProductsCount);
  const bundleUnlocked = cartProductsCount >= bundleGoal;
  const bundleProgressWidth = Math.min(
    (cartProductsCount / bundleGoal) * 100,
    100
  );

  const addAnyFiveBundleItemToCart = useCallback(
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
        // `id` must remain a real WooCommerce ID. The old composite string
        // (`product-variation-label`) was later sent to Tagada as a product ID.
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

        bundleEligible: true,
        bundleDiscount: 10,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "any-5-products",
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

  const goToPage = useCallback(
    (page) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      setCurrentPage(nextPage);
    },
    [totalPages]
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
        <div className="mb-8 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
              Shop Catalog
            </span>
          </div>

          <h2 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[56px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]">
            Browse research
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              products.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-sm md:mx-0">
            Filter products by category, price range, catalog status, and
            research collection.
          </p>
        </div>

        <div className="mb-7 overflow-hidden rounded-[1.35rem] border border-cyan-200/12 bg-[#121E2E]/55 p-4 sm:mb-8 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-300/[0.055] px-3 py-1.5">
                <Sparkles size={13} className="text-cyan-200" />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
                  Bundle Builder
                </span>
              </div>

              <h3 className="text-xl font-semibold tracking-[-0.045em] text-white sm:text-2xl">
                Add any 5 products and unlock 10% off.
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Every product in the catalog counts toward the bundle. Add any 5
                products to your cart and unlock 10% off automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-left lg:min-w-[220px]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Bundle Progress
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                {bundleUnlocked ? "Bundle unlocked" : `${cartProductsCount}/5 products`}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {bundleUnlocked
                  ? "10% off is active in your cart."
                  : `You need ${remainingBundleProducts} more product${
                      remainingBundleProducts === 1 ? "" : "s"
                    } to complete the 5-product bundle and unlock 10% off.`}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-all duration-300"
                  style={{ width: `${bundleProgressWidth}%` }}
                />
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

          <div>
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
                      onBundleAdd={addAnyFiveBundleItemToCart}
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

      <style>{`
        @keyframes productSoftFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, var(--product-float-lift, -9px), 0);
          }
        }

        @keyframes productShadowFloat {
          0%,
          100% {
            transform: scaleX(1);
            opacity: 0.72;
          }

          50% {
            transform: scaleX(0.84);
            opacity: 0.42;
          }
        }

        @keyframes productGlowFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.78;
          }

          50% {
            transform: translate3d(0, -7px, 0) scale(1.04);
            opacity: 0.92;
          }
        }

        @keyframes productMgSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .product-float-card {
          position: relative;
          display: flex;
          min-width: 0;
          height: 100%;
          flex-direction: column;
          overflow: hidden;
          isolation: isolate;
          border-radius: 28px;
          border: 1px solid rgba(122, 197, 255, 0.12);
          background:
            linear-gradient(
              180deg,
              rgba(11, 23, 48, 0.98) 0%,
              rgba(6, 13, 29, 0.98) 100%
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 18px 50px rgba(0, 0, 0, 0.22);
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .product-float-card-unavailable {
          opacity: 0.72;
        }

        .product-float-card:hover {
          transform: translate3d(0, -4px, 0);
          border-color: rgba(122, 197, 255, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 20px 54px rgba(0, 0, 0, 0.3);
        }

        .product-stock-badge {
          display: inline-flex;
          min-height: 32px;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(2, 6, 23, 0.82);
          padding: 0 11px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .product-bundle-select {
          display: inline-flex;
          width: 100%;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          background: rgba(103, 232, 249, 0.045);
          padding: 0 14px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .product-bundle-select:hover {
          transform: translate3d(0, -1px, 0);
          border-color: rgba(103, 232, 249, 0.34);
          color: white;
        }

        .product-bundle-select span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.45);
          background: transparent;
        }

        .product-bundle-select-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .product-bundle-select-disabled:hover {
          transform: none;
          border-color: rgba(165, 243, 252, 0.16);
          color: rgba(226, 232, 240, 0.82);
        }

        .product-bundle-select-active {
          border-color: rgba(103, 232, 249, 0.42);
          background: rgba(103, 232, 249, 0.12);
          color: #ecfeff;
        }

        .product-mg-selector {
          position: relative;
          z-index: 10;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(165, 243, 252, 0.18);
          background:
            radial-gradient(circle at 20% 0%, rgba(103, 232, 249, 0.11), transparent 35%),
            rgba(2, 6, 23, 0.94);
          box-shadow:
            0 22px 50px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255,255,255,0.06);
          padding: 12px;
          backdrop-filter: blur(18px);
        }

        .product-mg-selector-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .product-mg-kicker {
          margin: 0;
          color: rgba(103, 232, 249, 0.72);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .product-mg-title {
          margin: 3px 0 0;
          color: white;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .product-mg-close {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(226,232,240,0.76);
          transition:
            background 180ms ease,
            color 180ms ease,
            border-color 180ms ease;
        }

        .product-mg-close:hover {
          border-color: rgba(103, 232, 249, 0.22);
          background: rgba(103, 232, 249, 0.08);
          color: white;
        }

        .product-mg-options {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          max-height: 116px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .product-mg-option {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.14);
          background: rgba(255,255,255,0.035);
          padding: 0 11px;
          color: rgba(226,232,240,0.88);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .product-mg-option:hover {
          transform: translate3d(0, -1px, 0);
          border-color: rgba(103, 232, 249, 0.32);
          background: rgba(103, 232, 249, 0.1);
          color: white;
        }

        .product-mg-status {
          display: flex;
          width: 100%;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 13px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(255,255,255,0.025);
          padding: 9px 11px;
          color: rgba(207, 250, 254, 0.76);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-align: center;
          text-transform: uppercase;
        }

        .product-mg-status-error {
          flex-wrap: wrap;
          border-color: rgba(248, 113, 113, 0.16);
          color: rgba(254, 202, 202, 0.84);
        }

        .product-mg-spinner {
          width: 14px;
          height: 14px;
          flex: 0 0 auto;
          border: 2px solid rgba(103, 232, 249, 0.18);
          border-top-color: rgba(103, 232, 249, 0.9);
          border-radius: 999px;
          animation: productMgSpin 650ms linear infinite;
        }

        .product-mg-retry {
          min-height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.2);
          background: rgba(103, 232, 249, 0.08);
          padding: 0 10px;
          color: #cffafe;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .product-mg-note {
          margin: 10px 0 0;
          color: rgba(148, 163, 184, 0.66);
          font-size: 10px;
          line-height: 1.45;
          font-weight: 700;
        }

        .product-float-visual {
          position: relative;
          flex: 0 0 auto;
          height: 250px;
          overflow: hidden;
          border-bottom: 1px solid rgba(122, 197, 255, 0.08);
          background:
            radial-gradient(circle at 20% 25%, rgba(106, 218, 255, 0.08), transparent 30%),
            radial-gradient(circle at 80% 15%, rgba(79, 120, 255, 0.1), transparent 28%),
            linear-gradient(180deg, rgba(20, 36, 68, 0.96), rgba(10, 18, 37, 0.96));
        }

        .product-float-topbar {
          position: absolute;
          inset: 14px 14px auto;
          z-index: 12;
          display: flex;
          min-width: 0;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          pointer-events: none;
        }

        .product-float-top-actions {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 7px;
          pointer-events: auto;
        }

        .visual-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(122, 197, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 197, 255, 0.035) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.45), transparent 100%);
          pointer-events: none;
        }

        .visual-glow {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          opacity: 0.8;
          animation: productGlowFloat 5.6s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .visual-glow-1 {
          width: 160px;
          height: 160px;
          top: 10px;
          left: 10px;
          background: radial-gradient(circle, rgba(105, 226, 255, 0.14), transparent 68%);
        }

        .visual-glow-2 {
          width: 200px;
          height: 200px;
          right: -55px;
          bottom: -45px;
          background: radial-gradient(circle, rgba(72, 111, 255, 0.14), transparent 68%);
        }

        .product-float-pill {
          display: inline-flex;
          min-width: 0;
          align-items: center;
          min-height: 28px;
          max-width: 62%;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.68);
          color: rgba(184, 233, 255, 0.92);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          pointer-events: auto;
        }

        .product-float-eye {
          display: grid;
          height: 38px;
          width: 38px;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.66);
          color: rgba(184, 233, 255, 0.82);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .product-float-eye:hover {
          transform: translate3d(0, -1px, 0) scale(1.03);
          border-color: rgba(122, 197, 255, 0.3);
          background: rgba(103, 232, 249, 0.12);
          color: #e6fbff;
        }

        .product-float-image-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 22px;
          --product-float-lift: -9px;
          animation: productSoftFloat 5.6s ease-in-out infinite;
          will-change: transform;
        }

        .product-float-shadow {
          position: absolute;
          bottom: 34px;
          width: 120px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(0,0,0,0.34) 0%,
            rgba(0,0,0,0.06) 70%,
            transparent 100%
          );
          animation: productShadowFloat 5.6s ease-in-out infinite;
          transform-origin: center;
          will-change: transform, opacity;
        }

        .product-float-image {
          position: relative;
          z-index: 2;
          width: auto;
          max-width: 82%;
          max-height: 195px;
          object-fit: contain;
          filter: drop-shadow(0 16px 22px rgba(0,0,0,0.2));
          transform: translate3d(0, 0, 0);
          transition:
            transform 220ms ease,
            filter 220ms ease;
        }

        .product-float-card:hover .product-float-image {
          transform: translate3d(0, -4px, 0) scale(1.025);
          filter: drop-shadow(0 20px 28px rgba(0,0,0,0.26));
        }

        .product-float-body {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          padding: 18px;
        }

        .product-float-title {
          display: -webkit-box;
          min-height: 53px;
          overflow: hidden;
          margin: 0;
          color: #f8fbff;
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.045em;
          font-weight: 750;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .product-float-subtitle {
          min-height: 34px;
          margin: 8px 0 0;
          color: rgba(148, 163, 184, 0.62);
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .product-float-price {
          display: flex;
          min-height: 32px;
          align-items: center;
          margin: 10px 0 0;
          color: #7ee3ff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .product-float-price-discounted {
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }

        .product-float-price-regular {
          color: rgba(148, 163, 184, 0.52);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-decoration: line-through;
          text-decoration-thickness: 1.5px;
        }

        .product-float-price-current {
          color: #7ee3ff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .product-float-discount-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
          padding: 0 8px;
          border: 1px solid rgba(126, 227, 255, 0.2);
          border-radius: 999px;
          background: rgba(126, 227, 255, 0.075);
          color: rgba(220, 248, 255, 0.92);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .product-float-button,
        .product-float-button-disabled {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 46px;
          margin-top: 0;
          padding: 0 16px;
          border-radius: 16px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .product-float-actions {
          display: grid;
          gap: 8px;
          margin-top: auto;
          padding-top: 16px;
        }

        .product-float-button {
          border: 1px solid rgba(122, 197, 255, 0.18);
          background: linear-gradient(
            180deg,
            rgba(105, 220, 255, 0.96),
            rgba(88, 196, 233, 0.96)
          );
          color: #041019;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
          box-shadow: 0 12px 28px rgba(79, 201, 245, 0.16);
        }

        .product-float-button:hover {
          transform: translate3d(0, -1px, 0);
          box-shadow: 0 15px 30px rgba(79, 201, 245, 0.22);
          background: linear-gradient(
            180deg,
            rgba(125, 230, 255, 1),
            rgba(99, 211, 245, 1)
          );
        }

        .product-float-button-disabled {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(148, 163, 184, 0.65);
          cursor: not-allowed;
        }

        .product-float-arrow {
          transition: transform 180ms ease;
        }

        .product-float-button:hover .product-float-arrow {
          transform: translate3d(2px, 0, 0);
        }

        @media (max-width: 768px) {
          .product-float-card {
            border-radius: 20px;
          }

          .product-float-card:hover {
            transform: none;
          }

          .product-float-visual {
            height: 190px;
          }

          .product-float-topbar {
            inset: 10px 10px auto;
            gap: 7px;
          }

          .product-float-top-actions {
            gap: 6px;
          }

          .product-float-pill {
            min-height: 23px;
            max-width: 58%;
            padding: 0 7px;
            font-size: 7px;
            letter-spacing: 0.1em;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .product-stock-badge {
            min-height: 23px;
            padding: 0 8px;
            font-size: 7px;
            letter-spacing: 0.1em;
          }

          .product-bundle-select {
            min-height: 38px;
            border-radius: 13px;
            padding: 0 10px;
            font-size: 8px;
            letter-spacing: 0.11em;
          }

          .product-mg-selector {
            margin-top: 8px;
            border-radius: 15px;
            padding: 10px;
          }

          .product-mg-title {
            font-size: 12px;
          }

          .product-mg-options {
            gap: 6px;
            max-height: 88px;
          }

          .product-mg-option {
            min-height: 30px;
            padding: 0 9px;
            font-size: 8px;
            letter-spacing: 0.06em;
          }

          .product-mg-note {
            display: none;
          }

          .product-float-eye {
            width: 32px;
            height: 32px;
            border-radius: 12px;
          }

          .product-float-image-wrap {
            padding: 18px 12px;
            --product-float-lift: -5px;
          }

          .product-float-image {
            max-height: 122px;
            max-width: 78%;
            filter: drop-shadow(0 12px 18px rgba(0,0,0,0.2));
          }

          .product-float-card:hover .product-float-image {
            transform: none;
            filter: drop-shadow(0 12px 18px rgba(0,0,0,0.2));
          }

          .product-float-shadow {
            bottom: 26px;
            width: 88px;
            height: 18px;
          }

          .visual-grid {
            background-size: 32px 32px;
          }

          .visual-glow-1 {
            width: 110px;
            height: 110px;
            top: 28px;
            left: 16px;
          }

          .visual-glow-2 {
            width: 130px;
            height: 130px;
            right: -34px;
            bottom: 0;
          }

          .product-float-body {
            padding: 14px;
          }

          .product-float-title {
            display: -webkit-box;
            min-height: 36px;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: 15px;
            line-height: 1.12;
            letter-spacing: -0.035em;
          }

          .product-float-subtitle {
            display: none;
          }

          .product-float-price {
            margin-top: 8px;
            font-size: 18px;
          }

          .product-float-price-discounted {
            gap: 5px;
          }

          .product-float-price-regular {
            font-size: 10px;
          }

          .product-float-price-current {
            font-size: 18px;
          }

          .product-float-discount-badge {
            min-height: 18px;
            padding: 0 6px;
            font-size: 6.5px;
            letter-spacing: 0.06em;
          }

          .product-float-button,
          .product-float-button-disabled {
            min-height: 38px;
            gap: 7px;
            border-radius: 13px;
            padding: 0 10px;
            font-size: 8px;
            letter-spacing: 0.12em;
          }

          .product-float-actions {
            gap: 7px;
            padding-top: 12px;
          }

          .product-float-button svg,
          .product-float-button-disabled svg {
            width: 12px;
            height: 12px;
          }
        }

        @media (max-width: 420px) {
          .product-float-visual {
            height: 180px;
          }

          .product-float-image {
            max-height: 112px;
          }

          .product-float-title {
            font-size: 14px;
            min-height: 34px;
          }

          .product-float-price {
            font-size: 17px;
          }

          .product-float-price-current {
            font-size: 17px;
          }

          .product-float-price-regular {
            font-size: 9px;
          }

          .product-float-discount-badge {
            padding: 0 5px;
            font-size: 6px;
          }

          .product-float-button,
          .product-float-button-disabled {
            font-size: 7.5px;
            letter-spacing: 0.1em;
          }
        }

        .product-catalog-grid {
          display: grid !important;
          width: 100%;
          min-width: 0;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: stretch;
          gap: 10px !important;
        }

        .product-catalog-grid > .product-float-card {
          width: 100%;
          min-width: 0;
        }

        @media (min-width: 640px) {
          .product-catalog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20px !important;
          }
        }

        @media (min-width: 1280px) {
          .product-catalog-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 639px) {
          .product-float-card {
            border-radius: 17px;
          }

          .product-float-visual {
            height: 150px;
          }

          .product-float-topbar {
            inset: 8px 8px auto;
            gap: 4px;
          }

          .product-float-top-actions {
            gap: 4px;
          }

          .product-float-pill {
            min-height: 20px;
            max-width: calc(100% - 34px);
            padding: 0 6px;
            font-size: 6.3px;
            letter-spacing: 0.065em;
          }

          .product-stock-badge {
            min-height: 20px;
            max-width: 58px;
            overflow: hidden;
            padding: 0 6px;
            font-size: 6px;
            letter-spacing: 0.06em;
            text-overflow: ellipsis;
          }

          .product-float-eye {
            width: 27px;
            height: 27px;
            border-radius: 9px;
          }

          .product-float-eye svg {
            width: 12px;
            height: 12px;
          }

          .product-float-image-wrap {
            padding: 22px 8px 10px;
            --product-float-lift: -4px;
          }

          .product-float-image {
            max-width: 82%;
            max-height: 96px;
          }

          .product-float-shadow {
            bottom: 18px;
            width: 68px;
            height: 14px;
          }

          .visual-glow-1 {
            width: 86px;
            height: 86px;
            top: 26px;
            left: 8px;
          }

          .visual-glow-2 {
            width: 96px;
            height: 96px;
            right: -26px;
            bottom: 2px;
          }

          .product-float-body {
            padding: 10px;
          }

          .product-float-title {
            min-height: 31px;
            font-size: 13px;
            line-height: 1.16;
            letter-spacing: -0.025em;
          }

          .product-float-price {
            min-height: 23px;
            margin-top: 7px;
            font-size: 16px;
          }

          .product-float-price-discounted {
            gap: 4px;
          }

          .product-float-price-current {
            font-size: 15.5px;
          }

          .product-float-price-regular {
            font-size: 8.5px;
          }

          .product-float-discount-badge {
            min-height: 16px;
            padding: 0 4px;
            font-size: 5.5px;
            letter-spacing: 0.035em;
          }

          .product-float-actions {
            gap: 6px;
            padding-top: 10px;
          }

          .product-float-button,
          .product-float-button-disabled {
            min-height: 36px;
            gap: 5px;
            border-radius: 11px;
            padding: 0 7px;
            font-size: 7.2px;
            letter-spacing: 0.065em;
          }

          .product-float-button .product-float-arrow {
            display: none;
          }

          .product-float-button svg,
          .product-float-button-disabled svg {
            width: 11px;
            height: 11px;
            flex: 0 0 auto;
          }

          .product-bundle-select {
            min-height: 34px;
            gap: 5px;
            border-radius: 11px;
            padding: 0 6px;
            font-size: 7px;
            letter-spacing: 0.065em;
          }

          .product-bundle-select span {
            width: 7px;
            height: 7px;
            flex: 0 0 auto;
          }

          .product-mg-selector {
            margin-top: 7px;
            border-radius: 12px;
            padding: 8px;
          }

          .product-mg-selector-head {
            gap: 6px;
            margin-bottom: 7px;
          }

          .product-mg-kicker {
            font-size: 6px;
            letter-spacing: 0.1em;
          }

          .product-mg-title {
            font-size: 10px;
          }

          .product-mg-close {
            width: 24px;
            height: 24px;
            border-radius: 8px;
          }

          .product-mg-options {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }

          .product-mg-option {
            width: 100%;
            min-width: 0;
            min-height: 28px;
            padding: 0 4px;
            font-size: 7px;
            letter-spacing: 0.035em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .product-float-card,
          .product-float-image,
          .product-float-image-wrap,
          .product-float-shadow,
          .visual-glow,
          .product-float-eye,
          .product-bundle-select,
          .product-float-button,
          .product-float-arrow,
          .product-mg-selector,
          .product-mg-option,
          .product-mg-close {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}