import "./AccountCoas.styles.css";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Loader2,
  PackageSearch,
  Search,
  X,
} from "lucide-react";
import { getClientAuthToken } from "../../lib/authClient";
import { formatCoaDate } from "../../lib/coaModel.js";

function getInitialOrderFilter() {
  if (typeof window === "undefined") return "";
  return String(new URLSearchParams(window.location.search).get("order") || "")
    .replace(/^#/, "")
    .trim();
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      ...item,
      key: String(item.key || `${item.order_id || "order"}:${index}`),
      status: item.status === "available" ? "available" : "pending",
      product_name: String(item.product_name || "Purchased product"),
      product_options: Array.isArray(item.product_options)
        ? item.product_options.filter(Boolean).map(String)
        : [],
      order_number: String(item.order_number || item.order_id || ""),
      lot: String(item.lot || item.coa?.lot || ""),
      association: String(item.association || "pending"),
    }));
}

function CoaMetric({ label, value }) {
  return (
    <div className="account-coas__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CoaRow({ item, grouped = false }) {
  const available = item.status === "available" && item.coa?.view_url;
  const detail = item.coa?.strength || item.product_options.join(" · ");
  const viewLabel = item.coa?.file_kind === "image" ? "View image" : "View COA";
  const statusLabel = available ? "Order lot" : "Pending";

  return (
    <article className={`account-coa-row account-coa-row--${item.status}`}>
      <div className="account-coa-row__image">
        {item.product_image ? (
          <img
            src={item.product_image}
            alt=""
            width="76"
            height="76"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <FlaskConical size={22} aria-hidden="true" />
        )}
      </div>

      <div className="account-coa-row__main">
        <div className="account-coa-row__heading">
          <div>
            {!grouped ? (
              <p className="account-coa-row__order">
                <a href="/account#orders">Order #{item.order_number}</a>
                <span aria-hidden="true">·</span>
                <time dateTime={item.purchase_date || undefined}>
                  {formatCoaDate(item.purchase_date, "Purchase date unavailable")}
                </time>
              </p>
            ) : null}
            <h3>{item.product_name}</h3>
            {detail ? <p className="account-coa-row__variant">{detail}</p> : null}
          </div>

          <span className={`account-coa-row__status account-coa-row__status--${item.status}`}>
            {available ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {statusLabel}
          </span>
        </div>

        {available ? (
          <dl className="account-coa-row__facts">
            <div>
              <dt>Lot / Batch</dt>
              <dd>{item.lot || "Not provided"}</dd>
            </div>
            <div>
              <dt>Tested</dt>
              <dd>{formatCoaDate(item.coa.testing_date, "Not provided")}</dd>
            </div>
            {item.coa.laboratory ? (
              <div>
                <dt>Laboratory</dt>
                <dd>{item.coa.laboratory}</dd>
              </div>
            ) : null}
            {item.coa.purity ? (
              <div>
                <dt>Result</dt>
                <dd>{item.coa.purity}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="account-coa-row__pending">
            {item.message ||
              "COA pending — lot information has not been assigned to this order."}
          </p>
        )}
      </div>

      <div className="account-coa-row__actions">
        {available ? (
          <>
            <a
              href={item.coa.view_url}
              target="_blank"
              rel="noreferrer noopener"
              className="account-coa-action account-coa-action--primary"
              aria-label={`${viewLabel} for ${item.product_name}, lot ${item.lot}`}
            >
              <ExternalLink size={15} />
              {viewLabel}
            </a>
            {item.coa.download_url ? (
              <a
                href={item.coa.download_url}
                target="_blank"
                rel="noreferrer noopener"
                download
                className="account-coa-action"
                aria-label={`Download PDF for ${item.product_name}, lot ${item.lot}`}
              >
                <Download size={15} />
                Download PDF
              </a>
            ) : null}
          </>
        ) : (
          <span className="account-coa-row__waiting">
            <PackageSearch size={15} />
            Awaiting lot assignment
          </span>
        )}
      </div>
    </article>
  );
}

export default function AccountCoas() {
  const [status, setStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState(getInitialOrderFilter);
  const [visibleCount, setVisibleCount] = useState(12);

  const loadCoas = async () => {
    setStatus("loading");
    setError("");

    try {
      const token = getClientAuthToken();
      const requestUrl = new URL("/api/account/coas", window.location.origin);
      if (orderFilter) requestUrl.searchParams.set("order", orderFilter);

      const response = await fetch(requestUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Your COAs could not be loaded.");
      }

      setItems(normalizeItems(data?.items));
      setSummary(data?.summary && typeof data.summary === "object" ? data.summary : {});
      setStatus("ready");
    } catch (loadError) {
      setItems([]);
      setSummary({});
      setError(loadError?.message || "Your COAs could not be loaded.");
      setStatus("error");
    }
  };

  useEffect(() => {
    loadCoas();
  }, [orderFilter]);

  useEffect(() => {
    setVisibleCount(12);
  }, [filter, search, items]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!term) return true;
      return [
        item.product_name,
        item.order_number,
        item.lot,
        item.sku,
        item.coa?.laboratory,
        item.coa?.number,
        ...item.product_options,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, items, search]);

  const availableCount = items.filter((item) => item.status === "available").length;
  const pendingCount = items.length - availableCount;
  const showControls = items.length >= 6;
  const renderedItems = visibleItems.slice(0, visibleCount);
  const orderGroups = useMemo(() => {
    const groups = new Map();
    renderedItems.forEach((item) => {
      const key = String(item.order_id || item.order_number || "order");
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          number: item.order_number,
          date: item.purchase_date,
          status: item.order_status,
          items: [],
        });
      }
      groups.get(key).items.push(item);
    });
    return Array.from(groups.values());
  }, [renderedItems]);

  return (
    <section className="account-coas" aria-labelledby="account-coas-title">
      <header className="account-coas__header">
        <div>
          <p className="account-coas__eyebrow">Certificate library</p>
          <h2 id="account-coas-title">My COAs</h2>
          <p>Certificates of Analysis for products associated with your orders.</p>
        </div>
        <FileCheck2 size={24} aria-hidden="true" />
      </header>

      {status === "loading" ? (
        <div className="account-coas__state" role="status">
          <Loader2 className="account-coas__spinner" size={22} />
          <div>
            <strong>Loading your certificates</strong>
            <span>Checking the COA snapshots saved with your orders.</span>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="account-coas__state account-coas__state--error" role="alert">
          <AlertCircle size={22} />
          <div>
            <strong>COAs are temporarily unavailable</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={loadCoas}>Try again</button>
        </div>
      ) : null}

      {status === "ready" ? (
        <>
          {orderFilter ? (
            <div className="account-coas__scope">
              <span>Showing Order #{orderFilter}</span>
              <a href="/account/coas" onClick={() => setOrderFilter("")}>
                <X size={14} />
                Show all
              </a>
            </div>
          ) : null}

          <div className="account-coas__metrics" aria-label="COA summary">
            <CoaMetric
              label="Available COAs"
              value={Number(summary.available_coas ?? availableCount).toLocaleString("en-US")}
            />
            <CoaMetric
              label="Products with COAs"
              value={Number(summary.products_purchased ?? items.length).toLocaleString("en-US")}
            />
            {summary.most_recent_testing_date ? (
              <CoaMetric
                label="Most recent test"
                value={formatCoaDate(summary.most_recent_testing_date)}
              />
            ) : pendingCount > 0 ? (
              <CoaMetric label="Pending assignment" value={pendingCount.toLocaleString("en-US")} />
            ) : null}
          </div>

          {showControls ? (
            <div className="account-coas__controls">
              <label className="account-coas__search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search your COAs</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, lot or order"
                />
              </label>
              <div className="account-coas__filters" aria-label="Filter certificates">
                {[
                  ["all", `All ${items.length}`],
                  ["available", `Available ${availableCount}`],
                  ["pending", `Pending ${pendingCount}`],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="account-coas__empty">
              <FlaskConical size={24} aria-hidden="true" />
              <h3>{orderFilter ? "No COA records for this order" : "No COAs yet"}</h3>
              <p>
                {orderFilter
                  ? "This order has no products associated with the COA library."
                  : "Certificates appear automatically when an order contains a product with a matching COA."}
              </p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="account-coas__empty account-coas__empty--compact">
              <Search size={21} aria-hidden="true" />
              <h3>No matching certificates</h3>
              <p>Try a different product, lot, order number or status.</p>
            </div>
          ) : (
            <>
              <div className="account-coas__list">
                {orderGroups.map((group) => (
                  <section className="account-coa-order" key={group.key}>
                    <header className="account-coa-order__header">
                      <div>
                        <a href="/account#orders">Order #{group.number}</a>
                        <time dateTime={group.date || undefined}>
                          {formatCoaDate(group.date, "Purchase date unavailable")}
                        </time>
                      </div>
                      <span>
                        {group.items.length} product{group.items.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <div className="account-coa-order__items">
                      {group.items.map((item) => (
                        <CoaRow key={item.key} item={item} grouped />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {visibleItems.length > renderedItems.length ? (
                <button
                  type="button"
                  className="account-coas__more"
                  onClick={() => setVisibleCount((count) => count + 12)}
                >
                  Show 12 more
                </button>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
