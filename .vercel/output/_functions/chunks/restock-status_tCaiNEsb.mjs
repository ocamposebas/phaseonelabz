import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { useState, useEffect, useMemo } from 'react';
import { Search, X, RefreshCw, Loader2, AlertTriangle, PackageSearch, ShieldCheck, Bell, CheckCircle2, Clock3 } from 'lucide-react';
import { N as NewsletterSection, S as SiteFooter } from './NewsletterSection_RYopaVGa.mjs';

const statusFilters = [
  "All",
  "Coming Soon",
  "In Review",
  "Expected Soon",
  "Restocked",
  "Delayed",
  "TBA"
];
const statusOrder = {
  "coming soon": 1,
  "in review": 2,
  "expected soon": 3,
  restocked: 4,
  delayed: 5,
  tba: 6
};
function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.%\s-/+]/g, " ").replace(/\s+/g, " ").trim();
}
function getStatusClasses(status) {
  const clean = normalizeText(status);
  if (clean.includes("restocked")) {
    return "border-emerald-300/20 bg-emerald-300/[0.09] text-emerald-100 shadow-[0_0_22px_rgba(110,231,183,0.06)]";
  }
  if (clean.includes("delayed")) {
    return "border-rose-300/20 bg-rose-400/[0.075] text-rose-100 shadow-[0_0_22px_rgba(251,113,133,0.06)]";
  }
  if (clean.includes("review")) {
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
  if (cleanStatus.includes("review")) return 58;
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
  if (cleanStatus.includes("review")) return "Under review";
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
  return /* @__PURE__ */ jsxs("div", { className: "rounded-[1.1rem] border border-cyan-200/10 bg-white/[0.025] px-3 py-3 text-center backdrop-blur sm:rounded-2xl sm:px-4", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[9px] sm:tracking-[0.18em]", children: label }),
    /* @__PURE__ */ jsx(
      "p",
      {
        className: `mt-1 text-xl font-semibold tracking-[-0.04em] sm:text-2xl ${accent ? "text-cyan-100" : "text-white"}`,
        children: value
      }
    )
  ] });
}
function StatusPill({ status }) {
  const cleanStatus = normalizeText(status);
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: `inline-flex w-fit items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.14em] ${getStatusClasses(
        status
      )}`,
      children: [
        cleanStatus.includes("restocked") ? /* @__PURE__ */ jsx(CheckCircle2, { size: 12 }) : /* @__PURE__ */ jsx(Clock3, { size: 12 }),
        status || "TBA"
      ]
    }
  );
}
function EstimateProgress({ status, eta }) {
  const progress = getEstimateProgress(status, eta);
  const label = getEstimateLabel(status, eta);
  const cleanStatus = normalizeText(status);
  const isDelayed = cleanStatus.includes("delayed");
  const isRestocked = cleanStatus.includes("restocked");
  return /* @__PURE__ */ jsxs("div", { className: "w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("p", { className: "truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-300 sm:text-[10px] sm:tracking-[0.16em]", children: label }),
      /* @__PURE__ */ jsxs(
        "p",
        {
          className: `shrink-0 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.14em] ${isRestocked ? "text-emerald-200/80" : isDelayed ? "text-rose-200/80" : "text-cyan-200/70"}`,
          children: [
            progress,
            "%"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative h-2 overflow-hidden rounded-full border border-cyan-200/10 bg-white/[0.055]", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: `absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${isRestocked ? "bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.35)]" : isDelayed ? "bg-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.28)]" : "bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.35)]"}`,
          style: { width: `${progress}%` }
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" })
    ] })
  ] });
}
function StatusToggle({ value, onChange }) {
  return /* @__PURE__ */ jsx("div", { className: "restock-status-scroll flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0", children: statusFilters.map((option) => /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: () => onChange(option),
      className: `shrink-0 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] transition sm:text-[8.5px] sm:tracking-[0.13em] ${value === option ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.06)]" : "border-cyan-200/8 bg-white/[0.018] text-slate-600 hover:border-cyan-200/18 hover:bg-white/[0.035] hover:text-cyan-100"}`,
      children: option
    },
    option
  )) });
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
      const wpSiteUrl = "https://labone.local";
      if (!wpSiteUrl) ;
      const endpoint = `${wpSiteUrl.replace(
        /\/$/,
        ""
      )}/wp-json/phase/v1/restock-subscribe`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          productId: item.productId,
          productName: item.productName
        })
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
        error.message || "Something went wrong. Please try again or use the product page."
      );
    }
  };
  const hasMessage = message && status !== "loading";
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-[100] flex items-center justify-center px-4", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: onClose,
        className: "absolute inset-0 bg-[#020617]/82 backdrop-blur-xl",
        "aria-label": "Close modal"
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-lg overflow-hidden rounded-[1.55rem] border border-cyan-200/10 bg-[#07111f] p-4 text-white shadow-[0_30px_120px_rgba(0,0,0,0.6)] sm:rounded-[1.7rem] sm:p-5", children: [
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/[0.09] via-transparent to-blue-500/[0.045]" }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.24em]", children: "Restock Alert" }),
            /* @__PURE__ */ jsxs("h3", { className: "mt-2 text-[22px] font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-2xl", children: [
              "Notify me about ",
              item.productName || "this item"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm", children: "Enter your email to receive a restock alert for this item." })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onClose,
              className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-500 transition hover:text-cyan-100",
              "aria-label": "Close",
              children: /* @__PURE__ */ jsx(X, { size: 16 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-5 flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(StatusPill, { status: item.status }),
          /* @__PURE__ */ jsxs("span", { className: "rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]", children: [
            "Estimate: ",
            item.eta || "TBA"
          ] })
        ] }),
        hasMessage && /* @__PURE__ */ jsx(
          "div",
          {
            className: `mb-5 rounded-[1.25rem] border p-4 sm:rounded-[1.35rem] ${status === "success" ? "border-cyan-200/15 bg-cyan-300/[0.075]" : "border-red-300/20 bg-red-500/[0.075]"}`,
            children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: `grid h-10 w-10 shrink-0 place-items-center rounded-2xl border sm:h-11 sm:w-11 ${status === "success" ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100" : "border-red-300/20 bg-red-500/[0.12] text-red-100"}`,
                  children: status === "success" ? /* @__PURE__ */ jsx(CheckCircle2, { size: 20 }) : /* @__PURE__ */ jsx(AlertTriangle, { size: 20 })
                }
              ),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "p",
                  {
                    className: `text-[15px] font-semibold tracking-[-0.025em] ${status === "success" ? "text-cyan-50" : "text-red-50"}`,
                    children: messageTitle
                  }
                ),
                /* @__PURE__ */ jsx(
                  "p",
                  {
                    className: `mt-1 text-sm leading-6 ${status === "success" ? "text-cyan-100/75" : "text-red-100/75"}`,
                    children: message
                  }
                )
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsx("form", { onSubmit: handleSubmit, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col overflow-hidden rounded-2xl border border-cyan-200/10 bg-[#020617]/70 sm:flex-row", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              required: true,
              value: email,
              onChange: (event) => setEmail(event.target.value),
              placeholder: "Email address",
              className: "min-h-[52px] flex-1 bg-transparent px-5 text-sm font-medium text-white outline-none placeholder:text-slate-600"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: status === "loading",
              className: "inline-flex min-h-[52px] items-center justify-center gap-2 bg-cyan-300 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60",
              children: status === "loading" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Loader2, { size: 14, className: "animate-spin" }),
                "Saving"
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Bell, { size: 14 }),
                "Notify Me"
              ] })
            }
          )
        ] }) })
      ] })
    ] })
  ] });
}
function RestockTableRow({ item, onNotify }) {
  const cleanStatus = normalizeText(item.status);
  const isRestocked = cleanStatus.includes("restocked");
  const productName = item.productName || item.linkedProductName || "Restock item";
  return /* @__PURE__ */ jsxs("div", { className: "group border-t border-white/[0.075] px-4 py-4 transition hover:bg-cyan-300/[0.025] sm:px-5 sm:py-5 md:grid md:grid-cols-[minmax(220px,1.25fr)_170px_280px_190px] md:items-center md:gap-4 md:px-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "md:hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/40", children: "Product" }),
          /* @__PURE__ */ jsx("h4", { className: "text-[18px] font-semibold leading-[1.05] tracking-[-0.045em] text-white", children: productName }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500", children: "Restock availability update" })
        ] }),
        /* @__PURE__ */ jsx(StatusPill, { status: item.status })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-3.5", children: [
        /* @__PURE__ */ jsx("p", { className: "mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/40", children: "Estimate" }),
        /* @__PURE__ */ jsx(EstimateProgress, { status: item.status, eta: item.eta })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => onNotify(item),
          disabled: !item.productId && !item.notifyType,
          className: `mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border px-5 text-[9px] font-black uppercase tracking-[0.16em] transition ${isRestocked ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.13]" : "border-cyan-200/20 bg-cyan-300/[0.1] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.18] hover:text-white"}`,
          children: [
            /* @__PURE__ */ jsx(Bell, { size: 13 }),
            getNotifyLabel(item)
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "hidden min-w-0 md:block", children: [
      /* @__PURE__ */ jsx("h4", { className: "text-[18px] font-semibold tracking-[-0.04em] text-white sm:text-[20px]", children: productName }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500", children: "Restock availability update" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "hidden w-full items-center md:flex md:justify-center", children: /* @__PURE__ */ jsx(StatusPill, { status: item.status }) }),
    /* @__PURE__ */ jsx("div", { className: "hidden w-full items-center md:flex md:justify-center", children: /* @__PURE__ */ jsx("div", { className: "w-full max-w-[280px]", children: /* @__PURE__ */ jsx(EstimateProgress, { status: item.status, eta: item.eta }) }) }),
    /* @__PURE__ */ jsx("div", { className: "hidden w-full items-center md:flex md:justify-center", children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => onNotify(item),
        disabled: !item.productId && !item.notifyType,
        className: `inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border px-5 text-[10px] font-black uppercase tracking-[0.18em] transition md:w-[170px] ${isRestocked ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.13]" : "border-cyan-200/20 bg-cyan-300/[0.1] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.18] hover:text-white"}`,
        children: [
          /* @__PURE__ */ jsx(Bell, { size: 13 }),
          getNotifyLabel(item)
        ]
      }
    ) })
  ] });
}
function RestockStatusPanel() {
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [payload, setPayload] = useState({
    updatedAt: null,
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotifyItem, setSelectedNotifyItem] = useState(null);
  const apiUrl = "https://labone.local/wp-json/phase/v1/restocks";
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
        items: Array.isArray(data.items) ? data.items : []
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
    return payload.items.filter((item) => {
      const matchesStatus = activeStatus === "All" || item.status === activeStatus;
      const searchable = normalizeText(
        [item.productName, item.linkedProductName, item.status, item.eta].join(
          " "
        )
      );
      const matchesSearch = !cleanQuery || searchable.includes(cleanQuery);
      return matchesStatus && matchesSearch;
    }).sort((a, b) => {
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
  const restocked = payload.items.filter(
    (item) => normalizeText(item.status).includes("restocked")
  ).length;
  const hasActiveFilters = query.trim() || activeStatus !== "All";
  const clearAll = () => {
    setQuery("");
    setActiveStatus("All");
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-5 py-10 text-white sm:px-6 sm:py-14 lg:py-16", children: [
      /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[5%] lg:top-12 lg:h-80 lg:w-80 lg:translate-x-0 lg:blur-[140px]" }),
        /* @__PURE__ */ jsx("div", { className: "absolute right-[-28%] top-[24%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-8%] lg:h-96 lg:w-96 lg:blur-[150px]" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-6xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "mx-auto mb-8 flex max-w-4xl flex-col items-center text-center lg:mx-0 lg:mb-10 lg:items-start lg:text-left", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: "Restock Status" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[52px] lg:mx-0 lg:text-[64px] lg:leading-[1.02] lg:tracking-[-0.065em]", children: [
            "Track product",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent", children: "availability." })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-base lg:mx-0", children: "View current restock status, estimated availability windows, and sign up for product-specific alerts." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-7 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.18)] backdrop-blur sm:rounded-[1.7rem]", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                Search,
                {
                  size: 18,
                  className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/65"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  value: query,
                  onChange: (event) => setQuery(event.target.value),
                  type: "search",
                  placeholder: "Search product, status, estimate...",
                  className: "min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/70 py-3.5 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/90 sm:py-4"
                }
              ),
              query && /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setQuery(""),
                  className: "absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-500 transition hover:text-cyan-100",
                  "aria-label": "Clear search",
                  children: /* @__PURE__ */ jsx(X, { size: 14 })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
              /* @__PURE__ */ jsx(TinyStat, { label: "Items", value: payload.items.length }),
              /* @__PURE__ */ jsx(
                TinyStat,
                {
                  label: "Soon",
                  value: expectedSoon + comingSoon,
                  accent: true
                }
              ),
              /* @__PURE__ */ jsx(TinyStat, { label: "Live", value: restocked })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 border-t border-cyan-200/10 pt-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/40", children: "Filter by status" }),
              hasActiveFilters && /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: clearAll,
                  className: "inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:text-cyan-100 sm:text-[9px]",
                  children: [
                    /* @__PURE__ */ jsx(X, { size: 11 }),
                    "Reset"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx(StatusToggle, { value: activeStatus, onChange: setActiveStatus })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-5 flex flex-row items-end justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]", children: "Availability Records" }),
            /* @__PURE__ */ jsx("h3", { className: "mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: "Restock list" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-slate-500 sm:mt-2", children: [
              "Showing",
              " ",
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: filteredItems.length }),
              " ",
              "update",
              filteredItems.length === 1 ? "" : "s",
              "."
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: loadRestocks,
              className: "inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/[0.1] sm:text-[9px] sm:tracking-[0.18em]",
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { size: 13 }),
                "Refresh"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "overflow-hidden rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 shadow-[0_30px_120px_rgba(0,0,0,0.2)] backdrop-blur sm:rounded-[1.7rem]", children: [
          /* @__PURE__ */ jsxs("div", { className: "hidden bg-white/[0.025] px-5 py-4 md:grid md:grid-cols-[minmax(220px,1.25fr)_170px_280px_190px] md:items-center md:gap-4 md:px-6", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45", children: "Product" }),
            /* @__PURE__ */ jsx("p", { className: "text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45", children: "Status" }),
            /* @__PURE__ */ jsx("p", { className: "text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45", children: "Estimate" }),
            /* @__PURE__ */ jsx("p", { className: "text-center text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/45", children: "Notify" })
          ] }),
          loading ? /* @__PURE__ */ jsxs("div", { className: "flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]", children: [
            /* @__PURE__ */ jsx(Loader2, { className: "animate-spin text-cyan-200", size: 28 }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-slate-400", children: "Loading restock status..." })
          ] }) : error ? /* @__PURE__ */ jsxs("div", { className: "flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]", children: [
            /* @__PURE__ */ jsx(AlertTriangle, { className: "text-red-200", size: 28 }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-red-100/75", children: error }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: loadRestocks,
                className: "mt-5 inline-flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-500/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100",
                children: [
                  /* @__PURE__ */ jsx(RefreshCw, { size: 13 }),
                  "Try Again"
                ]
              }
            )
          ] }) : filteredItems.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:min-h-[320px]", children: [
            /* @__PURE__ */ jsx(PackageSearch, { size: 30, className: "text-cyan-200" }),
            /* @__PURE__ */ jsx("h4", { className: "mt-5 text-xl font-semibold tracking-[-0.04em] text-white", children: "No restock updates found" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-sm text-sm leading-6 text-slate-400", children: "Try searching by product name, status, or estimated restock window." })
          ] }) : /* @__PURE__ */ jsx("div", { children: filteredItems.map((item) => /* @__PURE__ */ jsx(
            RestockTableRow,
            {
              item,
              onNotify: setSelectedNotifyItem
            },
            item.id
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 sm:flex-row sm:items-center sm:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsx(
              ShieldCheck,
              {
                size: 17,
                className: "mt-0.5 shrink-0 text-cyan-200"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs leading-5 text-slate-400", children: "Availability timelines are updated regularly and may change based on supplier, batch, and fulfillment status." })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]", children: [
            "Last sync:",
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : "Not available" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      NotifyModal,
      {
        item: selectedNotifyItem,
        onClose: () => setSelectedNotifyItem(null)
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .restock-status-scroll {
          scrollbar-width: none;
        }

        .restock-status-scroll::-webkit-scrollbar {
          display: none;
        }
      ` })
  ] });
}

function RestockStatusExperience() {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png", transparentOnTop: true }),
    /* @__PURE__ */ jsxs("main", { className: "pt-[118px]", children: [
      /* @__PURE__ */ jsx(RestockStatusPanel, {}),
      /* @__PURE__ */ jsx(NewsletterSection, {}),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$RestockStatus = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Restock Status // Phase One Labs", "description": "Track upcoming product availability, estimated restock windows, and restock notifications." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "RestockStatusExperience", RestockStatusExperience, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/restock/RestockStatusExperience.jsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/restock-status.astro", void 0);

const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/restock-status.astro";
const $$url = "/restock-status";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$RestockStatus,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
