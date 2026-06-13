import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useMemo, useEffect } from 'react';
import { FileSearch, Search, X, ShieldCheck, Sparkles, BadgeCheck, History, ChevronDown, ArrowUpRight, FileText, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { c as coaRecords } from './coaRecords_DATiLCc2.mjs';
import { N as NewsletterSection, S as SiteFooter } from './NewsletterSection_RYopaVGa.mjs';

const ITEMS_PER_PAGE = 6;
const quickSearches = [
  "BPC",
  "Tirzepatide",
  "Retatrutide",
  "Lipo-C",
  "GHK",
  "NAD",
  "TB"
];
function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.%\s-/+]/g, " ").replace(/\s+/g, " ").trim();
}
function formatDate(date) {
  if (!date) return "Unknown date";
  const parsed = /* @__PURE__ */ new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function getCurrentCoa(record) {
  return record.currentCoa || {
    version: "v1",
    label: "Current COA",
    date: record.date,
    purity: record.purity,
    method: record.tested || record.method,
    verifyUrl: record.verifyUrl || record.fileUrl,
    fileUrl: record.fileUrl
  };
}
function getCertificateUrl(coa) {
  return coa?.verifyUrl || coa?.fileUrl || "";
}
function scoreRecord(record, query) {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return 1;
  const currentCoa = getCurrentCoa(record);
  const history = record.history || [];
  const searchable = normalizeText(
    [
      record.coaNumber,
      record.productName,
      record.compound,
      record.batch,
      record.lot,
      record.order,
      record.status,
      record.purity,
      record.tested,
      record.method,
      record.date,
      currentCoa.version,
      currentCoa.label,
      currentCoa.date,
      currentCoa.purity,
      currentCoa.method,
      ...record.keywords || [],
      ...history.flatMap((item) => [
        item.version,
        item.label,
        item.date,
        item.purity,
        item.method,
        item.tested
      ])
    ].join(" ")
  );
  const name = normalizeText(record.productName || record.compound);
  const batch = normalizeText(record.batch || record.lot);
  const coaNumber = normalizeText(record.coaNumber);
  const terms = cleanQuery.split(" ").filter(Boolean);
  let score = 0;
  if (name === cleanQuery) score += 140;
  if (batch === cleanQuery) score += 140;
  if (coaNumber === cleanQuery) score += 140;
  if (name.includes(cleanQuery)) score += 90;
  if (batch.includes(cleanQuery)) score += 90;
  if (coaNumber.includes(cleanQuery)) score += 90;
  if (searchable.includes(cleanQuery)) score += 40;
  terms.forEach((term) => {
    if (name.includes(term)) score += 18;
    if (batch.includes(term)) score += 20;
    if (coaNumber.includes(term)) score += 20;
    if (searchable.includes(term)) score += 8;
  });
  return score;
}
function TinyStat({ label, value, accent = false }) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-[1.1rem] border border-cyan-200/10 bg-white/[0.018] p-3 text-center sm:rounded-2xl sm:text-left", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.13em] text-slate-500 sm:text-[9px] sm:tracking-[0.16em]", children: label }),
    /* @__PURE__ */ jsx(
      "p",
      {
        className: `mt-1 text-lg font-semibold sm:text-xl ${accent ? "text-cyan-100" : "text-white"}`,
        children: value
      }
    )
  ] });
}
function HistoryToggle({ value, onChange }) {
  const options = [
    { label: "All Records", value: "All" },
    { label: "Has History", value: "Has History" },
    { label: "Current Only", value: "Current Only" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
    /* @__PURE__ */ jsx("p", { className: "mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/45", children: "Document View" }),
    /* @__PURE__ */ jsx("div", { className: "coa-scroll-row inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-1.5 sm:flex-wrap sm:overflow-visible", children: options.map((option) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => onChange(option.value),
        className: `shrink-0 rounded-xl border px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.12em] transition sm:px-4 sm:text-[9px] sm:tracking-[0.14em] ${value === option.value ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100" : "border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-cyan-100"}`,
        children: option.label
      },
      option.value
    )) })
  ] });
}
function ResearchDisclaimer() {
  return /* @__PURE__ */ jsx("div", { className: "rounded-[1.25rem] border border-red-400/18 bg-red-500/[0.045] p-4 sm:rounded-[1.35rem] sm:p-5", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
    /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-300/15 bg-red-500/[0.08] text-red-200", children: /* @__PURE__ */ jsx(AlertTriangle, { size: 18 }) }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.18em] text-red-200/80 sm:text-[10px] sm:tracking-[0.22em]", children: "Research Use Only Disclaimer" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-[11.5px] leading-6 text-red-100/65 sm:text-xs", children: "Certificates of Analysis are provided for laboratory documentation, batch transparency, and research verification purposes only. Products are not intended for human consumption, medical use, diagnosis, treatment, or prevention of any disease." })
    ] })
  ] }) });
}
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange
}) {
  if (totalPages <= 1) return null;
  return /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-col gap-4 border-t border-cyan-200/10 pt-5 sm:flex-row sm:items-center sm:justify-between", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-center text-xs text-slate-500 sm:text-left", children: [
      "Showing",
      " ",
      /* @__PURE__ */ jsxs("span", { className: "font-semibold text-white", children: [
        startItem,
        "-",
        endItem
      ] }),
      " ",
      "of ",
      /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: totalItems }),
      " ",
      "certificates"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "coa-scroll-row flex items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => onPageChange(currentPage - 1),
          disabled: currentPage === 1,
          className: "inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/10 bg-white/[0.018] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-35",
          children: [
            /* @__PURE__ */ jsx(ChevronLeft, { size: 13 }),
            "Prev"
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "flex shrink-0 items-center gap-1", children: Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => onPageChange(page),
            className: `grid h-9 w-9 place-items-center rounded-xl border text-[10px] font-black transition ${currentPage === page ? "border-cyan-200/35 bg-cyan-300/[0.14] text-cyan-50" : "border-cyan-200/10 bg-white/[0.018] text-slate-500 hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100"}`,
            children: page
          },
          page
        )
      ) }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => onPageChange(currentPage + 1),
          disabled: currentPage === totalPages,
          className: "inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/10 bg-white/[0.018] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-35",
          children: [
            "Next",
            /* @__PURE__ */ jsx(ChevronRight, { size: 13 })
          ]
        }
      )
    ] })
  ] });
}
function ResultCard({ record, openHistoryId, setOpenHistoryId }) {
  const currentCoa = getCurrentCoa(record);
  const history = record.history || [];
  const hasHistory = history.length > 0;
  const isOpen = openHistoryId === record.id;
  const certificateUrl = getCertificateUrl(currentCoa);
  return /* @__PURE__ */ jsxs("article", { className: "overflow-hidden rounded-[1.25rem] border border-cyan-200/10 bg-[#020617]/42 transition hover:border-cyan-200/20 hover:bg-[#061625]/60 sm:rounded-[1.45rem]", children: [
    /* @__PURE__ */ jsx("div", { className: "p-4 sm:p-5", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "rounded-full border border-cyan-200/10 bg-cyan-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-cyan-100 sm:text-[9px] sm:tracking-[0.14em]", children: [
            "Batch ",
            record.batch || record.lot || "—"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]", children: record.coaNumber || "COA Record" }),
          /* @__PURE__ */ jsx("span", { className: "rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]", children: currentCoa.version || "v1" })
        ] }),
        /* @__PURE__ */ jsx("h4", { className: "text-[20px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[26px]", children: record.productName || record.compound }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 text-[12.5px] leading-6 text-slate-400 sm:text-sm", children: [
          "Order",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: record.order || "—" }),
          " ",
          "· Document",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: currentCoa.label || "Current COA" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-[11px] leading-5 text-slate-500 sm:text-xs", children: [
            "Current document: ",
            formatDate(currentCoa.date || record.date)
          ] }),
          hasHistory && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setOpenHistoryId(isOpen ? null : record.id),
              className: "inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200/55 transition hover:text-cyan-100 sm:text-[10px] sm:tracking-[0.16em]",
              children: [
                /* @__PURE__ */ jsx(History, { size: 12 }),
                isOpen ? "Hide history" : `${history.length} archived`,
                /* @__PURE__ */ jsx(
                  ChevronDown,
                  {
                    size: 12,
                    className: `transition duration-300 ${isOpen ? "rotate-180" : ""}`
                  }
                )
              ]
            }
          )
        ] })
      ] }),
      certificateUrl ? /* @__PURE__ */ jsxs(
        "a",
        {
          href: certificateUrl,
          target: "_blank",
          rel: "noreferrer",
          className: "inline-flex min-h-[42px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-300/[0.09] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.16] hover:text-white sm:text-[10px] sm:tracking-[0.16em] lg:w-auto",
          children: [
            "View Certificate",
            /* @__PURE__ */ jsx(ArrowUpRight, { size: 13 })
          ]
        }
      ) : /* @__PURE__ */ jsx("span", { className: "inline-flex min-h-[42px] w-full shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.018] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em] lg:w-auto", children: "Link pending" })
    ] }) }),
    hasHistory && /* @__PURE__ */ jsx(
      "div",
      {
        className: `grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`,
        children: /* @__PURE__ */ jsx("div", { className: "overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "border-t border-cyan-200/10 bg-[#030b14]/58 px-4 py-3 sm:px-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(FileText, { size: 13, className: "text-cyan-200/75" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.16em] text-cyan-200/45 sm:text-[9px] sm:tracking-[0.2em]", children: "Archived COA versions" })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-600", children: [
              history.length,
              " document",
              history.length === 1 ? "" : "s"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-2", children: history.map((version) => {
            const historyUrl = getCertificateUrl(version);
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.014] px-3 py-2.5 transition hover:border-cyan-200/15 hover:bg-cyan-300/[0.025] sm:flex-row sm:items-center sm:justify-between",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "rounded-full bg-cyan-300/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100", children: version.version }),
                      /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-white/85", children: version.label })
                    ] }),
                    /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[11px] leading-5 text-slate-500", children: [
                      formatDate(version.date),
                      " ·",
                      " ",
                      version.method || version.tested || "COA",
                      " · Purity",
                      " ",
                      version.purity || "—"
                    ] })
                  ] }),
                  historyUrl ? /* @__PURE__ */ jsxs(
                    "a",
                    {
                      href: historyUrl,
                      target: "_blank",
                      rel: "noreferrer",
                      className: "inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200/10 bg-cyan-300/[0.045] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/80 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.1] hover:text-white",
                      children: [
                        "View",
                        /* @__PURE__ */ jsx(ArrowUpRight, { size: 11 })
                      ]
                    }
                  ) : /* @__PURE__ */ jsx("span", { className: "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.014] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-600", children: "Pending" })
                ]
              },
              `${record.id}-${version.version}`
            );
          }) })
        ] }) })
      }
    )
  ] });
}
function COALookupSection() {
  const [query, setQuery] = useState("");
  const [openHistoryId, setOpenHistoryId] = useState(null);
  const [activeHistory, setActiveHistory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const filteredRecords = useMemo(() => {
    let results = coaRecords.map((record) => ({
      record,
      score: scoreRecord(record, query)
    }));
    if (query.trim()) {
      results = results.filter((item) => item.score > 0);
    }
    if (activeHistory === "Has History") {
      results = results.filter(
        (item) => (item.record.history || []).length > 0
      );
    }
    if (activeHistory === "Current Only") {
      results = results.filter(
        (item) => (item.record.history || []).length === 0
      );
    }
    return results.sort((a, b) => b.score - a.score).map((item) => item.record);
  }, [query, activeHistory]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
  const startItem = filteredRecords.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(endIndex, filteredRecords.length);
  useEffect(() => {
    setCurrentPage(1);
    setOpenHistoryId(null);
  }, [query, activeHistory]);
  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    setOpenHistoryId(null);
  };
  const hasActiveFilters = query.trim().length > 0 || activeHistory !== "All";
  const clearAll = () => {
    setQuery("");
    setActiveHistory("All");
    setOpenHistoryId(null);
    setCurrentPage(1);
  };
  const recordsWithHistory = coaRecords.filter(
    (record) => (record.history || []).length > 0
  ).length;
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-5 py-10 text-white sm:px-6 sm:py-14 lg:px-6 lg:py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[8%] lg:top-16 lg:h-72 lg:w-72 lg:translate-x-0 lg:blur-[130px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 right-[-30%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-10%] lg:h-80 lg:w-80" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-6xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-col items-center gap-5 text-center lg:mb-7 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.48fr)] lg:items-end lg:gap-7 lg:text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "w-full", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)] lg:hidden" }),
            /* @__PURE__ */ jsx("span", { className: "hidden h-px w-9 bg-cyan-300/75 lg:block" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: "COA Documentation" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] lg:mx-0 lg:max-w-4xl lg:text-[56px] lg:leading-[1.02] lg:tracking-[-0.06em]", children: [
            "Search batch records",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: "with precision." })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full max-w-[390px] rounded-[1.25rem] border border-cyan-200/10 bg-[#020617]/28 p-4 lg:max-w-none lg:rounded-[1.4rem]", children: /* @__PURE__ */ jsx("p", { className: "text-[13px] leading-7 text-slate-300/70", children: "Locate COA references by product name, batch number, compound, or COA number." }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative mb-8 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/28 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.14)] backdrop-blur sm:p-5 lg:mb-10 lg:rounded-none lg:border-x-0 lg:border-y lg:bg-transparent lg:p-0 lg:py-6 lg:shadow-none lg:backdrop-blur-none", children: [
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent lg:block" }),
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-200/18 to-transparent lg:block" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-start gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100 sm:h-12 sm:w-12", children: /* @__PURE__ */ jsx(FileSearch, { size: 21 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.26em]", children: "Batch Lookup" }),
              /* @__PURE__ */ jsx("h3", { className: "mt-2 max-w-2xl text-[24px] font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-[32px]", children: "Find the right certificate faster." })
            ] })
          ] }),
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
                placeholder: "Search product, COA number, batch...",
                className: "min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-3.5 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/85 sm:py-4"
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
          /* @__PURE__ */ jsxs("div", { className: "mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]", children: [
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "coa-scroll-row flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0", children: quickSearches.map((item) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setQuery(item),
                  className: "shrink-0 rounded-full border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-cyan-100 sm:text-[10px] sm:tracking-[0.16em]",
                  children: item
                },
                item
              )) }),
              /* @__PURE__ */ jsx(
                HistoryToggle,
                {
                  value: activeHistory,
                  onChange: setActiveHistory
                }
              ),
              hasActiveFilters && /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: clearAll,
                  className: "mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200/10 bg-rose-300/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/75 transition hover:border-rose-200/25 hover:text-rose-100 sm:text-[10px]",
                  children: [
                    /* @__PURE__ */ jsx(X, { size: 12 }),
                    "Clear filters"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsx(TinyStat, { label: "Records", value: coaRecords.length }),
                /* @__PURE__ */ jsx(TinyStat, { label: "Found", value: filteredRecords.length }),
                /* @__PURE__ */ jsx(TinyStat, { label: "History", value: recordsWithHistory, accent: true })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex gap-3 rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-4", children: [
                /* @__PURE__ */ jsx(
                  ShieldCheck,
                  {
                    size: 17,
                    className: "mt-0.5 shrink-0 text-cyan-200"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Laboratory documentation access, batch transparency, and historical certificate tracking in one place." })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute right-[-10%] top-[-20%] h-80 w-80 rounded-full bg-cyan-300/8 blur-[120px]" }),
        /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-5 flex flex-row items-end justify-between gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]", children: "Available Records" }),
              /* @__PURE__ */ jsx("h3", { className: "mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: "COA results" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-slate-500 sm:mt-2", children: [
                "Showing",
                " ",
                /* @__PURE__ */ jsxs("span", { className: "font-semibold text-white", children: [
                  startItem,
                  "-",
                  endItem
                ] }),
                " ",
                "of",
                " ",
                /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: filteredRecords.length }),
                " ",
                "certificates."
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "hidden items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:flex", children: [
              /* @__PURE__ */ jsx(Sparkles, { size: 13 }),
              "Smart lookup"
            ] })
          ] }),
          filteredRecords.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex min-h-[280px] flex-col items-center justify-center rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/45 p-8 text-center sm:min-h-[320px] sm:rounded-[1.5rem]", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200", children: /* @__PURE__ */ jsx(Search, { size: 24 }) }),
            /* @__PURE__ */ jsx("h4", { className: "mt-5 text-xl font-semibold tracking-[-0.04em] text-white", children: "No records found" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-sm text-sm leading-6 text-slate-400", children: "Try searching by product name, COA number, batch number, or compound name." })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { className: "space-y-3", children: paginatedRecords.map((record) => /* @__PURE__ */ jsx(
              ResultCard,
              {
                record,
                openHistoryId,
                setOpenHistoryId
              },
              record.id
            )) }),
            /* @__PURE__ */ jsx(
              Pagination,
              {
                currentPage: safeCurrentPage,
                totalPages,
                totalItems: filteredRecords.length,
                startItem,
                endItem,
                onPageChange: handlePageChange
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-5 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4", children: [
            /* @__PURE__ */ jsx(
              BadgeCheck,
              {
                size: 17,
                className: "mt-0.5 shrink-0 text-cyan-200"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs leading-5 text-slate-400", children: "Missing a document? Contact support with the product name and batch number so the team can help locate the right COA." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsx(ResearchDisclaimer, {}) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .coa-scroll-row {
          scrollbar-width: none;
        }

        .coa-scroll-row::-webkit-scrollbar {
          display: none;
        }
      ` })
  ] });
}

function ShopExperience({ products = [] }) {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png", transparentOnTop: true }),
    /* @__PURE__ */ jsxs("main", { className: "pt-[118px]", children: [
      /* @__PURE__ */ jsx(COALookupSection, {}),
      /* @__PURE__ */ jsx(NewsletterSection, {}),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$Coa = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "COA Verification // Phase One Labs", "description": "Search and verify certificates of analysis by product name, COA number, batch number, or compound." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "COAExperience", ShopExperience, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/shop/COAExperience.jsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/coa.astro", void 0);

const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/coa.astro";
const $$url = "/coa";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Coa,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
