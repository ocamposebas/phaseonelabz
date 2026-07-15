import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Search, ShoppingCart, User, X, LogOut } from "lucide-react";
import { useCart } from "../cart/CartContext";

const navItems = [
  { label: "Shop", href: "/shop" },
  { label: "COA", href: "/coa" },
  { label: "Restock Status", href: "/restock-status" },
  { label: "Military Discount", href: "/military-discount" },
];

const announcementItems = [
  "Research Peptides Available",
  "Free Shipping Over $100",
  "No Extra Card Fees",
  "Verified COAs & Seamless Experience",
];

const PRODUCTS_ENDPOINT =
  import.meta.env.PUBLIC_PRODUCT_SEARCH_API_URL || "/api/products";

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9.%+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProductsFromPayload(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;

  return [];
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

function getProductUrl(product) {
  const cleanSlug = String(product?.slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (cleanSlug) {
    return `/product/${cleanSlug}`;
  }

  const possibleUrl = product?.permalink || product?.url || product?.link || "";

  if (possibleUrl) {
    try {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://phaseonelabz.com";

      const parsedUrl = new URL(possibleUrl, baseUrl);

      const pathParts = parsedUrl.pathname
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean);

      const productIndex = pathParts.findIndex(
        (part) => part === "product" || part === "products"
      );

      if (productIndex >= 0 && pathParts[productIndex + 1]) {
        return `/product/${pathParts[productIndex + 1]}`;
      }

      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart) {
        return `/product/${lastPart}`;
      }
    } catch {
      // Fallback below.
    }
  }

  if (product?.id) {
    return `/product/${product.id}`;
  }

  return "/shop";
}

function getProductPrice(product) {
  const rawPrice =
    product?.price ||
    product?.regular_price ||
    product?.sale_price ||
    product?.price_html ||
    "";

  if (!rawPrice) return "";

  if (typeof rawPrice === "number") {
    return `$${rawPrice.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }

  if (String(rawPrice).includes("$")) return String(rawPrice);

  const parsed = String(rawPrice).replace(/[^0-9.]/g, "");

  if (!parsed) return "";

  return `$${Number(parsed).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function getAccountStoreCredit(account) {
  return Number(
    account?.store_credit || account?.storeCredit || account?.credit || 0
  );
}

function formatStoreCredit(value) {
  const number = Number(value || 0);

  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function getProductCategory(product) {
  if (product?.category) return product.category;

  if (Array.isArray(product?.categories) && product.categories.length > 0) {
    const firstCategory = product.categories[0];

    return typeof firstCategory === "string"
      ? firstCategory
      : firstCategory?.name || "Research product";
  }

  return "Research product";
}

function getSearchableProductText(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories
        .map((category) =>
          typeof category === "string" ? category : category?.name
        )
        .filter(Boolean)
    : [];

  const tags = Array.isArray(product?.tags)
    ? product.tags
        .map((tag) => (typeof tag === "string" ? tag : tag?.name))
        .filter(Boolean)
    : [];

  return normalizeSearchText(
    [
      product?.name,
      product?.title,
      product?.slug,
      product?.sku,
      product?.category,
      product?.short_description,
      product?.description,
      ...categories,
      ...tags,
    ].join(" ")
  );
}

function VialIcon() {
  return (
    <span className="sh-vial" aria-hidden="true">
      <svg viewBox="0 0 18 24" fill="none">
        <path
          d="M6.4 2.5h5.2"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M7 3.7h4v2.8c0 .48.18.94.52 1.28l1.5 1.52c.5.5.78 1.18.78 1.9v7.45c0 1.2-.97 2.17-2.17 2.17H6.37c-1.2 0-2.17-.97-2.17-2.17V11.2c0-.72.28-1.4.78-1.9l1.5-1.52C6.82 7.44 7 6.98 7 6.5V3.7Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M5.45 15.25h7.1v3.28c0 .62-.5 1.12-1.12 1.12H6.57c-.62 0-1.12-.5-1.12-1.12v-3.28Z"
          fill="currentColor"
          opacity="0.22"
        />
      </svg>
    </span>
  );
}

function AnnouncementGroup() {
  return (
    <div className="sh-announcement-group">
      {announcementItems.map((item, index) => (
        <div className="sh-announcement-item" key={`${item}-${index}`}>
          <span>{item}</span>
          <VialIcon />
        </div>
      ))}
    </div>
  );
}

function AnnouncementLoop() {
  return (
    <div className="sh-announcement-track">
      <AnnouncementGroup />
      <AnnouncementGroup />
      <AnnouncementGroup />
      <AnnouncementGroup />
    </div>
  );
}

export default function SiteHeader({
  logoSrc = "/TRANSPARENCIA-03.png",
  logoAlt = "Research Lab Logo",
  isHome = false,
}) {
  const [mode, setMode] = useState("top");
  const [isHomePage, setIsHomePage] = useState(Boolean(isHome));
  const [currentPath, setCurrentPath] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastY = useRef(0);

  const { cartItems, setIsCartOpen } = useCart();

  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const safeCartCount = mounted ? cartCount : 0;
  const cleanSearchQuery = searchQuery.trim();

  const searchHref = useMemo(() => {
    if (!cleanSearchQuery) return "/shop";
    return `/shop?search=${encodeURIComponent(cleanSearchQuery)}`;
  }, [cleanSearchQuery]);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const pathname = window.location.pathname || "/";
      setIsHomePage(pathname === "/");
      setCurrentPath(pathname);
    }
  }, []);

  useEffect(() => {
    if (!searchExpanded) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [searchExpanded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchWrapRef.current) return;

      if (!searchWrapRef.current.contains(event.target)) {
        setSearchExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSearchExpanded(false);
        setSearchQuery("");
        setSearchResults([]);
        setSearchError("");
        setSearchLoading(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchExpanded && !mobileOpen) return;
    if (productsLoaded) return;

    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        setSearchLoading(true);
        setSearchError("");

        const response = await fetch(PRODUCTS_ENDPOINT, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Products request failed: ${response.status}`);
        }

        const data = await response.json();
        const products = extractProductsFromPayload(data);

        setAllProducts(products);
        setProductsLoaded(true);
      } catch (error) {
        if (error.name === "AbortError") return;

        setAllProducts([]);
        setSearchError("Search is unavailable right now.");
      } finally {
        setSearchLoading(false);
      }
    };

    loadProducts();

    return () => controller.abort();
  }, [searchExpanded, mobileOpen, productsLoaded]);

  useEffect(() => {
    if (cleanSearchQuery.length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    if (!productsLoaded) return;

    const cleanQuery = normalizeSearchText(cleanSearchQuery);
    const queryTerms = cleanQuery.split(" ").filter(Boolean);

    const results = allProducts
      .map((product) => {
        const searchable = getSearchableProductText(product);
        const productName = normalizeSearchText(product?.name || product?.title);
        const productSku = normalizeSearchText(product?.sku);
        const productSlug = normalizeSearchText(product?.slug);

        let score = 0;

        if (productName === cleanQuery) score += 100;
        if (productName.startsWith(cleanQuery)) score += 75;
        if (productName.includes(cleanQuery)) score += 55;
        if (productSku === cleanQuery) score += 85;
        if (productSlug.includes(cleanQuery)) score += 35;
        if (searchable.includes(cleanQuery)) score += 25;

        queryTerms.forEach((term) => {
          if (productName.includes(term)) score += 15;
          if (searchable.includes(term)) score += 8;
        });

        return {
          product,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
      .slice(0, 6);

    setSearchResults(results);
  }, [cleanSearchQuery, allProducts, productsLoaded]);

  useEffect(() => {
    const checkAccount = async () => {
      try {
        const response = await fetch(`/api/account?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          setAccount(null);
          setAuthChecked(true);
          return;
        }

        const data = await response.json();

        setAccount(data);
        setAuthChecked(true);
      } catch {
        setAccount(null);
        setAuthChecked(true);
      }
    };

    checkAccount();

    const handleAuthUpdate = () => checkAccount();

    window.addEventListener("focus", handleAuthUpdate);
    window.addEventListener("lab-auth-updated", handleAuthUpdate);

    return () => {
      window.removeEventListener("focus", handleAuthUpdate);
      window.removeEventListener("lab-auth-updated", handleAuthUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    let activeMode = "top";

    const updateMode = () => {
      const currentY = Math.max(window.scrollY || 0, 0);
      const nextMode = currentY <= 28 ? "top" : "compact";

      if (activeMode !== nextMode) {
        activeMode = nextMode;
        setMode(nextMode);
      }

      lastY.current = currentY;
      rafId = 0;
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateMode);
    };

    updateMode();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.classList.add("sh-menu-lock");
      document.body.classList.add("sh-menu-lock");
    } else {
      document.documentElement.classList.remove("sh-menu-lock");
      document.body.classList.remove("sh-menu-lock");
    }

    return () => {
      document.documentElement.classList.remove("sh-menu-lock");
      document.body.classList.remove("sh-menu-lock");
    };
  }, [mobileOpen]);

  const isTop = mode === "top";
  const isHidden = mode === "hidden" && !mobileOpen;

  /*
    Nav behavior:
    - At the very top, the nav stays transparent on every page.
    - When scrolling, searching, or opening the mobile menu, it becomes solid.

    Announcement:
    - visible at top on ALL pages
    - hidden when scrolling down / compact / hidden
  */
  const showGlass = !isTop || mobileOpen || searchExpanded;

  const isLoggedIn = Boolean(account);
  const storeCreditBalance = getAccountStoreCredit(account);

  const openCart = () => {
    setIsCartOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
    searchInputRef.current?.focus();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setAccount(null);
    setMobileOpen(false);

    window.dispatchEvent(new Event("lab-auth-updated"));

    if (window.location.pathname === "/account") {
      window.location.reload();
    }
  };

  return (
    <>
      <header
        className={`sh-header ${
          isHomePage ? "sh-header-home" : "sh-header-inner"
        } ${isHidden ? "sh-header-hidden" : ""}`}
      >
        <div className="sh-shell">
          <div
            className={`sh-announcement ${
              isTop ? "is-visible" : "is-hidden"
            }`}
          >
            <div className="sh-announcement-fade sh-announcement-fade-left" />
            <div className="sh-announcement-fade sh-announcement-fade-right" />

            <div className="sh-announcement-inner">
              <AnnouncementLoop />
            </div>
          </div>

          <div
            className={`sh-nav-card ${
              showGlass ? "sh-nav-glass" : "sh-nav-clear"
            } ${isTop ? "sh-nav-top" : "sh-nav-compact"}`}
          >
            <nav className="sh-nav">
              <button
                type="button"
                className="sh-mobile-toggle"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={27} />
              </button>

              <a href="/" className="sh-logo" aria-label="Home">
                <img src={logoSrc} alt={logoAlt} />
              </a>

              <div className="sh-links">
                {navItems.map((item) => {
                  const isActive =
                    currentPath === item.href ||
                    (item.href !== "/" &&
                      currentPath.startsWith(item.href + "/"));

                  return (
                    <a
                      href={item.href}
                      className={`sh-link ${isActive ? "is-active" : ""}`}
                      key={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>

              <div className="sh-actions">
                <div
                  ref={searchWrapRef}
                  className={`sh-inline-search ${
                    searchExpanded ? "is-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    aria-label="Search products"
                    className="sh-inline-search-trigger"
                    onClick={() => setSearchExpanded(true)}
                  >
                    <Search size={22} />
                  </button>

                  <form
                    className="sh-inline-search-form"
                    onSubmit={(event) => {
                      event.preventDefault();

                      if (cleanSearchQuery) {
                        window.location.href = searchHref;
                      }
                    }}
                  >
                    <Search size={16} />

                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setSearchExpanded(true);
                      }}
                      type="text"
                      placeholder="Search products..."
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={clearSearch}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </form>

                  {searchExpanded && cleanSearchQuery.length >= 2 && (
                    <div className="sh-inline-results">
                      {searchLoading && !productsLoaded ? (
                        <div className="sh-inline-empty">
                          Loading product catalog...
                        </div>
                      ) : searchError ? (
                        <div className="sh-inline-empty">{searchError}</div>
                      ) : searchResults.length === 0 ? (
                        <div className="sh-inline-empty">
                          No products found for “{cleanSearchQuery}”.
                        </div>
                      ) : (
                        <>
                          <div className="sh-inline-results-list">
                            {searchResults.map((product) => {
                              const productName =
                                product?.name || product?.title || "Product";
                              const productUrl = getProductUrl(product);
                              const productImage = getProductImage(product);
                              const productPrice = getProductPrice(product);
                              const category = getProductCategory(product);

                              return (
                                <a
                                  href={productUrl}
                                  key={product?.id || productUrl}
                                  className="sh-inline-result"
                                  onClick={() => setSearchExpanded(false)}
                                >
                                  <span className="sh-inline-result-image">
                                    <img src={productImage} alt={productName} />
                                  </span>

                                  <span className="sh-inline-result-copy">
                                    <strong>{productName}</strong>
                                    <small>{category}</small>
                                  </span>

                                  <span className="sh-inline-result-price">
                                    {productPrice || "View"}
                                  </span>
                                </a>
                              );
                            })}
                          </div>

                          <a
                            href={searchHref}
                            className="sh-inline-view-all"
                            onClick={() => setSearchExpanded(false)}
                          >
                            View all results →
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="sh-user-menu">
                  <a
                    href="/account"
                    aria-label="Account"
                    className="sh-icon sh-user-icon"
                  >
                    <User size={24} />
                  </a>

                  <div className="sh-user-dropdown">
                    <div className="sh-user-dropdown-head">
                      <p>{isLoggedIn ? "Account Active" : "Client Portal"}</p>

                      <span>
                        {isLoggedIn ? (
                          <>
                            Signed in as {account?.name || "customer"}.
                            <strong className="sh-user-balance">
                              Store balance:{" "}
                              {formatStoreCredit(storeCreditBalance)}
                            </strong>
                          </>
                        ) : (
                          "Access your rewards, points, and recent orders."
                        )}
                      </span>
                    </div>

                    {!authChecked ? (
                      <div className="sh-user-dropdown-loading">
                        Checking session...
                      </div>
                    ) : isLoggedIn ? (
                      <>
                        <a href="/account" className="sh-user-dropdown-link">
                          <User size={16} />
                          View profile 
                       </a>

                        <button
                          type="button"
                          className="sh-user-dropdown-link sh-user-dropdown-button"
                          onClick={handleLogout}
                        >
                          <LogOut size={16} />
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <a href="/account" className="sh-user-dropdown-link">
                          <User size={16} />
                          Login
                        </a>

                        <a href="/register" className="sh-user-dropdown-link">
                          <span className="sh-user-dot" />
                          Register
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Open cart"
                  className="sh-icon sh-cart"
                  onClick={openCart}
                >
                  <ShoppingCart size={25} />
                  <span suppressHydrationWarning>{safeCartCount}</span>
                </button>
              </div>

              <button
                type="button"
                aria-label="Open cart"
                className="sh-mobile-cart"
                onClick={openCart}
              >
                <ShoppingCart size={24} />
                <span suppressHydrationWarning>{safeCartCount}</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="sh-mobile-overlay">
          <button
            type="button"
            className="sh-mobile-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />

          <aside className="sh-mobile-panel">
            <div className="sh-mobile-glow" />

            <div className="sh-mobile-top">
              <a href="/" onClick={() => setMobileOpen(false)}>
                <img src={logoSrc} alt={logoAlt} />
              </a>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="sh-mobile-close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="sh-mobile-label">
              <span />
              Menu
            </div>

            <div className="sh-mobile-links">
              {navItems.map((item, index) => {
                const isActive =
                  currentPath === item.href ||
                  (item.href !== "/" &&
                    currentPath.startsWith(item.href + "/"));

                return (
                  <a
                    href={item.href}
                    key={item.label}
                    className={isActive ? "is-active" : ""}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    style={{ "--delay": `${index * 45}ms` }}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </a>
                );
              })}

              {isLoggedIn ? (
                <>
                  <a
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    style={{ "--delay": "210ms" }}
                  >
                    <span>05</span>
                    View profile
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ "--delay": "255ms" }}
                  >
                    <span>06</span>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    style={{ "--delay": "210ms" }}
                  >
                    <span>05</span>
                    Login
                  </a>

                  <a
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    style={{ "--delay": "255ms" }}
                  >
                    <span>06</span>
                    Sign up
                  </a>
                </>
              )}
            </div>

            <div className="sh-mobile-search">
              <div className="sh-mobile-search-box">
                <Search size={16} />

                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchExpanded(true);
                  }}
                  type="text"
                  placeholder="Search products..."
                />

                {searchQuery && (
                  <button type="button" onClick={clearSearch} aria-label="Clear">
                    <X size={13} />
                  </button>
                )}
              </div>

              {searchQuery.trim().length >= 2 && (
                <div className="sh-mobile-search-results">
                  {searchLoading && !productsLoaded ? (
                    <p>Loading products...</p>
                  ) : searchError ? (
                    <p>{searchError}</p>
                  ) : searchResults.length === 0 ? (
                    <p>No products found.</p>
                  ) : (
                    searchResults.slice(0, 4).map((product) => {
                      const productName =
                        product?.name || product?.title || "Product";
                      const productUrl = getProductUrl(product);
                      const productImage = getProductImage(product);

                      return (
                        <a
                          href={productUrl}
                          key={product?.id || productUrl}
                          onClick={() => {
                            setMobileOpen(false);
                            setSearchExpanded(false);
                          }}
                        >
                          <img src={productImage} alt={productName} />
                          <span>{productName}</span>
                        </a>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="sh-mobile-note">
              <p>{isLoggedIn ? "Account Active" : "Grand Opening"}</p>
              <span>
                {isLoggedIn
                  ? `${account?.points || 0} reward points · ${formatStoreCredit(
                      storeCreditBalance
                    )} store balance.`
                  : "Opening savings, free shipping over $50, and no extra card fees."}
              </span>
            </div>

            <div className="sh-mobile-bottom">
              <a href="/shop" onClick={() => setMobileOpen(false)}>
                <Search size={21} />
                Search
              </a>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setIsCartOpen(true);
                }}
              >
                <ShoppingCart size={22} />
                Cart
                {safeCartCount > 0 && (
                  <span suppressHydrationWarning>{safeCartCount}</span>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .sh-menu-lock {
          overflow: hidden !important;
        }

        .sh-header {
          --sh-surface: #050b18;
          --sh-surface-raised: #07111f;
          --sh-border: rgba(165, 243, 252, 0.11);
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 100;
          pointer-events: none;
          transform: translateY(0);
          opacity: 1;
          transition:
            transform 360ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 220ms ease;
          will-change: transform, opacity;
        }

        .sh-header-hidden {
          transform: translateY(-120%);
          opacity: 0;
        }

        .sh-shell {
          pointer-events: auto;
          padding: 0 12px;
        }

        .sh-announcement {
          position: relative;
          width: calc(100% + 24px);
          height: 38px;
          margin-left: -12px;
          overflow: hidden;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          transform: translate3d(0, 0, 0);
          transition:
            opacity 180ms ease,
            transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
            background 220ms ease,
            visibility 0s linear 0s;
          will-change: opacity, transform;
          contain: paint;
        }

        .sh-header-home .sh-announcement {
          background: var(--sh-surface);
        }

        .sh-header-inner .sh-announcement {
          background: var(--sh-surface);
        }

        .sh-announcement.is-visible {
          opacity: 1;
          visibility: visible;
          transform: translate3d(0, 0, 0);
        }

        .sh-announcement.is-hidden {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translate3d(0, -8px, 0);
          transition:
            opacity 150ms ease,
            transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
            visibility 0s linear 220ms;
        }

        .sh-announcement.is-hidden + .sh-nav-card {
          transform: translate3d(0, -38px, 0);
        }

        .sh-announcement-inner {
          position: relative;
          z-index: 1;
          display: flex;
          overflow: hidden;
          white-space: nowrap;
        }

        .sh-announcement-track {
          display: flex;
          width: max-content;
          animation: shAnnouncementMove 28s linear infinite;
          will-change: transform;
        }

        .sh-announcement-group {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .sh-announcement-item {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 9px 36px;
          flex-shrink: 0;
          font-family: "Orbitron", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(236, 254, 255, 0.86);
        }

        .sh-vial {
          display: inline-grid;
          width: 16px;
          height: 21px;
          place-items: center;
          color: rgba(103, 232, 249, 0.72);
          filter: drop-shadow(0 0 9px rgba(34, 211, 238, 0.25));
          flex-shrink: 0;
        }

        .sh-vial svg {
          width: 14px;
          height: 19px;
        }

        .sh-announcement-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 3;
          width: 110px;
          pointer-events: none;
        }

        .sh-announcement-fade-left {
          left: 0;
          background: linear-gradient(
            90deg,
            var(--sh-surface),
            rgba(5, 11, 24, 0)
          );
        }

        .sh-announcement-fade-right {
          right: 0;
          background: linear-gradient(
            270deg,
            var(--sh-surface),
            rgba(5, 11, 24, 0)
          );
        }

        @keyframes shAnnouncementMove {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-25%);
          }
        }

        .sh-nav-card {
          max-width: 1340px;
          margin-inline: auto;
          border-radius: 20px;
          overflow: visible;
          transform: translate3d(0, 0, 0);
          transition:
            transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
            margin-top 260ms ease,
            background 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease,
            backdrop-filter 220ms ease;
          will-change: transform;
        }

        .sh-nav-top,
        .sh-nav-compact {
          margin-top: 4px;
        }

        .sh-header-home .sh-nav-clear {
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .sh-header-inner .sh-nav-clear {
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .sh-nav-glass {
          border: 1px solid var(--sh-border);
          background: rgba(5, 11, 24, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025),
            0 14px 48px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .sh-nav {
          display: flex;
          height: 76px;
          align-items: center;
          justify-content: space-between;
          padding: 0 22px;
        }

        .sh-logo {
          display: flex;
          min-width: 150px;
          align-items: center;
        }

        .sh-logo img {
          width: auto;
          max-width: 164px;
          max-height: 50px;
          object-fit: contain;
          transition: transform 280ms ease;
        }

        .sh-logo:hover img {
          transform: scale(1.03);
        }

        .sh-links {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .sh-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 15px;
          font-weight: 850;
          letter-spacing: 0.055em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.76);
          transition: color 220ms ease;
        }

        .sh-link:hover {
          color: white;
        }

        .sh-link.is-active {
          color: #ecfeff;
        }

        .sh-link::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          border: 1px solid transparent;
          background: transparent;
          opacity: 0;
          transform: scale(0.92);
          transition:
            opacity 260ms ease,
            transform 260ms ease,
            background 260ms ease,
            border-color 260ms ease;
        }

        .sh-link:hover::before {
          opacity: 1;
          transform: scale(1);
          border-color: rgba(165, 243, 252, 0.1);
          background: rgba(34, 211, 238, 0.055);
        }

        .sh-link.is-active::before {
          opacity: 1;
          transform: scale(1);
          border-color: rgba(165, 243, 252, 0.14);
          background: rgba(103, 232, 249, 0.075);
        }

        .sh-link::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          height: 2px;
          width: 0;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgb(103, 232, 249);
          transition: width 260ms ease;
        }

        .sh-link:hover::after {
          width: 32px;
        }

        .sh-link.is-active::after {
          width: 24px;
        }

        .sh-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .sh-icon,
        .sh-mobile-toggle,
        .sh-mobile-cart {
          position: relative;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          padding: 0;
          color: rgba(255, 255, 255, 0.78);
          cursor: pointer;
          transition: color 240ms ease, transform 240ms ease;
        }

        .sh-icon {
          display: inline-flex;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(165, 243, 252, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
        }

        .sh-mobile-toggle,
        .sh-mobile-cart {
          display: none;
        }

        .sh-icon:hover,
        .sh-mobile-toggle:hover,
        .sh-mobile-cart:hover {
          color: rgb(165, 243, 252);
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.18);
          background: rgba(103, 232, 249, 0.055);
        }

        .sh-cart span,
        .sh-mobile-cart span {
          position: absolute;
          top: -6px;
          right: -6px;
          display: grid;
          min-width: 17px;
          height: 17px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding-inline: 5px;
          font-size: 9px;
          font-weight: 900;
          color: rgb(2, 6, 23);
          box-shadow: 0 0 18px rgba(103, 232, 249, 0.45);
        }

        .sh-user-menu {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .sh-user-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 278px;
          padding: 8px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 24px;
          background: linear-gradient(
            145deg,
            rgba(7, 22, 34, 0.98),
            rgba(3, 10, 18, 0.96),
            rgba(8, 28, 42, 0.96)
          );
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px) scale(0.98);
          transition:
            opacity 220ms ease,
            visibility 220ms ease,
            transform 220ms ease;
        }

        .sh-user-menu:hover .sh-user-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .sh-user-dropdown::before {
          content: "";
          position: absolute;
          top: -10px;
          right: 22px;
          width: 18px;
          height: 18px;
          border-left: 1px solid rgba(165, 243, 252, 0.1);
          border-top: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(7, 22, 34, 0.98);
          transform: rotate(45deg);
        }

        .sh-user-dropdown-head {
          position: relative;
          z-index: 1;
          padding: 13px 15px 12px;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
        }

        .sh-user-dropdown-head p {
          margin: 0;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-user-dropdown-head span {
          display: block;
          margin-top: 7px;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.52);
        }

        .sh-user-balance {
          display: block;
          margin-top: 8px;
          color: rgb(165, 243, 252);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sh-user-dropdown-loading,
        .sh-user-dropdown-link {
          position: relative;
          z-index: 1;
          margin-top: 6px;
          border-radius: 17px;
          padding: 13px 15px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.58);
        }

        .sh-user-dropdown-link {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          border: 0;
          background: transparent;
          text-align: left;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.86);
          cursor: pointer;
          transition:
            background 220ms ease,
            color 220ms ease,
            transform 220ms ease;
        }

        .sh-user-dropdown-link:hover {
          background: rgba(34, 211, 238, 0.07);
          color: white;
          transform: translateX(2px);
        }

        .sh-user-dropdown-link svg {
          color: rgb(165, 243, 252);
        }

        .sh-user-dropdown-button {
          font-family: inherit;
        }

        .sh-user-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 16px rgba(103, 232, 249, 0.45);
        }

        .sh-inline-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sh-inline-search-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(165, 243, 252, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
          padding: 0;
          color: rgba(255, 255, 255, 0.78);
          cursor: pointer;
          transition:
            color 240ms ease,
            transform 240ms ease,
            opacity 200ms ease;
        }

        .sh-inline-search-trigger:hover {
          color: rgb(165, 243, 252);
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.18);
          background: rgba(103, 232, 249, 0.055);
        }

        .sh-inline-search.is-open .sh-inline-search-trigger {
          opacity: 0;
          pointer-events: none;
          width: 0;
          height: 0;
          overflow: hidden;
          border: 0;
        }

        .sh-inline-search-form {
          display: grid;
          grid-template-columns: 16px 0fr auto;
          align-items: center;
          gap: 8px;
          width: 0;
          min-height: 42px;
          overflow: hidden;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          padding: 0;
          opacity: 0;
          transition:
            width 260ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms ease,
            border-color 220ms ease,
            background 220ms ease,
            padding 220ms ease;
        }

        .sh-inline-search.is-open .sh-inline-search-form {
          grid-template-columns: 16px 1fr auto;
          width: 300px;
          border-color: rgba(165, 243, 252, 0.13);
          background: rgba(2, 6, 23, 0.5);
          padding: 0 11px;
          opacity: 1;
        }

        .sh-inline-search-form svg {
          color: rgba(165, 243, 252, 0.68);
        }

        .sh-inline-search-form input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 13px;
          font-weight: 700;
        }

        .sh-inline-search-form input::placeholder {
          color: rgba(148, 163, 184, 0.48);
        }

        .sh-inline-search-form button {
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
        }

        .sh-inline-results {
          position: absolute;
          top: calc(100% + 16px);
          right: 0;
          width: min(430px, 92vw);
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 24px;
          background:
            linear-gradient(145deg, rgba(8, 28, 42, 0.98), rgba(2, 6, 23, 0.98)),
            #061522;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
          padding: 8px;
          animation: shInlineSearchIn 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sh-inline-empty {
          padding: 18px;
          text-align: center;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(148, 163, 184, 0.72);
        }

        .sh-inline-results-list {
          display: grid;
          gap: 6px;
        }

        .sh-inline-result {
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: center;
          gap: 11px;
          border: 1px solid rgba(165, 243, 252, 0.08);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.022);
          padding: 8px;
          transition:
            border-color 220ms ease,
            background 220ms ease,
            transform 220ms ease;
        }

        .sh-inline-result:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.2);
          background: rgba(103, 232, 249, 0.055);
        }

        .sh-inline-result-image {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          overflow: hidden;
          border-radius: 14px;
          background:
            radial-gradient(circle at 50% 35%, rgba(103, 232, 249, 0.16), transparent 55%),
            rgba(2, 6, 23, 0.7);
        }

        .sh-inline-result-image img {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .sh-inline-result-copy {
          min-width: 0;
        }

        .sh-inline-result-copy strong {
          display: block;
          overflow: hidden;
          color: white;
          font-size: 13px;
          font-weight: 850;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-inline-result-copy small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: rgba(148, 163, 184, 0.72);
          font-size: 10.5px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-inline-result-price {
          font-size: 12px;
          font-weight: 900;
          color: rgb(165, 243, 252);
        }

        .sh-inline-view-all {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          margin-top: 7px;
          border-radius: 16px;
          background: rgb(103, 232, 249);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgb(2, 6, 23);
        }

        .sh-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          pointer-events: auto;
          overflow: hidden;
        }

        .sh-mobile-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background:
            radial-gradient(circle at 15% 10%, rgba(103, 232, 249, 0.09), transparent 28%),
            rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: shFadeIn 260ms ease forwards;
          cursor: pointer;
        }

        .sh-mobile-panel {
          position: relative;
          display: flex;
          height: 100%;
          width: min(88%, 410px);
          flex-direction: column;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          border-right: 1px solid rgba(165, 243, 252, 0.13);
          background: var(--sh-surface, #050b18);
          padding: max(20px, env(safe-area-inset-top)) 20px
            max(20px, env(safe-area-inset-bottom));
          box-shadow: 24px 0 100px rgba(0, 0, 0, 0.56);
          animation: shPanelIn 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sh-mobile-glow {
          position: absolute;
          top: -120px;
          left: -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.1);
          filter: blur(90px);
          pointer-events: none;
        }

        .sh-mobile-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sh-mobile-top img {
          max-width: 150px;
          max-height: 50px;
          object-fit: contain;
        }

        .sh-mobile-close {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
          color: white;
          cursor: pointer;
          transition: background 240ms ease, color 240ms ease, transform 240ms ease;
        }

        .sh-mobile-close:hover {
          background: rgba(103, 232, 249, 0.1);
          color: rgb(165, 243, 252);
          transform: rotate(4deg);
        }

        .sh-mobile-label {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.56);
        }

        .sh-mobile-label span {
          display: block;
          width: 28px;
          height: 1px;
          background: rgba(103, 232, 249, 0.72);
        }

        .sh-mobile-links {
          position: relative;
          z-index: 1;
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sh-mobile-links a,
        .sh-mobile-links button {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.032);
          padding: 16px 18px;
          text-align: left;
          font-family: inherit;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.045em;
          text-transform: uppercase;
          color: white;
          cursor: pointer;
          opacity: 0;
          transform: translateX(-14px);
          animation: shMobileItemIn 460ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: var(--delay, 0ms);
          transition:
            border-color 240ms ease,
            background 240ms ease,
            transform 240ms ease;
        }

        .sh-mobile-links a:hover,
        .sh-mobile-links button:hover {
          border-color: rgba(103, 232, 249, 0.24);
          background: rgba(103, 232, 249, 0.075);
          transform: translateX(4px);
        }

        .sh-mobile-links a.is-active {
          border-color: rgba(103, 232, 249, 0.28);
          background: rgba(103, 232, 249, 0.09);
          color: #ecfeff;
        }

        .sh-mobile-links span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: rgba(165, 243, 252, 0.58);
        }

        .sh-mobile-search {
          position: relative;
          z-index: 1;
          margin-top: 18px;
        }

        .sh-mobile-search-box {
          display: grid;
          grid-template-columns: 18px 1fr auto;
          align-items: center;
          gap: 10px;
          min-height: 50px;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          padding: 0 14px;
        }

        .sh-mobile-search-box svg {
          color: rgba(165, 243, 252, 0.7);
        }

        .sh-mobile-search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 13px;
          font-weight: 700;
        }

        .sh-mobile-search-box input::placeholder {
          color: rgba(148, 163, 184, 0.48);
        }

        .sh-mobile-search-box button {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
        }

        .sh-mobile-search-results {
          display: grid;
          gap: 7px;
          margin-top: 10px;
          max-height: 210px;
          overflow-y: auto;
        }

        .sh-mobile-search-results p {
          margin: 0;
          border: 1px solid rgba(165, 243, 252, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.022);
          padding: 13px;
          text-align: center;
          font-size: 12px;
          color: rgba(148, 163, 184, 0.72);
        }

        .sh-mobile-search-results a {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(165, 243, 252, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.022);
          padding: 7px;
        }

        .sh-mobile-search-results img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.5);
        }

        .sh-mobile-search-results span {
          overflow: hidden;
          color: white;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-mobile-note {
          position: relative;
          z-index: 1;
          margin-top: 28px;
          border: 1px solid rgba(103, 232, 249, 0.16);
          border-radius: 26px;
          background: rgba(103, 232, 249, 0.055);
          padding: 18px;
        }

        .sh-mobile-note p {
          margin: 0;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-mobile-note span {
          display: block;
          margin-top: 9px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.62);
        }

        .sh-mobile-bottom {
          position: relative;
          z-index: 1;
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-top: 22px;
        }

        .sh-mobile-bottom a,
        .sh-mobile-bottom button {
          position: relative;
          display: flex;
          min-height: 54px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
          cursor: pointer;
        }

        .sh-mobile-bottom button span {
          display: grid;
          min-width: 18px;
          height: 18px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding-inline: 5px;
          font-size: 9px;
          font-weight: 900;
          color: rgb(2, 6, 23);
        }

        @keyframes shFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes shPanelIn {
          from {
            opacity: 0;
            transform: translateX(-100%) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes shMobileItemIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shInlineSearchIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sh-header,
          .sh-announcement,
          .sh-announcement-track,
          .sh-nav-card,
          .sh-mobile-panel,
          .sh-mobile-backdrop,
          .sh-mobile-links a,
          .sh-mobile-links button,
          .sh-inline-results {
            animation: none !important;
            transition-duration: 1ms !important;
            scroll-behavior: auto !important;
          }
        }

        @media (max-width: 1024px) {
          .sh-links,
          .sh-actions {
            display: none;
          }

          .sh-mobile-toggle,
          .sh-mobile-cart {
            display: inline-flex;
            width: 40px;
            height: 40px;
            border: 1px solid rgba(165, 243, 252, 0.09);
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.025);
          }

          .sh-nav {
            display: grid;
            grid-template-columns: 44px 1fr 44px;
            height: 72px;
            align-items: center;
            padding-inline: 12px;
          }

          .sh-mobile-toggle {
            justify-self: start;
          }

          .sh-logo {
            min-width: 0;
            justify-self: center;
            justify-content: center;
          }

          .sh-logo img {
            max-width: 150px;
            max-height: 48px;
          }

          .sh-mobile-cart {
            justify-self: end;
          }

          .sh-mobile-cart span {
            top: -6px;
            right: -6px;
          }
        }

        @media (max-width: 768px) {
          .sh-shell {
            padding: 0 10px;
          }

          .sh-announcement {
            width: calc(100% + 20px);
            margin-left: -10px;
          }

          .sh-announcement-track {
            animation-duration: 22s;
          }

          .sh-announcement-item {
            gap: 12px;
            padding: 8px 22px;
            font-size: 8.5px;
            letter-spacing: 0.2em;
          }

          .sh-announcement-fade {
            width: 54px;
          }

          .sh-vial svg {
            width: 13px;
            height: 18px;
          }

          .sh-nav-card {
            border-radius: 17px;
          }

          .sh-nav {
            height: 70px;
          }

          .sh-logo img {
            max-width: 142px;
            max-height: 46px;
          }
        }

        @media (max-width: 420px) {
          .sh-mobile-panel {
            width: min(91%, 390px);
            padding: 18px;
          }

          .sh-logo img {
            max-width: 132px;
          }

          .sh-mobile-links a,
          .sh-mobile-links button {
            padding: 14px 16px;
            font-size: 15px;
          }
        }
      `}</style>
    </>
  );
}