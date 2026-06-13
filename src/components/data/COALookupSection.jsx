import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  FileSearch,
  FileText,
  FlaskConical,
  History,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { coaRecords } from "./coaRecords.js";

const quickSearches = [
  "BPC",
  "Tirzepatide",
  "Retatrutide",
  "Lipo-C",
  "GHK",
  "NAD",
  "Current Lot",
];

const filterOptions = [
  { label: "All Records", value: "all" },
  { label: "Current Shipping Lot", value: "current-shipping-lot" },
  { label: "Has History", value: "has-history" },
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
      tested: record.tested,
      method: record.method,
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
    currentCoa?.currentShippingLot === true ||
    currentCoa?.activeShippingLot === true ||
    currentCoa?.currentLot === true
  );
}

function scoreRecord(record, query) {
  const cleanQuery = normalizeText(query);

  if (!cleanQuery) return 1;

  const currentCoa = getCurrentCoa(record);
  const history = record.history || [];
  const isShippingLot = isCurrentShippingLot(record, currentCoa);

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
      isShippingLot
        ? "current shipping lot currently shipping batch active shipping lot current lot"
        : "",
      currentCoa.version,
      currentCoa.label,
      currentCoa.date,
      currentCoa.purity,
      currentCoa.tested,
      currentCoa.method,
      ...(record.keywords || []),
      ...history.flatMap((version) => [
        version.version,
        version.label,
        version.date,
        version.purity,
        version.tested,
        version.method,
      ]),
    ].join(" ")
  );

  const name = normalizeText(record.productName || record.compound);
  const batch = normalizeText(record.batch || record.lot);
  const coaNumber = normalizeText(record.coaNumber);
  const terms = cleanQuery.split(" ").filter(Boolean);

  let score = 0;

  if (name === cleanQuery) score += 120;
  if (batch === cleanQuery) score += 120;
  if (coaNumber === cleanQuery) score += 120;

  if (name.includes(cleanQuery)) score += 80;
  if (batch.includes(cleanQuery)) score += 80;
  if (coaNumber.includes(cleanQuery)) score += 80;
  if (searchable.includes(cleanQuery)) score += 35;

  terms.forEach((term) => {
    if (name.includes(term)) score += 14;
    if (batch.includes(term)) score += 16;
    if (coaNumber.includes(term)) score += 16;
    if (searchable.includes(term)) score += 7;
  });

  return score;
}

export default function COALookupSection() {
  const [query, setQuery] = useState("");
  const [openHistoryId, setOpenHistoryId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const currentShippingLots = useMemo(() => {
    return coaRecords.filter((record) =>
      isCurrentShippingLot(record, getCurrentCoa(record))
    ).length;
  }, []);

  const filteredRecords = useMemo(() => {
    let results = coaRecords.map((record) => ({
      record,
      score: scoreRecord(record, query),
    }));

    if (query.trim()) {
      results = results.filter((item) => item.score > 0);
    }

    if (activeFilter === "current-shipping-lot") {
      results = results.filter((item) =>
        isCurrentShippingLot(item.record, getCurrentCoa(item.record))
      );
    }

    if (activeFilter === "has-history") {
      results = results.filter((item) => (item.record.history || []).length > 0);
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map((item) => item.record);
  }, [query, activeFilter]);

  const hasActiveFilters = query.trim().length > 0 || activeFilter !== "all";

  const clearAll = () => {
    setQuery("");
    setActiveFilter("all");
    setOpenHistoryId(null);
  };

  return (
    <section className="relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-cyan-300/8 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]">
              COA Documentation
            </span>
          </div>

          <h2 className="mx-auto max-w-[420px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]">
            Search batch records
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              with clarity.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-[14px] md:mx-0">
            Quickly locate COA references by product name, batch number,
            compound type, testing method, or current shipping lot.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#05111d] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.25)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(103,232,249,0.14),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(59,130,246,0.12),transparent_32%)]" />
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/60">
                    Batch Lookup
                  </p>

                  <h3 className="mt-3 max-w-sm text-[28px] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-[38px]">
                    Find the right document faster.
                  </h3>
                </div>

                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100">
                  <FileSearch size={22} />
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
                  placeholder="Search product, COA, batch, current lot..."
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-4 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/85"
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

              <div className="mt-4 flex flex-wrap gap-2">
                {quickSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="rounded-full border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-cyan-100"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/45">
                  COA Filter
                </p>

                <div className="flex flex-wrap gap-2 rounded-2xl border border-cyan-200/10 bg-[#020617]/35 p-1.5">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActiveFilter(option.value)}
                      className={`rounded-xl border px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.12em] transition sm:text-[9px] sm:tracking-[0.14em] ${
                        activeFilter === option.value
                          ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100"
                          : "border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-cyan-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200/10 bg-rose-300/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/75 transition hover:border-rose-200/25 hover:text-rose-100"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={17}
                      className="mt-0.5 shrink-0 text-cyan-200"
                    />

                    <p className="text-xs leading-6 text-slate-400">
                      Records marked{" "}
                      <span className="font-semibold text-amber-100">
                        Current Shipping Lot
                      </span>{" "}
                      represent the active lot currently being distributed from
                      the research catalog inventory.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Records
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {coaRecords.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Found
                    </p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {filteredRecords.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.045] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/60">
                      Shipping
                    </p>
                    <p className="mt-1 text-xl font-semibold text-amber-100">
                      {currentShippingLots}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.018] p-5 backdrop-blur-xl sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-80 w-80 rounded-full bg-cyan-300/10 blur-[120px]" />

            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/55">
                    Available Records
                  </p>

                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                    COA results
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-white">
                      {filteredRecords.length}
                    </span>{" "}
                    certificate{filteredRecords.length === 1 ? "" : "s"}.
                  </p>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-amber-300/15 bg-amber-400/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100 sm:flex">
                  <ShieldCheck size={13} />
                  Current lots marked
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] border border-cyan-200/10 bg-[#020617]/45 p-8 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
                    <Search size={24} />
                  </div>

                  <h4 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                    No records found
                  </h4>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Try searching by product name, batch number, COA number, or
                    current shipping lot.
                  </p>
                </div>
              ) : (
                <div className="mini-coa-results max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {filteredRecords.map((record) => {
                    const currentCoa = getCurrentCoa(record);
                    const history = record.history || [];
                    const hasHistory = history.length > 0;
                    const isHistoryOpen = openHistoryId === record.id;
                    const certificateUrl = getCertificateUrl(currentCoa);
                    const isShippingLot = isCurrentShippingLot(
                      record,
                      currentCoa
                    );

                    return (
                      <article
                        key={record.id}
                        className={`overflow-hidden rounded-[1.45rem] border transition ${
                          isShippingLot
                            ? "border-amber-300/20 bg-amber-400/[0.035] hover:border-amber-300/30 hover:bg-amber-400/[0.055]"
                            : "border-cyan-200/10 bg-[#020617]/42 hover:border-cyan-200/20 hover:bg-[#061625]/60"
                        }`}
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                                  {record.batch || record.lot || "Batch —"}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300">
                                  {record.coaNumber || "COA Record"}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300">
                                  {currentCoa.version || "v1"}
                                </span>

                                {isShippingLot && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/[0.12] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                                    <ShieldCheck size={11} />
                                    Current Shipping Lot
                                  </span>
                                )}
                              </div>

                              <h4 className="truncate text-[22px] font-semibold tracking-[-0.045em] text-white">
                                {record.productName || record.compound}
                              </h4>

                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                {record.compound || record.productName} ·{" "}
                                {currentCoa.tested ||
                                  currentCoa.method ||
                                  record.tested ||
                                  "COA"}{" "}
                                {currentCoa.purity && (
                                  <>
                                    · Purity{" "}
                                    <span className="text-cyan-100/80">
                                      {currentCoa.purity}
                                    </span>
                                  </>
                                )}
                              </p>

                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                Current document:{" "}
                                {formatDate(currentCoa.date || record.date)} ·{" "}
                                {currentCoa.label || "Current COA"}
                                {isShippingLot && (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <span className="font-semibold text-amber-100/85">
                                      Currently shipping batch
                                    </span>
                                  </>
                                )}
                              </p>

                              {isShippingLot && (
                                <div className="mt-3 rounded-2xl border border-amber-300/12 bg-amber-400/[0.055] px-3.5 py-3">
                                  <p className="text-[11.5px] leading-5 text-amber-50/76 sm:text-xs">
                                    This certificate represents the active lot
                                    currently being distributed from our
                                    research catalog inventory.
                                  </p>
                                </div>
                              )}

                              {hasHistory && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenHistoryId(
                                      isHistoryOpen ? null : record.id
                                    )
                                  }
                                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/55 transition hover:text-cyan-100"
                                >
                                  <History size={12} />
                                  {isHistoryOpen
                                    ? "Hide history"
                                    : `${history.length} archived`}
                                  <ChevronDown
                                    size={12}
                                    className={`transition duration-300 ${
                                      isHistoryOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            {certificateUrl ? (
                              <a
                                href={certificateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                                  isShippingLot
                                    ? "border-amber-300/20 bg-amber-400/[0.12] text-amber-100 hover:border-amber-300/35 hover:bg-amber-400/[0.18] hover:text-white"
                                    : "border-cyan-200/15 bg-cyan-300/[0.09] text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/[0.16] hover:text-white"
                                }`}
                              >
                                View Certificate
                                <ArrowRight size={13} />
                              </a>
                            ) : (
                              <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.018] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                                Link pending
                              </span>
                            )}
                          </div>
                        </div>

                        {hasHistory && (
                          <div
                            className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              isHistoryOpen
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="border-t border-cyan-200/10 bg-[#030b14]/58 px-4 py-3 sm:px-5">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileText
                                      size={13}
                                      className="text-cyan-200/75"
                                    />

                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/45">
                                      Archived COA versions
                                    </p>
                                  </div>

                                  <p className="text-[10px] text-slate-600">
                                    {history.length} document
                                    {history.length === 1 ? "" : "s"}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  {history.map((version) => {
                                    const versionUrl =
                                      version.verifyUrl || version.fileUrl || "";

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
                                            {version.tested ||
                                              version.method ||
                                              "COA"}
                                            {version.purity &&
                                              ` · Purity ${version.purity}`}
                                          </p>
                                        </div>

                                        {versionUrl ? (
                                          <a
                                            href={versionUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200/10 bg-cyan-300/[0.045] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/80 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.1] hover:text-white"
                                          >
                                            Open
                                            <ArrowRight size={11} />
                                          </a>
                                        ) : (
                                          <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.014] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
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
                  })}
                </div>
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
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mini-coa-results {
          scrollbar-width: thin;
          scrollbar-color: rgba(103, 232, 249, 0.22) transparent;
        }

        .mini-coa-results::-webkit-scrollbar {
          width: 6px;
        }

        .mini-coa-results::-webkit-scrollbar-track {
          background: transparent;
        }

        .mini-coa-results::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.22);
        }
      `}</style>
    </section>
  );
}