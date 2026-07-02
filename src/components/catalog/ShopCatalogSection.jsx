import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Beaker,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  FlaskConical,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useCart } from "../cart/CartContext";

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
  "Research Peptides",
];

const priceFilters = [
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50–$100", min: 50, max: 100 },
  { label: "$100–$200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: Infinity },
];

const collectionChips = [
  {
    label: "Most Requested",
    value: "favorites",
    caption: "Popular picks",
    icon: Sparkles,
  },
  {
    label: "Limited Deals",
    value: "sale",
    caption: "Active offers",
    icon: Tag,
  },
  {
    label: "Core Essentials",
    value: "exclusive",
    caption: "Selected catalog",
    icon: Beaker,
  },
  {
    label: "Next Drops",
    value: "coming-soon",
    caption: "Soon available",
    icon: FlaskConical,
  },
];

const sortOptions = [
  { label: "Most popular", value: "popular" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "A–Z", value: "az" },
];

const customProductOrder = [
  {
    rank: 1,
    groups: [["rt3"], ["reta"], ["retatrutide"]],
  },
  {
    rank: 2,
    groups: [["tz2"], ["tirz"], ["tirzepatide"]],
  },
  {
    rank: 3,
    groups: [["hospira"]],
  },
  {
    rank: 4,
    groups: [["p1", "water"], ["phase one", "water"], ["p1", "bacteriostatic"]],
    exclude: ["hospira"],
  },
  {
    rank: 5,
    groups: [["adamax"]],
  },
  {
    rank: 6,
    groups: [["glow"]],
  },
  {
    rank: 7,
    groups: [["klow"]],
  },
  {
    rank: 8,
    groups: [["ghk"], ["ghk cu"]],
  },
  {
    rank: 9,
    groups: [["tesamorelin"]],
  },
  {
    rank: 10,
    groups: [["mots"], ["mots c"]],
  },
  {
    rank: 11,
    groups: [["wolverine"], ["bpc", "tb"], ["bpc", "tb 500"]],
  },
  {
    rank: 12,
    groups: [["ss31"], ["ss 31"]],
  },
  {
    rank: 13,
    groups: [["5 amino", "1mq"], ["5 amino"], ["1mq"]],
  },
  {
    rank: 14,
    groups: [["korean", "glutha"], ["korean", "glutathione"], ["glutha"]],
  },
  {
    rank: 15,
    groups: [["nad plus"], ["nad"]],
  },
];

function normalizeProductOrderText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCatalogFilterText(value = "") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized === "accesories" ||
    normalized === "accesory" ||
    normalized === "accessory"
  ) {
    return "accessories";
  }

  return normalized;
}

function includesOrderTerm(searchable, term) {
  const cleanTerm = normalizeProductOrderText(term);

  if (!cleanTerm) return false;

  return ` ${searchable} `.includes(` ${cleanTerm} `);
}

function textMatchesCustomRule(searchable, rule) {
  if (rule.exclude?.some((term) => includesOrderTerm(searchable, term))) {
    return false;
  }

  return rule.groups.some((group) =>
    group.every((term) => includesOrderTerm(searchable, term))
  );
}

function getCustomProductRankFromText(searchable) {
  const matchedRule = customProductOrder.find((rule) =>
    textMatchesCustomRule(searchable, rule)
  );

  return matchedRule?.rank || 9999;
}

function getProductMgFromText(searchable) {
  const match = searchable.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*mg(?:\s|$)/i);

  return match ? Number(match[1]) : 9999;
}

function getTermValue(term) {
  if (!term) return "";

  if (typeof term === "string") return term;

  return term?.name || term?.slug || term?.label || "";
}

function getProductKey(product) {
  return String(product?.id || product?.slug || product?.name || product?.title);
}

function getProductImage(product) {
  return (
    product?.image ||
    product?.images?.[0]?.src ||
    product?.images?.[0]?.url ||
    product?.featuredImage ||
    "/placeholder-product.png"
  );
}

function getProductCategory(product) {
  if (product?.category) return product.category;

  if (Array.isArray(product?.categories) && product.categories.length > 0) {
    return product.categories[0]?.name || product.categories[0];
  }

  return "Research Peptides";
}

function getProductPrice(product) {
  const rawPrice =
    product?.price ||
    product?.regular_price ||
    product?.sale_price ||
    product?.price_html ||
    0;

  if (typeof rawPrice === "number") return rawPrice;

  const parsed = String(rawPrice).replace(/[^0-9.]/g, "");

  return Number(parsed || 0);
}

function parseProductPriceNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = String(value).replace(/[^0-9.]/g, "");

  return Number(parsed || 0);
}

function isProductDiscounted(product) {
  if (!product) return false;

  if (product?.on_sale === true || product?.onSale === true) {
    return true;
  }

  const regularPrice = parseProductPriceNumber(
    product?.regular_price ?? product?.regularPrice
  );

  const salePrice = parseProductPriceNumber(
    product?.sale_price ?? product?.salePrice
  );

  if (regularPrice > 0 && salePrice > 0 && salePrice < regularPrice) {
    return true;
  }

  const priceHtml = String(product?.price_html || product?.priceHtml || "");

  return (
    /<del[\s>]/i.test(priceHtml) ||
    (priceHtml.includes("woocommerce-Price-amount") &&
      priceHtml.includes("<del"))
  );
}

function formatPrice(price) {
  const number = Number(price || 0);

  if (Number.isNaN(number) || number <= 0) return "Request Price";

  return `$${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function getProductTags(product) {
  const rawTags = product?.tags || product?.labels || [];

  if (!Array.isArray(rawTags)) return [];

  return rawTags
    .map((tag) =>
      typeof tag === "string" ? tag.toLowerCase() : tag?.name?.toLowerCase()
    )
    .filter(Boolean);
}

function getProductCategoryFilterTerms(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories.map(getTermValue)
    : [];

  const tags = Array.isArray(product?.tags)
    ? product.tags.map(getTermValue)
    : [];

  const labels = Array.isArray(product?.labels)
    ? product.labels.map(getTermValue)
    : [];

  return [
    product?.category,
    product?.category_slug,
    product?.categorySlug,
    ...categories,
    ...tags,
    ...labels,
  ]
    .map(normalizeCatalogFilterText)
    .filter(Boolean);
}

function getProductAvailability(product, cachedTags) {
  const tags = cachedTags || getProductTags(product);

  const stockStatus = String(product?.stock_status || product?.stockStatus || "")
    .toLowerCase()
    .trim();

  const manageStock =
    product?.manage_stock === true || product?.manageStock === true;

  const stockQuantity =
    product?.stock_quantity ??
    product?.stockQuantity ??
    product?.quantity ??
    null;

  const isComingSoon =
    tags.includes("coming soon") ||
    tags.includes("coming-soon") ||
    stockStatus === "coming-soon";

  const isSoldOut =
    stockStatus === "outofstock" ||
    stockStatus === "out-of-stock" ||
    stockStatus === "out of stock" ||
    stockStatus === "soldout" ||
    stockStatus === "sold-out" ||
    stockStatus === "sold out" ||
    product?.in_stock === false ||
    product?.inStock === false ||
    product?.is_in_stock === false ||
    product?.isInStock === false ||
    product?.purchasable === false ||
    product?.is_purchasable === false ||
    tags.includes("sold out") ||
    tags.includes("sold-out") ||
    tags.includes("out of stock") ||
    tags.includes("out-of-stock") ||
    (manageStock && Number(stockQuantity) <= 0);

  const isUnavailable = isComingSoon || isSoldOut;

  return {
    isComingSoon,
    isSoldOut,
    isUnavailable,
    isAvailable: !isUnavailable,
    unavailableLabel: isComingSoon ? "Coming Soon" : "Sold Out",
  };
}

function getProductUrl(product) {
  return product?.slug ? `/product/${product.slug}` : `/product/${product?.id}`;
}

function getProductOrderSearchText(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories.map((category) => category?.name || category?.slug || "")
    : [];

  const tags = Array.isArray(product?.tags)
    ? product.tags.map((tag) =>
        typeof tag === "string" ? tag : tag?.name || tag?.slug || ""
      )
    : [];

  const attributes = Array.isArray(product?.attributes)
    ? product.attributes.flatMap((attribute) => [
        attribute?.name || "",
        attribute?.slug || "",
        ...(attribute?.options || []),
      ])
    : [];

  return normalizeProductOrderText(
    [
      product?.name,
      product?.title,
      product?.slug,
      product?.sku,
      product?.short_description,
      product?.description,
      ...categories,
      ...tags,
      ...attributes,
    ].join(" ")
  );
}

function getCategoryFromUrl() {
  if (typeof window === "undefined") return "All Products";

  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");

  if (!categoryParam) return "All Products";

  const normalizedParam = normalizeCatalogFilterText(categoryParam);

  const matchedCategory = categoryFilters.find(
    (category) => normalizeCatalogFilterText(category) === normalizedParam
  );

  return matchedCategory || "All Products";
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];

  if (currentPage > 3) {
    pages.push("start-ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("end-ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

function prepareProductForCatalog(product) {
  const name = product?.name || product?.title || "Product";
  const category = getProductCategory(product);
  const price = getProductPrice(product);
  const image = getProductImage(product);
  const url = getProductUrl(product);
  const key = getProductKey(product);
  const tags = getProductTags(product);
  const availability = getProductAvailability(product, tags);
  const orderText = getProductOrderSearchText(product);
  const categoryTerms = getProductCategoryFilterTerms(product);

  const searchText = normalizeCatalogFilterText(
    [
      product?.name,
      product?.title,
      product?.sku,
      product?.slug,
      product?.short_description,
      product?.description,
      category,
      ...categoryTerms,
      ...tags,
    ].join(" ")
  );

  const newestRaw =
    product?.date_created ||
    product?.dateCreated ||
    product?.created_at ||
    product?.createdAt ||
    0;

  return {
    product,
    key,
    name,
    category,
    price,
    image,
    url,
    tags,
    availability,
    orderText,
    categoryTerms,
    searchText,
    rank: getCustomProductRankFromText(orderText),
    mg: getProductMgFromText(orderText),
    onSale: isProductDiscounted(product),
    newestTime: newestRaw ? new Date(newestRaw).getTime() || 0 : 0,
  };
}

function productMatchesCategoryMeta(item, activeCategory) {
  const target = normalizeCatalogFilterText(activeCategory);

  if (!target || target === "all products") return true;

  return (
    item.categoryTerms.some((term) => term === target) ||
    target.split(" ").every((word) => item.searchText.includes(word))
  );
}

function isVariableCatalogProduct(product = {}) {
  const productType = String(
    product?.type || product?.product_type || product?.productType || ""
  )
    .toLowerCase()
    .trim();

  if (productType.includes("variable")) return true;

  if (product?.has_options === true || product?.hasOptions === true) return true;

  const variationCollections = [
    product?.variations,
    product?.variation_ids,
    product?.variationIds,
    product?.children,
  ];

  if (
    variationCollections.some(
      (collection) => Array.isArray(collection) && collection.length > 0
    )
  ) {
    return true;
  }

  if (
    Array.isArray(product?.attributes) &&
    product.attributes.some(
      (attribute) =>
        attribute?.variation === true ||
        attribute?.is_variation === true ||
        attribute?.isVariation === true
    )
  ) {
    return true;
  }

  const parseRangeNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const parsed = String(value).replace(/[^0-9.]/g, "");
    return Number(parsed || 0);
  };

  const priceRangePairs = [
    [product?.min_price, product?.max_price],
    [product?.minPrice, product?.maxPrice],
    [product?.price_min, product?.price_max],
    [product?.priceMin, product?.priceMax],
    [product?.regular_price_min, product?.regular_price_max],
    [product?.regularPriceMin, product?.regularPriceMax],
    [product?.price_range?.min, product?.price_range?.max],
    [product?.priceRange?.min, product?.priceRange?.max],
  ];

  if (
    priceRangePairs.some(([min, max]) => {
      const cleanMin = parseRangeNumber(min);
      const cleanMax = parseRangeNumber(max);

      return cleanMin > 0 && cleanMax > 0 && cleanMax !== cleanMin;
    })
  ) {
    return true;
  }

  const priceRangeText = [
    product?.price,
    product?.price_html,
    product?.priceHtml,
    product?.price_range,
    product?.priceRange,
    product?.display_price,
    product?.displayPrice,
  ]
    .filter(Boolean)
    .join(" ");

  return /(&ndash;|&#8211;|–|—|\s-\s|\sto\s)/i.test(priceRangeText);
}

const ProductCard = memo(function ProductCard({ item, addToCart, onBundleAdd }) {
  const { product, name, category, price, image, url, availability } = item;
  const { isUnavailable, unavailableLabel } = availability;
  const isVariableProduct = isVariableCatalogProduct(product);
  const canSelectBundle = !isUnavailable && !isVariableProduct;
  const actionLabel = isVariableProduct ? "Select Options" : "Add to cart";

  const goToProduct = useCallback(() => {
    window.location.href = url;
  }, [url]);

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

  const handleAddToCart = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isUnavailable) return;

      if (isVariableProduct) {
        goToProduct();
        return;
      }

      addToCart({
        ...product,
        id: product.id,
        product_id: product.product_id || product.id,
        parent_id: product.parent_id || product.product_id || product.id,
        variation_id: 0,
        variation: {},
        name,
        price,
        image,
        category,

        bundleEligible: true,
        bundleDiscount: 10,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "any-5-eligible-products",
      });
    },
    [
      addToCart,
      category,
      goToProduct,
      image,
      isUnavailable,
      isVariableProduct,
      name,
      price,
      product,
    ]
  );

  const handleBundleAdd = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!canSelectBundle) return;

      onBundleAdd(product);
    },
    [canSelectBundle, onBundleAdd, product]
  );

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={goToProduct}
      onKeyDown={handleCardKeyDown}
      aria-label={`View details for ${name}`}
      className={`product-float-card group cursor-pointer ${
        isUnavailable ? "product-float-card-unavailable" : ""
      }`}
    >
      {isUnavailable && (
        <span className="product-stock-badge">{unavailableLabel}</span>
      )}

      {canSelectBundle && (
        <button
          type="button"
          onClick={handleBundleAdd}
          className="product-bundle-select"
          aria-label={`Add ${name} to bundle and unlock 10% off after 5 eligible products`}
        >
          <span />
          Add to Bundle
        </button>
      )}

      <div className="product-float-visual">
        <div className="visual-glow visual-glow-1" />
        <div className="visual-glow visual-glow-2" />
        <div className="visual-grid" />

        <span className="product-float-pill">{category}</span>

        <a
          href={url}
          onClick={(event) => {
            event.stopPropagation();
          }}
          aria-label={`View details for ${name}`}
          className="product-float-eye"
        >
          <Eye size={15} />
        </a>

        <div className="product-float-image-wrap">
          <div className="product-float-shadow" />

          <img
            src={image}
            alt={name}
            className="product-float-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="product-float-body">
        <h3 className="product-float-title">{name}</h3>

        <p className="product-float-subtitle">
          Research use only · Batch documentation available
        </p>

        <p className="product-float-price">{formatPrice(price)}</p>

        {isUnavailable ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className="product-float-button-disabled"
          >
            {unavailableLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="product-float-button"
            aria-label={
              isVariableProduct
                ? `Select options for ${name}`
                : `Add ${name} to cart`
            }
          >
            <ShoppingBag size={14} />
            <span>{actionLabel}</span>
            <ArrowRight size={14} className="product-float-arrow" />
          </button>
        )}
      </div>
    </article>
  );
});

const FilterPanel = memo(function FilterPanel({
  activeCategory,
  activePrice,
  onCategoryChange,
  onPriceChange,
  onClear,
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55">
            Category
          </p>

          <button
            type="button"
            onClick={onClear}
            className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:text-cyan-100"
          >
            Clear
          </button>
        </div>

        <div className="space-y-1.5">
          {categoryFilters.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                activeCategory === category
                  ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100"
                  : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"
              }`}
            >
              <span className="text-[12px] font-semibold leading-5">
                {category}
              </span>

              {activeCategory === category && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55">
          Price
        </p>

        <div className="space-y-1.5">
          {priceFilters.map((price) => (
            <button
              key={price.label}
              type="button"
              onClick={() => onPriceChange(price)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                activePrice?.label === price.label
                  ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100"
                  : "border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"
              }`}
            >
              <span className="text-[12px] font-semibold leading-5">
                {price.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100"
      >
        Clear Filters
      </button>
    </div>
  );
});

export default function ShopCatalogSection({
  products = [],
  productsPerPage = 20,
}) {
  const { addToCart } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(() => getCategoryFromUrl());
  const [activePrice, setActivePrice] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [sortBy, setSortBy] = useState("popular");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const preparedProducts = useMemo(() => {
    return products.map(prepareProductForCatalog);
  }, [products]);

  const addAnyFiveBundleItemToCart = useCallback(
    (product) => {
      const availability = getProductAvailability(product);

      if (availability.isUnavailable) return;

      const productName = product?.name || product?.title || "Product";
      const category = getProductCategory(product);
      const price = getProductPrice(product);
      const image = getProductImage(product);

      addToCart({
        ...product,
        id: product.id,
        product_id: product.product_id || product.id,
        parent_id: product.parent_id || product.product_id || product.id,
        variation_id: 0,
        variation: {},
        name: productName,
        price,
        image,
        category,

        bundleEligible: true,
        bundleDiscount: 10,
        bundleSameProductOnly: false,
        bundleRequiredQuantity: 5,
        bundleQuantity: 1,
        bundleRuleKey: "any-5-eligible-products",
      });
    },
    [addToCart]
  );

  const filteredItems = useMemo(() => {
    const cleanSearch = normalizeCatalogFilterText(debouncedSearchQuery);

    const result = preparedProducts.filter((item) => {
      if (cleanSearch && !item.searchText.includes(cleanSearch)) {
        return false;
      }

      if (!productMatchesCategoryMeta(item, activeCategory)) {
        return false;
      }

      if (activePrice) {
        if (item.price < activePrice.min || item.price >= activePrice.max) {
          return false;
        }
      }

      if (activeCollection) {
        if (activeCollection === "sale") {
          return item.onSale;
        }

        if (activeCollection === "coming-soon") {
          return item.availability.isComingSoon;
        }

        return item.tags.includes(activeCollection);
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "popular") {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.mg !== b.mg) return a.mg - b.mg;
        return a.name.localeCompare(b.name);
      }

      if (a.availability.isAvailable && !b.availability.isAvailable) return -1;
      if (!a.availability.isAvailable && b.availability.isAvailable) return 1;

      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return b.newestTime - a.newestTime;

      if (a.rank !== b.rank) return a.rank - b.rank;

      return a.name.localeCompare(b.name);
    });

    return result;
  }, [
    preparedProducts,
    debouncedSearchQuery,
    activeCategory,
    activePrice,
    activeCollection,
    sortBy,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / productsPerPage)
  );

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * productsPerPage;

    return filteredItems.slice(start, start + productsPerPage);
  }, [filteredItems, currentPage, productsPerPage, totalPages]);

  const paginationPages = useMemo(() => {
    return getPaginationPages(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const showingStart =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * productsPerPage + 1;

  const showingEnd = Math.min(
    currentPage * productsPerPage,
    filteredItems.length
  );

  useEffect(() => {
    const handlePopStateCategorySync = () => {
      setActiveCategory(getCategoryFromUrl());
    };

    window.addEventListener("popstate", handlePopStateCategorySync);

    return () => {
      window.removeEventListener("popstate", handlePopStateCategorySync);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeCategory, activePrice, activeCollection, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback(
    (page) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      setCurrentPage(nextPage);
    },
    [totalPages]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setActiveCategory("All Products");
    setActivePrice(null);
    setActiveCollection(null);
    setSortBy("popular");
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const handlePriceChange = useCallback((price) => {
    setActivePrice((currentPrice) =>
      currentPrice?.label === price.label ? null : price
    );
  }, []);

  return (
    <section className="relative px-5 py-10 text-white sm:px-6 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
              Shop Catalog
            </span>
          </div>

          <h2 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[56px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]">
            Browse research
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              products.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-sm md:mx-0">
            Filter products by category, price range, catalog status, and
            research collection.
          </p>
        </div>

        <div className="mb-7 overflow-hidden rounded-[1.35rem] border border-cyan-200/12 bg-[#121E2E]/55 p-4 sm:mb-8 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-300/[0.055] px-3 py-1.5">
                <Sparkles size={13} className="text-cyan-200" />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
                  Bundle Builder
                </span>
              </div>

              <h3 className="text-xl font-semibold tracking-[-0.045em] text-white sm:text-2xl">
                Add any 5 eligible products and unlock 10% off.
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Mix and match any 5 eligible products from the catalog. Once your
                cart reaches 5 eligible items, the 10% bundle discount will be
                applied.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-left lg:min-w-[220px]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Bundle Progress
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                5 eligible products
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Mix and match across the catalog.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-3 sm:mb-8 lg:grid-cols-4">
          {collectionChips.map((chip) => {
            const Icon = chip.icon;
            const active = activeCollection === chip.value;

            return (
              <button
                key={chip.value}
                type="button"
                onClick={() =>
                  setActiveCollection(active ? null : chip.value)
                }
                className={`group relative overflow-hidden rounded-[1.15rem] border px-3.5 py-3.5 text-left transition sm:rounded-[1.4rem] sm:px-5 sm:py-4 ${
                  active
                    ? "border-cyan-200/30 bg-cyan-300/[0.075]"
                    : "border-cyan-200/10 bg-white/[0.018] hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />

                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-base">
                      {chip.label}
                    </p>

                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]">
                      {chip.caption}
                    </p>
                  </div>

                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition sm:h-10 sm:w-10 ${
                      active
                        ? "border-cyan-200/25 bg-cyan-300/[0.1] text-cyan-100"
                        : "border-cyan-200/10 bg-[#121E2E] text-cyan-200/70 group-hover:text-cyan-100"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-6 grid gap-3 lg:flex lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/55"
            />

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search products, category, SKU..."
              className="min-h-[50px] w-full rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#121E2E] sm:min-h-[52px] sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3 lg:flex">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:text-cyan-100 lg:hidden"
            >
              <Filter size={15} />
              Filters
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-h-[50px] w-full appearance-none rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 px-4 pr-10 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 outline-none transition focus:border-cyan-200/35 sm:min-h-[52px] sm:px-5 sm:pr-11 sm:text-[10px] sm:tracking-[0.16em]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[1.25rem] border border-cyan-200/10 bg-[#121E2E]/55 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
                  <SlidersHorizontal size={17} />
                </span>

                <div>
                  <p className="text-sm font-semibold text-white">Filters</p>
                  <p className="text-xs text-slate-600">
                    Refine catalog results
                  </p>
                </div>
              </div>

              <FilterPanel
                activeCategory={activeCategory}
                activePrice={activePrice}
                onCategoryChange={handleCategoryChange}
                onPriceChange={handlePriceChange}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <div>
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <p className="text-[12px] text-slate-500 sm:text-sm">
                Showing{" "}
                <span className="font-semibold text-white">
                  {showingStart}-{showingEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-white">
                  {filteredItems.length}
                </span>{" "}
                results
              </p>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                Manual catalog order active in Most popular
              </p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-[1.6rem] border border-cyan-200/10 bg-[#121E2E]/45 p-8 text-center sm:p-10">
                <p className="text-xl font-semibold text-white">
                  No products found
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Try clearing filters or searching another term.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.14]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {paginatedItems.map((item) => (
                    <ProductCard
                      key={item.key}
                      item={item}
                      addToCart={addToCart}
                      onBundleAdd={addAnyFiveBundleItemToCart}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-cyan-200/10 pt-6 sm:flex-row">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.025] text-slate-300 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {paginationPages.map((page) => {
                        if (typeof page === "string") {
                          return (
                            <span
                              key={page}
                              className="grid h-10 min-w-10 place-items-center text-[11px] font-black text-slate-700"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-[11px] font-black transition ${
                              currentPage === page
                                ? "bg-cyan-300 text-slate-950"
                                : "border border-cyan-200/10 bg-white/[0.025] text-slate-400 hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.025] text-slate-300 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-cyan-200/10 bg-[#07111D] p-6 shadow-[0_-30px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">Filters</p>
                <p className="text-sm text-slate-500">Refine shop results</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-white/[0.035] text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <FilterPanel
              activeCategory={activeCategory}
              activePrice={activePrice}
              onCategoryChange={handleCategoryChange}
              onPriceChange={handlePriceChange}
              onClear={clearFilters}
            />

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes productSoftFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, var(--product-float-lift, -9px), 0);
          }
        }

        @keyframes productShadowFloat {
          0%,
          100% {
            transform: scaleX(1);
            opacity: 0.72;
          }

          50% {
            transform: scaleX(0.84);
            opacity: 0.42;
          }
        }

        @keyframes productGlowFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.78;
          }

          50% {
            transform: translate3d(0, -7px, 0) scale(1.04);
            opacity: 0.92;
          }
        }

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
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
          content-visibility: auto;
          contain-intrinsic-size: 430px;
        }

        .product-float-card-unavailable {
          opacity: 0.72;
        }

        .product-float-card:hover {
          transform: translate3d(0, -4px, 0);
          border-color: rgba(122, 197, 255, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 20px 54px rgba(0, 0, 0, 0.3);
        }

        .product-stock-badge {
          position: absolute;
          right: 14px;
          top: 14px;
          z-index: 20;
          display: inline-flex;
          min-height: 28px;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(2, 6, 23, 0.82);
          padding: 0 10px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .product-bundle-select {
          position: absolute;
          left: 14px;
          top: 52px;
          z-index: 30;
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.16);
          background: rgba(2, 6, 23, 0.82);
          padding: 0 11px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .product-bundle-select:hover {
          transform: translate3d(0, -1px, 0);
          border-color: rgba(103, 232, 249, 0.34);
          color: white;
        }

        .product-bundle-select span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.45);
          background: transparent;
        }

        .product-float-visual {
          position: relative;
          height: 250px;
          overflow: hidden;
          border-bottom: 1px solid rgba(122, 197, 255, 0.08);
          background:
            radial-gradient(circle at 20% 25%, rgba(106, 218, 255, 0.08), transparent 30%),
            radial-gradient(circle at 80% 15%, rgba(79, 120, 255, 0.1), transparent 28%),
            linear-gradient(180deg, rgba(20, 36, 68, 0.96), rgba(10, 18, 37, 0.96));
        }

        .visual-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(122, 197, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 197, 255, 0.035) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.45), transparent 100%);
          pointer-events: none;
        }

        .visual-glow {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          opacity: 0.8;
          animation: productGlowFloat 5.6s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .visual-glow-1 {
          width: 160px;
          height: 160px;
          top: 10px;
          left: 10px;
          background: radial-gradient(circle, rgba(105, 226, 255, 0.14), transparent 68%);
        }

        .visual-glow-2 {
          width: 200px;
          height: 200px;
          right: -55px;
          bottom: -45px;
          background: radial-gradient(circle, rgba(72, 111, 255, 0.14), transparent 68%);
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
          background: rgba(2, 6, 23, 0.68);
          color: rgba(184, 233, 255, 0.92);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
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
          background: rgba(2, 6, 23, 0.66);
          color: rgba(184, 233, 255, 0.82);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .product-float-eye:hover {
          transform: translate3d(0, -1px, 0) scale(1.03);
          border-color: rgba(122, 197, 255, 0.3);
          background: rgba(103, 232, 249, 0.12);
          color: #e6fbff;
        }

        .product-float-image-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 22px;
          --product-float-lift: -9px;
          animation: productSoftFloat 5.6s ease-in-out infinite;
          will-change: transform;
        }

        .product-float-shadow {
          position: absolute;
          bottom: 34px;
          width: 120px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(0,0,0,0.34) 0%,
            rgba(0,0,0,0.06) 70%,
            transparent 100%
          );
          animation: productShadowFloat 5.6s ease-in-out infinite;
          transform-origin: center;
          will-change: transform, opacity;
        }

        .product-float-image {
          position: relative;
          z-index: 2;
          width: auto;
          max-width: 82%;
          max-height: 195px;
          object-fit: contain;
          filter: drop-shadow(0 16px 22px rgba(0,0,0,0.2));
          transform: translate3d(0, 0, 0);
          transition:
            transform 220ms ease,
            filter 220ms ease;
        }

        .product-float-card:hover .product-float-image {
          transform: translate3d(0, -4px, 0) scale(1.025);
          filter: drop-shadow(0 20px 28px rgba(0,0,0,0.26));
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
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
          box-shadow: 0 12px 28px rgba(79, 201, 245, 0.16);
        }

        .product-float-button:hover {
          transform: translate3d(0, -1px, 0);
          box-shadow: 0 15px 30px rgba(79, 201, 245, 0.22);
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
          transition: transform 180ms ease;
        }

        .product-float-button:hover .product-float-arrow {
          transform: translate3d(2px, 0, 0);
        }

        @media (max-width: 768px) {
          .product-float-card {
            border-radius: 20px;
            content-visibility: visible;
            contain-intrinsic-size: auto;
          }

          .product-float-card:hover {
            transform: none;
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

          .product-stock-badge {
            right: 10px;
            top: 48px;
            min-height: 23px;
            padding: 0 8px;
            font-size: 7px;
            letter-spacing: 0.1em;
          }

          .product-bundle-select {
            left: 10px;
            top: 42px;
            min-height: 24px;
            padding: 0 8px;
            font-size: 7px;
            letter-spacing: 0.1em;
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
            --product-float-lift: -5px;
          }

          .product-float-image {
            max-height: 122px;
            max-width: 78%;
            filter: drop-shadow(0 12px 18px rgba(0,0,0,0.2));
          }

          .product-float-card:hover .product-float-image {
            transform: none;
            filter: drop-shadow(0 12px 18px rgba(0,0,0,0.2));
          }

          .product-float-shadow {
            bottom: 26px;
            width: 88px;
            height: 18px;
          }

          .visual-grid {
            background-size: 32px 32px;
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
          .product-float-card,
          .product-float-image,
          .product-float-image-wrap,
          .product-float-shadow,
          .visual-glow,
          .product-float-eye,
          .product-bundle-select,
          .product-float-button,
          .product-float-arrow {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
