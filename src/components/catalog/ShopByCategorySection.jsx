import "./ShopByCategorySection.styles.css";
import { memo, useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

const fallbackCategories = [
  {
    name: "Research Peptides",
    slug: "research-peptides",
    count: 1,
    description: "Core catalog",
  },
  {
    name: "Research Blends",
    slug: "research-blends",
    count: 9,
    description: "Stacked formulas",
  },
  {
    name: "Metabolic Research",
    slug: "metabolic-research",
    count: 2,
    description: "Metabolic focus",
  },
  {
    name: "Longevity & Other",
    slug: "longevity-other",
    count: 11,
    description: "Extended catalog",
  },
  {
    name: "Healing & Recovery",
    slug: "healing-recovery",
    count: 3,
    description: "Recovery research",
  },
  {
    name: "Cosmetic & Skin",
    slug: "cosmetic-skin",
    count: 8,
    description: "Skin research",
  },
  {
    name: "Recon Water",
    slug: "reconstitution-solution",
    count: 3,
    description: "Support items",
  },
  {
    name: "Accessories",
    slug: "accessories",
    count: 8,
    description: "Catalog tools",
  },
];

function normalizeCategoryKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryMatches(category, acceptedValues = []) {
  const keys = [
    normalizeCategoryKey(category?.name),
    normalizeCategoryKey(category?.slug),
  ].filter(Boolean);

  return keys.some((key) => acceptedValues.includes(key));
}

function isGrowthHormoneCategory(category) {
  return categoryMatches(category, ["growth hormone"]);
}

function isResearchPeptidesCategory(category) {
  return categoryMatches(category, ["research peptides"]);
}

function isBacteriostaticCategory(category) {
  return categoryMatches(category, [
    "bacteriostatic water",
    "bacteriostatic solution",
    "bac water",
    "bac",
  ]);
}

function prepareCategories(categories) {
  const safeCategories = Array.isArray(categories)
    ? categories
    : fallbackCategories;

  const growthHormoneCount = safeCategories
    .filter(isGrowthHormoneCategory)
    .reduce((total, category) => total + Number(category?.count || 0), 0);

  const preparedCategories = safeCategories
    .filter((category) => !isGrowthHormoneCategory(category))
    .map((category) => {
      if (!isBacteriostaticCategory(category)) return category;

      return {
        ...category,
        name: "Recon Water",
        slug: "reconstitution-solution",
        description: category?.description || "Support items",
        // Force getCategoryHref() to build the URL from the new slug.
        href: undefined,
      };
    });

  if (growthHormoneCount > 0) {
    const researchIndex = preparedCategories.findIndex(
      isResearchPeptidesCategory
    );

    if (researchIndex >= 0) {
      preparedCategories[researchIndex] = {
        ...preparedCategories[researchIndex],
        count:
          Number(preparedCategories[researchIndex]?.count || 0) +
          growthHormoneCount,
      };
    } else {
      preparedCategories.unshift({
        ...fallbackCategories.find(
          (category) => category.slug === "research-peptides"
        ),
        count: growthHormoneCount,
      });
    }
  }

  return preparedCategories;
}

const fallbackCategoryMap = new Map(
  fallbackCategories.flatMap((category) => [
    [category.name, category],
    [category.slug, category],
  ])
);

function formatCount(count) {
  const total = Number(count || 0);
  return `${total} ${total === 1 ? "item" : "items"}`;
}

function getCategoryHref(category) {
  const categoryValue = category.slug || category.name;
  return category.href || `/shop?category=${encodeURIComponent(categoryValue)}`;
}

function normalizeCategory(category) {
  const fallback =
    fallbackCategoryMap.get(category?.name) ||
    fallbackCategoryMap.get(category?.slug) ||
    null;

  const slug = category?.slug || fallback?.slug || category?.name || "category";

  const normalizedCategory = {
    ...category,
    name: category?.name || fallback?.name || "Catalog section",
    slug,
    count: category?.count ?? fallback?.count ?? 0,
    description:
      category?.description || fallback?.description || "Catalog section",
  };

  return {
    ...normalizedCategory,
    href: getCategoryHref(normalizedCategory),
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
