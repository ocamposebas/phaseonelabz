export const CATALOG_CATEGORIES = Object.freeze([
  {
    label: "Shop All",
    href: "/shop",
    description: "Complete research catalog",
  },
  {
    label: "Peptides",
    href: "/shop?category=Peptides",
    description: "Single-compound research",
  },
  {
    label: "Peptide Blends",
    href: "/shop?category=Peptide%20Blends",
    description: "Multi-compound formulas",
  },
  {
    label: "Raws",
    href: "/shop?category=Raws",
    description: "Raw research materials",
  },
  {
    label: "Aminos & Liquids",
    href: "/shop?category=Aminos%20%26%20Liquids",
    description: "Amino and liquid essentials",
  },
]);

export const CATALOG_NAV_ITEMS = Object.freeze([
  ...CATALOG_CATEGORIES,
  {
    label: "Bulk Order",
    href: "/bulk-orders",
    isUtility: true,
  },
]);

const CATEGORY_ALIASES = new Map([
  ["all", "Shop All"],
  ["all products", "Shop All"],
  ["shop all", "Shop All"],
  ["peptide", "Peptides"],
  ["peptides", "Peptides"],
  ["research peptide", "Peptides"],
  ["research peptides", "Peptides"],
  ["cosmetic skin", "Peptides"],
  ["healing recovery", "Peptides"],
  ["longevity other", "Peptides"],
  ["metabolic research", "Peptides"],
  ["growth hormone", "Peptides"],
  ["growth hormones", "Peptides"],
  ["gh research", "Peptides"],
  ["blend", "Peptide Blends"],
  ["blends", "Peptide Blends"],
  ["peptide blend", "Peptide Blends"],
  ["peptide blends", "Peptide Blends"],
  ["research blend", "Peptide Blends"],
  ["research blends", "Peptide Blends"],
  ["raw", "Raws"],
  ["raws", "Raws"],
  ["amino", "Aminos & Liquids"],
  ["aminos", "Aminos & Liquids"],
  ["amino liquid", "Aminos & Liquids"],
  ["amino liquids", "Aminos & Liquids"],
  ["amino and liquid", "Aminos & Liquids"],
  ["amino and liquids", "Aminos & Liquids"],
  ["aminos and liquid", "Aminos & Liquids"],
  ["aminos and liquids", "Aminos & Liquids"],
  ["aminos liquids", "Aminos & Liquids"],
  ["recon water", "Aminos & Liquids"],
  ["recon waters", "Aminos & Liquids"],
  ["reconstitution solution", "Aminos & Liquids"],
  ["reconstitution solutions", "Aminos & Liquids"],
  ["reconstituition solution", "Aminos & Liquids"],
  ["bacteriostatic water", "Aminos & Liquids"],
  ["bacteriostatic waters", "Aminos & Liquids"],
  ["bac water", "Aminos & Liquids"],
]);

const RAW_TERMS = ["raw", "raws"];
const BLEND_TERMS = [
  "blend",
  "blends",
  "peptide blend",
  "peptide blends",
  "research blend",
  "research blends",
];
const AMINO_LIQUID_TERMS = [
  "amino",
  "aminos",
  "liquid",
  "liquids",
  "water",
  "recon water",
  "reconstitution solution",
  "reconstituition solution",
  "bacteriostatic",
  "bac water",
  "glutathione",
  "gluta",
  "luthione",
  "detoxione",
  "glutaone",
  "vitamin b12",
  "b12",
  "lipo c",
  "nad",
];
const ACCESSORY_TERMS = ["accessory", "accessories", "accesory", "accesories", "tee", "shirt"];

export function normalizeCatalogTaxonomyText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCatalogCategory(value) {
  const normalized = normalizeCatalogTaxonomyText(value);

  if (!normalized) return null;

  return CATEGORY_ALIASES.get(normalized) || null;
}

function getTermValue(term) {
  if (!term) return "";
  if (typeof term === "string") return term;
  return term.name || term.slug || term.label || "";
}

function includesTaxonomyTerm(searchable, term) {
  const normalizedTerm = normalizeCatalogTaxonomyText(term);
  return Boolean(normalizedTerm) && ` ${searchable} `.includes(` ${normalizedTerm} `);
}

export function getProductCatalogCategory(product = {}) {
  const categoryValues = Array.isArray(product.categories)
    ? product.categories.map(getTermValue)
    : [];
  const tagValues = Array.isArray(product.tags)
    ? product.tags.map(getTermValue)
    : [];
  const labelValues = Array.isArray(product.labels)
    ? product.labels.map(getTermValue)
    : [];
  const searchable = normalizeCatalogTaxonomyText(
    [
      product.name,
      product.title,
      product.slug,
      product.sku,
      getTermValue(product.category),
      product.category_slug,
      product.categorySlug,
      ...categoryValues,
      ...tagValues,
      ...labelValues,
    ].join(" "),
  );

  if (RAW_TERMS.some((term) => includesTaxonomyTerm(searchable, term))) {
    return "Raws";
  }

  if (AMINO_LIQUID_TERMS.some((term) => includesTaxonomyTerm(searchable, term))) {
    return "Aminos & Liquids";
  }

  if (BLEND_TERMS.some((term) => includesTaxonomyTerm(searchable, term))) {
    return "Peptide Blends";
  }

  if (ACCESSORY_TERMS.some((term) => includesTaxonomyTerm(searchable, term))) {
    return null;
  }

  return "Peptides";
}

export function productMatchesCatalogCategory(product, category) {
  const resolvedCategory = resolveCatalogCategory(category) || "Shop All";

  if (resolvedCategory === "Shop All") return true;

  return getProductCatalogCategory(product) === resolvedCategory;
}
