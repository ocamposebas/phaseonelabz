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
  Syringe,
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
    name: "Growth Hormone",
    slug: "growth-hormone",
    count: 3,
    description: "GH catalog",
    icon: Syringe,
  },
  {
    name: "Bacteriostatic Water",
    slug: "bacteriostatic-water",
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

          <p className="mt-2 truncate text-[12px] font-medium text-slate-400 sm:text-[13px]">
            {category.description}
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-cyan-200/18 via-cyan-200/6 to-transparent" />

        <div className="mt-4 flex items-center justify-between gap-3">
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
  const normalizedCategories = useMemo(() => {
    const safeCategories = Array.isArray(categories)
      ? categories
      : fallbackCategories;

    return safeCategories.map(normalizeCategory);
  }, [categories]);

  return (
    <section className="category-section relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="category-bg" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.55)]" />

            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
              {eyebrow}
            </span>
          </div>

          <h2 className="mx-auto max-w-[420px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]">
            {titleTop}
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              {titleBottom}
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-[14px] md:mx-0">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {normalizedCategories.map((category) => (
            <CategoryCard key={category.slug || category.name} category={category} />
          ))}
        </div>

        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:mt-7 md:text-left">
          Laboratory research catalog only.
        </p>
      </div>

      <style>{`
        .category-section {
          isolation: isolate;
        }

        .category-bg {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(circle at 8% 18%, rgba(103, 232, 249, 0.07), transparent 28%),
            radial-gradient(circle at 100% 90%, rgba(59, 130, 246, 0.08), transparent 30%);
        }

        .category-card {
          position: relative;
          overflow: hidden;
          border-radius: 1.35rem;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(7, 20, 33, 0.72);
          padding: 1rem;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.14);
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            background 200ms ease;
          content-visibility: auto;
          contain-intrinsic-size: 210px;
        }

        .category-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            circle at 82% 0%,
            rgba(103, 232, 249, 0.1),
            transparent 44%
          );
          opacity: 0.72;
          transition: opacity 200ms ease;
        }

        .category-card::after {
          content: "";
          position: absolute;
          right: -42px;
          top: -42px;
          width: 115px;
          height: 115px;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(
            circle,
            rgba(103, 232, 249, 0.08),
            transparent 68%
          );
          opacity: 0.85;
          transition: opacity 200ms ease;
        }

        .category-card:hover {
          transform: translate3d(0, -4px, 0);
          border-color: rgba(165, 243, 252, 0.24);
          background: rgba(10, 27, 43, 0.82);
        }

        .category-card:hover::before,
        .category-card:hover::after {
          opacity: 1;
        }

        .category-icon {
          display: grid;
          height: 44px;
          width: 44px;
          place-items: center;
          border-radius: 1rem;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(103, 232, 249, 0.055);
          color: rgb(165, 243, 252);
          transition:
            background 200ms ease,
            border-color 200ms ease;
        }

        .category-card:hover .category-icon {
          border-color: rgba(165, 243, 252, 0.24);
          background: rgba(103, 232, 249, 0.1);
        }

        .category-arrow {
          display: grid;
          height: 36px;
          width: 36px;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(207, 250, 254, 0.55);
          transition:
            background 200ms ease,
            border-color 200ms ease,
            color 200ms ease,
            transform 200ms ease;
        }

        .category-card:hover .category-arrow {
          transform: translate3d(1px, -1px, 0);
          border-color: rgba(165, 243, 252, 0.24);
          background: rgba(103, 232, 249, 0.09);
          color: rgb(207, 250, 254);
        }

        .category-dot {
          display: block;
          height: 6px;
          width: 6px;
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.7);
          box-shadow: 0 0 12px rgba(103, 232, 249, 0.5);
          transition: transform 200ms ease;
        }

        .category-card:hover .category-dot {
          transform: scale(1.18);
        }

        @media (min-width: 640px) {
          .category-card {
            border-radius: 1.55rem;
            padding: 1.25rem;
          }

          .category-icon {
            height: 48px;
            width: 48px;
          }
        }

        @media (max-width: 768px) {
          .category-bg {
            background:
              radial-gradient(circle at 10% 12%, rgba(103, 232, 249, 0.045), transparent 30%),
              radial-gradient(circle at 100% 90%, rgba(59, 130, 246, 0.055), transparent 32%);
          }

          .category-card {
            content-visibility: visible;
            contain-intrinsic-size: auto;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
          }

          .category-card:hover {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .category-card,
          .category-card::before,
          .category-card::after,
          .category-icon,
          .category-arrow,
          .category-dot {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}