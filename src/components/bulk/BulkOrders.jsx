import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  LockKeyhole,
  LogOut,
  PackageCheck,
  Search,
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
  if (!response.ok) throw Object.assign(new Error(errorMessage(data, "Request failed.")), { status: response.status });
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
  const attributes = Array.isArray(item.attributes) ? item.attributes : [];
  if (attributes.length) return attributes.map((entry) => entry.value).filter(Boolean).join(" · ");
  return item.name === item.parent_name ? "Standard" : item.name;
}

function TierScale({ item }) {
  const tiers = Array.isArray(item.tiers) ? item.tiers : [];
  if (item.pricing_mode !== "tiered" || !tiers.length) {
    return <span className="bulk-fixed-price">{money(item.unit_price)} each</span>;
  }
  return (
    <div className="bulk-tiers" aria-label="Volume pricing">
      {tiers.map((tier) => (
        <span key={`${tier.minimum}-${tier.price}`}>
          <b>{tier.minimum}+</b> {money(tier.price)}
        </span>
      ))}
    </div>
  );
}

function QuantityControl({ item, value, onChange }) {
  const minimum = Math.max(1, Number(item.minimum || 1));
  const maximum = Math.max(0, Number(item.maximum || 0));
  const normalize = (next) => Math.max(minimum, maximum > 0 ? Math.min(maximum, next) : next);
  return (
    <label className="bulk-quantity">
      <span>Qty</span>
      <button type="button" onClick={() => onChange(normalize(value - 1))} aria-label={`Decrease ${item.name} quantity`}>−</button>
      <input
        type="number"
        min={minimum}
        max={maximum || undefined}
        step="1"
        value={value}
        onChange={(event) => onChange(normalize(Math.floor(Number(event.target.value || minimum))))}
        aria-label={`${item.name} quantity`}
      />
      <button type="button" onClick={() => onChange(normalize(value + 1))} aria-label={`Increase ${item.name} quantity`}>+</button>
    </label>
  );
}

function Family({ name, items, cart, drafts, setDraft, setLine }) {
  const representative = items[0];
  return (
    <article className="bulk-family">
      <header>
        <div className="bulk-family-image">
          <img src={representative.image} alt="" loading="lazy" decoding="async" />
        </div>
        <div>
          <span>{representative.categories?.[0] || "Bulk catalog"}</span>
          <h2>{name}</h2>
          <p>{items.length === 1 ? "1 purchasable SKU" : `${items.length} purchasable SKUs`}</p>
        </div>
      </header>

      <div className="bulk-skus">
        {items.map((item) => {
          const key = itemKey(item);
          const existing = cart.find((line) => itemKey(line) === key);
          const quantity = Number(drafts[key] ?? existing?.quantity ?? item.minimum ?? 1);
          return (
            <section className="bulk-sku" key={key}>
              <div className="bulk-sku-heading">
                <div>
                  <strong>{productLabel(item)}</strong>
                  <span>SKU {item.sku}</span>
                </div>
                {!item.available && <span className="bulk-unavailable">Unavailable</span>}
              </div>
              <TierScale item={item} />
              <div className="bulk-sku-action">
                <QuantityControl item={item} value={quantity} onChange={(value) => setDraft(key, value)} />
                <button
                  type="button"
                  className="bulk-add"
                  disabled={!item.available}
                  onClick={() => setLine(item, quantity)}
                >
                  {existing ? "Update" : "Add"}
                </button>
              </div>
              <small>
                Minimum {item.minimum} per SKU
                {Number(item.maximum || 0) > 0 ? ` · Maximum ${item.maximum}` : ""}
              </small>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function BulkCart({ cart, catalogById, quote, quoteState, error, removeLine, checkout, checkingOut, close }) {
  const currency = quote?.currency || "USD";
  const totalQuantity = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const quoteLines = new Map((quote?.lines || []).map((line) => [itemKey(line), line]));
  return (
    <aside className="bulk-cart" aria-label="Bulk cart">
      <div className="bulk-cart-head">
        <div>
          <span>Bulk Cart</span>
          <h2>{totalQuantity ? `${totalQuantity} units` : "No items yet"}</h2>
        </div>
        {close && <button type="button" onClick={close} aria-label="Close Bulk cart"><X size={20} /></button>}
      </div>

      <div className="bulk-cart-lines">
        {!cart.length ? (
          <div className="bulk-cart-empty">
            <ShoppingBag size={22} />
            <p>Select a SKU and quantity to start your Bulk order.</p>
          </div>
        ) : cart.map((line) => {
          const product = catalogById.get(itemKey(line));
          const priced = quoteLines.get(itemKey(line));
          return (
            <div className="bulk-cart-line" key={itemKey(line)}>
              <div>
                <strong>{product?.parent_name || product?.name || "Product"}</strong>
                <span>{productLabel(product || {})} · {line.quantity} units</span>
              </div>
              <div>
                <b>{priced ? money(priced.line_total, currency) : "—"}</b>
                <button type="button" onClick={() => removeLine(line)} aria-label={`Remove ${product?.name || "item"}`}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bulk-cart-total">
        <div><span>Merchandise subtotal</span><strong>{quoteState === "loading" ? "Updating…" : money(quote?.subtotal || 0, currency)}</strong></div>
        <p>Shipping and any selected payment adjustment are calculated securely at checkout.</p>
        {error && <div className="bulk-inline-error" role="alert">{error}</div>}
        <button type="button" className="bulk-checkout" disabled={!cart.length || !quote || quoteState === "loading" || checkingOut} onClick={checkout}>
          <span>{checkingOut ? "Preparing checkout…" : "Continue to checkout"}</span>
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
            <input id="bulk-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" spellCheck="false" placeholder="P1B-••••-••••-••••" />
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
  const [cart, setCart] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState("idle");
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [accessMode, setAccessMode] = useState("private");

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
    const validIds = new Set(catalog.map(itemKey));
    setCart((current) => {
      const cleaned = current.filter((line) => validIds.has(itemKey(line)));
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
        setError(requestError.message || "The Bulk cart could not be validated.");
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cart, status]);

  const catalogById = useMemo(() => new Map(catalog.map((item) => [itemKey(item), item])), [catalog]);
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = new Map();
    for (const item of catalog) {
      const haystack = `${item.parent_name} ${item.name} ${item.sku} ${(item.categories || []).join(" ")}`.toLowerCase();
      if (normalized && !haystack.includes(normalized)) continue;
      const family = item.parent_name || item.name;
      if (!result.has(family)) result.set(family, []);
      result.get(family).push(item);
    }
    return Array.from(result.entries());
  }, [catalog, query]);

  const setLine = (item, quantity) => {
    const line = {
      product_id: Number(item.product_id),
      variation_id: Number(item.variation_id || 0),
      quantity: Number(quantity),
    };
    setCart((current) => [...current.filter((entry) => itemKey(entry) !== itemKey(item)), line]);
  };
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
    return <main className="bulk-state"><PackageCheck size={24} /><p>Loading secure Bulk catalog…</p></main>;
  }
  if (status === "locked") return <AccessGate onAccess={loadCatalog} />;
  if (status === "error") {
    return <main className="bulk-state"><p>{error}</p><button type="button" onClick={loadCatalog}>Try again</button></main>;
  }

  const totalQuantity = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  return (
    <main className="bulk-page">
      <section className="bulk-hero">
        <div>
          <span className="bulk-eyebrow">{accessMode === "public" ? "Volume purchasing" : "Authorized purchasing"}</span>
          <h1>Bulk Orders</h1>
          <p>Volume pricing by SKU, verified against live WooCommerce inventory.</p>
        </div>
        {accessMode === "private" && <button type="button" className="bulk-end-session" onClick={logout}><LogOut size={16} /> End session</button>}
      </section>

      <div className="bulk-toolbar">
        <label>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or SKU" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
        </label>
        <span>{groups.length} product {groups.length === 1 ? "family" : "families"}</span>
      </div>

      <div className="bulk-layout">
        <section className="bulk-catalog" aria-label="Bulk products">
          {!groups.length ? <div className="bulk-no-results">No Bulk products match that search.</div> : groups.map(([name, items]) => (
            <Family
              key={name}
              name={name}
              items={items}
              cart={cart}
              drafts={drafts}
              setDraft={(key, value) => setDrafts((current) => ({ ...current, [key]: value }))}
              setLine={setLine}
            />
          ))}
        </section>

        <div className="bulk-cart-desktop">
          <BulkCart {...{ cart, catalogById, quote, quoteState, error, removeLine, checkout, checkingOut }} />
        </div>
      </div>

      <button type="button" className="bulk-mobile-bar" onClick={() => setCartOpen(true)}>
        <span><ShoppingBag size={18} /> {totalQuantity || 0} units</span>
        <strong>{money(quote?.subtotal || 0, quote?.currency || "USD")} <ChevronDown size={17} /></strong>
      </button>
      {cartOpen && (
        <div className="bulk-sheet" role="dialog" aria-modal="true" aria-label="Bulk cart">
          <button className="bulk-sheet-backdrop" type="button" onClick={() => setCartOpen(false)} aria-label="Close Bulk cart" />
          <BulkCart {...{ cart, catalogById, quote, quoteState, error, removeLine, checkout, checkingOut }} close={() => setCartOpen(false)} />
        </div>
      )}
    </main>
  );
}
