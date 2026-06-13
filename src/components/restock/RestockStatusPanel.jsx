import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const fallbackApiUrl = "/wp-json/phase/v1/restocks";

const statusFilters = [
  "All",
  "Coming Soon",
  "In Testing",
  "Expected Soon",
  "Restocked",
  "Delayed",
  "TBA",
];

const statusOrder = {
  "coming soon": 1,
  "in testing": 2,
  "in review": 2,
  "expected soon": 3,
  restocked: 4,
  delayed: 5,
  tba: 6,
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.%\s-/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDisplayStatus(status) {
  const clean = normalizeText(status);

  if (clean.includes("review") || clean.includes("testing")) {
    return "In Testing";
  }

  return status || "TBA";
}

function getStatusClasses(status) {
  const clean = normalizeText(status);

  if (clean.includes("restocked")) {
    return "border-emerald-300/20 bg-emerald-300/[0.09] text-emerald-100 shadow-[0_0_22px_rgba(110,231,183,0.06)]";
  }

  if (clean.includes("delayed")) {
    return "border-rose-300/20 bg-rose-400/[0.075] text-rose-100 shadow-[0_0_22px_rgba(251,113,133,0.06)]";
  }

  if (clean.includes("review") || clean.includes("testing")) {
    return "border-blue-300/20 bg-blue-300/[0.075] text-blue-100 shadow-[0_0_22px_rgba(147,197,253,0.06)]";
  }

  if (clean.includes("expected")) {
    return "border-cyan-300/20 bg-cyan-300/[0.085] text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,0.07)]";
  }

  if (clean.includes("tba")) {
    return "border-white/10 bg-white/[0.04] text-slate-400";
  }

  return "border-cyan-300/18 bg-cyan-300/[0.065] text-cyan-100";
}

function getEstimateProgress(status, eta) {
  const cleanStatus = normalizeText(status);
  const cleanEta = normalizeText(eta);

  if (cleanStatus.includes("restocked")) return 100;
  if (cleanStatus.includes("expected")) return 82;
  if (cleanStatus.includes("review") || cleanStatus.includes("testing")) return 58;
  if (cleanStatus.includes("coming")) return 28;
  if (cleanStatus.includes("delayed")) return 18;
  if (cleanStatus.includes("tba") || cleanEta.includes("tba")) return 8;

  return 35;
}

function getEstimateLabel(status, eta) {
  const cleanStatus = normalizeText(status);
  const cleanEta = normalizeText(eta);

  if (cleanStatus.includes("restocked")) return "Available now";

  if (cleanStatus.includes("expected")) {
    return eta && cleanEta !== "tba" ? eta : "Expected soon";
  }

  if (cleanStatus.includes("review") || cleanStatus.includes("testing")) return "In testing";
  if (cleanStatus.includes("coming")) return "Early pipeline";
  if (cleanStatus.includes("delayed")) return "Delayed";
  if (eta && cleanEta !== "tba") return eta;

  return "Timeline pending";
}

function getNotifyLabel(item) {
  const cleanStatus = normalizeText(item.status);

  if (cleanStatus.includes("restocked")) {
    return "Available";
  }

  return "Notify Me";
}

function TinyStat({ label, value, accent = false }) {
  return (
    <div className="rounded-[1.1rem] border border-cyan-200/10 bg-white/[0.025] px-3 py-3 text-center backdrop-blur sm:rounded-2xl sm:px-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[9px] sm:tracking-[0.18em]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-semibold tracking-[-0.04em] sm:text-2xl ${
          accent ? "text-cyan-100" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }) {
  const cleanStatus = normalizeText(status);

  return (
    <span
      className={`inline-flex w-fit items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.14em] ${getStatusClasses(
        status
      )}`}
    >
      {cleanStatus.includes("restocked") ? (
        <CheckCircle2 size={12} />
      ) : (
        <Clock3 size={12} />
      )}

      {getDisplayStatus(status)}
    </span>
  );
}

function EstimateProgress({ status, eta }) {
  const progress = getEstimateProgress(status, eta);
  const label = getEstimateLabel(status, eta);
  const cleanStatus = normalizeText(status);
  const isDelayed = cleanStatus.includes("delayed");
  const isRestocked = cleanStatus.includes("restocked");

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-300 sm:text-[10px] sm:tracking-[0.16em]">
          {label}
        </p>

        <p
          className={`shrink-0 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.14em] ${
            isRestocked
              ? "text-emerald-200/80"
              : isDelayed
              ? "text-rose-200/80"
              : "text-cyan-200/70"
          }`}
        >
          {progress}%
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full border border-cyan-200/10 bg-white/[0.055]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
            isRestocked
              ? "bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.35)]"
              : isDelayed
              ? "bg-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.28)]"
              : "bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.35)]"
          }`}
          style={{ width: `${progress}%` }}
        />

        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
      </div>
    </div>
  );
}

function StatusToggle({ value, onChange }) {
  return (
    <div className="restock-status-scroll flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {statusFilters.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] transition sm:text-[8.5px] sm:tracking-[0.13em] ${
            value === option
              ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.06)]"
              : "border-cyan-200/8 bg-white/[0.018] text-slate-600 hover:border-cyan-200/18 hover:bg-white/[0.035] hover:text-cyan-100"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function NotifyModal({ item, onClose }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [messageTitle, setMessageTitle] = useState("");

  if (!item) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!item.productId) {
      setStatus("error");
      setMessageTitle("Notification unavailable");
      setMessage("This product is not ready for notifications yet.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      setMessageTitle("");

      const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;

      if (!wpSiteUrl) {
        throw new Error("PUBLIC_WP_SITE_URL is missing in your .env file.");
      }

      const endpoint = `${wpSiteUrl.replace(
        /\/$/,
        ""
      )}/wp-json/phase/v1/restock-subscribe`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          productId: item.productId,
          productName: item.productName,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();

        console.error("Expected JSON but received:", text.slice(0, 300));
        console.error("Endpoint used:", endpoint);

        throw new Error(
          "The server returned HTML instead of JSON. Check your WordPress endpoint URL."
        );
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to save notification.");
      }

      setStatus("success");

      if (data.alreadySubscribed) {
        setMessageTitle("You're already on the list");
        setMessage(
          "This email is already registered for this item. We'll notify you when it becomes available."
        );
      } else {
        setMessageTitle("You're on the list");
        setMessage(
          "We saved your email successfully. We'll notify you as soon as this item becomes available."
        );
      }

      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessageTitle("Something went wrong");
      setMessage(
        error.message ||
          "Something went wrong. Please try again or use the product page."
      );
    }
  };

  const hasMessage = message && status !== "loading";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#020617]/82 backdrop-blur-xl"
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[1.55rem] border border-cyan-200/10 bg-[#07111f] p-4 text-white shadow-[0_30px_120px_rgba(0,0,0,0.6)] sm:rounded-[1.7rem] sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/[0.09] via-transparent to-blue-500/[0.045]" />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.24em]">
                Restock Alert
              </p>

              <h3 className="mt-2 text-[22px] font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-2xl">
                Notify me about {item.productName || "this item"}
              </h3>

              <p className="mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm">
                Enter your email to receive a restock alert for this item.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-500 transition hover:text-cyan-100"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <StatusPill status={item.status} />

            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]">
              Estimate: {item.eta || "TBA"}
            </span>
          </div>

          {hasMessage && (
            <div
              className={`mb-5 rounded-[1.25rem] border p-4 sm:rounded-[1.35rem] ${
                status === "success"
                  ? "border-cyan-200/15 bg-cyan-300/[0.075]"
                  : "border-red-300/20 bg-red-500/[0.075]"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border sm:h-11 sm:w-11 ${
                    status === "success"
                      ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100"
                      : "border-red-300/20 bg-red-500/[0.12] text-red-100"
                  }`}
                >
                  {status === "success" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                </div>

                <div>
                  <p
                    className={`text-[15px] font-semibold tracking-[-0.025em] ${
                      status === "success" ? "text-cyan-50" : "text-red-50"
                    }`}
                  >
                    {messageTitle}
                  </p>

                  <p
                    className={`mt-1 text-sm leading-6 ${
                      status === "success"
                        ? "text-cyan-100/75"
                        : "text-red-100/75"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col overflow-hidden rounded-2xl border border-cyan-200/10 bg-[#020617]/70 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="min-h-[52px] flex-1 bg-transparent px-5 text-sm font-medium text-white outline-none placeholder:text-slate-600"
              />

              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 bg-cyan-300 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Bell size={14} />
                    Notify Me
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RestockTableRow({ item, onNotify }) {
  const cleanStatus = normalizeText(item.status);
  const isRestocked = cleanStatus.includes("restocked");
  const productName =
    item.productName || item.linkedProductName || "Restock item";

  return (
    <div className="group border-t border-white/[0.075] px-4 py-4 transition hover:bg-cyan-300/[0.025] sm:px-5 sm:py-5 md:grid md:grid-cols-[minmax(220px,1.25fr)_170px_280px_190px] md:items-center md:gap-4 md:px-6">
      {/* Mobile card */}
      <div className="md:hidden">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/40">
              Product
            </p>

            <h4 className="text-[18px] font-semibold leading-[1.05] tracking-[-0.045em] text-white">
              {productName}
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Restock availability update
            </p>
          </div>

          <StatusPill status={item.status} />
        </div>

        <div className="rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-3.5">
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/40">
            Estimate
          </p>

          <EstimateProgress status={item.status} eta={item.eta} />
        </div>

        <button
          type="button"
          onClick={() => onNotify(item)}
          disabled={!item.productId && !item.notifyType}
          className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border px-5 text-[9px] font-black uppercase tracking-[0.16em] transition ${
            isRestocked
              ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.13]"
              : "border-cyan-200/20 bg-cyan-300/[0.1] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.18] hover:text-white"
          }`}
        >
          <Bell size={13} />
          {getNotifyLabel(item)}
        </button>
      </div>

      {/* Desktop table row */}
      <div className="hidden min-w-0 md:block">
        <h4 className="text-[18px] font-semibold tracking-[-0.04em] text-white sm:text-[20px]">
          {productName}
        </h4>

        <p className="mt-1 text-xs text-slate-500">
          Restock availability update
        </p>
      </div>

      <div className="hidden w-full items-center md:flex md:justify-center">
        <StatusPill status={item.status} />
      </div>

      <div className="hidden w-full items-center md:flex md:justify-center">
        <div className="w-full max-w-[280px]">
          <EstimateProgress status={item.status} eta={item.eta} />
        </div>
      </div>

      <div className="hidden w-full items-center md:flex md:justify-center">
        <button
          type="button"
          onClick={() => onNotify(item)}
          disabled={!item.productId && !item.notifyType}
          className={`inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border px-5 text-[10px] font-black uppercase tracking-[0.18em] transition md:w-[170px] ${
            isRestocked
              ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.13]"
              : "border-cyan-200/20 bg-cyan-300/[0.1] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.18] hover:text-white"
          }`}
        >
          <Bell size={13} />
          {getNotifyLabel(item)}
        </button>
      </div>
    </div>
  );
}

export default function RestockStatusPanel() {
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [payload, setPayload] = useState({
    updatedAt: null,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotifyItem, setSelectedNotifyItem] = useState(null);

  const apiUrl = import.meta.env.PUBLIC_RESTOCK_API_URL || fallbackApiUrl;

  const loadRestocks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      setPayload({
        updatedAt: data.updatedAt || data.updated_at || null,
        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch (err) {
      setError("Unable to load restock status right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestocks();
  }, [apiUrl]);

  const filteredItems = useMemo(() => {
    const cleanQuery = normalizeText(query);

    return payload.items
      .filter((item) => {
        const itemStatus = normalizeText(item.status);
        const selectedStatus = normalizeText(activeStatus);

        const matchesStatus =
          activeStatus === "All" ||
          item.status === activeStatus ||
          itemStatus === selectedStatus ||
          (selectedStatus === "in testing" &&
            (itemStatus.includes("review") || itemStatus.includes("testing")));

        const searchable = normalizeText(
          [item.productName, item.linkedProductName, item.status, item.eta].join(
            " "
          )
        );

        const matchesSearch = !cleanQuery || searchable.includes(cleanQuery);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const aRank = statusOrder[normalizeText(a.status)] || 99;
        const bRank = statusOrder[normalizeText(b.status)] || 99;

        return aRank - bRank;
      });
  }, [payload.items, query, activeStatus]);

  const expectedSoon = payload.items.filter(
    (item) => item.status === "Expected Soon"
  ).length;

  const comingSoon = payload.items.filter(
    (item) => item.status === "Coming Soon"
  ).length;

  const restocked = payload.items.filter((item) =>
    normalizeText(item.status).includes("restocked")
  ).length;

  const hasActiveFilters = query.trim() || activeStatus !== "All";

  const clearAll = () => {
    setQuery("");
    setActiveStatus("All");
  };

  return (
    <>
      <section className="relative overflow-hidden px-5 py-10 text-white sm:px-6 sm:py-14 lg:py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[5%] lg:top-12 lg:h-80 lg:w-80 lg:translate-x-0 lg:blur-[140px]" />
          <div className="absolute right-[-28%] top-[24%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-8%] lg:h-96 lg:w-96 lg:blur-[150px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Header */}
          <div className="mx-auto mb-8 flex max-w-4xl flex-col items-center text-center lg:mx-0 lg:mb-10 lg:items-start lg:text-left">
            <div className="mb-4 inline-flex items-center justify-center gap-3 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
                Restock Status
              </span>
            </div>

            <h2 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[52px] lg:mx-0 lg:text-[64px] lg:leading-[1.02] lg:tracking-[-0.065em]">
              Track product
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
                availability.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-base lg:mx-0">
              View current restock status, estimated availability windows, and
              sign up for product-specific alerts.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-7 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.18)] backdrop-blur sm:rounded-[1.7rem]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/65"
                />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search product, status, estimate..."
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/70 py-3.5 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/90 sm:py-4"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-500 transition hover:text-cyan-100"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TinyStat label="Items" value={payload.items.length} />
                <TinyStat
                  label="Soon"
                  value={expectedSoon + comingSoon}
                  accent
                />
                <TinyStat label="Live" value={restocked} />
              </div>
            </div>

            <div className="mt-4 border-t border-cyan-200/10 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/40">
                  Filter by status
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:text-cyan-100 sm:text-[9px]"
                  >
                    <X size={11} />
                    Reset
                  </button>
                )}
              </div>

              <StatusToggle value={activeStatus} onChange={setActiveStatus} />
            </div>
          </div>

          {/* List header */}
          <div className="mb-5 flex flex-row items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]">
                Availability Records
              </p>

              <h3 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                Restock list
              </h3>

              <p className="mt-1 text-xs text-slate-500 sm:mt-2">
                Showing{" "}
                <span className="font-semibold text-white">
                  {filteredItems.length}
                </span>{" "}
                update{filteredItems.length === 1 ? "" : "s"}.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRestocks}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/[0.1] sm:text-[9px] sm:tracking-[0.18em]"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {/* Table/card container */}
          <div className="overflow-hidden rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 shadow-[0_30px_120px_rgba(0,0,0,0.2)] backdrop-blur sm:rounded-[1.7rem]">
            <div className="hidden bg-white/[0.025] px-5 py-4 md:grid md:grid-cols-[minmax(220px,1.25fr)_170px_280px_190px] md:items-center md:gap-4 md:px-6">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45">
                Product
              </p>

              <p className="text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45">
                Status
              </p>

              <p className="text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45">
                Estimate
              </p>

              <p className="text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45">
                Notify
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]">
                <Loader2 className="animate-spin text-cyan-200" size={28} />

                <p className="mt-4 text-sm text-slate-400">
                  Loading restock status...
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]">
                <AlertTriangle className="text-red-200" size={28} />

                <p className="mt-4 text-sm text-red-100/75">{error}</p>

                <button
                  type="button"
                  onClick={loadRestocks}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-500/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100"
                >
                  <RefreshCw size={13} />
                  Try Again
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]">
                <PackageSearch size={30} className="text-cyan-200" />

                <h4 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                  No restock updates found
                </h4>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  Try searching by product name, status, or estimated restock
                  window.
                </p>
              </div>
            ) : (
              <div>
                {filteredItems.map((item) => (
                  <RestockTableRow
                    key={item.id}
                    item={item}
                    onNotify={setSelectedNotifyItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notice */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-cyan-200"
              />

              <p className="text-xs leading-5 text-slate-400">
                Availability timelines are updated regularly and may change based
                on supplier, batch, and fulfillment status.
              </p>
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]">
              Last sync:{" "}
              <span className="text-slate-400">
                {payload.updatedAt
                  ? new Date(payload.updatedAt).toLocaleString()
                  : "Not available"}
              </span>
            </p>
          </div>
        </div>
      </section>

      <NotifyModal
        item={selectedNotifyItem}
        onClose={() => setSelectedNotifyItem(null)}
      />

      <style>{`
        .restock-status-scroll {
          scrollbar-width: none;
        }

        .restock-status-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}