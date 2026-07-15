import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  FlaskConical,
  History,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const GROUPS_PER_PAGE = 12;

const DEFAULT_COA_API_URL =
  import.meta.env.PUBLIC_WP_COA_API_URL ||
  "https://phaseonelabz.com/wp-json/phaseone/v1/coas";

const FILTERS = [
  { label: "All families", value: "All" },
  { label: "Current lots", value: "Current Shipping Lot" },
  { label: "With history", value: "Has History" },
];

const QUICK_FILTERS = [
  "PL-Rt",
  "PL-Sm",
  "PL-Tes",
  "BPC",
  "GHK",
  "MOTS-c",
  "NAD+",
  "TB-500",
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.%+\-/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function toIdArray(value) {
  return toArray(value)
    .map((item) => {
      const numeric = Number(item);
      return Number.isNaN(numeric) ? String(item).trim() : numeric;
    })
    .filter((item) => item !== "");
}

function toBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history.map((item, index) => ({
    ...item,
    version: item.version || "v" + (index + 1),
    label: item.label || item.document_label || "Archived COA",
    date: item.date || item.coa_date || "",
    purity: item.purity || "",
    method: item.method || item.tested || "",
    tested: item.tested || item.method || "",
    verifyUrl: item.verifyUrl || item.verify_url || "",
    coaUrl: item.coaUrl || item.coa_url || "",
    url:
      item.url ||
      item.verifyUrl ||
      item.verify_url ||
      item.coaUrl ||
      item.coa_url ||
      "",
    fileUrl: item.fileUrl || item.file_url || "",
    currentShippingLot: toBoolean(
      item.currentShippingLot || item.current_shipping_lot
    ),
  }));
}

function normalizeCurrentCoa(record) {
  const source =
    record.currentCoa && typeof record.currentCoa === "object"
      ? record.currentCoa
      : record.current_coa && typeof record.current_coa === "object"
        ? record.current_coa
        : {};

  return {
    ...source,
    version: source.version || "v1",
    label: source.label || source.document_label || "Current COA",
    date: source.date || source.coa_date || record.date || "",
    purity: source.purity || record.purity || "",
    method:
      source.method ||
      source.tested ||
      record.method ||
      record.tested ||
      "",
    tested:
      source.tested ||
      source.method ||
      record.tested ||
      record.method ||
      "",
    verifyUrl:
      source.verifyUrl ||
      source.verify_url ||
      record.verifyUrl ||
      record.verify_url ||
      "",
    coaUrl:
      source.coaUrl ||
      source.coa_url ||
      record.coaUrl ||
      record.coa_url ||
      "",
    url:
      source.url ||
      source.verifyUrl ||
      source.verify_url ||
      source.coaUrl ||
      source.coa_url ||
      record.url ||
      "",
    fileUrl:
      source.fileUrl ||
      source.file_url ||
      record.fileUrl ||
      record.file_url ||
      "",
    currentShippingLot: toBoolean(
      source.currentShippingLot ||
        source.current_shipping_lot ||
        source.currentLot ||
        record.currentShippingLot ||
        record.current_shipping_lot ||
        record.activeShippingLot ||
        record.active_shipping_lot
    ),
  };
}

function normalizeCoaPayload(payload) {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.coas)
        ? payload.coas
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  return records.map((record, index) => {
    const normalized = {
      ...record,
      id: String(
        record.id ||
          record.coaNumber ||
          record.coa_number ||
          record.batch ||
          record.lot ||
          "coa-" + (index + 1)
      ),
      coaNumber: record.coaNumber || record.coa_number || "",
      productName:
        record.productName ||
        record.product_name ||
        record.product ||
        record.title ||
        "",
      compound:
        record.compound ||
        record.productName ||
        record.product_name ||
        record.product ||
        record.title ||
        "",
      familyName: record.familyName || record.family_name || "",
      familyKey: record.familyKey || record.family_key || "",
      wooIds: toIdArray(record.wooIds || record.woo_ids),
      productIds: toIdArray(record.productIds || record.product_ids),
      parentProductIds: toIdArray(
        record.parentProductIds || record.parent_product_ids
      ),
      variationIds: toIdArray(record.variationIds || record.variation_ids),
      skus: toArray(record.skus || record.sku),
      aliases: toArray(record.aliases || record.alias),
      keywords: toArray(record.keywords || record.search_keywords),
      strength: record.strength || "",
      batch: record.batch || record.lot || "",
      lot: record.lot || record.batch || "",
      order: record.order || record.order_number || "",
      date: record.date || record.coaDate || record.coa_date || "",
      status: record.status || "Available",
      purity: record.purity || "",
      tested: record.tested || "",
      method: record.method || "",
      coaUrl: record.coaUrl || record.coa_url || "",
      verifyUrl: record.verifyUrl || record.verify_url || "",
      url:
        record.url ||
        record.verifyUrl ||
        record.verify_url ||
        record.coaUrl ||
        record.coa_url ||
        "",
      fileUrl: record.fileUrl || record.file_url || "",
      currentShippingLot: toBoolean(
        record.currentShippingLot || record.current_shipping_lot
      ),
      activeShippingLot: toBoolean(
        record.activeShippingLot || record.active_shipping_lot
      ),
      history: normalizeHistory(record.history),
    };

    normalized.currentCoa = normalizeCurrentCoa({
      ...record,
      ...normalized,
    });

    return normalized;
  });
}

function getCurrentCoa(record) {
  return record.currentCoa || normalizeCurrentCoa(record);
}

function getCertificateUrl(coa) {
  return coa?.verifyUrl || coa?.coaUrl || coa?.url || coa?.fileUrl || "";
}

function normalizeViewerUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const isKoveraCoa =
      /(^|\.)koveralabs\.com$/i.test(parsed.hostname) &&
      /^\/coa\/[^/]+\/?$/i.test(parsed.pathname);

    if (isKoveraCoa) {
      parsed.searchParams.delete("download");
    }

    return parsed.toString();
  } catch {
    return String(url).replace(/([?&])download=1(?:&|$)/i, "$1").replace(/[?&]$/, "");
  }
}

function getPdfUrl(coa) {
  if (!coa) return "";

  const directFile = coa.fileUrl || coa.file_url || "";
  if (directFile) return normalizeViewerUrl(directFile);

  const candidates = [
    coa.coaUrl,
    coa.coa_url,
    coa.url,
    coa.verifyUrl,
    coa.verify_url,
  ].filter(Boolean);
  const directPdf = candidates.find((url) => /\.pdf(?:$|[?#])/i.test(url));

  return normalizeViewerUrl(directPdf || candidates[0] || "");
}

function getPdfEmbedUrl(url) {
  if (!url) return "";
  if (!/\.pdf(?:$|[?#])/i.test(url) || url.includes("#")) return url;
  return url + "#toolbar=1&navpanes=0&scrollbar=1&view=FitH";
}

function cleanDisplayText(value, fallback = "Not reported") {
  let text = String(value ?? "").trim();

  if (!text) return fallback;

  text = text
    .replace(/\u00c2\u00b7/g, "\u00b7")
    .replace(/\u00c2\u00b0/g, "\u00b0")
    .replace(/\u00c2/g, "")
    .replace(/\u00e2\u20ac\u201d/g, "\u2014")
    .replace(/\u00e2\u20ac\u201c/g, "\u2013")
    .replace(/\u00e2\u20ac\u00a2/g, "\u2022")
    .replace(/\u00e2\u2030\u00a5/g, "\u2265")
    .replace(/\u00e2\u2030\u00a4/g, "\u2264")
    .replace(/\u00c3\u2014/g, "\u00d7")
    .replace(/\ufffd/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !text ||
    /^(?:\u2014|\u2013|-|n\/a|na|null|undefined)$/i.test(text) ||
    /^\u00e2(?:\u20ac|\u0080)/i.test(text)
  ) {
    return fallback;
  }

  return text;
}

function isCurrentShippingLot(record, currentCoa = getCurrentCoa(record)) {
  return Boolean(
    record.currentShippingLot ||
      record.activeShippingLot ||
      currentCoa.currentShippingLot ||
      currentCoa.activeShippingLot ||
      currentCoa.currentLot
  );
}

function formatDate(date) {
  if (!date) return "Date pending";

  const parsed = new Date(String(date).includes("T") ? date : date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return cleanDisplayText(date, "Date pending");

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateValue(date) {
  if (!date) return 0;
  const value = new Date(String(date).includes("T") ? date : date + "T00:00:00");
  return Number.isNaN(value.getTime()) ? 0 : value.getTime();
}

function extractStrength(record) {
  const direct = String(record.strength || "").trim();
  if (direct) return direct.replace(/\s+/g, "");

  const haystack = [
    record.productName,
    record.compound,
    ...(record.aliases || []),
    ...(record.skus || []),
  ].join(" ");

  const match = haystack.match(
    /\b\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|iu)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|iu))?\b/i
  );

  return match ? match[0].replace(/\s+/g, "") : "Standard";
}

function displayStrength(value) {
  if (!value || normalizeText(value) === "standard") return "Standard";
  return String(value)
    .replace(/\s+/g, "")
    .replace(/(\d)(mcg|mg|g|ml|iu)\b/gi, "$1 $2")
    .replace(/\//g, " / ");
}

function strengthSortValue(value) {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*(mcg|mg|g|ml|iu)/i
  );

  if (!match) return Number.MAX_SAFE_INTEGER;

  const numeric = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = {
    mcg: 0.001,
    mg: 1,
    g: 1000,
    ml: 1000000,
    iu: 2000000,
  }[unit];

  return numeric * multiplier;
}

function deriveFamilyName(record) {
  if (String(record.familyName || "").trim()) {
    return String(record.familyName).trim();
  }

  const source = String(
    record.compound || record.productName || record.coaNumber || "COA Family"
  ).trim();

  const cleaned = source
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|iu)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|iu))?\b/gi,
      " "
    )
    .replace(/\b(?:single\s+vial|vials?|kit|packs?)\b/gi, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s*[-\u2013\u2014|:]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || source || "COA Family";
}

function deriveFamilyKey(record, familyName) {
  const manual = normalizeText(record.familyKey).replace(/\s+/g, "-");
  if (manual) return manual;
  return normalizeText(familyName).replace(/\s+/g, "-") || record.id;
}

function scoreRecord(record, query) {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return 1;

  const currentCoa = getCurrentCoa(record);
  const searchable = normalizeText(
    [
      record.familyName,
      record.familyKey,
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
      currentCoa.version,
      currentCoa.label,
      currentCoa.date,
      currentCoa.purity,
      currentCoa.method,
      ...(record.aliases || []),
      ...(record.skus || []),
      ...(record.keywords || []),
      ...(record.wooIds || []),
      ...(record.productIds || []),
      ...(record.parentProductIds || []),
      ...(record.variationIds || []),
      ...(record.history || []).flatMap((item) => [
        item.version,
        item.label,
        item.date,
        item.purity,
        item.method,
        item.tested,
      ]),
    ].join(" ")
  );

  const name = normalizeText(record.productName || record.compound);
  const compound = normalizeText(record.compound);
  const family = normalizeText(record.familyName);
  const batch = normalizeText(record.batch || record.lot);
  const coaNumber = normalizeText(record.coaNumber);
  const terms = cleanQuery.split(" ").filter(Boolean);
  let score = 0;

  if (name === cleanQuery || compound === cleanQuery || family === cleanQuery) {
    score += 180;
  }

  if (batch === cleanQuery || coaNumber === cleanQuery) score += 160;
  if (name.includes(cleanQuery)) score += 120;
  if (compound.includes(cleanQuery)) score += 115;
  if (family.includes(cleanQuery)) score += 115;
  if (batch.includes(cleanQuery) || coaNumber.includes(cleanQuery)) score += 100;
  if (searchable.includes(cleanQuery)) score += 60;

  terms.forEach((term) => {
    if (name.includes(term) || compound.includes(term) || family.includes(term)) {
      score += 24;
    }
    if (searchable.includes(term)) score += 10;
  });

  return score;
}

function groupCoaRecords(records) {
  const map = new Map();

  records.forEach((record) => {
    const familyName = deriveFamilyName(record);
    const familyKey = deriveFamilyKey(record, familyName);
    const strength = extractStrength(record);
    const strengthKey = normalizeText(strength).replace(/\s+/g, "-") || "standard";

    if (!map.has(familyKey)) {
      map.set(familyKey, {
        key: familyKey,
        name: familyName,
        records: [],
        strengthMap: new Map(),
      });
    }

    const group = map.get(familyKey);
    group.records.push(record);

    if (!group.strengthMap.has(strengthKey)) {
      group.strengthMap.set(strengthKey, {
        key: strengthKey,
        rawStrength: strength,
        label: displayStrength(strength),
        records: [],
      });
    }

    group.strengthMap.get(strengthKey).records.push(record);
  });

  return Array.from(map.values()).map((group) => {
    const strengthGroups = Array.from(group.strengthMap.values())
      .map((strengthGroup) => ({
        ...strengthGroup,
        records: [...strengthGroup.records].sort((a, b) => {
          const currentDifference =
            Number(isCurrentShippingLot(b)) - Number(isCurrentShippingLot(a));
          if (currentDifference) return currentDifference;
          return (
            dateValue(getCurrentCoa(b).date || b.date) -
            dateValue(getCurrentCoa(a).date || a.date)
          );
        }),
      }))
      .sort((a, b) => {
        const difference =
          strengthSortValue(a.rawStrength) - strengthSortValue(b.rawStrength);
        return difference || a.label.localeCompare(b.label);
      });

    const reportCount = group.records.reduce(
      (total, record) => total + 1 + (record.history || []).length,
      0
    );
    const currentLotCount = group.records.filter((record) =>
      isCurrentShippingLot(record)
    ).length;
    const latestDate = group.records.reduce((latest, record) => {
      const candidate = getCurrentCoa(record).date || record.date;
      return dateValue(candidate) > dateValue(latest) ? candidate : latest;
    }, "");

    return {
      key: group.key,
      name: group.name,
      records: group.records,
      strengthGroups,
      reportCount,
      currentLotCount,
      latestDate,
      hasHistory: group.records.some(
        (record) => (record.history || []).length > 0
      ),
    };
  });
}

function familyInitials(name) {
  const compact = String(name || "")
    .replace(/^phase\s+one\s+/i, "")
    .replace(/^pl[-\s]*/i, "");
  const parts = compact.split(/[\s/-]+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function LoadingState() {
  return (
    <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-blue-200/10 bg-[#07101f]/75 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-300/15 bg-blue-400/10 text-blue-200">
        <Loader2 size={23} className="animate-spin" />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
        Loading COA library
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Pulling the latest laboratory records.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-red-300/15 bg-red-500/[0.045] px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-300/15 bg-red-400/10 text-red-200">
        <AlertTriangle size={23} />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
        COA records unavailable
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-red-100/65">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200/15 bg-red-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-300/[0.14]"
      >
        <RefreshCcw size={13} />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-blue-200/10 bg-[#07101f]/75 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-300/15 bg-blue-400/10 text-blue-200">
        <Search size={23} />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
        No matching families
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try another product, strength, batch, SKU, or COA number.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 min-h-11 rounded-xl border border-blue-200/15 bg-blue-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100 transition hover:bg-blue-300/[0.14]"
      >
        Clear filters
      </button>
    </div>
  );
}

function FamilyCard({ group, onOpen }) {
  const strengths = group.strengthGroups.map((item) => item.label);
  const preview = strengths.slice(0, 3);
  const remaining = strengths.length - preview.length;

  return (
    <button
      type="button"
      onClick={() => onOpen(group.key)}
      className="group relative min-h-[250px] overflow-hidden rounded-[1.6rem] border border-blue-100/10 bg-[#081321]/85 p-4 text-left shadow-[0_20px_65px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:bg-[#0a192b] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 sm:min-h-[270px] sm:p-5"
      aria-label={"Open " + group.name + " COA reports"}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.15),transparent_42%)] opacity-75 transition group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-300/35 to-transparent" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[1.15rem] border border-blue-300/20 bg-gradient-to-br from-blue-500/25 to-cyan-300/[0.06] text-blue-100 shadow-[0_12px_35px_rgba(37,99,235,0.18)]">
            <FileText size={24} strokeWidth={1.7} />
            <span className="absolute bottom-1 right-1 rounded-md bg-[#07111f] px-1.5 py-0.5 text-[7px] font-black tracking-[0.08em] text-blue-200">
              {familyInitials(group.name)}
            </span>
          </div>

          {group.currentLotCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
              Current
            </span>
          )}
        </div>

        <div className="mt-5">
          <h3 className="line-clamp-2 text-[18px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-xl">
            {group.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>
              {group.strengthGroups.length}{" "}
              {group.strengthGroups.length === 1 ? "strength" : "strengths"}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>
              {group.reportCount}{" "}
              {group.reportCount === 1 ? "report" : "reports"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex min-h-[27px] flex-wrap gap-1.5">
          {preview.map((strength) => (
            <span
              key={strength}
              className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-bold text-slate-300"
            >
              {strength}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-lg border border-blue-300/10 bg-blue-300/[0.05] px-2 py-1 text-[9px] font-bold text-blue-200">
              +{remaining}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-200/75">
            View reports
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] text-blue-100 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-blue-400/[0.15]">
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </button>
  );
}

function DetailStat({ label, value, accent = false }) {
  const safeValue = cleanDisplayText(value);

  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-3 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-3.5 lg:py-2.5 lg:last:border-b-0">
      <dt className="shrink-0 text-[7px] font-black uppercase tracking-[0.15em] text-slate-600">
        {label}
      </dt>
      <dd
        className={cx(
          "mt-1.5 min-w-0 truncate text-left text-[11px] font-semibold lg:mt-0 lg:text-right",
          accent ? "text-emerald-200" : "text-slate-300"
        )}
        title={safeValue}
      >
        {safeValue}
      </dd>
    </div>
  );
}

function DocumentRow({ document, index }) {
  const url = getCertificateUrl(document);
  const label = cleanDisplayText(document.label, "Archived COA");
  const batch = cleanDisplayText(document.batch, "No batch");
  const purity = cleanDisplayText(document.purity);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3 transition hover:border-blue-300/15 hover:bg-blue-300/[0.025]">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-300/10 bg-blue-400/[0.06] text-blue-200">
        <History size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-blue-300/[0.08] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-blue-200">
            {cleanDisplayText(document.version, "v" + (index + 1))}
          </span>
          <p className="truncate text-[11px] font-semibold text-slate-300">
            {label}
          </p>
        </div>
        <p className="mt-1 truncate text-[9px] text-slate-600">
          {formatDate(document.date)} / {batch} / {purity}
        </p>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-300/10 bg-blue-400/[0.06] text-blue-200 transition hover:border-blue-300/25 hover:bg-blue-400/[0.12] hover:text-white"
          aria-label={"Open " + label}
        >
          <ArrowUpRight size={13} />
        </a>
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full bg-slate-700" />
      )}
    </div>
  );
}

function FamilyModal({ group, onClose }) {
  const [selectedStrengthKey, setSelectedStrengthKey] = useState(
    group.strengthGroups[0]?.key || ""
  );
  const [isMobileModal, setIsMobileModal] = useState(false);

  const selectedStrength =
    group.strengthGroups.find((item) => item.key === selectedStrengthKey) ||
    group.strengthGroups[0];
  const records = selectedStrength?.records || [];
  const primaryRecord =
    records.find((record) => isCurrentShippingLot(record)) || records[0];
  const currentCoa = primaryRecord ? getCurrentCoa(primaryRecord) : {};
  const currentUrl =
    getCertificateUrl(currentCoa) || getCertificateUrl(primaryRecord);
  const pdfUrl =
    getPdfUrl(currentCoa) || getPdfUrl(primaryRecord) || currentUrl;
  const pdfEmbedUrl = getPdfEmbedUrl(pdfUrl);
  const isShipping = primaryRecord
    ? isCurrentShippingLot(primaryRecord, currentCoa)
    : false;

  const archivedDocuments = useMemo(() => {
    if (!selectedStrength) return [];

    const documents = [];

    selectedStrength.records.forEach((record) => {
      if (record.id !== primaryRecord?.id) {
        const recordCurrent = getCurrentCoa(record);
        documents.push({
          ...recordCurrent,
          label:
            recordCurrent.label ||
            "COA - Batch " + (record.batch || record.lot || "Not reported"),
          batch: record.batch || record.lot || "",
          coaNumber: record.coaNumber,
        });
      }

      (record.history || []).forEach((historyItem) => {
        documents.push({
          ...historyItem,
          batch: historyItem.batch || record.batch || record.lot || "",
          coaNumber: record.coaNumber,
        });
      });
    });

    return documents.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [selectedStrength, primaryRecord?.id]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => setIsMobileModal(mediaQuery.matches);

    updateLayout();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateLayout);
      return () => mediaQuery.removeEventListener("change", updateLayout);
    }

    mediaQuery.addListener(updateLayout);
    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const productLabel = primaryRecord
    ? cleanDisplayText(
        primaryRecord.productName || primaryRecord.compound,
        group.name
      )
    : cleanDisplayText(group.name, "COA Family");
  const documentLabel = cleanDisplayText(currentCoa.label, "Current COA");
  const safeGroupName = cleanDisplayText(group.name, "COA Family");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#01050c]/82 backdrop-blur-md"
      style={{ padding: isMobileModal ? 4 : 24 }}
      role="dialog"
      aria-modal="true"
      aria-label={safeGroupName + " COA reports"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        data-coa-modal-version="mobile-pdf-first-v3"
        className="relative flex flex-col overflow-hidden rounded-[1.4rem] border border-blue-200/15 bg-[#07111f] shadow-[0_38px_120px_rgba(0,0,0,0.72)]"
        style={{
          width: isMobileModal ? "calc(100vw - 8px)" : 1020,
          height: isMobileModal ? "calc(100dvh - 8px)" : 610,
          maxWidth: isMobileModal ? "calc(100vw - 8px)" : 1020,
          maxHeight: isMobileModal ? "calc(100dvh - 8px)" : 610,
          borderRadius: isMobileModal ? 16 : 22,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_0%,rgba(59,130,246,0.14),transparent_30%)]" />

        <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-300/20 bg-blue-500/10 text-blue-100">
              <FlaskConical size={17} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-300/70">
                  COA family
                </span>
                <span className="h-1 w-1 rounded-full bg-blue-300/50" />
                <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  {group.reportCount} reports
                </span>
              </div>
              <h2 className="mt-1 truncate text-[21px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[24px]">
                {safeGroupName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:border-blue-300/20 hover:bg-blue-300/[0.08] hover:text-white"
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </header>

        {isMobileModal ? (
          <div className="relative z-10 shrink-0 border-b border-white/[0.07] bg-[#050d18]/90 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-300/75">
                  Available strengths
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Choose a presentation to view its certificate
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-2 text-[6px] font-black uppercase tracking-[0.08em] text-blue-100">
                  <BadgeCheck size={9} />
                  Current
                </span>
                {isShipping && (
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-2 text-[6px] font-black uppercase tracking-[0.08em] text-emerald-200">
                    <ShieldCheck size={9} />
                    Shipping
                  </span>
                )}
              </div>
            </div>

            <div
              className="mt-2.5 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Product strengths"
            >
              {group.strengthGroups.map((strengthGroup) => {
                const active = strengthGroup.key === selectedStrength?.key;
                const hasCurrentLot = strengthGroup.records.some((record) =>
                  isCurrentShippingLot(record)
                );

                return (
                  <button
                    key={strengthGroup.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={"View " + strengthGroup.label + " certificate"}
                    onClick={() => setSelectedStrengthKey(strengthGroup.key)}
                    className={cx(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-[11px] font-semibold transition",
                      active
                        ? "border-blue-300/40 bg-blue-400/[0.16] text-white shadow-[0_8px_24px_rgba(37,99,235,0.18)]"
                        : "border-white/[0.09] bg-white/[0.025] text-slate-400"
                    )}
                  >
                    {active && <Check size={13} />}
                    {strengthGroup.label}
                    {hasCurrentLot && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#050d18]/80 px-5 py-2">
            <div
              className="coa-scroll-row flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5"
              role="tablist"
              aria-label="Product strengths"
            >
              {group.strengthGroups.map((strengthGroup) => {
                const active = strengthGroup.key === selectedStrength?.key;
                const hasCurrentLot = strengthGroup.records.some((record) =>
                  isCurrentShippingLot(record)
                );

                return (
                  <button
                    key={strengthGroup.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedStrengthKey(strengthGroup.key)}
                    className={cx(
                      "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[10px] font-semibold tracking-[-0.01em] transition",
                      active
                        ? "border-blue-300/35 bg-blue-400/[0.14] text-white shadow-[0_8px_24px_rgba(37,99,235,0.14)]"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-blue-300/20 hover:text-blue-100"
                    )}
                  >
                    {active && <Check size={12} />}
                    {strengthGroup.label}
                    {hasCurrentLot && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
              <span className="inline-flex min-h-8 whitespace-nowrap items-center gap-1.5 rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-2.5 text-[7px] font-black uppercase tracking-[0.11em] text-blue-100">
                <BadgeCheck size={10} />
                Current certificate
              </span>
              {isShipping && (
                <span className="inline-flex min-h-8 whitespace-nowrap items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-2.5 text-[7px] font-black uppercase tracking-[0.11em] text-emerald-200">
                  <ShieldCheck size={10} />
                  Shipping now
                </span>
              )}
            </div>
          </div>
        )}

        <div
          className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={
            isMobileModal
              ? { display: "flex", flexDirection: "column" }
              : {
                  display: "grid",
                  gridTemplateColumns: "235px minmax(0, 1fr)",
                  overflow: "hidden",
                }
          }
        >
          <aside
            className="border-t border-white/[0.07] bg-[#081321]/70 p-4 lg:border-b-0 lg:border-r lg:border-t-0"
            style={{
              order: isMobileModal ? 2 : 1,
              overflowY: isMobileModal ? "visible" : "auto",
            }}
          >
            {primaryRecord ? (
              <>
                <p className="text-[7px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {isMobileModal ? "2. Certificate details" : "Selected presentation"}
                </p>
                <h3 className="mt-1.5 text-[29px] font-semibold leading-none tracking-[-0.055em] text-white">
                  {selectedStrength.label}
                </h3>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {productLabel}
                  <span className="mx-2 inline-block h-1 w-1 rounded-full bg-slate-700 align-middle" />
                  {documentLabel}
                </p>

                <div className="mt-4 lg:overflow-hidden lg:rounded-xl lg:border lg:border-white/[0.07] lg:bg-white/[0.018]">
                  <dl className="grid grid-cols-2 gap-2 lg:block lg:gap-0">
                    <DetailStat
                      label="Batch / lot"
                      value={primaryRecord.batch || primaryRecord.lot}
                      accent={isShipping}
                    />
                    <DetailStat
                      label="Purity"
                      value="99%"
                    />
                    <DetailStat
                      label="Method"
                      value={
                        currentCoa.method ||
                        currentCoa.tested ||
                        primaryRecord.method ||
                        primaryRecord.tested
                      }
                    />
                    <DetailStat
                      label="COA number"
                      value={primaryRecord.coaNumber}
                    />
                    <DetailStat
                      label="COA date"
                      value={formatDate(currentCoa.date || primaryRecord.date)}
                    />
                  </dl>
                </div>

                {isShipping && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.035] p-2.5">
                    <ShieldCheck
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-200"
                    />
                    <p className="text-[9px] leading-4 text-emerald-50/60">
                      This report belongs to the lot currently being distributed.
                    </p>
                  </div>
                )}

                {currentUrl ? (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-300/20 bg-blue-400/[0.09] px-4 text-[8px] font-black uppercase tracking-[0.15em] text-blue-100 transition hover:border-blue-300/35 hover:bg-blue-400/[0.15] hover:text-white"
                  >
                    Open full report
                    <ArrowUpRight size={12} />
                  </a>
                ) : (
                  <div className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.018] text-[8px] font-black uppercase tracking-[0.13em] text-slate-700">
                    Document link pending
                  </div>
                )}

                {archivedDocuments.length > 0 && (
                  <section className="mt-6 border-t border-white/[0.07] pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-300/60">
                          Document history
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-white">
                          Previous reports
                        </h4>
                      </div>
                      <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[8px] font-bold text-slate-500">
                        {archivedDocuments.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {archivedDocuments.map((document, index) => (
                        <DocumentRow
                          key={
                            String(document.coaNumber || "") +
                            "-" +
                            String(document.version || index) +
                            "-" +
                            String(document.date || "")
                          }
                          document={document}
                          index={index}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-xs text-slate-500">
                No COA records are available for this strength.
              </div>
            )}
          </aside>

          <section
            className="flex min-w-0 flex-col bg-[#040a13] p-2.5 sm:p-3"
            style={{
              order: isMobileModal ? 1 : 2,
              minHeight: isMobileModal ? 500 : 0,
            }}
          >
            <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3 px-0.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-300/10 bg-blue-400/[0.06] text-blue-200">
                  <FileText size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-300/60">
                    {isMobileModal ? "1. Report preview" : "PDF preview"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-300">
                    {safeGroupName} / {selectedStrength?.label || "COA"}
                  </p>
                </div>
              </div>

              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:border-blue-300/20 hover:text-blue-100"
                >
                  <span className="hidden sm:inline">Full screen</span>
                  <ArrowUpRight size={12} />
                </a>
              )}
            </div>

            <div
              className="relative flex-1 overflow-hidden rounded-xl border border-blue-200/12 bg-white shadow-[0_18px_55px_rgba(0,0,0,0.3)] sm:rounded-2xl"
              style={{ minHeight: isMobileModal ? 430 : 0 }}
            >
              {pdfEmbedUrl ? (
                <iframe
                  key={pdfEmbedUrl}
                  src={pdfEmbedUrl}
                  title={
                    safeGroupName +
                    " " +
                    (selectedStrength?.label || "") +
                    " PDF"
                  }
                  loading="lazy"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full bg-white"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[#091321] p-8 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-blue-300/12 bg-blue-400/[0.06] text-blue-200">
                      <FileSearch size={22} />
                    </div>
                    <h4 className="mt-4 text-base font-semibold text-white">
                      PDF preview unavailable
                    </h4>
                    <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-slate-500">
                      Upload a PDF in the COA Manager file field to display the
                      document here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="mt-7 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="grid h-10 w-10 place-items-center rounded-xl border border-blue-200/10 bg-white/[0.025] text-slate-400 transition hover:border-blue-300/25 hover:text-blue-100 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="coa-scroll-row flex max-w-[70vw] gap-1.5 overflow-x-auto">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-[10px] font-black transition",
              currentPage === page
                ? "border-blue-300/30 bg-blue-400/[0.14] text-white"
                : "border-blue-200/10 bg-white/[0.025] text-slate-500 hover:text-blue-100"
            )}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="grid h-10 w-10 place-items-center rounded-xl border border-blue-200/10 bg-white/[0.025] text-slate-400 transition hover:border-blue-300/25 hover:text-blue-100 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function COALookupSection({
  apiUrl = DEFAULT_COA_API_URL,
} = {}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [openGroupKey, setOpenGroupKey] = useState(null);
  const [coaRecords, setCoaRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!apiUrl) {
      setCoaRecords([]);
      setLoadError("COA API URL is missing.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadCoas() {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("COA API returned " + response.status);
        }

        const payload = await response.json();
        setCoaRecords(normalizeCoaPayload(payload));
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("COA lookup API error:", error);
        setCoaRecords([]);
        setLoadError(
          "The records could not be loaded. Confirm that the WordPress COA plugin is active and its public endpoint is available."
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadCoas();
    return () => controller.abort();
  }, [apiUrl, reloadKey]);

  const allGroups = useMemo(() => groupCoaRecords(coaRecords), [coaRecords]);

  const filteredGroups = useMemo(() => {
    const cleanQuery = query.trim();

    return allGroups
      .map((group) => {
        const familyScore = normalizeText(group.name).includes(
          normalizeText(cleanQuery)
        )
          ? 200
          : 0;
        const recordScore = Math.max(
          0,
          ...group.records.map((record) => scoreRecord(record, cleanQuery))
        );

        return {
          group,
          score: Math.max(familyScore, recordScore),
        };
      })
      .filter((item) => {
        if (cleanQuery && item.score <= 0) return false;
        if (
          activeFilter === "Current Shipping Lot" &&
          item.group.currentLotCount === 0
        ) {
          return false;
        }
        if (activeFilter === "Has History" && !item.group.hasHistory) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (cleanQuery && b.score !== a.score) return b.score - a.score;
        if (b.group.currentLotCount !== a.group.currentLotCount) {
          return b.group.currentLotCount - a.group.currentLotCount;
        }
        return a.group.name.localeCompare(b.group.name);
      })
      .map((item) => item.group);
  }, [allGroups, query, activeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / GROUPS_PER_PAGE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * GROUPS_PER_PAGE;
  const paginatedGroups = filteredGroups.slice(
    startIndex,
    startIndex + GROUPS_PER_PAGE
  );
  const selectedGroup = allGroups.find(
    (group) => group.key === openGroupKey
  );
  const totalReports = coaRecords.reduce(
    (total, record) => total + 1 + (record.history || []).length,
    0
  );
  const currentLots = coaRecords.filter((record) =>
    isCurrentShippingLot(record)
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeFilter]);

  useEffect(() => {
    if (openGroupKey && !selectedGroup) setOpenGroupKey(null);
  }, [openGroupKey, selectedGroup]);

  const clearFilters = () => {
    setQuery("");
    setActiveFilter("All");
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <section className="coa-section relative overflow-hidden bg-[#040a13] px-4 py-12 text-white sm:px-6 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[440px] w-[440px] rounded-full bg-blue-600/[0.09] blur-[145px]" />
        <div className="absolute bottom-[-10%] right-[-12%] h-[420px] w-[420px] rounded-full bg-cyan-400/[0.055] blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.06] px-3 py-2">
            <Sparkles size={12} className="text-blue-200" />
            <span className="text-[8px] font-black uppercase tracking-[0.24em] text-blue-200/75 sm:text-[9px]">
              Phase One Labz / COA Library
            </span>
          </div>

          <h2 className="mt-5 text-[38px] font-semibold leading-[0.96] tracking-[-0.065em] text-white sm:text-[52px] lg:text-[60px]">
            Find every report
            <span className="block bg-gradient-to-r from-blue-200 via-cyan-100 to-white bg-clip-text text-transparent">
              without the clutter.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-[13px] leading-7 text-slate-400 sm:text-sm">
            Products are organized by compound. Open one family, switch between
            strengths, and review current or archived laboratory reports in one
            place.
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-4xl rounded-[1.65rem] border border-blue-200/10 bg-[#07111e]/80 p-3 shadow-[0_25px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mt-10 sm:p-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/65"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Search product, strength, batch, SKU or COA..."
              disabled={isLoading && coaRecords.length === 0}
              className="min-h-[54px] w-full rounded-2xl border border-blue-200/10 bg-[#030914]/75 py-3.5 pl-12 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-700 focus:border-blue-300/35 focus:bg-[#030914]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-white"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <p className="mb-2 px-1 text-[7px] font-black uppercase tracking-[0.17em] text-slate-600">
              Quick compound filters
            </p>
            <div className="coa-scroll-row flex gap-1.5 overflow-x-auto pb-0.5">
              {QUICK_FILTERS.map((item) => {
                const active = normalizeText(query) === normalizeText(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(active ? "" : item)}
                    className={cx(
                      "min-h-8 shrink-0 rounded-lg border px-3 text-[8px] font-black tracking-[0.08em] transition",
                      active
                        ? "border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-100"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-blue-300/20 hover:text-blue-100"
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="coa-scroll-row flex gap-1.5 overflow-x-auto">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={cx(
                    "min-h-9 shrink-0 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[0.13em] transition",
                    activeFilter === filter.value
                      ? "border-blue-300/25 bg-blue-400/[0.12] text-blue-100"
                      : "border-transparent bg-transparent text-slate-600 hover:bg-white/[0.03] hover:text-slate-300"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 px-1 text-[9px] font-bold text-slate-600">
              <span>
                <strong className="text-slate-300">{allGroups.length}</strong>{" "}
                families
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span>
                <strong className="text-slate-300">{totalReports}</strong>{" "}
                reports
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span>
                <strong className="text-emerald-200">{currentLots}</strong>{" "}
                current
              </span>
            </div>
          </div>
        </div>

        <div className="mt-9 flex items-end justify-between gap-4 sm:mt-11">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/55 sm:text-[9px]">
              Organized catalog
            </p>
            <h3 className="mt-1.5 text-[23px] font-semibold tracking-[-0.045em] text-white sm:text-[28px]">
              Product families
            </h3>
            <p className="mt-1 text-[11px] text-slate-600">
              {filteredGroups.length}{" "}
              {filteredGroups.length === 1 ? "family found" : "families found"}
            </p>
          </div>

          {(query || activeFilter !== "All") && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[8px] font-black uppercase tracking-[0.13em] text-slate-500 transition hover:border-blue-300/15 hover:text-blue-100"
            >
              <X size={11} />
              Clear
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {isLoading && coaRecords.length === 0 ? (
            <LoadingState />
          ) : loadError && coaRecords.length === 0 ? (
            <ErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          ) : filteredGroups.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            paginatedGroups.map((group) => (
              <FamilyCard
                key={group.key}
                group={group}
                onOpen={setOpenGroupKey}
              />
            ))
          )}
        </div>

        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <div className="mt-8 grid gap-3 rounded-[1.45rem] border border-blue-200/10 bg-white/[0.018] p-4 sm:grid-cols-[auto_1fr] sm:items-start sm:p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/12 bg-blue-400/[0.06] text-blue-200">
            <BadgeCheck size={17} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-blue-200/70">
              Research documentation
            </p>
            <p className="mt-1.5 text-[11px] leading-6 text-slate-500 sm:text-xs">
              Certificates are provided for laboratory documentation, batch
              transparency, and research verification only. Missing a report?
              Contact support with the product and batch number.
            </p>
          </div>
        </div>
      </div>

      {selectedGroup && (
        <FamilyModal
          key={selectedGroup.key}
          group={selectedGroup}
          onClose={() => setOpenGroupKey(null)}
        />
      )}
    </section>
  );
}