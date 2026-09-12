import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Check,
  ChevronDown,
  LockKeyhole,
  LogOut,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import "./bulk-orders.css";

const STORAGE_KEY = "phaseone_bulk_cart_v1";

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function errorMessage(data, fallback) {
  return String(data?.message || data?.error || fallback);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(errorMessage(data, "Request failed.")), { status: response.status });
  }
  return data;
}

function cleanStoredCart(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => ({
      product_id: Number(line?.product_id || 0),
      variation_id: Number(line?.variation_id || 0),
      quantity: Math.max(1, Math.floor(Number(line?.quantity || 0))),
    }))
    .filter((line) => line.product_id > 0 && line.quantity > 0)
    .slice(0, 100);
}

function itemKey(item) {
  return String(Number(item?.variation_id || item?.purchasable_id || item?.product_id || 0));
}

function productLabel(item) {
  const attributes = Array.isArray(item?.attributes) ? item.attributes : [];
  if (attributes.length) return attributes.map((entry) => entry.value).filter(Boolean).join(" · ");
  return item?.name === item?.parent_name ? "Standard" : item?.name || "Standard";
}

function isBundle(item) {
  return item?.pricing_mode !== "tiered";
}

function bundleSize(item) {
  return Math.max(1, Number(item?.minimum || 1));
}

function bundleCount(item, quantity) {
  return Math.max(1, Math.round(Number(quantity || bundleSize(item)) / bundleSize(item)));
}

function maximumBundles(item) {
  const maximum = Math.max(0, Number(item?.maximum || 0));
  return maximum > 0 ? Math.floor(maximum / bundleSize(item)) : 0;
}

function availabilityCopy(item) {
  const maximum = Math.max(0, Number(item?.maximum || 0));
  const minimum = bundleSize(item);
  if (!item?.available && maximum > 0 && maximum < minimum) {
    return `Only ${maximum} units of this option are in stock; the bundle needs ${minimum}.`;
  }
  if (!item?.available) return "Currently unavailable.";
  if (isBundle(item)) {
    const capacity = maximumBundles(item);
    return capacity > 0 ? `${capacity} bundle${capacity === 1 ? "" : "s"} currently available.` : "Available to order.";
  }
  return maximum > 0 ? `Up to ${maximum} SKU units currently available.` : "Available to order.";
}

function offerPrice(item, currency = "USD") {
  if (isBundle(item)) return money(item.line_total, currency);
  const tiers = Array.isArray(item.tiers) ? item.tiers : [];
  return tiers.length ? `${money(tiers[0].price, currency)}/unit` : money(item.line_total, currency);
}

function ProductFamily({ name, items, cart, currency, addLine, selectedKey, selectOffer, index }) {
  const representative = items[0];
  const selected = items.find((item) => itemKey(item) === selectedKey)
    || items.find((item) => item.available)
    || representative;
  const selectedLine = cart.find((line) => itemKey(line) === itemKey(selected));
  const selectedBundles = selectedLine && isBundle(selected) ? bundleCount(selected, selectedLine.quantity) : 0;
  const increment = bundleSize(selected);
  const maximum = Math.max(0, Number(selected.maximum || 0));
  const atMaximum = Boolean(selectedLine && maximum > 0 && Number(selectedLine.quantity) + increment > maximum);
  const selectionCopy = isBundle(selected)
    ? `Contains ${bundleSize(selected)} × ${productLabel(selected)}`
    : "Quantity pricing applies";
  return (
    <article className="bulk-product-card">
      <div className="bulk-product-visual">
        <div className="bulk-family-index" aria-hidden="true">
          <span>Family</span>
          <strong>{String(index + 1).padStart(2, "0")}</strong>
        </div>
        <img src={representative.image} alt="" loading="lazy" decoding="async" />
        <span><Check size={13} /> Stock verified live</span>
      </div>
      <div className="bulk-product-body">
        <header>
          <span>{representative.categories?.[0] || "Bulk catalog"}</span>
          <h2>{name}</h2>
          <p>{items.length} bundle option{items.length === 1 ? "" : "s"}</p>
        </header>
        <div className="bulk-variant-list" role="radiogroup" aria-label={`${name} bundle options`}>
          {items.map((item) => (
            <button
              type="button"
              key={itemKey(item)}
              role="radio"
              aria-checked={itemKey(selected) === itemKey(item)}
              className={`${itemKey(selected) === itemKey(item) ? "is-active" : ""}${!item.available ? " is-unavailable" : ""}`}
              onClick={() => selectOffer(item)}
            >
              <span>
                <strong>{productLabel(item)}</strong>
                <small>{isBundle(item) ? `Bundle of ${bundleSize(item)}` : `Minimum ${bundleSize(item)} units`}</small>
              </span>
              <b>{offerPrice(item, currency)}</b>
            </button>
          ))}
        </div>
        <div className="bulk-product-purchase">
          <div>
            <span>{isBundle(selected) ? "Bundle total" : "Starting price"}</span>
            <strong>{offerPrice(selected, currency)}</strong>
            <small>{selectionCopy}</small>
          </div>
          <button type="button" disabled={!selected.available || atMaximum} onClick={() => addLine(selected)}>
            {atMaximum ? "Maximum added" : selectedLine
              ? <><Check size={15} /> {isBundle(selected) ? `${selectedBundles} in order` : `${selectedLine.quantity} units`}</>
              : isBundle(selected) ? "Add bundle" : "Add quantity"}
          </button>
        </div>
        <p className={`bulk-product-availability${selected.available ? "" : " is-error"}`}>{availabilityCopy(selected)}</p>
      </div>
    </article>
  );
}

function LineCounter({ product, line, updateLine }) {
  const step = isBundle(product) ? bundleSize(product) : 1;
  const display = isBundle(product) ? bundleCount(product, line.quantity) : Number(line.quantity);
  const maximum = Math.max(0, Number(product?.maximum || 0));
  const maxDisplay = isBundle(product) ? maximumBundles(product) : maximum;
  const change = (next) => {
    const normalized = Math.max(1, maxDisplay > 0 ? Math.min(maxDisplay, next) : next);
    updateLine(product, normalized * step);
  };
  return (
    <div className="bulk-line-counter" aria-label={`${product?.name || "Product"} ${isBundle(product) ? "bundles" : "quantity"}`}>
      <button type="button" onClick={() => change(display - 1)} disabled={display <= 1}>−</button>
      <span>{display}</span>
      <button type="button" onClick={() => change(display + 1)} disabled={maxDisplay > 0 && display >= maxDisplay}>+</button>
    </div>
  );
}

function BulkCart({ cart, catalogById, quote, quoteState, error, updateLine, removeLine, checkout, checkingOut, close }) {
  const currency = quote?.currency || "USD";
  const quoteLines = new Map((quote?.lines || []).map((line) => [itemKey(line), line]));
  const orderSummary = cart.reduce((summary, line) => {
    const product = catalogById.get(itemKey(line));
    if (!product) return summary;
    summary.units += Number(line.quantity || 0);
    summary.bundles += isBundle(product) ? bundleCount(product, line.quantity) : 0;
    return summary;
  }, { units: 0, bundles: 0 });
  return (
    <aside className="bulk-cart" aria-label="Bulk order">
      <div className="bulk-cart-head">
        <div>
          <span>Bulk manifest</span>
          <h2>{cart.length ? `${orderSummary.bundles || orderSummary.units} bundle${(orderSummary.bundles || orderSummary.units) === 1 ? "" : "s"} ready` : "No bundles selected"}</h2>
        </div>
        {close && <button type="button" onClick={close} aria-label="Close Bulk cart"><X size={20} /></button>}
      </div>

      <div className="bulk-cart-lines">
        {!cart.length ? (
          <div className="bulk-cart-empty">
            <ShoppingBag size={22} />
            <p>Choose a product family and add its bundle here.</p>
          </div>
        ) : cart.map((line) => {
          const product = catalogById.get(itemKey(line));
          const priced = quoteLines.get(itemKey(line));
          if (!product) return null;
          const bundles = isBundle(product) ? bundleCount(product, line.quantity) : 0;
          return (
            <div className="bulk-cart-line" key={itemKey(line)}>
              <img src={product.image} alt="" loading="lazy" decoding="async" />
              <div className="bulk-cart-line-info">
                <strong>{product.parent_name || product.name}</strong>
                <span>{productLabel(product)}</span>
                <small>{bundles ? `${bundles} bundle${bundles === 1 ? "" : "s"} · ${line.quantity} total units` : `${line.quantity} units`}</small>
                <LineCounter product={product} line={line} updateLine={updateLine} />
              </div>
              <div className="bulk-cart-line-total">
                <button type="button" onClick={() => removeLine(line)} aria-label={`Remove ${product.name}`}><Trash2 size={15} /></button>
                <b>{priced ? money(priced.line_total, currency) : "—"}</b>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bulk-cart-total">
        {!!cart.length && (
          <div className="bulk-order-facts">
            <span><b>{cart.length}</b> selected SKU{cart.length === 1 ? "" : "s"}</span>
            <span><b>{orderSummary.units}</b> total units</span>
          </div>
        )}
        <div className="bulk-total-row"><span>Merchandise total</span><strong>{quoteState === "loading" ? "Updating…" : money(quote?.subtotal || 0, currency)}</strong></div>
        <p>Inventory and totals are verified again by WooCommerce before payment.</p>
        {error && <div className="bulk-inline-error" role="alert">{error}</div>}
        <button type="button" className="bulk-checkout" disabled={!cart.length || !quote || quoteState === "loading" || checkingOut} onClick={checkout}>
          <span>{checkingOut ? "Preparing checkout…" : `Continue · ${money(quote?.subtotal || 0, currency)}`}</span>
          {!checkingOut && <ArrowRight size={18} />}
        </button>
      </div>
    </aside>
  );
}

function AccessGate({ onAccess }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/bulk/access", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
      onAccess();
    } catch (requestError) {
      setError(requestError.message || "That access code is not available.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bulk-access-shell">
      <section className="bulk-access-panel">
        <div className="bulk-access-mark"><LockKeyhole size={22} /></div>
        <span className="bulk-eyebrow">Private procurement</span>
        <h1>Bulk Orders</h1>
        <p>Enter the access code issued to your organization.</p>
        <form onSubmit={submit}>
          <label htmlFor="bulk-code">Access code</label>
          <div className="bulk-code-field">
            <input id="bulk-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" spellCheck="false" placeholder="P1B-••••••-••••••-••••••-••••••" />
            <button type="submit" disabled={!code.trim() || submitting}>{submitting ? "Checking" : "Continue"}</button>
          </div>
          {error && <div className="bulk-access-error" role="alert">{error}</div>}
        </form>
        <small>Access is session-based and can be revoked by Phase One.</small>
      </section>
    </main>
  );
}

export default function BulkOrders() {
  const [status, setStatus] = useState("checking");
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [cart, setCart] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState("idle");
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [accessMode, setAccessMode] = useState("private");
  const [selectedOffers, setSelectedOffers] = useState({});

  const loadCatalog = async () => {
    setStatus("loading");
    setError("");
    try {
      const data = await api("/api/bulk/catalog");
      setAccessMode(data.access_mode === "public" ? "public" : "private");
      setCatalog(Array.isArray(data.items) ? data.items : []);
      setStatus("ready");
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) setStatus("locked");
      else {
        setStatus("error");
        setError(requestError.message || "The Bulk catalog is temporarily unavailable.");
      }
    }
  };

  useEffect(() => {
    try {
      setCart(cleanStoredCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    api("/api/bulk/session")
      .then((data) => {
        setAccessMode(data.access_mode === "public" ? "public" : "private");
        return loadCatalog();
      })
      .catch((requestError) => {
        if (requestError.status === 401 || requestError.status === 403) setStatus("locked");
        else {
          setStatus("error");
          setError(requestError.message || "Bulk access is temporarily unavailable.");
        }
      });
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const byId = new Map(catalog.map((item) => [itemKey(item), item]));
    setCart((current) => {
      const cleaned = current.flatMap((line) => {
        const item = byId.get(itemKey(line));
        if (!item) return [];
        if (!isBundle(item)) return [line];
        const minimum = bundleSize(item);
        const normalized = Math.max(minimum, bundleCount(item, line.quantity) * minimum);
        return [{ ...line, quantity: normalized }];
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    });
  }, [catalog, status]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    if (!cart.length || status !== "ready") {
      setQuote(null);
      setQuoteState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteState("loading");
      setError("");
      try {
        const data = await api("/api/bulk/quote", {
          method: "POST",
          body: JSON.stringify({ items: cart }),
          signal: controller.signal,
        });
        setQuote(data);
        setQuoteState("ready");
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        setQuote(null);
        setQuoteState("error");
        setError(requestError.message || "The Bulk order could not be validated.");
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cart, status]);

  const catalogById = useMemo(() => new Map(catalog.map((item) => [itemKey(item), item])), [catalog]);
  const categories = useMemo(() => [
    "All products",
    ...Array.from(new Set(catalog.flatMap((item) => item.categories || []).filter(Boolean))).sort(),
  ], [catalog]);
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = new Map();
    for (const item of catalog) {
      const itemCategories = Array.isArray(item.categories) ? item.categories : [];
      if (category !== "All products" && !itemCategories.includes(category)) continue;
      const haystack = `${item.parent_name} ${item.name} ${item.sku} ${itemCategories.join(" ")}`.toLowerCase();
      if (normalized && !haystack.includes(normalized)) continue;
      const family = item.parent_name || item.name;
      if (!result.has(family)) result.set(family, []);
      result.get(family).push(item);
    }
    return Array.from(result.entries());
  }, [catalog, category, query]);

  const setLine = (item, quantity) => {
    const line = {
      product_id: Number(item.product_id),
      variation_id: Number(item.variation_id || 0),
      quantity: Number(quantity),
    };
    setCart((current) => [...current.filter((entry) => itemKey(entry) !== itemKey(item)), line]);
  };
  const addLine = (item) => {
    const existing = cart.find((line) => itemKey(line) === itemKey(item));
    const step = isBundle(item) ? bundleSize(item) : bundleSize(item);
    setLine(item, existing ? Number(existing.quantity) + step : step);
  };
  const updateLine = (item, quantity) => setLine(item, quantity);
  const removeLine = (line) => setCart((current) => current.filter((entry) => itemKey(entry) !== itemKey(line)));

  const checkout = async () => {
    if (!quote || checkingOut) return;
    setCheckingOut(true);
    setError("");
    try {
      await api("/api/bulk/checkout-intent", { method: "POST", body: JSON.stringify({ items: cart }) });
      window.location.assign("/checkout?mode=bulk");
    } catch (requestError) {
      setError(requestError.message || "Bulk checkout could not be prepared.");
      setCheckingOut(false);
    }
  };

  const logout = async () => {
    await api("/api/bulk/session", { method: "DELETE" }).catch(() => null);
    setCatalog([]);
    setQuote(null);
    setStatus("locked");
  };

  if (status === "checking" || status === "loading") {
    return <main className="bulk-state"><PackageCheck size={24} /><p>Loading Bulk catalog…</p></main>;
  }
  if (status === "locked") return <AccessGate onAccess={loadCatalog} />;
  if (status === "error") {
    return <main className="bulk-state"><p>{error}</p><button type="button" onClick={loadCatalog}>Try again</button></main>;
  }

  const currency = quote?.currency || "USD";
  return (
    <main className="bulk-page">
      <div className="bulk-shell">
        <section className="bulk-hero">
          <div className="bulk-hero-copy">
            <span className="bulk-eyebrow">Phase One / {accessMode === "public" ? "Bulk purchasing" : "Private bulk access"}</span>
            <h1>Buy in volume. <em>Get better value.</em></h1>
            <p>Choose ready-priced bundles, combine products in one order, and review the complete total before payment.</p>
          </div>
          {accessMode === "private" && <button type="button" className="bulk-end-session" onClick={logout}><LogOut size={16} /> End session</button>}
        </section>

        <section className="bulk-commercial-points" aria-label="Bulk order benefits">
          <article>
            <BadgeDollarSign size={19} aria-hidden="true" />
            <div><strong>Bundle-first pricing</strong><span>One clear total per selection</span></div>
          </article>
          <article>
            <Boxes size={19} aria-hidden="true" />
            <div><strong>Mix product families</strong><span>Build one organized bulk order</span></div>
          </article>
          <article>
            <PackageCheck size={19} aria-hidden="true" />
            <div><strong>Inventory checked</strong><span>Availability confirmed before payment</span></div>
          </article>
          <article>
            <ShieldCheck size={19} aria-hidden="true" />
            <div><strong>Flexible checkout</strong><span>Card, ACH, and Zelle supported</span></div>
          </article>
        </section>

        <div className="bulk-toolbar">
          <label>
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKUs" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
          </label>
        </div>

        {categories.length > 1 && (
          <div className="bulk-categories" aria-label="Product categories">
            {categories.map((name) => <button type="button" className={category === name ? "is-active" : ""} onClick={() => setCategory(name)} key={name}>{name}</button>)}
          </div>
        )}

        <div className="bulk-layout">
          <section className="bulk-catalog" aria-label="Bulk products">
            {!groups.length ? <div className="bulk-no-results">No Bulk products match these filters.</div> : groups.map(([name, items], index) => (
              <ProductFamily
                key={name}
                name={name}
                items={items}
                index={index}
                cart={cart}
                currency={currency}
                addLine={addLine}
                selectedKey={selectedOffers[name]}
                selectOffer={(item) => setSelectedOffers((current) => ({ ...current, [name]: itemKey(item) }))}
              />
            ))}
          </section>

          <div className="bulk-cart-desktop">
            <BulkCart {...{ cart, catalogById, quote, quoteState, error, updateLine, removeLine, checkout, checkingOut }} />
          </div>
        </div>
      </div>

      <button type="button" className="bulk-mobile-bar" onClick={() => setCartOpen(true)}>
        <span><ShoppingBag size={18} /> {cart.length} selected</span>
        <strong>{money(quote?.subtotal || 0, currency)} <ChevronDown size={17} /></strong>
      </button>
      {cartOpen && (
        <div className="bulk-sheet" role="dialog" aria-modal="true" aria-label="Bulk cart">
          <button className="bulk-sheet-backdrop" type="button" onClick={() => setCartOpen(false)} aria-label="Close Bulk cart" />
          <BulkCart {...{ cart, catalogById, quote, quoteState, error, updateLine, removeLine, checkout, checkingOut }} close={() => setCartOpen(false)} />
        </div>
      )}
    </main>
  );
}
