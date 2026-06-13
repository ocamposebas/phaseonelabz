import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  History,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { coaRecords } from "./coaRecords.js";

const ITEMS_PER_PAGE = 6;

const quickSearches = [
  "BPC",
  "PL-Sm",
  "PL-Rt",
  "PL-MIC",
  "PL-Tes",
  "GHK",
  "NAD",
  "TB",
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.%\s-/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(date) {
  if (!date) return "Unknown date";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentCoa(record) {
  return (
    record.currentCoa || {
      version: "v1",
      label: "Current COA",
      date: record.date,
      purity: record.purity,
      method: record.tested || record.method,
      verifyUrl: record.verifyUrl || record.fileUrl,
      fileUrl: record.fileUrl,
      currentShippingLot: record.currentShippingLot || false,
    }
  );
}

function getCertificateUrl(coa) {
  return coa?.verifyUrl || coa?.fileUrl || "";
}

function isCurrentShippingLot(record, currentCoa) {
  return (
    record.currentShippingLot === true ||
    record.activeShippingLot === true ||
    currentCoa.currentShippingLot === true ||
    currentCoa.activeShippingLot === true ||
    currentCoa.currentLot === true
  );
}

function scoreRecord(record, query) {
  const cleanQuery = normalizeText(query);

  if (!cleanQuery) return 1;

  const currentCoa = getCurrentCoa(record);
  const history = record.history || [];

  const aliases = Array.isArray(record.aliases) ? record.aliases : [];
  const skus = Array.isArray(record.skus) ? record.skus : [];
  const wooIds = Array.isArray(record.wooIds) ? record.wooIds.map(String) : [];
  const productIds = Array.isArray(record.productIds)
    ? record.productIds.map(String)
    : [];
  const parentProductIds = Array.isArray(record.parentProductIds)
    ? record.parentProductIds.map(String)
    : [];
  const variationIds = Array.isArray(record.variationIds)
    ? record.variationIds.map(String)
    : [];

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
      record.strength,
      record.coaUrl,
      record.verifyUrl,
      record.url,
      record.currentShippingLot
        ? "current shipping lot currently shipping batch active shipping lot"
        : "",
      currentCoa.version,
      currentCoa.label,
      currentCoa.date,
      currentCoa.purity,
      currentCoa.method,
      currentCoa.verifyUrl,
      currentCoa.fileUrl,
      currentCoa.currentShippingLot
        ? "current shipping lot currently shipping batch active shipping lot"
        : "",
      ...aliases,
      ...skus,
      ...wooIds,
      ...productIds,
      ...parentProductIds,
      ...variationIds,
      ...(record.keywords || []),
      ...history.flatMap((item) => [
        item.version,
        item.label,
        item.date,
        item.purity,
        item.method,
        item.tested,
        item.verifyUrl,
        item.fileUrl,
      ]),
    ].join(" ")
  );

  const name = normalizeText(record.productName || record.compound);
  const compound = normalizeText(record.compound);
  const aliasText = normalizeText(aliases.join(" "));
  const skuText = normalizeText(skus.join(" "));
  const batch = normalizeText(record.batch || record.lot);
  const coaNumber = normalizeText(record.coaNumber);
  const strength = normalizeText(record.strength);
  const terms = cleanQuery.split(" ").filter(Boolean);

  let score = 0;

  if (name === cleanQuery) score += 160;
  if (compound === cleanQuery) score += 150;
  if (batch === cleanQuery) score += 150;
  if (coaNumber === cleanQuery) score += 150;
  if (skuText === cleanQuery) score += 150;
  if (aliases.some((alias) => normalizeText(alias) === cleanQuery)) score += 145;

  if (name.includes(cleanQuery)) score += 100;
  if (compound.includes(cleanQuery)) score += 95;
  if (aliasText.includes(cleanQuery)) score += 92;
  if (skuText.includes(cleanQuery)) score += 90;
  if (batch.includes(cleanQuery)) score += 90;
  if (coaNumber.includes(cleanQuery)) score += 90;
  if (strength.includes(cleanQuery)) score += 50;
  if (searchable.includes(cleanQuery)) score += 45;

  terms.forEach((term) => {
    if (name.includes(term)) score += 22;
    if (compound.includes(term)) score += 20;
    if (aliasText.includes(term)) score += 20;
    if (skuText.includes(term)) score += 20;
    if (batch.includes(term)) score += 20;
    if (coaNumber.includes(term)) score += 20;
    if (strength.includes(term)) score += 12;
    if (searchable.includes(term)) score += 8;
  });

  return score;
}
function TinyStat({ label, value, accent = false }) {
  return (
    <div className="rounded-[1.1rem] border border-cyan-200/10 bg-white/[0.018] p-3 text-center sm:rounded-2xl sm:text-left">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-500 sm:text-[9px] sm:tracking-[0.16em]">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-semibold sm:text-xl ${
          accent ? "text-cyan-100" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryToggle({ value, onChange }) {
  const options = [
    { label: "All Records", value: "All" },
    { label: "Has History", value: "Has History" },
    { label: "Current Shipping Lot", value: "Current Shipping Lot" },
  ];

  return (
    <div className="mt-5">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/45">
        COA Filter
      </p>

      <div className="coa-scroll-row inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-1.5 sm:flex-wrap sm:overflow-visible">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.12em] transition sm:px-4 sm:text-[9px] sm:tracking-[0.14em] ${
              value === option.value
                ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100"
                : "border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-cyan-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResearchDisclaimer() {
  return (
    <div className="rounded-[1.25rem] border border-red-400/18 bg-red-500/[0.045] p-4 sm:rounded-[1.35rem] sm:p-5">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-300/15 bg-red-500/[0.08] text-red-200">
          <AlertTriangle size={18} />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-200/80 sm:text-[10px] sm:tracking-[0.22em]">
            Research Use Only Disclaimer
          </p>

          <p className="mt-2 text-[11.5px] leading-6 text-red-100/65 sm:text-xs">
            Certificates of Analysis are provided for laboratory documentation,
            batch transparency, and research verification purposes only. Products
            are not intended for human consumption, medical use, diagnosis,
            treatment, or prevention of any disease.
          </p>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-cyan-200/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-xs text-slate-500 sm:text-left">
        Showing{" "}
        <span className="font-semibold text-white">
          {startItem}-{endItem}
        </span>{" "}
        of <span className="font-semibold text-white">{totalItems}</span>{" "}
        certificates
      </p>

      <div className="coa-scroll-row flex items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/10 bg-white/[0.018] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronLeft size={13} />
          Prev
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`grid h-9 w-9 place-items-center rounded-xl border text-[10px] font-black transition ${
                  currentPage === page
                    ? "border-cyan-200/35 bg-cyan-300/[0.14] text-cyan-50"
                    : "border-cyan-200/10 bg-white/[0.018] text-slate-500 hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/10 bg-white/[0.018] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.045] hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-35"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

function ResultCard({ record, openHistoryId, setOpenHistoryId }) {
  const currentCoa = getCurrentCoa(record);
  const history = record.history || [];
  const hasHistory = history.length > 0;
  const isOpen = openHistoryId === record.id;
  const certificateUrl = getCertificateUrl(currentCoa);
  const isShippingLot = isCurrentShippingLot(record, currentCoa);

  return (
    <article
      className={`overflow-hidden rounded-[1.25rem] border transition sm:rounded-[1.45rem] ${
        isShippingLot
          ? "border-amber-300/20 bg-amber-400/[0.035] shadow-[0_0_0_1px_rgba(251,191,36,0.06),0_24px_80px_rgba(0,0,0,0.18)] hover:border-amber-300/30 hover:bg-amber-400/[0.055]"
          : "border-cyan-200/10 bg-[#020617]/42 hover:border-cyan-200/20 hover:bg-[#061625]/60"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-cyan-100 sm:text-[9px] sm:tracking-[0.14em]">
                Batch {record.batch || record.lot || "—"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]">
                {record.coaNumber || "COA Record"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-slate-300 sm:text-[9px] sm:tracking-[0.14em]">
                {currentCoa.version || "v1"}
              </span>

              {isShippingLot && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/[0.12] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-amber-100 sm:text-[9px] sm:tracking-[0.14em]">
                  <ShieldCheck size={11} />
                  Current Shipping Lot
                </span>
              )}
            </div>

            <h4 className="text-[20px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[26px]">
              {record.productName || record.compound}
            </h4>

            <p className="mt-2 text-[12.5px] leading-6 text-slate-400 sm:text-sm">
              Order{" "}
              <span className="text-slate-300">{record.order || "—"}</span>{" "}
              · Document{" "}
              <span className="text-slate-300">
                {currentCoa.label || "Current COA"}
              </span>
              {isShippingLot && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-amber-100/90">
                    Currently shipping batch
                  </span>
                </>
              )}
            </p>

            {isShippingLot && (
              <div className="mt-3 rounded-2xl border border-amber-300/12 bg-amber-400/[0.055] px-3.5 py-3">
                <p className="text-[11.5px] leading-5 text-amber-50/76 sm:text-xs">
                  This certificate represents the active lot currently being
                  distributed from our research catalog inventory.
                </p>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
                Current document: {formatDate(currentCoa.date || record.date)}
              </p>

              {hasHistory && (
                <button
                  type="button"
                  onClick={() => setOpenHistoryId(isOpen ? null : record.id)}
                  className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200/55 transition hover:text-cyan-100 sm:text-[10px] sm:tracking-[0.16em]"
                >
                  <History size={12} />
                  {isOpen ? "Hide history" : `${history.length} archived`}
                  <ChevronDown
                    size={12}
                    className={`transition duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {certificateUrl ? (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-[42px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] transition sm:text-[10px] sm:tracking-[0.16em] lg:w-auto ${
                isShippingLot
                  ? "border-amber-300/20 bg-amber-400/[0.12] text-amber-100 hover:border-amber-300/35 hover:bg-amber-400/[0.18] hover:text-white"
                  : "border-cyan-200/15 bg-cyan-300/[0.09] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.16] hover:text-white"
              }`}
            >
              View Certificate
              <ArrowUpRight size={13} />
            </a>
          ) : (
            <span className="inline-flex min-h-[42px] w-full shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.018] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em] lg:w-auto">
              Link pending
            </span>
          )}
        </div>
      </div>

      {hasHistory && (
        <div
          className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-cyan-200/10 bg-[#030b14]/58 px-4 py-3 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-cyan-200/75" />

                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-200/45 sm:text-[9px] sm:tracking-[0.2em]">
                    Archived COA versions
                  </p>
                </div>

                <p className="text-[10px] text-slate-600">
                  {history.length} document{history.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="space-y-2">
                {history.map((version) => {
                  const historyUrl = getCertificateUrl(version);

                  return (
                    <div
                      key={`${record.id}-${version.version}`}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.014] px-3 py-2.5 transition hover:border-cyan-200/15 hover:bg-cyan-300/[0.025] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cyan-300/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100">
                            {version.version}
                          </span>

                          <span className="text-xs font-semibold text-white/85">
                            {version.label}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          {formatDate(version.date)} ·{" "}
                          {version.method || version.tested || "COA"} · Purity{" "}
                          {version.purity || "—"}
                        </p>
                      </div>

                      {historyUrl ? (
                        <a
                          href={historyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200/10 bg-cyan-300/[0.045] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/80 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.1] hover:text-white"
                        >
                          View
                          <ArrowUpRight size={11} />
                        </a>
                      ) : (
                        <span className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.014] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function COALookupSection() {
  const [query, setQuery] = useState("");
  const [openHistoryId, setOpenHistoryId] = useState(null);
  const [activeHistory, setActiveHistory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = useMemo(() => {
    let results = coaRecords.map((record) => ({
      record,
      score: scoreRecord(record, query),
    }));

    if (query.trim()) {
      results = results.filter((item) => item.score > 0);
    }

    if (activeHistory === "Has History") {
      results = results.filter(
        (item) => (item.record.history || []).length > 0
      );
    }

    if (activeHistory === "Current Shipping Lot") {
      results = results.filter((item) =>
        isCurrentShippingLot(item.record, getCurrentCoa(item.record))
      );
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map((item) => item.record);
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

  const currentShippingLots = coaRecords.filter((record) =>
    isCurrentShippingLot(record, getCurrentCoa(record))
  ).length;

  return (
<section className="coa-section relative overflow-hidden px-5 py-10 text-white sm:px-6 sm:py-14 lg:px-6 lg:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[8%] lg:top-16 lg:h-72 lg:w-72 lg:translate-x-0 lg:blur-[130px]" />
        <div className="absolute bottom-0 right-[-30%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-10%] lg:h-80 lg:w-80" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-5 text-center lg:mb-7 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.48fr)] lg:items-end lg:gap-7 lg:text-left">
          <div className="w-full">
            <div className="mb-4 inline-flex items-center justify-center gap-3 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)] lg:hidden" />
              <span className="hidden h-px w-9 bg-cyan-300/75 lg:block" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
                COA Documentation
              </span>
            </div>

            <h2 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] lg:mx-0 lg:max-w-4xl lg:text-[56px] lg:leading-[1.02] lg:tracking-[-0.06em]">
              Search batch records
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85">
                with precision.
              </span>
            </h2>
          </div>

          <div className="w-full max-w-[390px] rounded-[1.25rem] border border-cyan-200/10 bg-[#020617]/28 p-4 lg:max-w-none lg:rounded-[1.4rem]">
            <p className="text-[13px] leading-7 text-slate-300/70">
              Locate COA references by product name, batch number, compound, or
              COA number. Records marked{" "}
              <span className="font-semibold text-amber-100">
                Current Shipping Lot
              </span>{" "}
              represent the active lot currently being distributed.
            </p>
          </div>
        </div>

        <div className="relative mb-8 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/28 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.14)] backdrop-blur sm:p-5 lg:mb-10 lg:rounded-none lg:border-x-0 lg:border-y lg:bg-transparent lg:p-0 lg:py-6 lg:shadow-none lg:backdrop-blur-none">
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent lg:block" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-200/18 to-transparent lg:block" />

          <div className="relative">
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100 sm:h-12 sm:w-12">
                <FileSearch size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.26em]">
                  Batch Lookup
                </p>

                <h3 className="mt-2 max-w-2xl text-[24px] font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-[32px]">
                  Find the right certificate faster.
                </h3>
              </div>
            </div>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/65"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search product, COA number, batch..."
                className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-3.5 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/85 sm:py-4"
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

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
              <div className="min-w-0">
                <div className="coa-scroll-row flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {quickSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="shrink-0 rounded-full border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-cyan-100 sm:text-[10px] sm:tracking-[0.16em]"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <HistoryToggle
                  value={activeHistory}
                  onChange={setActiveHistory}
                />

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200/10 bg-rose-300/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/75 transition hover:border-rose-200/25 hover:text-rose-100 sm:text-[10px]"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                )}
              </div>

              <div>
                <div className="grid grid-cols-3 gap-2">
                  <TinyStat label="Records" value={coaRecords.length} />
                  <TinyStat label="Found" value={filteredRecords.length} />
                  <TinyStat
                    label="Shipping"
                    value={currentShippingLots}
                    accent
                  />
                </div>

                <div className="mt-4 flex gap-3 rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-4">
                  <ShieldCheck
                    size={17}
                    className="mt-0.5 shrink-0 text-cyan-200"
                  />

                  <p className="text-xs leading-6 text-slate-400">
                    Laboratory documentation access, batch transparency, current
                    shipping lot indicators, and historical certificate tracking
                    in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-80 w-80 rounded-full bg-cyan-300/8 blur-[120px]" />

          <div className="relative z-10">
            <div className="mb-5 flex flex-row items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]">
                  Available Records
                </p>

                <h3 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                  COA results
                </h3>

                <p className="mt-1 text-xs text-slate-500 sm:mt-2">
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {startItem}-{endItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-white">
                    {filteredRecords.length}
                  </span>{" "}
                  certificates.
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-amber-300/15 bg-amber-400/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100 sm:flex">
                <ShieldCheck size={13} />
                Current lots marked
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/45 p-8 text-center sm:min-h-[320px] sm:rounded-[1.5rem]">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
                  <Search size={24} />
                </div>

                <h4 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                  No records found
                </h4>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  Try searching by product name, COA number, batch number, or
                  compound name.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedRecords.map((record) => (
                    <ResultCard
                      key={record.id}
                      record={record}
                      openHistoryId={openHistoryId}
                      setOpenHistoryId={setOpenHistoryId}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={filteredRecords.length}
                  startItem={startItem}
                  endItem={endItem}
                  onPageChange={handlePageChange}
                />
              </>
            )}

            <div className="mt-5 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4">
              <BadgeCheck
                size={17}
                className="mt-0.5 shrink-0 text-cyan-200"
              />

              <p className="text-xs leading-5 text-slate-400">
                Missing a document? Contact support with the product name and
                batch number so the team can help locate the right COA.
              </p>
            </div>

            <div className="mt-5">
              <ResearchDisclaimer />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .coa-scroll-row {
          scrollbar-width: none;
        }

        .coa-scroll-row::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

