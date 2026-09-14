import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  LogOut,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import "./bulk-orders.css";

const STORAGE_KEY = "phaseone_bulk_cart_v1";
const API_TIMEOUT_MS = 10_000;

// Mirrors the storefront's default "Most popular" product-family order.
const CATALOG_FAMILY_ORDER = [
  { rank: 1, groups: [["pl", "rt"], ["pl rt"], ["r3ta"], ["rt3"], ["reta"], ["retatrutide"]] },
  { rank: 2, groups: [["pl", "tirz"], ["pl tirz"], ["tirz"], ["pl tz"], ["tz2"], ["tirzepatide"]] },
  { rank: 3, groups: [["h recon water"]] },
  { rank: 4, groups: [["eloralintide"]] },
  { rank: 5, groups: [["mitoprime"]] },
  { rank: 5, groups: [["recon", "water", "30ml"], ["recon", "water"], ["reconstitution", "water", "30ml"], ["reconstitution", "water"], ["p1", "water"], ["phase one", "water"], ["p1", "bacteriostatic"]], exclude: ["hospira", "3ml"] },
  { rank: 6, groups: [["adamax"]] },
  { rank: 7, groups: [["bundle"], ["kit"], ["stack"]] },
  { rank: 10, groups: [["glow"]] },
  { rank: 11, groups: [["klow"]] },
  { rank: 12, groups: [["ghk cu"], ["ghk-cu"], ["ghk"]], exclude: ["glow", "klow"] },
  { rank: 13, groups: [["tesa"], ["tesamorelin"]] },
  { rank: 14, groups: [["cartalax", "bpc", "tb500"]] },
];

function normalizeCatalogOrderText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesCatalogOrderTerm(searchable, term) {
  const cleanTerm = normalizeCatalogOrderText(term);
  return cleanTerm ? ` ${searchable} `.includes(` ${cleanTerm} `) : false;
}

function catalogFamilySortData(name, items) {
  const searchable = normalizeCatalogOrderText([
    name,
    ...items.flatMap((item) => [item?.name, item?.sku, ...(item?.categories || [])]),
  ].filter(Boolean).join(" "));
  const matched = CATALOG_FAMILY_ORDER.find((rule) =>
    !rule.exclude?.some((term) => includesCatalogOrderTerm(searchable, term))
      && rule.groups.some((group) => group.every((term) => includesCatalogOrderTerm(searchable, term))),
  );
  const strength = searchable.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*mg(?:\s|$)/i);
  return { rank: matched?.rank || 9999, strength: strength ? Number(strength[1]) : 9999 };
}

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function percentage(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function errorMessage(data, fallback) {
  return String(data?.message || data?.error || fallback);
}

async function api(path, options = {}) {
  const { signal: callerSignal, ...requestOptions } = options;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...requestOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(requestOptions.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(errorMessage(data, "Request failed.")), { status: response.status });
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError" && !callerSignal?.aborted) {
      throw Object.assign(new Error("The Bulk service took too long to respond. Please try again."), {
        code: "timeout",
        status: 504,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
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

function kitSize(item) {
  return Math.max(1, Number(item?.kit_units || 1));
}

function minimumKits(item) {
  return Math.max(1, Number(item?.minimum_kits || Math.ceil(Number(item?.minimum || 1) / kitSize(item))));
}

function kitCount(item, quantity) {
  return Math.max(minimumKits(item), Math.round(Number(quantity || item?.minimum || kitSize(item)) / kitSize(item)));
}

function maximumKits(item) {
  const maximum = Math.max(0, Number(item?.maximum || 0));
  return maximum > 0 ? Math.floor(maximum / kitSize(item)) : 0;
}

function availabilityCopy(item) {
  const capacity = maximumKits(item);
  if (!item?.available) {
    return item?.availability_reason || "This SKU is currently unavailable for a complete kit.";
  }
  return capacity > 0
    ? `${capacity} kit${capacity === 1 ? "" : "s"} currently available.`
    : "Available to order.";
}

function startingKitPrice(item, currency) {
  return money(item?.kit_price || 0, currency);
}

function Savings({ value }) {
  const amount = Number(value || 0);
  if (amount <= 0) return null;
  return <span className="bulk-savings">Save {percentage(amount)}%</span>;
}

function ProductFamily({ name, items, cart, currency, addLine, selectedKey, selectOffer }) {
  const representative = items[0];
  const selected = items.find((item) => itemKey(item) === selectedKey)
    || items.find((item) => item.available)
    || representative;
  const selectedLine = cart.find((line) => itemKey(line) === itemKey(selected));
  const selectedKits = selectedLine ? kitCount(selected, selectedLine.quantity) : 0;
  const maximum = maximumKits(selected);
  const atMaximum = Boolean(selectedLine && maximum > 0 && selectedKits >= maximum);
  const tiers = Array.isArray(selected?.tiers) ? selected.tiers : [];
  const retailKitPrice = Number(selected?.retail_unit_price || 0) * kitSize(selected);
  const availableCount = items.filter((item) => item.available).length;
  const configurationCopy = items.length > 1
    ? `${availableCount} of ${items.length} configurations available`
    : productLabel(selected);

  return (
    <article className="bulk-product-card">
      <div className="bulk-product-visual">
        <img src={selected.image || representative.image} alt={name} loading="lazy" decoding="async" />
        <span className={selected.available ? "" : "is-error"}>
          {selected.available ? <Check size={13} /> : <X size={13} />}
          {selected.available ? "Available in complete kits" : "Currently unavailable"}
        </span>
      </div>

      <div className="bulk-product-body">
        <header>
          <span>{representative.categories?.[0] || "Bulk catalog"}</span>
          <h2>{name}</h2>
          <p>{configurationCopy}</p>
        </header>

        {items.length > 1 && (
          <div className="bulk-variant-picker">
            <span>Choose configuration</span>
            <div className="bulk-variant-options" role="radiogroup" aria-label={`${name} configurations`}>
              {items.map((item) => {
                const active = itemKey(item) === itemKey(selected);
                return (
                  <button
                    key={itemKey(item)}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${productLabel(item)}${item.available ? "" : ", unavailable"}`}
                    className={`${active ? "is-active" : ""}${item.available ? "" : " is-unavailable"}`}
                    aria-disabled={!item.available}
                    onClick={() => selectOffer(item)}
                  >
                    {productLabel(item)}{item.available ? "" : " · Unavailable"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bulk-product-pricing">
          <div>
            <span>Bulk price</span>
            <strong>{startingKitPrice(selected, currency)} <small>/ kit</small></strong>
          </div>
          <div className="bulk-price-proof">
            {retailKitPrice > 0 && <del>{money(retailKitPrice, currency)} retail</del>}
            <Savings value={selected?.savings_percent} />
          </div>
        </div>

        {tiers.length > 1 && (
          <div className="bulk-tier-summary" aria-label="Volume pricing tiers">
            {tiers.map((tier) => (
              <span key={`${tier.kits}-${tier.kit_price}`}><b>{tier.kits} kits</b> {money(tier.kit_price, currency)}/kit</span>
            ))}
          </div>
        )}

        <div className="bulk-product-purchase">
          <div>
            <strong>{minimumKits(selected)} Kit{minimumKits(selected) === 1 ? "" : "s"}</strong>
            <small>{Number(selected?.minimum || kitSize(selected))} units of the same SKU</small>
          </div>
          <button type="button" disabled={!selected.available || atMaximum} onClick={() => addLine(selected)}>
            {atMaximum ? "Maximum added" : selectedLine
              ? <><Check size={15} /> {selectedKits} kit{selectedKits === 1 ? "" : "s"} added</>
              : `Add ${minimumKits(selected)} Kit${minimumKits(selected) === 1 ? "" : "s"}`}
          </button>
        </div>
        {!selected.available && <p className="bulk-product-availability is-error">{availabilityCopy(selected)}</p>}
      </div>
    </article>
  );
}

function LineCounter({ product, line, updateLine }) {
  const minimum = minimumKits(product);
  const display = kitCount(product, line.quantity);
  const maximum = maximumKits(product);
  const change = (next) => {
    const normalized = Math.max(minimum, maximum > 0 ? Math.min(maximum, next) : next);
    updateLine(product, normalized * kitSize(product));
  };
  return (
    <div className="bulk-line-counter" aria-label={`${product?.name || "Product"} kits`}>
      <button type="button" onClick={() => change(display - 1)} disabled={display <= minimum}>−</button>
      <span>{display}</span>
      <button type="button" onClick={() => change(display + 1)} disabled={maximum > 0 && display >= maximum}>+</button>
    </div>
  );
}

function BulkCart({ cart, catalogById, quote, quoteState, error, updateLine, removeLine, checkout, checkingOut, close, currency }) {
  const quoteLines = new Map((quote?.lines || []).map((line) => [itemKey(line), line]));
  const orderSummary = cart.reduce((summary, line) => {
    const product = catalogById.get(itemKey(line));
    if (!product) return summary;
    summary.units += Number(line.quantity || 0);
    summary.kits += kitCount(product, line.quantity);
    return summary;
  }, { units: 0, kits: 0 });

  return (
    <aside className="bulk-cart" aria-label="Bulk order">
      <div className="bulk-cart-head">
        <div>
          <span>Bulk cart</span>
          <h2>{cart.length ? `${orderSummary.kits} kit${orderSummary.kits === 1 ? "" : "s"} ready` : "No kits selected"}</h2>
        </div>
        {close && <button type="button" onClick={close} aria-label="Close Bulk cart"><X size={20} /></button>}
      </div>

      <div className="bulk-cart-lines">
        {!cart.length ? (
          <div className="bulk-cart-empty">
            <ShoppingBag size={22} />
            <p>Choose a SKU and add its minimum kit quantity here.</p>
          </div>
        ) : cart.map((line) => {
          const product = catalogById.get(itemKey(line));
          const priced = quoteLines.get(itemKey(line));
          if (!product) return null;
          const kits = kitCount(product, line.quantity);
          return (
            <div className="bulk-cart-line" key={itemKey(line)}>
              <img src={product.image} alt="" loading="lazy" decoding="async" />
              <div className="bulk-cart-line-info">
                <strong>{product.parent_name || product.name}</strong>
                <span>{productLabel(product)}</span>
                <small>{kits} kit{kits === 1 ? "" : "s"} · {line.quantity} total units</small>
                {priced && <Savings value={priced.savings_percent} />}
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
        <p>WooCommerce verifies prices, kit quantities and inventory again before payment.</p>
        {error && <div className="bulk-inline-error" role="alert">{error}</div>}
        <button type="button" className="bulk-checkout" disabled={!cart.length || !quote || quoteState === "loading" || checkingOut} onClick={checkout}>
          <span>{checkingOut ? "Preparing checkout…" : `Continue · ${money(quote?.subtotal || 0, currency)}`}</span>
          {!checkingOut && <ArrowRight size={18} />}
        </button>
      </div>
    </aside>
  );
}

function CodeAccess({ onAccess }) {
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
      await onAccess();
    } catch (requestError) {
      setError(requestError.message || "That access code is not available.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bulk-public-code">
      <div className="bulk-access-mark"><LockKeyhole size={21} /></div>
      <span className="bulk-eyebrow">Already approved?</span>
      <h2>Enter your Access Code</h2>
      <p>A valid code creates a secure temporary session on this device.</p>
      <form onSubmit={submit}>
        <label htmlFor="bulk-code">Access code</label>
        <div className="bulk-code-field">
          <input id="bulk-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" spellCheck="false" placeholder="P1B-••••••-••••••-••••••-••••••" />
          <button type="submit" disabled={!code.trim() || submitting}>{submitting ? "Checking…" : "Unlock catalog"}</button>
        </div>
        {error && <div className="bulk-access-error" role="alert">{error}</div>}
      </form>
      <small>Access can expire or be revoked by Phase One.</small>
    </section>
  );
}

function RequestAccess({ account, refresh }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const authenticated = Boolean(account?.authenticated);
  const customer = account?.customer || null;
  const currentRequest = account?.request || null;
  const pending = currentRequest?.status === "pending";
  const approved = customer?.tier === "special";
  const eligible = Boolean(customer?.eligible);

  const submit = async (event) => {
    event.preventDefault();
    if (!eligible || pending || approved || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/bulk/access-request", { method: "POST", body: JSON.stringify({ note }) });
      setNote("");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Your request could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bulk-public-request">
      <span className="bulk-eyebrow">Request access</span>
      <h2>Apply for Bulk pricing</h2>
      {!authenticated ? (
        <>
          <p>Sign in so we can verify your completed-order history and prefill your application.</p>
          <a className="bulk-primary-link" href="/account">Sign in to request access <ArrowRight size={17} /></a>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="bulk-customer-summary">
            <div><span>Customer</span><strong>{customer?.name || "Account customer"}</strong><small>{customer?.email}</small></div>
            <div><span>Completed orders</span><strong>{Number(customer?.completed_orders || 0)}</strong><small>{eligible ? "Eligible to apply" : "Not yet eligible"}</small></div>
          </div>
          {approved ? (
            <div className="bulk-request-status is-approved"><UserCheck size={18} /> Access approved. Refreshing this page will open your private catalog.</div>
          ) : pending ? (
            <div className="bulk-request-status"><Clock3 size={18} /> Request received. Phase One will review it manually.</div>
          ) : (
            <>
              <label htmlFor="bulk-request-note">Anything we should know? <span>Optional</span></label>
              <textarea id="bulk-request-note" rows="3" maxLength="1000" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Expected volume, products of interest, or purchasing context." />
              <button className="bulk-request-button" type="submit" disabled={!eligible || submitting}>
                {submitting ? "Sending request…" : currentRequest ? "Request access again" : "Request Bulk Access"}
                {!submitting && <ArrowRight size={17} />}
              </button>
              {!eligible && <small>Complete at least one order before applying. Approval is never automatic.</small>}
            </>
          )}
          {error && <div className="bulk-access-error" role="alert">{error}</div>}
        </form>
      )}
    </section>
  );
}

function PublicBulkPage({ program, account, refreshAccount, onAccess, warning }) {
  const kitUnits = Number(program?.kit_units || 0);
  const defaultMinimum = Number(program?.default_minimum || 0);
  const maximumSavings = Number(program?.max_savings_percent || 0);
  const savingsCopy = maximumSavings > 0 ? `Save up to ${percentage(maximumSavings)}%` : "Private volume pricing";
  const minimumCopy = kitUnits > 0 && defaultMinimum > 0
    ? `${Math.max(1, Math.ceil(defaultMinimum / kitUnits))} kit minimum per SKU`
    : "Complete-kit minimums";

  return (
    <main className="bulk-public-page">
      <div className="bulk-public-shell">
        <section className="bulk-public-hero">
          <div className="bulk-public-hero-copy">
            <span className="bulk-eyebrow">Phase One / Bulk Orders</span>
            <h1>{program?.title || "Bulk Orders"}</h1>
            <strong>{savingsCopy}</strong>
            <p>{program?.intro || "Approved customers receive access to private bulk pricing."}</p>
          </div>
          <div className="bulk-public-proof" aria-label="Bulk program requirements">
            <span><ShieldCheck size={18} /> Manually approved</span>
            <span><Boxes size={18} /> {minimumCopy}</span>
            <span><PackageCheck size={18} /> Same SKU per kit</span>
          </div>
        </section>

        {warning && <div className="bulk-public-warning" role="status">{warning}</div>}

        <section className="bulk-public-explainer">
          <div>
            <span className="bulk-section-number">01</span>
            <h2>Built for repeat purchasing</h2>
          </div>
          <p>Approved customers receive private pricing without mixing Bulk items with regular store promotions or the retail cart.</p>
        </section>

        <div className="bulk-public-steps">
          <article><strong>Qualify</strong><p>At least one previous completed order is required before your account can be considered.</p></article>
          <article><strong>Get approved</strong><p>Phase One reviews every request manually. Eligibility does not grant access automatically.</p></article>
          <article><strong>Order by kit</strong><p>{kitUnits > 0 ? `${kitUnits} units of the same SKU equal one kit.` : "Each kit contains a fixed number of units from the same SKU."}</p></article>
        </div>

        <div className="bulk-public-actions">
          <RequestAccess account={account} refresh={refreshAccount} />
          <CodeAccess onAccess={onAccess} />
        </div>
      </div>
    </main>
  );
}

export default function BulkOrders() {
  const [status, setStatus] = useState("checking");
  const [program, setProgram] = useState(null);
  const [account, setAccount] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [currency, setCurrency] = useState("USD");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [cart, setCart] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState("idle");
  const [error, setError] = useState("");
  const [publicWarning, setPublicWarning] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [accessSource, setAccessSource] = useState("");
  const [selectedOffers, setSelectedOffers] = useState({});

  const refreshAccount = async () => {
    const data = await api("/api/bulk/customer-access");
    setAccount(data);
    return data;
  };

  const loadCatalog = async () => {
    setStatus("loading");
    setError("");
    try {
      const data = await api("/api/bulk/catalog");
      setAccessSource(String(data.access_source || "code"));
      setCatalog(Array.isArray(data.items) ? data.items : []);
      setCurrency(String(data.currency || "USD"));
      setStatus("ready");
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) setStatus("locked");
      else {
        setStatus("error");
        setError(requestError.message || "The Bulk catalog is temporarily unavailable.");
      }
    }
  };

  const checkAccess = async () => {
    try {
      const data = await api("/api/bulk/session");
      setAccessSource(String(data.access_source || "code"));
      await loadCatalog();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) setStatus("locked");
      else {
        setStatus("error");
        setError(requestError.message || "Bulk access is temporarily unavailable.");
      }
    }
  };

  useEffect(() => {
    try {
      setCart(cleanStoredCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    api("/api/bulk/program")
      .then((data) => setProgram(data?.program || null))
      .catch(() => setPublicWarning("Live program details are temporarily unavailable."));
    refreshAccount().catch(() => setAccount({ authenticated: false, customer: null, request: null }));
    checkAccess();
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const byId = new Map(catalog.map((item) => [itemKey(item), item]));
    setCart((current) => {
      const cleaned = current.flatMap((line) => {
        const item = byId.get(itemKey(line));
        if (!item || !item.available) return [];
        const size = kitSize(item);
        const normalized = Math.max(Number(item.minimum || size), Math.ceil(Number(line.quantity || 0) / size) * size);
        const maximum = Math.max(0, Number(item.maximum || 0));
        if (maximum > 0 && normalized > maximum) return [];
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
        if (requestError.status === 401 || requestError.status === 403) {
          setStatus("locked");
          setQuote(null);
          return;
        }
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
      const itemCategories = Array.isArray(item?.categories) ? item.categories : [];
      if (category !== "All products" && !itemCategories.includes(category)) continue;
      const haystack = `${item.parent_name} ${item.name} ${item.sku} ${itemCategories.join(" ")}`.toLowerCase();
      if (normalized && !haystack.includes(normalized)) continue;
      const family = item.parent_name || item.name;
      if (!result.has(family)) result.set(family, []);
      result.get(family).push(item);
    }
    return Array.from(result.entries()).sort(([leftName, leftItems], [rightName, rightItems]) => {
      const left = catalogFamilySortData(leftName, leftItems);
      const right = catalogFamilySortData(rightName, rightItems);
      if (left.rank !== right.rank) return left.rank - right.rank;
      if (left.strength !== right.strength) return left.strength - right.strength;
      return leftName.localeCompare(rightName);
    });
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
    if (!item?.available) return;
    const existing = cart.find((line) => itemKey(line) === itemKey(item));
    setLine(item, existing ? Number(existing.quantity) + kitSize(item) : Number(item.minimum || kitSize(item)));
  };

  const checkout = async () => {
    if (!quote || checkingOut) return;
    setCheckingOut(true);
    setError("");
    try {
      await api("/api/bulk/checkout-intent", { method: "POST", body: JSON.stringify({ items: cart }) });
      window.location.assign("/checkout?mode=bulk");
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        setStatus("locked");
        setCheckingOut(false);
        return;
      }
      setError(requestError.message || "Bulk checkout could not be prepared.");
      setCheckingOut(false);
    }
  };

  const logout = async () => {
    await api("/api/bulk/session", { method: "DELETE" }).catch(() => null);
    setCatalog([]);
    setQuote(null);
    setAccessSource("");
    setStatus("locked");
  };

  if (status === "checking" || status === "loading") {
    return <main className="bulk-state"><PackageCheck size={24} /><p>{status === "checking" ? "Checking Bulk access…" : "Loading Bulk catalog…"}</p></main>;
  }
  if (status === "locked") {
    return <PublicBulkPage program={program} account={account} refreshAccount={refreshAccount} onAccess={checkAccess} warning={publicWarning} />;
  }
  if (status === "error") {
    return <main className="bulk-state"><p>{error}</p><button type="button" onClick={checkAccess}>Try again</button></main>;
  }

  const maximumSavings = Number(program?.max_savings_percent || 0);
  const heroSavings = maximumSavings > 0 ? `Save up to ${percentage(maximumSavings)}%` : "Private volume pricing";
  const removeLine = (line) => setCart((current) => current.filter((entry) => itemKey(entry) !== itemKey(line)));
  return (
    <main className="bulk-page">
      <div className="bulk-shell">
        <section className="bulk-hero">
          <div className="bulk-hero-copy">
            <span className="bulk-eyebrow">Phase One / Private bulk access</span>
            <h1>Buy by the kit. <em>{heroSavings}.</em></h1>
            <p>Every kit contains one SKU only. Prices, savings and inventory come directly from WooCommerce.</p>
          </div>
          {accessSource === "code" && <button type="button" className="bulk-end-session" onClick={logout}><LogOut size={16} /> End temporary session</button>}
        </section>

        <section className="bulk-commercial-points" aria-label="Bulk order benefits">
          <article><BadgeDollarSign size={19} aria-hidden="true" /><div><strong>Real savings shown</strong><span>Compared with current retail pricing</span></div></article>
          <article><Boxes size={19} aria-hidden="true" /><div><strong>Kit-based ordering</strong><span>One SKU per complete kit</span></div></article>
          <article><PackageCheck size={19} aria-hidden="true" /><div><strong>Inventory checked</strong><span>Availability confirmed before payment</span></div></article>
          <article><ShieldCheck size={19} aria-hidden="true" /><div><strong>Server-side pricing</strong><span>Every total is verified by WooCommerce</span></div></article>
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
            {!groups.length ? <div className="bulk-no-results">No Bulk products match these filters.</div> : groups.map(([name, items]) => (
              <ProductFamily
                key={name}
                name={name}
                items={items}
                cart={cart}
                currency={currency}
                addLine={addLine}
                selectedKey={selectedOffers[name]}
                selectOffer={(item) => setSelectedOffers((current) => ({ ...current, [name]: itemKey(item) }))}
              />
            ))}
          </section>

          <div className="bulk-cart-desktop">
            <BulkCart cart={cart} catalogById={catalogById} quote={quote} quoteState={quoteState} error={error} updateLine={setLine} removeLine={removeLine} checkout={checkout} checkingOut={checkingOut} currency={currency} />
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
          <BulkCart cart={cart} catalogById={catalogById} quote={quote} quoteState={quoteState} error={error} updateLine={setLine} removeLine={removeLine} checkout={checkout} checkingOut={checkingOut} close={() => setCartOpen(false)} currency={currency} />
        </div>
      )}
    </main>
  );
}
