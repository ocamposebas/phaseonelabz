import "./ShopByCategorySection.styles.css";
import { memo, useMemo } from "react";
import {
  ArrowUpRight,
  Beaker,
  Droplets,
  FlaskConical,
  Layers3,
  PackageCheck,
  ShieldPlus,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const fallbackCategories = [
  {
    name: "Research Peptides",
    slug: "research-peptides",
    count: 1,
    description: "Core catalog",
    icon: FlaskConical,
  },
  {
    name: "Research Blends",
    slug: "research-blends",
    count: 9,
    description: "Stacked formulas",
    icon: Layers3,
  },
  {
    name: "Metabolic Research",
    slug: "metabolic-research",
    count: 2,
    description: "Metabolic focus",
    icon: Sparkles,
  },
  {
    name: "Longevity & Other",
    slug: "longevity-other",
    count: 11,
    description: "Extended catalog",
    icon: ShieldPlus,
  },
  {
    name: "Healing & Recovery",
    slug: "healing-recovery",
    count: 3,
    description: "Recovery research",
    icon: Beaker,
  },
  {
    name: "Cosmetic & Skin",
    slug: "cosmetic-skin",
    count: 8,
    description: "Skin research",
    icon: WandSparkles,
  },
  {
    name: "Recon Water",
    slug: "reconstitution-solution",
    count: 3,
    description: "Support items",
    icon: Droplets,
  },
  {
    name: "Accessories",
    slug: "accessories",
    count: 8,
    description: "Catalog tools",
    icon: PackageCheck,
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
        icon: category?.icon || Droplets,
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
    icon: category?.icon || fallback?.icon || FlaskConical,
  };

  return {
    ...normalizedCategory,
    href: getCategoryHref(normalizedCategory),
  };
}

const CategoryCard = memo(function CategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <a href={category.href} className="category-card group">
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="category-icon">
            <Icon size={20} aria-hidden="true" />
          </div>

          <span className="category-arrow" aria-hidden="true">
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/55 sm:text-[9px]">
            {formatCount(category.count)}
          </p>

          <h3 className="min-h-[38px] text-[16px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:min-h-[44px] sm:text-[20px]">
            {category.name}
          </h3>

          <p className="category-description mt-2 truncate text-[12px] font-medium text-slate-400 sm:text-[13px]">
            {category.description}
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-cyan-200/18 via-cyan-200/6 to-transparent" />

        <div className="category-meta mt-4 flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/62">
            Explore
          </span>

          <span className="category-dot" aria-hidden="true" />
        </div>
      </div>
    </a>
  );
});

export default function ShopByCategorySection({
  categories = fallbackCategories,
  eyebrow = "Catalog sections",
  titleTop = "Browse research",
  titleBottom = "by category.",
  subtitle = "Explore products by research focus, support items, and specialized catalog groups.",
}) {
  const normalizedCategories = useMemo(
    () => prepareCategories(categories).map(normalizeCategory),
    [categories]
  );

  return (
    <section className="category-section relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="category-bg" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <div className="category-heading mb-8 grid gap-5 border-b border-cyan-200/10 pb-7 md:grid-cols-[minmax(0,0.9fr)_minmax(280px,0.55fr)] md:items-end md:gap-12 lg:mb-9">
          <div>
            <div className="mb-3 inline-flex items-center gap-3">
              <span className="h-px w-7 bg-cyan-300/70" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.32em]">
                {eyebrow}
              </span>
            </div>

            <h2 className="max-w-[520px] text-[34px] font-semibold leading-[0.98] tracking-[-0.065em] text-white sm:text-[42px] lg:text-[48px] lg:tracking-[-0.055em]">
              {titleTop}{" "}
              <span className="text-cyan-200/85">{titleBottom}</span>
            </h2>
          </div>

          <p className="max-w-lg text-[13.5px] leading-7 text-slate-300/65 sm:text-[14px] md:justify-self-end">
            {subtitle}
          </p>
        </div>

        <div className="category-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {normalizedCategories.map((category) => (
            <CategoryCard key={category.slug || category.name} category={category} />
          ))}
        </div>

        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:mt-7 md:text-left">
          Laboratory research catalog only.
        </p>
      </div>
    </section>
  );
}
