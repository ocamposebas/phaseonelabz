import { useMemo, useState } from "react";
import { Search, Atom } from "lucide-react";
import { useCart } from "../cart/CartContext";

export default function ShopProductGrid({ products }) {
  const { addToCart } = useCart();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [focusFilter, setFocusFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("featured");

  const productTypes = [
    { label: "All", value: "all" },
    { label: "Vials", value: "vials" },
    { label: "Capsules", value: "capsules" },
    { label: "Liquids", value: "liquids" },
  ];

  const researchFocus = [
    { label: "All", value: "all" },
    { label: "Recovery", value: "recovery" },
    { label: "Longevity", value: "longevity" },
    { label: "Cognitive", value: "cognitive" },
    { label: "Metabolic", value: "metabolic" },
    { label: "Tissue Repair", value: "tissue-repair" },
    { label: "Immune", value: "immune" },
  ];

  const parsePrice = (price) => {
    if (price === null || price === undefined || price === "") return 0;

    return Number(
      String(price)
        .replace(/,/g, "")
        .replace("$", "")
        .trim()
    );
  };

  const formatPrice = (price) => {
    const cleanPrice = parsePrice(price);

    if (!cleanPrice) return "Request Price";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cleanPrice);
  };

  const getProductTerms = (product) => {
    const categories =
      product.categories?.map((cat) => cat.name || cat.slug) || [];

    const tags = product.tags?.map((tag) => tag.name || tag.slug) || [];

    const attributes =
      product.attributes?.flatMap((attr) => [
        attr.name,
        ...(attr.options || []),
      ]) || [];

    return [...categories, ...tags, ...attributes]
      .join(" ")
      .toLowerCase();
  };

  const matchesTerm = (product, term) => {
    if (term === "all") return true;

    const searchable = `${product.name || ""} ${getProductTerms(
      product
    )}`.toLowerCase();

    const aliases = {
      vials: ["vial", "vials", "bpc", "peptide"],
      capsules: ["capsule", "capsules", "caps"],
      liquids: ["liquid", "liquids", "drop", "solution"],

      recovery: ["recovery", "repair", "bpc", "tb", "growth"],
      longevity: ["longevity", "anti-aging", "age", "cellular"],
      cognitive: ["cognitive", "neuro", "brain", "focus"],
      metabolic: ["metabolic", "metabolism", "energy", "mitochondrial"],
      "tissue-repair": ["tissue", "repair", "regeneration", "bpc", "tb"],
      immune: ["immune", "inflammatory", "inflammation"],
    };

    return aliases[term]?.some((word) => searchable.includes(word)) || false;
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const search = query.toLowerCase();

      const matchesSearch = name.includes(search);
      const matchesType = matchesTerm(product, typeFilter);
      const matchesFocus = matchesTerm(product, focusFilter);

      return matchesSearch && matchesType && matchesFocus;
    });

    if (sortFilter === "price-low") {
      result = [...result].sort(
        (a, b) => parsePrice(a.price) - parsePrice(b.price)
      );
    }

    if (sortFilter === "price-high") {
      result = [...result].sort(
        (a, b) => parsePrice(b.price) - parsePrice(a.price)
      );
    }

    if (sortFilter === "az") {
      result = [...result].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    return result;
  }, [products, query, typeFilter, focusFilter, sortFilter]);

  const ProductCard = ({ product }) => {
    const image = product.images?.[0]?.src;
    const productUrl = `/products/${product.slug}`;
    const isInStock = product.stock_status === "instock";

    return (
      <article className="group relative w-full max-w-[275px] overflow-hidden border border-cyan-500/15 bg-[#040917]/85 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-400/45 hover:shadow-[0_0_42px_rgba(6,182,212,0.12)]">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[65px]" />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        </div>

        {/* Corners */}
        <span className="absolute top-0 left-0 z-20 h-3 w-3 border-l border-t border-cyan-400/60" />
        <span className="absolute top-0 right-0 z-20 h-3 w-3 border-r border-t border-cyan-400/60" />
        <span className="absolute bottom-0 left-0 z-20 h-3 w-3 border-l border-b border-cyan-400/60" />
        <span className="absolute bottom-0 right-0 z-20 h-3 w-3 border-r border-b border-cyan-400/60" />

        <a href={productUrl} className="relative z-10 block">
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#030712]">
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.13),transparent_55%)]" />
                <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:34px_34px]" />

                <div className="relative z-10 mx-auto mt-20 h-32 w-20 rounded-b-[1.4rem] rounded-t-xl border border-cyan-300/20 bg-gradient-to-r from-white/15 via-white/5 to-cyan-300/10 shadow-[0_0_45px_rgba(6,182,212,0.16)]">
                  <div className="absolute -top-7 left-1/2 h-9 w-20 -translate-x-1/2 rounded-t-xl rounded-b-md bg-gradient-to-r from-slate-500 via-white to-slate-600" />

                  <div className="absolute left-1/2 top-14 w-32 -translate-x-1/2 border border-cyan-300/20 bg-cyan-950/70 px-3 py-3 text-center backdrop-blur-md">
                    <p className="font-['Orbitron'] text-[11px] font-bold text-white">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[7px] uppercase tracking-[0.18em] text-cyan-300">
                      Research Use
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Stock Badge */}
            <div className="absolute top-3 right-3 z-20">
              <span
                className={`font-['Orbitron'] inline-flex items-center justify-center px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.18em] text-black shadow-[0_8px_22px_rgba(0,0,0,0.25)] ${
                  isInStock ? "bg-emerald-300" : "bg-red-400 text-white"
                }`}
              >
                {isInStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
          </div>
        </a>

        {/* Info */}
        <div className="relative z-10 p-4">
          <h3 className="font-['Orbitron'] text-base font-black uppercase tracking-tight text-white leading-tight">
            {product.name}
          </h3>

          <div className="mb-4 mt-4 border-t border-cyan-500/10 pt-3">
            <p className="text-[8px] uppercase tracking-[0.24em] text-slate-500">
              Starting at
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
              {formatPrice(product.price)}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5">
            {isInStock ? (
              <button
                type="button"
                onClick={() => addToCart(product)}
                className="font-['Orbitron'] inline-flex w-full items-center justify-center bg-cyan-400 px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_26px_rgba(6,182,212,0.32)]"
              >
                Add to Cart
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="font-['Orbitron'] inline-flex w-full items-center justify-center bg-white/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500"
              >
                Unavailable
              </button>
            )}

            <a
              href={productUrl}
              className="group/read relative inline-flex w-full items-center justify-center overflow-hidden border border-cyan-400/20 bg-cyan-400/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300 transition-all duration-300 hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white"
            >
              <span className="relative z-10">Read More</span>
              <span className="absolute left-0 top-0 h-full w-0 bg-cyan-400/10 transition-all duration-300 group-hover/read:w-full" />
              <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-cyan-300 transition-all duration-300 group-hover/read:w-3/4" />
            </a>
          </div>
        </div>
      </article>
    );
  };

  if (!products || products.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[#020617] text-white px-5 sm:px-6 lg:px-10 pt-[185px] pb-24 font-[inherit]">
        <div className="relative z-10 max-w-[1180px] mx-auto text-center">
          <p className="font-['Orbitron'] text-xs uppercase tracking-[0.35em] text-cyan-400/70">
            No products available
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-[#020617] text-white px-5 sm:px-6 lg:px-10 pt-[185px] pb-24 font-[inherit]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-blue-700/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_95%,rgba(6,182,212,0.018)_95%)] bg-[size:100%_32px]" />
      </div>

      <div className="relative z-10 max-w-[1180px] mx-auto">
        {/* Header */}
        <div className="text-center mb-9 md:mb-10">
          <p className="font-['Orbitron'] mb-3 text-[9px] md:text-[10px] uppercase tracking-[0.32em] text-cyan-400/80">
            Research Catalog
          </p>

          <h1 className="font-['Orbitron'] text-xl sm:text-2xl md:text-3xl font-semibold uppercase tracking-[0.12em] leading-[1.25] text-white">
            Shop Research
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-200 to-white">
              Peptides
            </span>
          </h1>
        </div>

        {/* Filters */}
        <div className="mb-12 rounded-none border border-cyan-400/15 bg-[#040917]/55 p-5 backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr_260px]">
            {/* Product Type */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Product Type
              </p>

              <div className="flex flex-wrap gap-2">
                {productTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTypeFilter(item.value)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                      typeFilter === item.value
                        ? "bg-cyan-400 text-black shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                        : "border border-cyan-400/15 bg-black/20 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Research Focus */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Research Focus
              </p>

              <div className="flex flex-wrap gap-2">
                {researchFocus.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFocusFilter(item.value)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                      focusFilter === item.value
                        ? "bg-cyan-400 text-black shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                        : "border border-cyan-400/15 bg-black/20 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Sort */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Product Filters
              </p>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400"
                />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full border border-cyan-400/15 bg-black/20 pl-9 pr-3 font-mono text-[11px] text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />
              </div>

              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
                className="h-10 w-full border border-cyan-400/15 bg-black/20 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-300 outline-none focus:border-cyan-400/40"
              >
                <option value="featured" className="bg-[#020617]">
                  Featured
                </option>
                <option value="price-low" className="bg-[#020617]">
                  Price Low to High
                </option>
                <option value="price-high" className="bg-[#020617]">
                  Price High to Low
                </option>
                <option value="az" className="bg-[#020617]">
                  A-Z
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-cyan-400/10 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span className="flex items-center gap-2">
              <Atom size={13} className="text-cyan-400" />
              {filteredProducts.length} result
              {filteredProducts.length !== 1 ? "s" : ""} detected
            </span>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setFocusFilter("all");
                setSortFilter("featured");
              }}
              className="text-cyan-400 hover:text-white transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Products */}
        {filteredProducts.length === 0 ? (
          <div className="mx-auto max-w-xl border border-cyan-400/15 bg-[#040917]/70 p-10 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              No matching products
            </p>
            <p className="mt-3 font-mono text-sm text-slate-500">
              Try another search or reset the filters.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}