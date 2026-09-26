const FEATURED_PRODUCT_RULES = [
  {
    label: "RT3 / RETA",
    skus: ["p1-rt-10", "p1-kit-rt-10", "p1-kit-rt-30"],
    groups: [["rt3"], ["reta"], ["retatrutide"]],
  },
  {
    label: "TZ2 / Tirzepatide",
    skus: ["p1-tz-10", "p1-tirz-10"],
    groups: [["tz2"], ["tirz"], ["tirzepatide"]],
  },
  {
    label: "Hospira",
    skus: ["p1-bacw-30"],
    groups: [["hospira"]],
  },
  {
    label: "P1 Water",
    skus: ["p1-bacw-10"],
    groups: [
      ["p1", "water"],
      ["phase one", "water"],
      ["bacteriostatic", "water"],
      ["bac", "water"],
    ],
    exclude: ["hospira"],
  },
];

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchableProductText(product = {}) {
  const categories = Array.isArray(product.categories)
    ? product.categories
        .map((category) =>
          typeof category === "string" ? category : category?.name,
        )
        .filter(Boolean)
    : [];
  const tags = Array.isArray(product.tags)
    ? product.tags
        .map((tag) => (typeof tag === "string" ? tag : tag?.name))
        .filter(Boolean)
    : [];

  return normalizeText(
    [
      product.name,
      product.title,
      product.slug,
      product.sku,
      product.short_description,
      product.description,
      product.catalog_search_text,
      ...categories,
      ...tags,
    ].join(" "),
  );
}

function matchesRule(product = {}, rule = {}) {
  const searchText = searchableProductText(product);
  const sku = normalizeText(product.sku).replace(/\s+/g, "-");
  const excluded = (rule.exclude || []).some((term) =>
    searchText.includes(normalizeText(term)),
  );

  if (excluded) return false;
  if ((rule.skus || []).some((ruleSku) => sku === normalizeText(ruleSku))) {
    return true;
  }

  return (rule.groups || []).some((group) =>
    group.every((term) => searchText.includes(normalizeText(term))),
  );
}

export function selectSuggestedProducts(products = [], currentProductId, limit = 4) {
  const cleanProducts = (Array.isArray(products) ? products : []).filter(
    (product) =>
      product?.id && String(product.id) !== String(currentProductId || ""),
  );
  const selected = [];
  const selectedIds = new Set();

  FEATURED_PRODUCT_RULES.forEach((rule) => {
    const match = cleanProducts.find(
      (product) =>
        !selectedIds.has(String(product.id)) && matchesRule(product, rule),
    );

    if (!match) return;
    selected.push({ ...match, suggestedLabel: rule.label });
    selectedIds.add(String(match.id));
  });

  return selected.slice(0, Math.max(0, Number(limit) || 0));
}
