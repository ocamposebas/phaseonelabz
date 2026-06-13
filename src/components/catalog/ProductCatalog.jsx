import { useMemo } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "../cart/CartContext";

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
  return product.images?.[0]?.src || "/tarro.png";
}

function getProductDetailUrl(product) {
  if (!product?.slug) return "/shop";

  return `/product/${product.slug}`;
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchableProductText(product = {}) {
  const categories = Array.isArray(product.categories)
    ? product.categories
        .map((category) =>
          typeof category === "string" ? category : category?.name
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
      ...categories,
      ...tags,
    ].join(" ")
  );
}

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
    groups: [["p1", "water"], ["phase one", "water"], ["bacteriostatic", "water"], ["bac", "water"]],
    exclude: ["hospira"],
  },
];

function productMatchesGroup(searchText, group = []) {
  return group.every((term) => searchText.includes(normalizeText(term)));
}

function productMatchesRule(product = {}, rule = {}) {
  const searchText = getSearchableProductText(product);
  const sku = normalizeText(product?.sku || "");

  const excluded = Array.isArray(rule.exclude)
    ? rule.exclude.some((term) => searchText.includes(normalizeText(term)))
    : false;

  if (excluded) return false;

  const skuMatch = Array.isArray(rule.skus)
    ? rule.skus.some((ruleSku) => sku === normalizeText(ruleSku))
    : false;

  if (skuMatch) return true;

  return rule.groups.some((group) => productMatchesGroup(searchText, group));
}

function getFeaturedProducts(products = []) {
  const selected = [];
  const selectedIds = new Set();

  featuredProductRules.forEach((rule) => {
    const match = products.find((product) => {
      if (!product?.id || selectedIds.has(product.id)) return false;
      return productMatchesRule(product, rule);
    });

    if (match) {
      selected.push(match);
      selectedIds.add(match.id);
    } else {
      console.warn(`Featured product not found: ${rule.label}`);
    }
  });

  if (selected.length < 4) {
    products.forEach((product) => {
      if (selected.length >= 4) return;
      if (!product?.id || selectedIds.has(product.id)) return;

      selected.push(product);
      selectedIds.add(product.id);
    });
  }

  return selected.slice(0, 4);
}

export default function ProductCatalog({ products = [] }) {
  const { addToCart } = useCart();

  const visibleProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    return getFeaturedProducts(products);
  }, [products]);

  const goToProduct = (url) => {
    window.location.href = url;
  };

  const handleCardKeyDown = (event, url) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToProduct(url);
    }
  };

  if (!products || products.length === 0) {
    return (
      <section className="relative py-14 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-400">No products available.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden py-12 text-white sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div className="w-full lg:max-w-[720px]">
            <div className="mx-auto mb-4 inline-flex items-center justify-center gap-3 lg:mx-0 lg:mb-5 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

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
            className="group hidden w-fit items-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white lg:inline-flex"
          >
            View Catalog
            <ArrowRight
              size={15}
              className="transition group-hover:translate-x-1"
            />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visibleProducts.map((product, index) => {
            const image = getImage(product);
            const isInStock = product.stock_status === "instock";
            const productUrl = getProductDetailUrl(product);

            return (
              <article
                key={product.id}
                role="link"
                tabIndex={0}
                aria-label={`View details for ${product.name}`}
                onClick={() => goToProduct(productUrl)}
                onKeyDown={(event) => handleCardKeyDown(event, productUrl)}
                className="group relative cursor-pointer overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.025] p-2.5 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-200/35 sm:rounded-[2rem] sm:p-4"
              >
                <div className="relative flex h-[170px] items-center justify-center overflow-hidden rounded-[1rem] bg-[linear-gradient(145deg,rgba(3,12,24,0.98),rgba(8,38,56,0.78),rgba(4,14,28,0.96))] sm:h-[260px] sm:rounded-[1.5rem] lg:h-[300px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(103,232,249,0.2),transparent_48%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_28%)]" />
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/12 blur-[60px] sm:-right-16 sm:-top-16 sm:h-48 sm:w-48 sm:blur-[70px]" />
                  <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-blue-500/10 blur-[70px] sm:-left-16 sm:h-48 sm:w-48 sm:blur-[80px]" />

                  <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 sm:h-48 sm:w-48" />
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/5 sm:h-32 sm:w-32" />

                  <div className="absolute bottom-6 h-8 w-28 rounded-full bg-black/45 blur-2xl sm:bottom-10 sm:h-10 sm:w-40" />

                  <img
                    src={image}
                    alt={product.name}
                    draggable="false"
                    className="product-image relative z-10 max-h-[132px] w-auto object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.5)] transition duration-500 group-hover:scale-[1.04] sm:max-h-[220px] lg:max-h-[245px]"
                    style={{ animationDelay: `${index * 0.22}s` }}
                  />
                </div>

                <div className="px-0.5 pb-1 pt-3 sm:px-1 sm:pt-5">
                  <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                    <span className="text-[7.5px] font-black uppercase tracking-[0.12em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.18em]">
                      Featured
                    </span>

                    <span className="text-[7.5px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                      {isInStock ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 min-h-[38px] text-[15px] font-semibold leading-[1.08] tracking-[-0.04em] text-white transition group-hover:text-cyan-100 sm:min-h-0 sm:text-[22px] lg:text-[24px]">
                    {product.name}
                  </h3>

                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-cyan-200/10 pt-3 sm:mt-4 sm:pt-4">
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                        Price
                      </p>

                      <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[28px] lg:text-[32px]">
                        {formatPrice(product.price)}
                      </p>
                    </div>

                    <span className="mb-0.5 inline-flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.14em] text-cyan-200/65 transition group-hover:text-cyan-100 sm:mb-1 sm:text-[10px] sm:tracking-[0.18em]">
                      Details
                      <ArrowRight
                        size={12}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!isInStock}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      if (isInStock) {
                        addToCart(product);
                      }
                    }}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.14em] transition duration-300 sm:mt-5 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-[11px] sm:tracking-[0.2em] ${
                      isInStock
                        ? "bg-cyan-300 text-slate-950 shadow-[0_16px_38px_rgba(34,211,238,0.16)] hover:-translate-y-0.5 hover:bg-white"
                        : "cursor-not-allowed border border-cyan-200/10 bg-white/[0.035] text-slate-500"
                    }`}
                  >
                    <ShoppingBag size={13} className="sm:hidden" />
                    <ShoppingBag size={15} className="hidden sm:block" />
                    {isInStock ? "Add" : "Out"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-7 flex justify-center lg:hidden">
          <a
            href="/shop"
            className="group inline-flex items-center justify-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/80 backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white"
          >
            View Catalog
            <ArrowRight
              size={15}
              className="transition group-hover:translate-x-1"
            />
          </a>
        </div>

        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:mt-7 sm:text-[10px] sm:tracking-[0.18em]">
          Laboratory research catalog only.
        </p>
      </div>

      <style>{`
        .product-image {
          animation: floatProduct 5.8s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes floatProduct {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-12px);
          }
        }

        @media (max-width: 640px) {
          .product-image {
            animation-duration: 6.3s;
          }

          @keyframes floatProduct {
            0%, 100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-7px);
            }
          }
        }
      `}</style>
    </section>
  );
}