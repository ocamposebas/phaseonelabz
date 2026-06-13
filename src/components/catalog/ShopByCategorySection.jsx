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

function formatCount(count) {
  const total = Number(count || 0);
  return `${total} ${total === 1 ? "item" : "items"}`;
}

function getCategoryHref(category) {
  const categoryValue = category.slug || category.name;

  return category.href || `/shop?category=${encodeURIComponent(categoryValue)}`;
}

export default function ShopByCategorySection({
  categories = fallbackCategories,
  eyebrow = "Catalog sections",
  titleTop = "Browse research",
  titleBottom = "by category.",
  subtitle = "Explore products by research focus, support items, and specialized catalog groups.",
}) {
  const normalizedCategories = categories.map((category) => {
    const fallback = fallbackCategories.find((item) => item.name === category.name);

    return {
      ...category,
      slug: category.slug || fallback?.slug || category.name,
      description:
        category.description || fallback?.description || "Catalog section",
      icon: category.icon || fallback?.icon || FlaskConical,
      href: getCategoryHref({
        ...category,
        slug: category.slug || fallback?.slug || category.name,
      }),
    };
  });

  return (
    <section className="relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-cyan-300/8 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

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
          {normalizedCategories.map((category, index) => {
            const Icon = category.icon;

            return (
              <a
                key={`${category.slug}-${index}`}
                href={category.href}
                className="group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#071421]/72 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-[#0a1b2b]/82 sm:rounded-[1.55rem] sm:p-5"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(103,232,249,0.13),transparent_42%)] opacity-70 transition group-hover:opacity-100" />
                <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-300/8 blur-2xl transition group-hover:bg-cyan-300/14" />

                <div className="relative z-10">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200 transition group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.1] sm:h-12 sm:w-12">
                      <Icon size={20} />
                    </div>

                    <span className="grid h-9 w-9 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.03] text-cyan-100/55 transition group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.09] group-hover:text-cyan-100">
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

                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_14px_rgba(103,232,249,0.65)] transition group-hover:scale-125" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:mt-7 md:text-left">
          Laboratory research catalog only.
        </p>
      </div>
    </section>
  );
}
