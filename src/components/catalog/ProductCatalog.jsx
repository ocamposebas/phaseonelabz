import { memo, useCallback, useMemo } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";

const featuredProductRules = [
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

const normalizedFeaturedRules = featuredProductRules.map((rule) => ({
  ...rule,
  skus: Array.isArray(rule.skus) ? rule.skus.map(normalizeText) : [],
  groups: Array.isArray(rule.groups)
    ? rule.groups.map((group) => group.map(normalizeText))
    : [],
  exclude: Array.isArray(rule.exclude) ? rule.exclude.map(normalizeText) : [],
}));

function formatPrice(price) {
  if (!price) return "View";

  const number = Number(price);

  if (Number.isNaN(number)) return `$${price}`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function getImage(product) {
  return (
    product?.image ||
    product?.images?.[0]?.src ||
    product?.images?.[0]?.url ||
    product?.featuredImage ||
    "/tarro.png"
  );
}

function getProductDetailUrl(product) {
  if (!product?.slug) return "/shop";

  return `/product/${product.slug}`;
}

function getTermValue(term) {
  if (!term) return "";

  if (typeof term === "string") return term;

  return term?.name || term?.slug || term?.label || "";
}

function getSearchableProductText(product = {}) {
  const categories = Array.isArray(product.categories)
    ? product.categories.map(getTermValue)
    : [];

  const tags = Array.isArray(product.tags) ? product.tags.map(getTermValue) : [];

  return normalizeText(
    [
      product.name,
      product.title,
      product.slug,
      product.sku,
      product.short_description,
      product.description,
      ...categories,
      ...tags,
    ].join(" ")
  );
}

function productMatchesRule(item, rule) {
  if (!item?.id) return false;

  if (rule.exclude.some((term) => item.searchText.includes(term))) {
    return false;
  }

  if (rule.skus.some((sku) => item.skuText === sku)) {
    return true;
  }

  return rule.groups.some((group) =>
    group.every((term) => item.searchText.includes(term))
  );
}

function prepareProduct(product = {}, index = 0) {
  const name = product?.name || product?.title || "Product";
  const image = getImage(product);
  const url = getProductDetailUrl(product);
  const priceLabel = formatPrice(product?.price);
  const isInStock = product?.stock_status === "instock";

  return {
    raw: product,
    id: product?.id || product?.slug || `${name}-${index}`,
    name,
    image,
    url,
    priceLabel,
    isInStock,
    skuText: normalizeText(product?.sku || ""),
    searchText: getSearchableProductText(product),
  };
}

function getFeaturedItems(items = []) {
  const selected = [];
  const selectedIds = new Set();

  normalizedFeaturedRules.forEach((rule) => {
    const match = items.find((item) => {
      if (!item?.id || selectedIds.has(item.id)) return false;

      return productMatchesRule(item, rule);
    });

    if (match) {
      selected.push(match);
      selectedIds.add(match.id);
    }
  });

  if (selected.length < 4) {
    items.forEach((item) => {
      if (selected.length >= 4) return;
      if (!item?.id || selectedIds.has(item.id)) return;

      selected.push(item);
      selectedIds.add(item.id);
    });
  }

  return selected.slice(0, 4);
}

const ProductCard = memo(function ProductCard({ item }) {
  const goToProduct = useCallback(() => {
    window.location.href = item.url;
  }, [item.url]);

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

  const handleSelect = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!item.isInStock) return;

      goToProduct();
    },
    [goToProduct, item.isInStock]
  );

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`View details for ${item.name}`}
      onClick={goToProduct}
      onKeyDown={handleCardKeyDown}
      className="featured-card group"
    >
      <div className="featured-visual">
        <div className="featured-visual-bg" aria-hidden="true" />
        <div className="featured-rings" aria-hidden="true" />
        <div className="featured-shadow" aria-hidden="true" />

        <img
          src={item.image}
          alt={item.name}
          draggable="false"
          loading="lazy"
          decoding="async"
          className="featured-image"
        />
      </div>

      <div className="px-0.5 pb-1 pt-3 sm:px-1 sm:pt-5">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <span className="text-[7.5px] font-black uppercase tracking-[0.12em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.18em]">
            Featured
          </span>

          <span className="text-[7.5px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
            {item.isInStock ? "Available" : "Unavailable"}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[38px] text-[15px] font-semibold leading-[1.08] tracking-[-0.04em] text-white transition-colors duration-200 group-hover:text-cyan-100 sm:min-h-0 sm:text-[22px] lg:text-[24px]">
          {item.name}
        </h3>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-cyan-200/10 pt-3 sm:mt-4 sm:pt-4">
          <div>
            <p className="text-[7.5px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
              Price
            </p>

            <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[28px] lg:text-[32px]">
              {item.priceLabel}
            </p>
          </div>

          <span className="mb-0.5 inline-flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.14em] text-cyan-200/65 transition-colors duration-200 group-hover:text-cyan-100 sm:mb-1 sm:text-[10px] sm:tracking-[0.18em]">
            Details
            <ArrowRight
              size={12}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>

        <button
          type="button"
          disabled={!item.isInStock}
          onClick={handleSelect}
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.14em] transition duration-200 sm:mt-5 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-[11px] sm:tracking-[0.2em] ${
            item.isInStock
              ? "bg-cyan-300 text-slate-950 hover:bg-white"
              : "cursor-not-allowed border border-cyan-200/10 bg-white/[0.035] text-slate-500"
          }`}
        >
          <ShoppingBag size={13} className="sm:hidden" aria-hidden="true" />
          <ShoppingBag size={15} className="hidden sm:block" aria-hidden="true" />
          {item.isInStock ? "Select" : "Out"}
        </button>
      </div>
    </article>
  );
});

export default function ProductCatalog({ products = [] }) {
  const visibleProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const preparedProducts = products.map(prepareProduct);

    return getFeaturedItems(preparedProducts);
  }, [products]);

  if (!Array.isArray(products) || products.length === 0) {
    return (
      <section className="relative py-14 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-400">No products available.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-section relative overflow-hidden py-12 text-white sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div className="w-full lg:max-w-[720px]">
            <div className="mx-auto mb-4 inline-flex items-center justify-center gap-3 lg:mx-0 lg:mb-5 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.55)]" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
                High Demand
              </span>
            </div>

            <h2 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-3xl sm:text-[50px] lg:mx-0 lg:max-w-[720px] lg:text-[58px] lg:leading-[1.04] lg:tracking-[-0.05em]">
              Compounds in
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85">
                high demand.
              </span>
            </h2>
          </div>

          <a
            href="/shop"
            className="group hidden w-fit items-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/80 transition-colors duration-200 hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white lg:inline-flex"
          >
            View Catalog
            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visibleProducts.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-7 flex justify-center lg:hidden">
          <a
            href="/shop"
            className="group inline-flex items-center justify-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/80 transition-colors duration-200 hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white"
          >
            View Catalog
            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
        </div>

        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:mt-7 sm:text-[10px] sm:tracking-[0.18em]">
          Laboratory research catalog only.
        </p>
      </div>

      <style>{`
        .featured-section {
          isolation: isolate;
        }

        .featured-card {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          border-radius: 1.35rem;
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(255, 255, 255, 0.025);
          padding: 0.625rem;
          outline: none;
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            background 200ms ease;
          content-visibility: auto;
          contain-intrinsic-size: 470px;
        }

        .featured-card:hover {
          transform: translate3d(0, -4px, 0);
          border-color: rgba(165, 243, 252, 0.24);
          background: rgba(255, 255, 255, 0.04);
        }

        .featured-card:focus-visible {
          box-shadow: 0 0 0 2px rgba(165, 243, 252, 0.35);
        }

        .featured-visual {
          position: relative;
          display: flex;
          height: 170px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 1rem;
          background:
            radial-gradient(circle at 50% 34%, rgba(103, 232, 249, 0.14), transparent 46%),
            linear-gradient(145deg, rgba(3, 12, 24, 0.98), rgba(8, 38, 56, 0.78), rgba(4, 14, 28, 0.96));
        }

        .featured-visual-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 10%, rgba(255,255,255,0.055), transparent 30%),
            radial-gradient(circle at 100% 0%, rgba(103,232,249,0.09), transparent 36%),
            radial-gradient(circle at 0% 100%, rgba(59,130,246,0.08), transparent 38%);
        }

        .featured-rings {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 128px;
          height: 128px;
          transform: translate3d(-50%, -50%, 0);
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.1);
        }

        .featured-rings::after {
          content: "";
          position: absolute;
          inset: 24px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.055);
        }

        .featured-shadow {
          position: absolute;
          bottom: 24px;
          width: 112px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.38),
            rgba(0, 0, 0, 0.06) 68%,
            transparent 100%
          );
        }

        .featured-image {
          position: relative;
          z-index: 2;
          width: auto;
          max-height: 132px;
          object-fit: contain;
          filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.36));
          transform: translate3d(0, 0, 0);
          transition:
            transform 220ms ease,
            filter 220ms ease;
        }

        .featured-card:hover .featured-image {
          transform: translate3d(0, -4px, 0) scale(1.025);
          filter: drop-shadow(0 22px 30px rgba(0, 0, 0, 0.42));
        }

        @media (min-width: 640px) {
          .featured-card {
            border-radius: 2rem;
            padding: 1rem;
          }

          .featured-visual {
            height: 260px;
            border-radius: 1.5rem;
          }

          .featured-rings {
            width: 192px;
            height: 192px;
          }

          .featured-rings::after {
            inset: 36px;
          }

          .featured-shadow {
            bottom: 40px;
            width: 160px;
            height: 34px;
          }

          .featured-image {
            max-height: 220px;
          }
        }

        @media (min-width: 1024px) {
          .featured-visual {
            height: 300px;
          }

          .featured-image {
            max-height: 245px;
          }
        }

        @media (max-width: 768px) {
          .featured-card {
            content-visibility: visible;
            contain-intrinsic-size: auto;
          }

          .featured-card:hover {
            transform: none;
          }

          .featured-card:hover .featured-image {
            transform: none;
          }

          .featured-image {
            filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.34));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .featured-card,
          .featured-image,
          .featured-card *,
          .featured-card::before,
          .featured-card::after {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}