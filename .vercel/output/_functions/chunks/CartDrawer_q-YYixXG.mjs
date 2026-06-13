import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { j as addAttribute, q as renderHead, p as renderComponent, s as renderSlot, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LockKeyhole, CheckCircle2, AlertTriangle, ShieldCheck, Menu, Search, X, User, LogOut, ShoppingCart, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';

function GlobalPreloader({
  logoSrc = "/TRANSPARENCIA-03.png",
  minDuration = 1150
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    document.documentElement.classList.add("phase-preloader-lock");
    document.body.classList.add("phase-preloader-lock");
    let mounted = true;
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return current;
        return current + Math.random() * 9;
      });
    }, 95);
    const finish = () => {
      setProgress(100);
      window.setTimeout(() => {
        if (!mounted) return;
        setVisible(false);
        document.documentElement.classList.remove("phase-preloader-lock");
        document.body.classList.remove("phase-preloader-lock");
      }, 450);
    };
    const minTimer = window.setTimeout(() => {
      if (document.readyState === "complete") {
        finish();
      } else {
        window.addEventListener("load", finish, { once: true });
      }
    }, minDuration);
    return () => {
      mounted = false;
      window.clearInterval(progressTimer);
      window.clearTimeout(minTimer);
      window.removeEventListener("load", finish);
      document.documentElement.classList.remove("phase-preloader-lock");
      document.body.classList.remove("phase-preloader-lock");
    };
  }, [minDuration]);
  return /* @__PURE__ */ jsx(AnimatePresence, { children: visible && /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: "phase-preloader",
      initial: { opacity: 1 },
      exit: {
        opacity: 0,
        y: -10,
        transition: {
          duration: 0.65,
          ease: [0.16, 1, 0.3, 1]
        }
      },
      children: [
        /* @__PURE__ */ jsx("div", { className: "phase-preloader__background" }),
        /* @__PURE__ */ jsx("div", { className: "phase-preloader__line phase-preloader__line--top" }),
        /* @__PURE__ */ jsx("div", { className: "phase-preloader__line phase-preloader__line--bottom" }),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            className: "phase-preloader__content",
            initial: { opacity: 0, y: 18 },
            animate: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.75,
                ease: [0.16, 1, 0.3, 1]
              }
            },
            children: [
              /* @__PURE__ */ jsx(
                motion.div,
                {
                  className: "phase-preloader__logoBlock",
                  initial: { opacity: 0, scale: 0.96 },
                  animate: {
                    opacity: 1,
                    scale: 1,
                    transition: {
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1]
                    }
                  },
                  children: /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: logoSrc,
                      alt: "Phase One Labz",
                      className: "phase-preloader__logo"
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxs(
                motion.div,
                {
                  className: "phase-preloader__brand",
                  initial: { opacity: 0, y: 8 },
                  animate: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: 0.16,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1]
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsx("p", { children: "Phase One Labz" }),
                    /* @__PURE__ */ jsx("span", { children: "Research Catalog" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                motion.div,
                {
                  className: "phase-preloader__progress",
                  initial: { opacity: 0, y: 8 },
                  animate: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: 0.26,
                      duration: 0.55,
                      ease: [0.16, 1, 0.3, 1]
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsx("div", { className: "phase-preloader__bar", children: /* @__PURE__ */ jsx(
                      motion.div,
                      {
                        className: "phase-preloader__barFill",
                        animate: { width: `${Math.min(progress, 100)}%` },
                        transition: { duration: 0.25, ease: "easeOut" }
                      }
                    ) }),
                    /* @__PURE__ */ jsxs("div", { className: "phase-preloader__meta", children: [
                      /* @__PURE__ */ jsx("span", { children: "Syncing availability" }),
                      /* @__PURE__ */ jsxs("span", { children: [
                        Math.min(Math.round(progress), 100),
                        "%"
                      ] })
                    ] })
                  ]
                }
              )
            ]
          }
        )
      ]
    }
  ) });
}

const AGE_GATE_KEY = "phase_age_verified";
const AGE_GATE_UNTIL_KEY = "phase_age_verified_until";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1e3;
const SESSION_MS = 12 * 60 * 60 * 1e3;
function hasValidAgeGate() {
  try {
    const verified = window.localStorage.getItem(AGE_GATE_KEY);
    const validUntil = Number(window.localStorage.getItem(AGE_GATE_UNTIL_KEY));
    if (verified !== "yes") return false;
    if (!validUntil || Number.isNaN(validUntil)) return false;
    return Date.now() < validUntil;
  } catch {
    return false;
  }
}
function AgeGate({
  logoSrc = "/TRANSPARENCIA-03.png",
  minAge = 21,
  /**
   * Where underage users are redirected.
   * You can change this to another safe external page if you want.
   */
  underAgeRedirectUrl = "https://www.google.com"
}) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [denied, setDenied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    const isVerified = hasValidAgeGate();
    if (!isVerified) {
      setVisible(true);
      document.documentElement.classList.add("phase-age-lock");
      document.body.classList.add("phase-age-lock");
    }
    setReady(true);
    return () => {
      document.documentElement.classList.remove("phase-age-lock");
      document.body.classList.remove("phase-age-lock");
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    const preventKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", preventKeys, true);
    return () => {
      window.removeEventListener("keydown", preventKeys, true);
    };
  }, [visible]);
  const handleEnter = () => {
    try {
      const expiresAt = remember ? Date.now() + THIRTY_DAYS_MS : Date.now() + SESSION_MS;
      window.localStorage.setItem(AGE_GATE_KEY, "yes");
      window.localStorage.setItem(AGE_GATE_UNTIL_KEY, String(expiresAt));
    } catch {
    }
    setVisible(false);
    document.documentElement.classList.remove("phase-age-lock");
    document.body.classList.remove("phase-age-lock");
  };
  const handleUnderAge = () => {
    setDenied(true);
    setRedirecting(true);
    try {
      window.localStorage.removeItem(AGE_GATE_KEY);
      window.localStorage.removeItem(AGE_GATE_UNTIL_KEY);
      window.sessionStorage.removeItem(AGE_GATE_KEY);
      window.sessionStorage.removeItem(AGE_GATE_UNTIL_KEY);
    } catch {
    }
    window.setTimeout(() => {
      window.location.replace(underAgeRedirectUrl);
    }, 900);
  };
  if (!ready || !visible) return null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "phase-age-gate",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "phase-age-title",
      children: [
        /* @__PURE__ */ jsx("div", { className: "phase-age-gate__ambient" }),
        /* @__PURE__ */ jsx("div", { className: "phase-age-gate__mesh" }),
        /* @__PURE__ */ jsx("div", { className: "phase-age-gate__scanline" }),
        /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__shell", children: [
          /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__brandRail", children: [
            /* @__PURE__ */ jsx("div", { className: "phase-age-gate__logoBox", children: /* @__PURE__ */ jsx("img", { src: logoSrc, alt: "Phase One Labz" }) }),
            /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__brandText", children: [
              /* @__PURE__ */ jsx("span", { children: "Phase One Labz" }),
              /* @__PURE__ */ jsx("strong", { children: "Restricted Access" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__panel", children: [
            /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__left", children: [
              /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__badge", children: [
                /* @__PURE__ */ jsx(LockKeyhole, { size: 13 }),
                "Verification checkpoint"
              ] }),
              /* @__PURE__ */ jsx("h1", { id: "phase-age-title", className: "phase-age-gate__title", children: "Research catalog access requires age confirmation." }),
              /* @__PURE__ */ jsxs("p", { className: "phase-age-gate__text", children: [
                "This site contains products intended strictly for laboratory and research use. Confirm you are ",
                minAge,
                "+ to continue."
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__checks", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(CheckCircle2, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { children: "Research-use-only catalog" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(CheckCircle2, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { children: "Age-restricted access" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(CheckCircle2, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { children: "Secure session preference" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__right", children: [
              /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__ageMark", children: [
                /* @__PURE__ */ jsx("span", { children: minAge }),
                /* @__PURE__ */ jsx("small", { children: "+" })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "phase-age-gate__confirm", children: "Confirm that you meet the legal age requirement to enter this website." }),
              denied && /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__denied", children: [
                /* @__PURE__ */ jsx(AlertTriangle, { size: 17 }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Access denied. You must be ",
                  minAge,
                  " or older to enter this site. Redirecting..."
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__actions", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: handleEnter,
                    disabled: redirecting,
                    className: "phase-age-gate__button phase-age-gate__button--primary",
                    children: [
                      "Confirm & enter",
                      /* @__PURE__ */ jsx("span", { children: "→" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: handleUnderAge,
                    disabled: redirecting,
                    className: "phase-age-gate__button phase-age-gate__button--secondary",
                    children: redirecting ? "Redirecting..." : `I am under ${minAge}`
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "phase-age-gate__remember", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: remember,
                    disabled: redirecting,
                    onChange: (event) => setRemember(event.target.checked)
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Remember this device for 30 days" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "phase-age-gate__footer", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { size: 15 }),
            /* @__PURE__ */ jsx("span", { children: "Access is required before viewing any page content. This screen cannot be dismissed without confirmation." })
          ] })
        ] })
      ]
    }
  );
}

const $$MainLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$MainLayout;
  const {
    title = "Research Peptides",
    description = "Premium research peptide catalog for educational and laboratory use."
  } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="description"${addAttribute(description, "content")}><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>${renderHead()}</head> <body> ${renderComponent($$result, "AgeGate", AgeGate, { "client:load": true, "logoSrc": "/TRANSPARENCIA-03.png", "underAgeRedirectUrl": "https://www.google.com", "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/age-gate/AgeGate.jsx", "client:component-export": "default" })} ${renderComponent($$result, "GlobalPreloader", GlobalPreloader, { "client:load": true, "logoSrc": "/TRANSPARENCIA-03.png", "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/loading/GlobalPreloader.jsx", "client:component-export": "default" })} ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/layouts/MainLayout.astro", void 0);

const CartContext = createContext();
function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("lab_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  useEffect(() => {
    localStorage.setItem("lab_cart", JSON.stringify(cartItems));
  }, [cartItems]);
  useEffect(() => {
    const WOO_URL = "https://labone.local/";
    if (typeof document === "undefined") return;
    const cleanUrl = WOO_URL.replace(/\/$/, "");
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = cleanUrl;
    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = cleanUrl;
    document.head.appendChild(preconnect);
    document.head.appendChild(dnsPrefetch);
    return () => {
      preconnect.remove();
      dnsPrefetch.remove();
    };
  }, []);
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map(
          (item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevItems,
        {
          ...product,
          quantity: 1
        }
      ];
    });
    setIsCartOpen(true);
  };
  const removeFromCart = (productId) => {
    setCartItems(
      (prevItems) => prevItems.filter((item) => item.id !== productId)
    );
  };
  const updateQuantity = (productId, amount) => {
    setCartItems(
      (prevItems) => prevItems.map((item) => {
        if (item.id === productId) {
          const newQty = item.quantity + amount;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("lab_cart");
  };
  const buildCheckoutUrl = () => {
    const WOO_URL = "https://labone.local/";
    const cleanUrl = WOO_URL.replace(/\/$/, "");
    const checkoutItems = cartItems.map((item) => `${item.id}:${item.quantity}`).join(",");
    return `${cleanUrl}/?lab_checkout=${encodeURIComponent(checkoutItems)}`;
  };
  const checkout = () => {
    if (checkoutLoading) return;
    if (!cartItems || cartItems.length === 0) {
      setIsCartOpen(true);
      return;
    }
    const checkoutUrl = buildCheckoutUrl();
    if (!checkoutUrl) {
      alert("Checkout is not configured yet.");
      return;
    }
    setCheckoutLoading(true);
    window.location.assign(checkoutUrl);
  };
  const cartTotal = cartItems.reduce(
    (total, item) => total + Number(item.price || 0) * item.quantity,
    0
  );
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  return /* @__PURE__ */ jsx(
    CartContext.Provider,
    {
      value: {
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout,
        checkoutLoading,
        cartTotal,
        cartCount
      },
      children
    }
  );
}
const useCart = () => useContext(CartContext);

const navItems = [
  { label: "Shop", href: "/shop" },
  { label: "Build a Pack", href: "/build-a-pack" },
  { label: "COA", href: "/coa" },
  { label: "Restock Status", href: "/restock-status" }
];
const announcementItems = [
  "Research Use Only",
  "99% Purity HPLC Verified",
  "Free Shipping Over $250"
];
const PRODUCTS_ENDPOINT = "/api/products";
function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9.%+\-\s]/g, " ").replace(/\s+/g, " ").trim();
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
  return product?.image || product?.images?.[0]?.src || product?.images?.[0]?.url || product?.featuredImage || "/placeholder-product.png";
}
function getProductUrl(product) {
  return product?.permalink || product?.url || product?.link || `/products/${product?.slug || product?.id}`;
}
function getProductPrice(product) {
  const rawPrice = product?.price || product?.regular_price || product?.sale_price || product?.price_html || "";
  if (!rawPrice) return "";
  if (typeof rawPrice === "number") {
    return `$${rawPrice.toLocaleString(void 0, {
      maximumFractionDigits: 2
    })}`;
  }
  if (String(rawPrice).includes("$")) return String(rawPrice);
  const parsed = String(rawPrice).replace(/[^0-9.]/g, "");
  if (!parsed) return "";
  return `$${Number(parsed).toLocaleString(void 0, {
    maximumFractionDigits: 2
  })}`;
}
function getProductCategory(product) {
  if (product?.category) return product.category;
  if (Array.isArray(product?.categories) && product.categories.length > 0) {
    const firstCategory = product.categories[0];
    return typeof firstCategory === "string" ? firstCategory : firstCategory?.name || "Research product";
  }
  return "Research product";
}
function getSearchableProductText(product) {
  const categories = Array.isArray(product?.categories) ? product.categories.map(
    (category) => typeof category === "string" ? category : category?.name
  ).filter(Boolean) : [];
  const tags = Array.isArray(product?.tags) ? product.tags.map((tag) => typeof tag === "string" ? tag : tag?.name).filter(Boolean) : [];
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
      ...tags
    ].join(" ")
  );
}
function VialIcon() {
  return /* @__PURE__ */ jsx("span", { className: "sh-vial", "aria-hidden": "true", children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 18 24", fill: "none", children: [
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M6.4 2.5h5.2",
        stroke: "currentColor",
        strokeWidth: "1.35",
        strokeLinecap: "round"
      }
    ),
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M7 3.7h4v2.8c0 .48.18.94.52 1.28l1.5 1.52c.5.5.78 1.18.78 1.9v7.45c0 1.2-.97 2.17-2.17 2.17H6.37c-1.2 0-2.17-.97-2.17-2.17V11.2c0-.72.28-1.4.78-1.9l1.5-1.52C6.82 7.44 7 6.98 7 6.5V3.7Z",
        stroke: "currentColor",
        strokeWidth: "1.35",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M5.45 15.25h7.1v3.28c0 .62-.5 1.12-1.12 1.12H6.57c-.62 0-1.12-.5-1.12-1.12v-3.28Z",
        fill: "currentColor",
        opacity: "0.22"
      }
    )
  ] }) });
}
function AnnouncementGroup() {
  return /* @__PURE__ */ jsx("div", { className: "sh-announcement-group", children: announcementItems.map((item, index) => /* @__PURE__ */ jsxs("div", { className: "sh-announcement-item", children: [
    /* @__PURE__ */ jsx("span", { children: item }),
    /* @__PURE__ */ jsx(VialIcon, {})
  ] }, `${item}-${index}`)) });
}
function AnnouncementLoop() {
  return /* @__PURE__ */ jsxs("div", { className: "sh-announcement-track", children: [
    /* @__PURE__ */ jsx(AnnouncementGroup, {}),
    /* @__PURE__ */ jsx(AnnouncementGroup, {}),
    /* @__PURE__ */ jsx(AnnouncementGroup, {}),
    /* @__PURE__ */ jsx(AnnouncementGroup, {})
  ] });
}
function SiteHeader({
  logoSrc = "/TRANSPARENCIA-03.png",
  logoAlt = "Research Lab Logo"
}) {
  const [mode, setMode] = useState("top");
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
            Accept: "application/json"
          }
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
    const results = allProducts.map((product) => {
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
        score
      };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.product).slice(0, 6);
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
            "Cache-Control": "no-cache"
          }
        });
        if (!response.ok) {
          setAccount(null);
          setAuthChecked(true);
          return;
        }
        const data = await response.json();
        setAccount(data);
        setAuthChecked(true);
      } catch (error) {
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
    const handleScroll = () => {
      const currentY = window.scrollY;
      const goingDown = currentY > lastY.current;
      if (currentY < 24) {
        setMode("top");
      } else if (goingDown && currentY > 90) {
        setMode("hidden");
      } else if (!goingDown) {
        setMode("compact");
      }
      lastY.current = Math.max(currentY, 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
  const showGlass = mode === "compact" || mobileOpen || searchExpanded;
  const isLoggedIn = Boolean(account);
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
      method: "POST"
    });
    setAccount(null);
    setMobileOpen(false);
    window.dispatchEvent(new Event("lab-auth-updated"));
    if (window.location.pathname === "/account") {
      window.location.reload();
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("header", { className: `sh-header ${isHidden ? "sh-header-hidden" : ""}`, children: /* @__PURE__ */ jsxs("div", { className: "sh-shell", children: [
      /* @__PURE__ */ jsxs("div", { className: `sh-announcement ${isTop ? "is-visible" : "is-hidden"}`, children: [
        /* @__PURE__ */ jsx("div", { className: "sh-announcement-fade sh-announcement-fade-left" }),
        /* @__PURE__ */ jsx("div", { className: "sh-announcement-fade sh-announcement-fade-right" }),
        /* @__PURE__ */ jsx("div", { className: "sh-announcement-inner", children: /* @__PURE__ */ jsx(AnnouncementLoop, {}) })
      ] }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: `sh-nav-card ${showGlass ? "sh-nav-glass" : "sh-nav-clear"} ${isTop ? "sh-nav-top" : "sh-nav-compact"}`,
          children: /* @__PURE__ */ jsxs("nav", { className: "sh-nav", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "sh-mobile-toggle",
                onClick: () => setMobileOpen(true),
                "aria-label": "Open menu",
                children: /* @__PURE__ */ jsx(Menu, { size: 27 })
              }
            ),
            /* @__PURE__ */ jsx("a", { href: "/", className: "sh-logo", "aria-label": "Home", children: /* @__PURE__ */ jsx("img", { src: logoSrc, alt: logoAlt }) }),
            /* @__PURE__ */ jsx("div", { className: "sh-links", children: navItems.map((item) => /* @__PURE__ */ jsx("a", { href: item.href, className: "sh-link", children: item.label }, item.label)) }),
            /* @__PURE__ */ jsxs("div", { className: "sh-actions", children: [
              /* @__PURE__ */ jsxs(
                "div",
                {
                  ref: searchWrapRef,
                  className: `sh-inline-search ${searchExpanded ? "is-open" : ""}`,
                  children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        "aria-label": "Search products",
                        className: "sh-inline-search-trigger",
                        onClick: () => setSearchExpanded(true),
                        children: /* @__PURE__ */ jsx(Search, { size: 22 })
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "form",
                      {
                        className: "sh-inline-search-form",
                        onSubmit: (event) => {
                          event.preventDefault();
                          if (cleanSearchQuery) {
                            window.location.href = searchHref;
                          }
                        },
                        children: [
                          /* @__PURE__ */ jsx(Search, { size: 16 }),
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              ref: searchInputRef,
                              value: searchQuery,
                              onChange: (event) => {
                                setSearchQuery(event.target.value);
                                setSearchExpanded(true);
                              },
                              type: "text",
                              placeholder: "Search products..."
                            }
                          ),
                          searchQuery && /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              "aria-label": "Clear search",
                              onClick: clearSearch,
                              children: /* @__PURE__ */ jsx(X, { size: 13 })
                            }
                          )
                        ]
                      }
                    ),
                    searchExpanded && /* @__PURE__ */ jsx("div", { className: "sh-inline-results", children: cleanSearchQuery.length < 2 ? /* @__PURE__ */ jsx("div", { className: "sh-inline-empty", children: "Start typing to search products." }) : searchLoading && !productsLoaded ? /* @__PURE__ */ jsx("div", { className: "sh-inline-empty", children: "Loading product catalog..." }) : searchError ? /* @__PURE__ */ jsx("div", { className: "sh-inline-empty", children: searchError }) : searchResults.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "sh-inline-empty", children: [
                      "No products found for “",
                      cleanSearchQuery,
                      "”."
                    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx("div", { className: "sh-inline-results-list", children: searchResults.map((product) => {
                        const productName = product?.name || product?.title || "Product";
                        const productUrl = getProductUrl(product);
                        const productImage = getProductImage(product);
                        const productPrice = getProductPrice(product);
                        const category = getProductCategory(product);
                        return /* @__PURE__ */ jsxs(
                          "a",
                          {
                            href: productUrl,
                            className: "sh-inline-result",
                            onClick: () => setSearchExpanded(false),
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "sh-inline-result-image", children: /* @__PURE__ */ jsx("img", { src: productImage, alt: productName }) }),
                              /* @__PURE__ */ jsxs("span", { className: "sh-inline-result-copy", children: [
                                /* @__PURE__ */ jsx("strong", { children: productName }),
                                /* @__PURE__ */ jsx("small", { children: category })
                              ] }),
                              /* @__PURE__ */ jsx("span", { className: "sh-inline-result-price", children: productPrice || "View" })
                            ]
                          },
                          product?.id || productUrl
                        );
                      }) }),
                      /* @__PURE__ */ jsx(
                        "a",
                        {
                          href: searchHref,
                          className: "sh-inline-view-all",
                          onClick: () => setSearchExpanded(false),
                          children: "View all results →"
                        }
                      )
                    ] }) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "sh-user-menu", children: [
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/account",
                    "aria-label": "Account",
                    className: "sh-icon sh-user-icon",
                    children: /* @__PURE__ */ jsx(User, { size: 24 })
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "sh-user-dropdown", children: [
                  /* @__PURE__ */ jsxs("div", { className: "sh-user-dropdown-head", children: [
                    /* @__PURE__ */ jsx("p", { children: isLoggedIn ? "Account Active" : "Client Portal" }),
                    /* @__PURE__ */ jsx("span", { children: isLoggedIn ? `Signed in as ${account?.name || "customer"}.` : "Access your rewards, points, and recent orders." })
                  ] }),
                  !authChecked ? /* @__PURE__ */ jsx("div", { className: "sh-user-dropdown-loading", children: "Checking session..." }) : isLoggedIn ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("a", { href: "/account", className: "sh-user-dropdown-link", children: [
                      /* @__PURE__ */ jsx(User, { size: 16 }),
                      "Ver perfil"
                    ] }),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        className: "sh-user-dropdown-link sh-user-dropdown-button",
                        onClick: handleLogout,
                        children: [
                          /* @__PURE__ */ jsx(LogOut, { size: 16 }),
                          "Cerrar sesión"
                        ]
                      }
                    )
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("a", { href: "/account", className: "sh-user-dropdown-link", children: [
                      /* @__PURE__ */ jsx(User, { size: 16 }),
                      "Iniciar sesión"
                    ] }),
                    /* @__PURE__ */ jsxs("a", { href: "/register", className: "sh-user-dropdown-link", children: [
                      /* @__PURE__ */ jsx("span", { className: "sh-user-dot" }),
                      "Registrarse"
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "aria-label": "Open cart",
                  className: "sh-icon sh-cart",
                  onClick: openCart,
                  children: [
                    /* @__PURE__ */ jsx(ShoppingCart, { size: 25 }),
                    /* @__PURE__ */ jsx("span", { suppressHydrationWarning: true, children: safeCartCount })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                "aria-label": "Open cart",
                className: "sh-mobile-cart",
                onClick: openCart,
                children: [
                  /* @__PURE__ */ jsx(ShoppingCart, { size: 24 }),
                  /* @__PURE__ */ jsx("span", { suppressHydrationWarning: true, children: safeCartCount })
                ]
              }
            )
          ] })
        }
      )
    ] }) }),
    mobileOpen && /* @__PURE__ */ jsxs("div", { className: "sh-mobile-overlay", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "sh-mobile-backdrop",
          onClick: () => setMobileOpen(false),
          "aria-label": "Close menu"
        }
      ),
      /* @__PURE__ */ jsxs("aside", { className: "sh-mobile-panel", children: [
        /* @__PURE__ */ jsx("div", { className: "sh-mobile-glow" }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-top", children: [
          /* @__PURE__ */ jsx("a", { href: "/", onClick: () => setMobileOpen(false), children: /* @__PURE__ */ jsx("img", { src: logoSrc, alt: logoAlt }) }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setMobileOpen(false),
              "aria-label": "Close menu",
              className: "sh-mobile-close",
              children: /* @__PURE__ */ jsx(X, { size: 24 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-label", children: [
          /* @__PURE__ */ jsx("span", {}),
          "Menu"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-links", children: [
          navItems.map((item, index) => /* @__PURE__ */ jsxs(
            "a",
            {
              href: item.href,
              onClick: () => setMobileOpen(false),
              style: { "--delay": `${index * 45}ms` },
              children: [
                /* @__PURE__ */ jsx("span", { children: String(index + 1).padStart(2, "0") }),
                item.label
              ]
            },
            item.label
          )),
          isLoggedIn ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: "/account",
                onClick: () => setMobileOpen(false),
                style: { "--delay": "210ms" },
                children: [
                  /* @__PURE__ */ jsx("span", { children: "05" }),
                  "Ver perfil"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: handleLogout,
                style: { "--delay": "255ms" },
                children: [
                  /* @__PURE__ */ jsx("span", { children: "06" }),
                  "Cerrar sesión"
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: "/account",
                onClick: () => setMobileOpen(false),
                style: { "--delay": "210ms" },
                children: [
                  /* @__PURE__ */ jsx("span", { children: "05" }),
                  "Iniciar sesión"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: "/register",
                onClick: () => setMobileOpen(false),
                style: { "--delay": "255ms" },
                children: [
                  /* @__PURE__ */ jsx("span", { children: "06" }),
                  "Registrarse"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-search", children: [
          /* @__PURE__ */ jsxs("div", { className: "sh-mobile-search-box", children: [
            /* @__PURE__ */ jsx(Search, { size: 16 }),
            /* @__PURE__ */ jsx(
              "input",
              {
                value: searchQuery,
                onChange: (event) => {
                  setSearchQuery(event.target.value);
                  setSearchExpanded(true);
                },
                type: "text",
                placeholder: "Search products..."
              }
            ),
            searchQuery && /* @__PURE__ */ jsx("button", { type: "button", onClick: clearSearch, "aria-label": "Clear", children: /* @__PURE__ */ jsx(X, { size: 13 }) })
          ] }),
          searchQuery.trim().length >= 2 && /* @__PURE__ */ jsx("div", { className: "sh-mobile-search-results", children: searchLoading && !productsLoaded ? /* @__PURE__ */ jsx("p", { children: "Loading products..." }) : searchError ? /* @__PURE__ */ jsx("p", { children: searchError }) : searchResults.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No products found." }) : searchResults.slice(0, 4).map((product) => {
            const productName = product?.name || product?.title || "Product";
            const productUrl = getProductUrl(product);
            const productImage = getProductImage(product);
            return /* @__PURE__ */ jsxs(
              "a",
              {
                href: productUrl,
                onClick: () => {
                  setMobileOpen(false);
                  setSearchExpanded(false);
                },
                children: [
                  /* @__PURE__ */ jsx("img", { src: productImage, alt: productName }),
                  /* @__PURE__ */ jsx("span", { children: productName })
                ]
              },
              product?.id || productUrl
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-note", children: [
          /* @__PURE__ */ jsx("p", { children: isLoggedIn ? "Account Active" : "Research Use Only" }),
          /* @__PURE__ */ jsx("span", { children: isLoggedIn ? `${account?.points || 0} reward points available.` : "Laboratory research catalog only." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sh-mobile-bottom", children: [
          /* @__PURE__ */ jsxs("a", { href: "/shop", onClick: () => setMobileOpen(false), children: [
            /* @__PURE__ */ jsx(Search, { size: 21 }),
            "Search"
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setMobileOpen(false);
                setIsCartOpen(true);
              },
              children: [
                /* @__PURE__ */ jsx(ShoppingCart, { size: 22 }),
                "Cart",
                safeCartCount > 0 && /* @__PURE__ */ jsx("span", { suppressHydrationWarning: true, children: safeCartCount })
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .sh-menu-lock {
          overflow: hidden !important;
        }

        .sh-header {
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
          margin-left: -12px;
          overflow: hidden;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            90deg,
            rgba(7, 25, 38, 0.76),
            rgba(2, 6, 23, 0.72),
            rgba(7, 25, 38, 0.76)
          );
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition:
            max-height 260ms ease,
            opacity 180ms ease;
        }

        .sh-announcement.is-visible {
          max-height: 38px;
          opacity: 1;
        }

        .sh-announcement.is-hidden {
          max-height: 0;
          opacity: 0;
          pointer-events: none;
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
          padding: 9px 42px;
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
            rgba(2, 6, 23, 0.96),
            rgba(2, 6, 23, 0)
          );
        }

        .sh-announcement-fade-right {
          right: 0;
          background: linear-gradient(
            270deg,
            rgba(2, 6, 23, 0.96),
            rgba(2, 6, 23, 0)
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
          max-width: 1280px;
          margin-inline: auto;
          border-radius: 24px;
          overflow: visible;
          transition:
            margin-top 260ms ease,
            background 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease,
            backdrop-filter 220ms ease;
        }

        .sh-nav-top,
        .sh-nav-compact {
          margin-top: 12px;
        }

        .sh-nav-clear {
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;
          backdrop-filter: blur(0);
          -webkit-backdrop-filter: blur(0);
        }

        .sh-nav-glass {
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            135deg,
            rgba(8, 25, 38, 0.72),
            rgba(3, 10, 18, 0.66),
            rgba(8, 28, 42, 0.7)
          );
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sh-nav {
          display: flex;
          height: 78px;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
        }

        .sh-logo {
          display: flex;
          min-width: 130px;
          align-items: center;
        }

        .sh-logo img {
          width: auto;
          max-width: 176px;
          max-height: 54px;
          object-fit: contain;
          transition: transform 280ms ease;
        }

        .sh-logo:hover img {
          transform: scale(1.03);
        }

        .sh-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sh-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.84);
          transition: color 260ms ease;
        }

        .sh-link:hover {
          color: white;
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

        .sh-actions {
          display: flex;
          align-items: center;
          gap: 24px;
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
        }

        .sh-user-menu {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .sh-user-icon {
          padding: 0;
        }

        .sh-user-dropdown {
          position: absolute;
          top: calc(100% + 18px);
          right: -18px;
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

        .sh-user-dropdown-loading {
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
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          border: 0;
          border-radius: 17px;
          background: transparent;
          padding: 13px 15px;
          text-align: left;
          font-size: 14px;
          font-weight: 800;
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

        .sh-cart span,
        .sh-mobile-cart span {
          position: absolute;
          top: -12px;
          right: -12px;
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

        .sh-inline-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sh-inline-search-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
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
        }

        .sh-inline-search.is-open .sh-inline-search-trigger {
          opacity: 0;
          pointer-events: none;
          width: 0;
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
          overflow: hidden;
          border-right: 1px solid rgba(165, 243, 252, 0.13);
          background:
            linear-gradient(145deg, rgba(8, 28, 42, 0.98), rgba(2, 6, 23, 0.98)),
            #061522;
          padding: 20px;
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

        @media (max-width: 1024px) {
          .sh-links,
          .sh-actions {
            display: none;
          }

          .sh-mobile-toggle,
          .sh-mobile-cart {
            display: inline-flex;
          }

          .sh-nav {
            display: grid;
            grid-template-columns: 44px 1fr 44px;
            height: 72px;
            align-items: center;
            padding-inline: 16px;
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
            top: -9px;
            right: -9px;
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
            border-radius: 22px;
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
      ` })
  ] });
}

function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    updateQuantity,
    removeFromCart,
    cartTotal,
    checkout,
    checkoutLoading
  } = useCart();
  const hasItems = cartItems.length > 0;
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(price || 0));
  };
  const totalUnits = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
  return /* @__PURE__ */ jsx(AnimatePresence, { children: isCartOpen && /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      motion.button,
      {
        type: "button",
        "aria-label": "Close cart overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: () => {
          if (!checkoutLoading) {
            setIsCartOpen(false);
          }
        },
        className: "fixed inset-0 z-[9998] bg-black/65 backdrop-blur-sm"
      }
    ),
    /* @__PURE__ */ jsxs(
      motion.aside,
      {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
        transition: {
          type: "tween",
          duration: 0.34,
          ease: [0.16, 1, 0.3, 1]
        },
        className: "fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-[430px] flex-col overflow-hidden border-l border-cyan-200/10 bg-[#040814]/95 text-white shadow-[-18px_0_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl",
        children: [
          /* @__PURE__ */ jsx("div", { className: "border-b border-cyan-200/10 px-5 py-5", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60", children: "Cart" }),
              /* @__PURE__ */ jsx("h2", { className: "mt-1 text-2xl font-semibold tracking-[-0.04em] text-white", children: "Your order" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-slate-400", children: hasItems ? `${totalUnits} item${totalUnits > 1 ? "s" : ""} selected` : "Your cart is empty" })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  if (!checkoutLoading) {
                    setIsCartOpen(false);
                  }
                },
                disabled: checkoutLoading,
                "aria-label": "Close cart",
                className: "grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-200/25 hover:text-white disabled:cursor-wait disabled:opacity-50",
                children: /* @__PURE__ */ jsx(X, { size: 17 })
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto px-5 py-5", children: !hasItems ? /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col items-center justify-center text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-20 w-20 place-items-center rounded-full border border-cyan-200/10 bg-cyan-300/[0.04] text-cyan-200", children: /* @__PURE__ */ jsx(ShoppingBag, { size: 28 }) }),
            /* @__PURE__ */ jsx("h3", { className: "mt-5 text-xl font-semibold tracking-[-0.03em] text-white", children: "Nothing here yet" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-[260px] text-sm leading-6 text-slate-400", children: "Add products from the catalog to continue." }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setIsCartOpen(false),
                className: "mt-6 rounded-full border border-cyan-200/15 bg-cyan-300/[0.06] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15",
                children: "Continue Shopping"
              }
            )
          ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: cartItems.map((item) => {
            const itemImage = item.images?.[0]?.src;
            const lineTotal = Number(item.price || 0) * item.quantity;
            return /* @__PURE__ */ jsx(
              motion.article,
              {
                layout: true,
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -8 },
                className: "rounded-2xl border border-cyan-200/10 bg-white/[0.025] p-3 transition hover:border-cyan-200/20 hover:bg-white/[0.04]",
                children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(145deg,rgba(6,17,31,1),rgba(8,38,56,0.65),rgba(4,12,24,1))]", children: itemImage ? /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: itemImage,
                      alt: item.name,
                      className: "max-h-[76px] w-auto object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.35)]"
                    }
                  ) : /* @__PURE__ */ jsx(
                    ShoppingBag,
                    {
                      size: 22,
                      className: "text-cyan-200/60"
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
                      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsx("h3", { className: "line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white", children: item.name }),
                        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-slate-400", children: [
                          formatPrice(item.price),
                          " each"
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => removeFromCart(item.id),
                          disabled: checkoutLoading,
                          "aria-label": "Remove product",
                          className: "grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50",
                          children: /* @__PURE__ */ jsx(Trash2, { size: 14 })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-between gap-3", children: [
                      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center rounded-full border border-cyan-200/10 bg-[#020617]/60 p-1", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => updateQuantity(item.id, -1),
                            disabled: checkoutLoading,
                            "aria-label": "Decrease quantity",
                            className: "grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-wait disabled:opacity-50",
                            children: /* @__PURE__ */ jsx(Minus, { size: 12 })
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { className: "min-w-[30px] text-center text-sm font-semibold text-white", children: item.quantity }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => updateQuantity(item.id, 1),
                            disabled: checkoutLoading,
                            "aria-label": "Increase quantity",
                            className: "grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-wait disabled:opacity-50",
                            children: /* @__PURE__ */ jsx(Plus, { size: 12 })
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: formatPrice(lineTotal) })
                    ] })
                  ] })
                ] })
              },
              item.id
            );
          }) }) }),
          hasItems && /* @__PURE__ */ jsxs("div", { className: "border-t border-cyan-200/10 bg-[#040814]/95 px-5 py-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-end justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", children: "Subtotal" }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-3xl font-semibold tracking-[-0.05em] text-white", children: formatPrice(cartTotal) })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "pb-1 text-right text-xs leading-5 text-slate-500", children: "Taxes and shipping at checkout." })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: checkout,
                disabled: checkoutLoading,
                className: "relative w-full overflow-hidden rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-80",
                children: [
                  checkoutLoading && /* @__PURE__ */ jsx("span", { className: "absolute inset-0 animate-pulse bg-white/20" }),
                  /* @__PURE__ */ jsx("span", { className: "relative z-10", children: checkoutLoading ? "Opening checkout..." : "Checkout" })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setIsCartOpen(false),
                disabled: checkoutLoading,
                className: "mt-3 w-full py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-cyan-200 disabled:cursor-wait disabled:opacity-50",
                children: "Continue Shopping"
              }
            )
          ] })
        ]
      }
    )
  ] }) });
}

export { $$MainLayout as $, CartDrawer as C, SiteHeader as S, CartProvider as a, useCart as u };
