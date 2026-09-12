import "./navbar.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Search, ShoppingCart, User, X, LogOut } from "lucide-react";
import { useCart } from "../cart/CartContext";
import { FREE_SHIPPING_MINIMUM } from "../data/storeConfig";
import { requestClientLogout } from "../../lib/authClient";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Catalog", href: "/shop" },
  { label: "COA", href: "/coa" },
  { label: "Track Order", href: "/track-order" },
  { label: "Restocks", href: "/restock-status" },
];

const announcementItems = [
  "For research use only",
  `Free shipping over $${FREE_SHIPPING_MINIMUM}`,
  "Independent batch documentation",
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
      product?.search_text,
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
  showCart = true,
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
          cache: "default",
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
    setAccount(null);
    setMobileOpen(false);

    try {
      await requestClientLogout();
    } finally {
      window.dispatchEvent(new Event("lab-auth-updated"));
      window.location.assign("/account");
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

                {showCart && <button
                  type="button"
                  aria-label="Open cart"
                  className="sh-icon sh-cart"
                  onClick={openCart}
                >
                  <ShoppingCart size={25} />
                  <span suppressHydrationWarning>{safeCartCount}</span>
                </button>}
              </div>

              {showCart && <button
                type="button"
                aria-label="Open cart"
                className="sh-mobile-cart"
                onClick={openCart}
              >
                <ShoppingCart size={24} />
                <span suppressHydrationWarning>{safeCartCount}</span>
              </button>}
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

              {showCart && <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="sh-mobile-close"
              >
                <X size={24} />
              </button>}
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
                  : `Opening savings, free shipping over $${FREE_SHIPPING_MINIMUM}, and no extra card fees.`}
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
    </>
  );
}
