import "./ShopByCategorySection.styles.css";
import { memo, useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  CATALOG_CATEGORIES,
  resolveCatalogCategory,
} from "../../lib/catalogTaxonomy";

const fallbackCounts = {
  Peptides: 19,
  "Peptide Blends": 9,
  Raws: 1,
  "Aminos & Liquids": 13,
};

const fallbackCategories = CATALOG_CATEGORIES.slice(1).map((category) => ({
  name: category.label,
  href: category.href,
  count: fallbackCounts[category.label] || 0,
  description: category.description,
}));

function prepareCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return fallbackCategories;
  }

  const counts = new Map();

  categories.forEach((category) => {
    const resolvedCategory =
      resolveCatalogCategory(category?.name) ||
      resolveCatalogCategory(category?.slug);

    if (!resolvedCategory || resolvedCategory === "Shop All") return;

    counts.set(
      resolvedCategory,
      (counts.get(resolvedCategory) || 0) + Number(category?.count || 0),
    );
  });

  return CATALOG_CATEGORIES.slice(1).map((category) => ({
    name: category.label,
    href: category.href,
    count: counts.get(category.label) || 0,
    description: category.description,
  }));
}

function formatCount(count) {
  const total = Number(count || 0);
  return `${total} ${total === 1 ? "item" : "items"}`;
}

function normalizeCategory(category) {
  return {
    ...category,
    name: category?.name || "Catalog section",
    count: category?.count ?? 0,
    description: category?.description || "Catalog section",
    href: category?.href || "/shop",
  };
}

const CategoryRow = memo(function CategoryRow({ category, index }) {
  return (
    <a href={category.href} className="category-row group">
      <span className="category-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="category-row-copy">
        <h3>{category.name}</h3>
        <p>{category.description}</p>
      </div>

      <span className="category-count">{formatCount(category.count)}</span>

      <span className="category-arrow" aria-hidden="true">
        <ArrowUpRight size={18} />
      </span>
    </a>
  );
});

export default function ShopByCategorySection({
  categories = fallbackCategories,
  eyebrow = "Research catalog",
  titleTop = "Find the right",
  titleBottom = "research collection.",
  subtitle = "A focused index of compounds and laboratory essentials, organized for faster and clearer browsing.",
}) {
  const normalizedCategories = useMemo(
    () => prepareCategories(categories).map(normalizeCategory),
    [categories]
  );
  const totalProducts = useMemo(
    () =>
      normalizedCategories.reduce(
        (total, category) => total + Number(category.count || 0),
        0
      ),
    [normalizedCategories]
  );

  return (
    <section
      id="research-categories"
      className="category-section phase-band phase-band--petrol relative overflow-hidden px-5 py-16 text-white sm:px-6 sm:py-20 lg:py-28"
    >
      <div className="category-bg" aria-hidden="true" />

      <div className="category-shell relative mx-auto max-w-7xl">
        <div className="category-intro">
          <div className="category-eyebrow">
            <span aria-hidden="true" />
            <p>{eyebrow}</p>
          </div>

          <h2>
            <span>{titleTop}</span>
            <span>{titleBottom}</span>
          </h2>

          <p className="category-subtitle">{subtitle}</p>

          <div className="category-intro-footer">
            <a href="/shop" className="category-all-link">
              View full catalog
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>

            <span>
              {totalProducts} products across {normalizedCategories.length} collections
            </span>
          </div>
        </div>

        <div className="category-directory">
          <div className="category-directory-head" aria-hidden="true">
            <span>Collection index</span>
            <span>Availability</span>
          </div>

          <div className="category-list">
            {normalizedCategories.map((category, index) => (
              <CategoryRow
                key={category.slug || category.name}
                category={category}
                index={index}
              />
            ))}
          </div>

          <p className="category-disclaimer">
            Laboratory research catalog only.
          </p>
        </div>
      </div>
    </section>
  );
}
