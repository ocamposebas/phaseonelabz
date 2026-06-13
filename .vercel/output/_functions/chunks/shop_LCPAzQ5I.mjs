import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { u as useCart, a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useMemo } from 'react';
import { Sparkles, Tag, Beaker, FlaskConical, Search, Filter, ChevronDown, SlidersHorizontal, X, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import { N as NewsletterSection, S as SiteFooter } from './NewsletterSection_RYopaVGa.mjs';

const categoryFilters = [
  "All Products",
  "Accessories",
  "Bacteriostatic Water",
  "Cosmetic & Skin",
  "Growth Hormone",
  "Healing & Recovery",
  "Longevity & Other",
  "Metabolic Research",
  "Research Blends",
  "Research Peptides"
];
const priceFilters = [
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50–$100", min: 50, max: 100 },
  { label: "$100–$200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: Infinity }
];
const collectionChips = [
  {
    label: "Most Requested",
    value: "favorites",
    caption: "Popular picks",
    icon: Sparkles
  },
  {
    label: "Limited Deals",
    value: "sale",
    caption: "Active offers",
    icon: Tag
  },
  {
    label: "Core Essentials",
    value: "exclusive",
    caption: "Selected catalog",
    icon: Beaker
  },
  {
    label: "Next Drops",
    value: "coming-soon",
    caption: "Soon available",
    icon: FlaskConical
  }
];
const sortOptions = [
  { label: "Most popular", value: "popular" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "A–Z", value: "az" }
];
function getProductImage(product) {
  return product?.image || product?.images?.[0]?.src || product?.images?.[0]?.url || product?.featuredImage || "/placeholder-product.png";
}
function getProductCategory(product) {
  if (product?.category) return product.category;
  if (Array.isArray(product?.categories) && product.categories.length > 0) {
    return product.categories[0]?.name || product.categories[0];
  }
  return "Research Peptides";
}
function getProductPrice(product) {
  const rawPrice = product?.price || product?.regular_price || product?.sale_price || product?.price_html || 0;
  if (typeof rawPrice === "number") return rawPrice;
  const parsed = String(rawPrice).replace(/[^0-9.]/g, "");
  return Number(parsed || 0);
}
function formatPrice(price) {
  const number = Number(price || 0);
  if (Number.isNaN(number)) return "$0";
  return `$${number.toLocaleString(void 0, {
    maximumFractionDigits: 2
  })}`;
}
function getProductTags(product) {
  const rawTags = product?.tags || product?.labels || [];
  if (!Array.isArray(rawTags)) return [];
  return rawTags.map(
    (tag) => typeof tag === "string" ? tag.toLowerCase() : tag?.name?.toLowerCase()
  ).filter(Boolean);
}
function ProductCard({ product, addToCart }) {
  const productName = product?.name || product?.title || "Product";
  const category = getProductCategory(product);
  const price = getProductPrice(product);
  const image = getProductImage(product);
  const tags = getProductTags(product);
  const stockStatus = String(product?.stock_status || product?.stockStatus || "").toLowerCase().trim();
  const manageStock = product?.manage_stock === true || product?.manageStock === true;
  const stockQuantity = product?.stock_quantity ?? product?.stockQuantity ?? product?.quantity ?? null;
  const isComingSoon = tags.includes("coming soon") || tags.includes("coming-soon") || stockStatus === "coming-soon";
  const isSoldOut = stockStatus === "outofstock" || stockStatus === "out-of-stock" || stockStatus === "out of stock" || stockStatus === "soldout" || stockStatus === "sold-out" || stockStatus === "sold out" || product?.in_stock === false || product?.inStock === false || product?.is_in_stock === false || product?.isInStock === false || product?.purchasable === false || product?.is_purchasable === false || tags.includes("sold out") || tags.includes("sold-out") || tags.includes("out of stock") || tags.includes("out-of-stock") || manageStock && Number(stockQuantity) <= 0;
  const isUnavailable = isComingSoon || isSoldOut;
  const unavailableLabel = isComingSoon ? "Coming Soon" : "Sold Out";
  const productUrl = product?.permalink || product?.url || product?.link || `/product/${product?.slug || product?.id}`;
  const handleAddToCart = () => {
    if (isUnavailable) return;
    addToCart({
      ...product,
      id: product.id,
      name: productName,
      price,
      image,
      category
    });
  };
  return /* @__PURE__ */ jsxs("article", { className: "product-float-card group", children: [
    /* @__PURE__ */ jsxs("div", { className: "product-float-visual", children: [
      /* @__PURE__ */ jsx("div", { className: "visual-glow visual-glow-1" }),
      /* @__PURE__ */ jsx("div", { className: "visual-glow visual-glow-2" }),
      /* @__PURE__ */ jsx("div", { className: "visual-grid" }),
      /* @__PURE__ */ jsx("span", { className: "product-float-pill", children: category }),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: productUrl,
          "aria-label": `View details for ${productName}`,
          className: "product-float-eye",
          children: /* @__PURE__ */ jsx(Eye, { size: 15 })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "product-float-image-wrap", children: [
        /* @__PURE__ */ jsx("div", { className: "product-float-shadow" }),
        /* @__PURE__ */ jsx(
          "img",
          {
            src: image,
            alt: productName,
            className: "product-float-image",
            loading: "lazy"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "product-float-body", children: [
      /* @__PURE__ */ jsx("h3", { className: "product-float-title", children: productName }),
      /* @__PURE__ */ jsx("p", { className: "product-float-subtitle", children: "Research use only · Batch documentation available" }),
      /* @__PURE__ */ jsx("p", { className: "product-float-price", children: formatPrice(price) }),
      isUnavailable ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: true,
          "aria-disabled": "true",
          className: "product-float-button-disabled",
          children: unavailableLabel
        }
      ) : /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleAddToCart,
          className: "product-float-button",
          children: [
            /* @__PURE__ */ jsx(ShoppingBag, { size: 14 }),
            /* @__PURE__ */ jsx("span", { children: "Add to cart" }),
            /* @__PURE__ */ jsx(ArrowRight, { size: 14, className: "product-float-arrow" })
          ]
        }
      )
    ] })
  ] });
}
function ShopCatalogSection({ products = [] }) {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [activePrice, setActivePrice] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [sortBy, setSortBy] = useState("popular");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filteredProducts = useMemo(() => {
    let result = [...products];
    const cleanSearch = searchQuery.trim().toLowerCase();
    if (cleanSearch) {
      result = result.filter((product) => {
        const searchable = [
          product?.name,
          product?.title,
          product?.sku,
          getProductCategory(product),
          ...(product?.tags || []).map(
            (tag) => typeof tag === "string" ? tag : tag?.name
          )
        ].join(" ").toLowerCase();
        return searchable.includes(cleanSearch);
      });
    }
    if (activeCategory !== "All Products") {
      result = result.filter(
        (product) => getProductCategory(product).toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (activePrice) {
      result = result.filter((product) => {
        const price = getProductPrice(product);
        return price >= activePrice.min && price < activePrice.max;
      });
    }
    if (activeCollection) {
      result = result.filter((product) => {
        const tags = getProductTags(product);
        if (activeCollection === "sale") {
          return tags.includes("sale") || tags.includes("on sale") || product?.sale_price || product?.onSale;
        }
        if (activeCollection === "coming-soon") {
          return tags.includes("coming soon") || tags.includes("coming-soon") || product?.stock_status === "coming-soon";
        }
        return tags.includes(activeCollection);
      });
    }
    result.sort((a, b) => {
      const priceA = getProductPrice(a);
      const priceB = getProductPrice(b);
      const nameA = String(a?.name || a?.title || "");
      const nameB = String(b?.name || b?.title || "");
      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      if (sortBy === "az") return nameA.localeCompare(nameB);
      if (sortBy === "newest") {
        return new Date(b?.date_created || 0) - new Date(a?.date_created || 0);
      }
      return 0;
    });
    return result;
  }, [
    products,
    searchQuery,
    activeCategory,
    activePrice,
    activeCollection,
    sortBy
  ]);
  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategory("All Products");
    setActivePrice(null);
    setActiveCollection(null);
    setSortBy("popular");
  };
  const FilterPanel = () => /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55", children: "Category" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: clearFilters,
            className: "text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:text-cyan-100",
            children: "Clear"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: categoryFilters.map((category) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setActiveCategory(category),
          className: `flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${activeCategory === category ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100" : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"}`,
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-[12px] font-semibold leading-5", children: category }),
            activeCategory === category && /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" })
          ]
        },
        category
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "mb-3 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55", children: "Price" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: priceFilters.map((price) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => setActivePrice(
            activePrice?.label === price.label ? null : price
          ),
          className: `flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${activePrice?.label === price.label ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100" : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"}`,
          children: /* @__PURE__ */ jsx("span", { className: "text-[12px] font-semibold leading-5", children: price.label })
        },
        price.label
      )) })
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: clearFilters,
        className: "w-full rounded-xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100",
        children: "Clear Filters"
      }
    )
  ] });
  return /* @__PURE__ */ jsxs("section", { className: "relative px-5 py-10 text-white sm:px-6 sm:py-14 lg:py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 md:justify-start", children: [
          /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: "Shop Catalog" })
        ] }),
        /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[56px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]", children: [
          "Browse research",
          /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent", children: "products." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-sm md:mx-0", children: "Filter products by category, price range, catalog status, and research collection." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mb-7 grid grid-cols-2 gap-3 sm:mb-8 lg:grid-cols-4", children: collectionChips.map((chip) => {
        const Icon = chip.icon;
        const active = activeCollection === chip.value;
        return /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setActiveCollection(active ? null : chip.value),
            className: `group relative overflow-hidden rounded-[1.15rem] border px-3.5 py-3.5 text-left transition sm:rounded-[1.4rem] sm:px-5 sm:py-4 ${active ? "border-cyan-200/30 bg-cyan-300/[0.075]" : "border-cyan-200/10 bg-white/[0.018] hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"}`,
            children: [
              /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 sm:gap-4", children: [
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[13px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-base", children: chip.label }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]", children: chip.caption })
                ] }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition sm:h-10 sm:w-10 ${active ? "border-cyan-200/25 bg-cyan-300/[0.1] text-cyan-100" : "border-cyan-200/10 bg-[#121E2E] text-cyan-200/70 group-hover:text-cyan-100"}`,
                    children: /* @__PURE__ */ jsx(Icon, { size: 16 })
                  }
                )
              ] })
            ]
          },
          chip.value
        );
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "mb-6 grid gap-3 lg:flex lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-full lg:max-w-xl", children: [
          /* @__PURE__ */ jsx(
            Search,
            {
              size: 17,
              className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/55"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: searchQuery,
              onChange: (event) => setSearchQuery(event.target.value),
              type: "search",
              placeholder: "Search products, category, SKU...",
              className: "min-h-[50px] w-full rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#121E2E] sm:min-h-[52px] sm:text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[auto_1fr] gap-3 lg:flex", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setMobileFiltersOpen(true),
              className: "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:text-cyan-100 lg:hidden",
              children: [
                /* @__PURE__ */ jsx(Filter, { size: 15 }),
                "Filters"
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: sortBy,
                onChange: (event) => setSortBy(event.target.value),
                className: "min-h-[50px] w-full appearance-none rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 px-4 pr-10 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 outline-none transition focus:border-cyan-200/35 sm:min-h-[52px] sm:px-5 sm:pr-11 sm:text-[10px] sm:tracking-[0.16em]",
                children: sortOptions.map((option) => /* @__PURE__ */ jsxs("option", { value: option.value, children: [
                  "Sort: ",
                  option.label
                ] }, option.value))
              }
            ),
            /* @__PURE__ */ jsx(
              ChevronDown,
              {
                size: 15,
                className: "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-8 lg:grid-cols-[280px_1fr]", children: [
        /* @__PURE__ */ jsx("aside", { className: "hidden lg:block", children: /* @__PURE__ */ jsxs("div", { className: "sticky top-24 rounded-[1.25rem] border border-cyan-200/10 bg-[#121E2E]/55 p-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200", children: /* @__PURE__ */ jsx(SlidersHorizontal, { size: 17 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Filters" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600", children: "Refine catalog results" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(FilterPanel, {})
        ] }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "mb-5 flex items-center justify-between gap-4", children: /* @__PURE__ */ jsxs("p", { className: "text-[12px] text-slate-500 sm:text-sm", children: [
            "Showing",
            " ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: filteredProducts.length }),
            " ",
            "of",
            " ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: products.length }),
            " ",
            "products"
          ] }) }),
          filteredProducts.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-[1.6rem] border border-cyan-200/10 bg-[#121E2E]/45 p-8 text-center sm:p-10", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold text-white", children: "No products found" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-slate-500", children: "Try clearing filters or searching another term." }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: clearFilters,
                className: "mt-6 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.14]",
                children: "Clear Filters"
              }
            )
          ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3", children: filteredProducts.map((product) => /* @__PURE__ */ jsx(
            ProductCard,
            {
              product,
              addToCart
            },
            product.id
          )) })
        ] })
      ] })
    ] }),
    mobileFiltersOpen && /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-[90] lg:hidden", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          "aria-label": "Close filters",
          onClick: () => setMobileFiltersOpen(false),
          className: "absolute inset-0 bg-black/60 backdrop-blur-sm"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-cyan-200/10 bg-[#07111D] p-6 shadow-[0_-30px_80px_rgba(0,0,0,0.35)]", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-white", children: "Filters" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500", children: "Refine shop results" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setMobileFiltersOpen(false),
              className: "grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-white/[0.035] text-slate-400",
              children: /* @__PURE__ */ jsx(X, { size: 18 })
            }
          )
        ] }),
        /* @__PURE__ */ jsx(FilterPanel, {}),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setMobileFiltersOpen(false),
            className: "mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950",
            children: "Apply Filters"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .product-float-card {
          position: relative;
          overflow: hidden;
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
            transform 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease;
        }

        .product-float-card:hover {
          transform: translateY(-6px);
          border-color: rgba(122, 197, 255, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 24px 70px rgba(0, 0, 0, 0.34);
        }

        .product-float-visual {
          position: relative;
          height: 250px;
          overflow: hidden;
          border-bottom: 1px solid rgba(122, 197, 255, 0.08);
          background:
            radial-gradient(circle at 20% 25%, rgba(106, 218, 255, 0.08), transparent 30%),
            radial-gradient(circle at 80% 15%, rgba(79, 120, 255, 0.10), transparent 28%),
            linear-gradient(180deg, rgba(20, 36, 68, 0.96), rgba(10, 18, 37, 0.96));
        }

        .visual-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(122, 197, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 197, 255, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), transparent 100%);
          pointer-events: none;
        }

        .visual-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          pointer-events: none;
        }

        .visual-glow-1 {
          width: 140px;
          height: 140px;
          top: 25px;
          left: 30px;
          background: rgba(105, 226, 255, 0.14);
        }

        .visual-glow-2 {
          width: 180px;
          height: 180px;
          right: -20px;
          bottom: 10px;
          background: rgba(72, 111, 255, 0.14);
        }

        .product-float-pill {
          position: absolute;
          left: 16px;
          top: 16px;
          z-index: 5;
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.58);
          color: rgba(184, 233, 255, 0.92);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .product-float-eye {
          position: absolute;
          right: 16px;
          top: 16px;
          z-index: 6;
          display: grid;
          height: 38px;
          width: 38px;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.56);
          color: rgba(184, 233, 255, 0.82);
          backdrop-filter: blur(12px);
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease,
            color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .product-float-eye:hover {
          transform: translateY(-1px) scale(1.04);
          border-color: rgba(122, 197, 255, 0.3);
          background: rgba(103, 232, 249, 0.12);
          color: #e6fbff;
          box-shadow: 0 10px 28px rgba(103, 232, 249, 0.12);
        }

        .product-float-image-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 22px;
        }

        .product-float-shadow {
          position: absolute;
          bottom: 34px;
          width: 120px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(0,0,0,0.42) 0%,
            rgba(0,0,0,0.06) 70%,
            transparent 100%
          );
          filter: blur(7px);
          animation: floatShadow 4.4s ease-in-out infinite;
        }

        .product-float-image {
          position: relative;
          z-index: 2;
          width: auto;
          max-width: 82%;
          max-height: 195px;
          object-fit: contain;
          filter: drop-shadow(0 18px 26px rgba(0,0,0,0.22));
          animation: floatBottle 4.4s ease-in-out infinite;
          transition:
            transform 0.35s ease,
            filter 0.35s ease;
        }

        .product-float-card:hover .product-float-image {
          transform: scale(1.04);
          filter: drop-shadow(0 24px 34px rgba(0,0,0,0.30));
        }

        .product-float-body {
          padding: 18px;
        }

        .product-float-title {
          margin: 0;
          color: #f8fbff;
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.045em;
          font-weight: 750;
        }

        .product-float-subtitle {
          margin: 8px 0 0;
          color: rgba(148, 163, 184, 0.62);
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .product-float-price {
          margin: 10px 0 0;
          color: #7ee3ff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .product-float-button,
        .product-float-button-disabled {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 46px;
          margin-top: 16px;
          padding: 0 16px;
          border-radius: 16px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
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
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
          box-shadow: 0 12px 30px rgba(79, 201, 245, 0.18);
        }

        .product-float-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(79, 201, 245, 0.25);
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
          transition: transform 0.25s ease;
        }

        .product-float-button:hover .product-float-arrow {
          transform: translateX(2px);
        }

        @keyframes floatBottle {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-12px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        @keyframes floatShadow {
          0% {
            transform: scaleX(1);
            opacity: 0.34;
          }

          50% {
            transform: scaleX(0.84);
            opacity: 0.22;
          }

          100% {
            transform: scaleX(1);
            opacity: 0.34;
          }
        }

        @media (max-width: 768px) {
          .product-float-card {
            border-radius: 20px;
          }

          .product-float-visual {
            height: 165px;
          }

          .product-float-pill {
            left: 10px;
            top: 10px;
            min-height: 23px;
            max-width: calc(100% - 58px);
            padding: 0 7px;
            font-size: 7px;
            letter-spacing: 0.1em;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .product-float-eye {
            right: 10px;
            top: 10px;
            width: 32px;
            height: 32px;
            border-radius: 12px;
          }

          .product-float-image-wrap {
            padding: 18px 12px;
          }

          .product-float-image {
            max-height: 122px;
            max-width: 78%;
          }

          .product-float-shadow {
            bottom: 26px;
            width: 88px;
            height: 18px;
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
            padding: 12px;
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

          .product-float-button,
          .product-float-button-disabled {
            min-height: 38px;
            margin-top: 11px;
            gap: 7px;
            border-radius: 13px;
            padding: 0 10px;
            font-size: 8px;
            letter-spacing: 0.12em;
          }

          .product-float-button svg,
          .product-float-button-disabled svg {
            width: 12px;
            height: 12px;
          }
        }

        @media (max-width: 420px) {
          .product-float-visual {
            height: 152px;
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

          .product-float-button,
          .product-float-button-disabled {
            font-size: 7.5px;
            letter-spacing: 0.1em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .product-float-image,
          .product-float-shadow {
            animation: none;
          }
        }
      ` })
  ] });
}

function ShopExperience({ products = [] }) {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png", transparentOnTop: true }),
    /* @__PURE__ */ jsxs("main", { className: "pt-[118px]", children: [
      /* @__PURE__ */ jsx(ShopCatalogSection, { products }),
      /* @__PURE__ */ jsx(NewsletterSection, {}),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$Shop = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Shop;
  const WOO_URL = "https://labone.local/";
  const KEY = "ck_37e016ac24ece9120b1a17d1df405f3a5d4fd7c6";
  const SECRET = "cs_4d1a871a490c3ff20e752b091b4c7a25720c1ad1";
  let products = [];
  try {
    if (!WOO_URL || !KEY || !SECRET) ; else {
      const cleanUrl = WOO_URL.replace(/\/$/, "");
      const url = new URL(`${cleanUrl}/wp-json/wc/v3/products`);
      url.searchParams.set("per_page", "20");
      url.searchParams.set("status", "publish");
      url.searchParams.set("consumer_key", KEY);
      url.searchParams.set("consumer_secret", SECRET);
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Research Catalog Astro",
          Accept: "application/json"
        }
      });
      console.log(
        "WooCommerce URL:",
        url.toString().replace(KEY, "ck_hidden").replace(SECRET, "cs_hidden")
      );
      console.log("WooCommerce status:", response.status);
      if (response.ok) {
        products = await response.json();
        console.log("=== API SUCCESS === Productos encontrados:", products.length);
      } else {
        const errorText = await response.text();
        console.error("=== API ERROR ===", response.status, errorText);
      }
    }
  } catch (error) {
    console.error("=== CATCH ERROR ===:", error);
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$MainLayout, { "title": "Research Compounds // Scientific Catalog", "description": "Research-focused catalog experience for laboratory-use compounds with documentation, COA access, and responsible scientific presentation." }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "ShopExperience", ShopExperience, { "products": products, "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/shop/ShopPageExperience", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/shop.astro", void 0);
const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/shop.astro";
const $$url = "/shop";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Shop,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
