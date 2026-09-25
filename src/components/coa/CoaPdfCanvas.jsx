import { useEffect, useMemo, useRef, useState } from "react";

const ALLOWED_COA_HOSTS = new Set([
  "staging.phaseonelabz.com",
  "coas.freedomdiagnosticstesting.com",
  "d2xsxph8kpxj0f.cloudfront.net",
  "files.ils-lab.com",
]);
const DOCUMENT_FOCUS_KEYS = new Set(["identity", "purity", "tests"]);
const CALLOUT_COPY = Object.freeze({
  identity: {
    label: "Compound name",
    detail: "This name and presentation must match the vial.",
  },
  purity: {
    label: "Purity result",
    detail: "Read the assay result together with its method.",
  },
});

const TEST_DEFINITIONS = Object.freeze([
  {
    id: "purity",
    label: "Purity / HPLC",
    detail: "Separates the sample's components and reports how much of the detected material matches the main compound.",
    prefixes: ["peptide purity hplc", "purity hplc uv", "purity hplc"],
  },
  {
    id: "net-content",
    label: "Net peptide content",
    detail: "Measures the actual peptide mass found in the tested vial, separate from the purity percentage.",
    prefixes: ["net peptide content", "net content"],
  },
  {
    id: "identity",
    label: "Identity",
    detail: "Checks whether the sample's analytical signature matches the compound named on the certificate.",
    prefixes: ["identity hplc rtm", "identity lc ms", "compound identity", "identity"],
  },
  {
    id: "fentanyl",
    label: "Fentanyl screen",
    detail: "Screens specifically for fentanyl at the detection cutoff stated by the laboratory.",
    prefixes: ["fentanyl screen", "fentanyl"],
  },
  {
    id: "elemental-impurities",
    label: "Elemental impurities",
    detail: "Summarizes the panel used to look for trace elemental contaminants in the sample.",
    prefixes: ["elemental impurities icp ms", "elemental impurities"],
  },
  {
    id: "arsenic",
    label: "Arsenic",
    detail: "Checks the sample for the elemental contaminant arsenic.",
    prefixes: ["arsenic as", "arsenic"],
    metal: true,
  },
  {
    id: "cadmium",
    label: "Cadmium",
    detail: "Checks the sample for the elemental contaminant cadmium.",
    prefixes: ["cadmium cd", "cadmium"],
    metal: true,
  },
  {
    id: "lead",
    label: "Lead",
    detail: "Checks the sample for the elemental contaminant lead.",
    prefixes: ["lead pb", "lead"],
    metal: true,
  },
  {
    id: "mercury",
    label: "Mercury",
    detail: "Checks the sample for the elemental contaminant mercury.",
    prefixes: ["mercury hg", "mercury"],
    metal: true,
  },
  {
    id: "chromium",
    label: "Chromium",
    detail: "Checks the sample for the elemental contaminant chromium.",
    prefixes: ["chromium cr", "chromium"],
    metal: true,
  },
  {
    id: "sterility",
    label: "Sterility PCR",
    detail: "Looks for evidence of microbial contamination using the method reported by the laboratory.",
    prefixes: ["sterility pcr", "sterility"],
  },
  {
    id: "microbial-pcr",
    label: "Microbial PCR",
    detail: "Screens for microbial genetic material using the laboratory's reported PCR method.",
    prefixes: ["microbial analysis pcr", "microbial pcr"],
  },
  {
    id: "endotoxin",
    label: "Endotoxin",
    detail: "Measures bacterial endotoxins and reports the concentration, commonly in EU/mL.",
    prefixes: ["endotoxin usp 85", "bacterial endotoxins", "bacterial endotoxin", "endotoxin"],
    repeatable: true,
  },
]);

function explainReportedResult({ canonicalId = "", resultText = "", statusText = "" }) {
  const combined = `${resultText} ${statusText}`.trim();
  const normalized = normalizeText(combined);

  if (/not detected|non detected|nd\b/.test(normalized)) {
    return "The analyte was below the laboratory's stated detection or reporting threshold; it does not mean absolute zero.";
  }
  if (/no growth/.test(normalized)) {
    return "No microbial growth was reported under this test's stated conditions.";
  }
  if (/confirmed/.test(normalized)) {
    return "The laboratory reports that this analytical check matched the expected identity.";
  }
  if (/pass/.test(normalized)) {
    return "The reported value meets the acceptance criterion shown on this certificate.";
  }
  if (canonicalId === "purity" || /%/.test(combined)) {
    return "Read this as the reported purity percentage, not as the amount inside the vial or a standalone safety claim.";
  }
  if (canonicalId === "net-content" || /\bmg\b/i.test(combined)) {
    return "This is the measured amount reported for the tested sample; compare it with the labeled vial content.";
  }
  if (canonicalId === "endotoxin" || /eu\s*\/\s*ml/i.test(combined)) {
    return "Read the measured concentration together with the specification or limit printed on the same row.";
  }
  return "Read this reported result together with the method, unit and acceptance criterion printed on the COA.";
}

const IDENTITY_ALIASES = Object.freeze([
  {
    canonical: "retatrutide",
    aliases: ["retatrutide", "pl rt", "r3ta", "rt3", "reta"],
  },
  {
    canonical: "tirzepatide",
    aliases: ["tirzepatide", "pl tirz", "tirz", "pl tz", "tz2"],
  },
  {
    canonical: "semaglutide",
    aliases: ["semaglutide", "pl sema", "sema"],
  },
  {
    canonical: "cagrilintide",
    aliases: ["cagrilintide", "pl cagri", "cagri"],
  },
]);

let pdfJsPromise;
const pdfBytesCache = new Map();
const MAX_CACHED_PDFS = 8;
const preparedCoaCache = new Map();
const MAX_PREPARED_COAS = 8;
const PAGE_SNAPSHOT_WIDTH = 1_200;

function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, workerModule]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default || workerModule;
      return pdfjs;
    });
  }

  return pdfJsPromise;
}

export function preloadCoaRenderer() {
  return loadPdfJs();
}

function trimOldest(cache, maximum) {
  while (cache.size > maximum) {
    cache.delete(cache.keys().next().value);
  }
}

function touchCacheEntry(cache, key) {
  const value = cache.get(key);
  if (!value) return null;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function redactionSignature(redactions = []) {
  return redactions
    .map((rect) =>
      [rect.type || "field", rect.x, rect.y, rect.width, rect.height]
        .map((value) => (typeof value === "number" ? value.toFixed(5) : value))
        .join(":"),
    )
    .join("|");
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function containsTerm(text, term) {
  if (!text || !term) return false;
  if (text === term) return true;
  return ` ${text} `.includes(` ${term} `);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRect(rect, pageWidth, pageHeight) {
  const x = clamp(rect.x / pageWidth);
  const y = clamp(rect.y / pageHeight);
  const width = clamp(rect.width / pageWidth, 0, 1 - x);
  const height = clamp(rect.height / pageHeight, 0, 1 - y);

  return { x, y, width, height };
}

function unionRects(rectangles = []) {
  const valid = rectangles.filter(Boolean);
  if (!valid.length) return null;

  const left = Math.min(...valid.map((rect) => rect.x));
  const top = Math.min(...valid.map((rect) => rect.y));
  const right = Math.max(...valid.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...valid.map((rect) => rect.y + rect.height));

  return {
    x: clamp(left),
    y: clamp(top),
    width: clamp(right - left, 0, 1 - clamp(left)),
    height: clamp(bottom - top, 0, 1 - clamp(top)),
  };
}

function padRect(rect, horizontal = 0.006, vertical = 0.004) {
  if (!rect) return null;

  const x = clamp(rect.x - horizontal);
  const y = clamp(rect.y - vertical);
  const right = clamp(rect.x + rect.width + horizontal);
  const bottom = clamp(rect.y + rect.height + vertical);

  return {
    x,
    y,
    width: Math.max(0.004, right - x),
    height: Math.max(0.004, bottom - y),
  };
}

function rectCenter(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function rectDistance(left, right) {
  const a = rectCenter(left);
  const b = rectCenter(right);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getTextItemRect(item, viewport, Util) {
  const transform = Util.transform(viewport.transform, item.transform);
  const fontHeight = Math.max(
    Math.hypot(transform[2], transform[3]),
    Number(item.height || 0) * viewport.scale,
    1,
  );
  const width = Math.max(Math.abs(Number(item.width || 0) * viewport.scale), 1);
  const x = transform[4];
  const y = transform[5] - fontHeight;

  return normalizeRect(
    {
      x,
      y,
      width,
      height: fontHeight,
    },
    viewport.width,
    viewport.height,
  );
}

function groupTextLines(entries = []) {
  const lines = [];
  const sorted = [...entries].sort((left, right) => {
    const vertical = left.rect.y - right.rect.y;
    return Math.abs(vertical) > 0.002 ? vertical : left.rect.x - right.rect.x;
  });

  sorted.forEach((entry) => {
    const centerY = rectCenter(entry.rect).y;
    let bestLine = null;
    let bestDistance = Infinity;

    lines.forEach((line) => {
      const tolerance = Math.max(0.004, entry.rect.height * 0.8, line.height * 0.7);
      const distance = Math.abs(centerY - line.centerY);
      if (distance <= tolerance && distance < bestDistance) {
        bestLine = line;
        bestDistance = distance;
      }
    });

    if (!bestLine) {
      lines.push({
        centerY,
        entries: [entry],
        height: entry.rect.height,
      });
      return;
    }

    bestLine.entries.push(entry);
    const entryCount = bestLine.entries.length;
    bestLine.centerY =
      (bestLine.centerY * (entryCount - 1) + centerY) / entryCount;
    bestLine.height = Math.max(bestLine.height, entry.rect.height);
  });

  return lines.map((line) => {
    const ordered = [...line.entries].sort(
      (left, right) => left.rect.x - right.rect.x,
    );
    const text = ordered.map((entry) => entry.text).join(" ").replace(/\s+/g, " ").trim();

    return {
      kind: "line",
      text,
      normalized: normalizeText(text),
      rect: unionRects(ordered.map((entry) => entry.rect)),
      entries: ordered,
    };
  });
}

async function analyzePage(page, pageNumber, Util) {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const entries = textContent.items
    .filter((item) => typeof item?.str === "string" && item.str.trim())
    .map((item) => {
      const text = item.str.replace(/\s+/g, " ").trim();
      return {
        kind: "item",
        text,
        normalized: normalizeText(text),
        rect: getTextItemRect(item, viewport, Util),
      };
    })
    .filter((entry) => entry.normalized && entry.rect);
  const lines = groupTextLines(entries);

  return {
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    entries,
    lines,
    candidates: [...entries, ...lines],
    normalizedText: normalizeText(lines.map((line) => line.text).join(" ")),
  };
}

function buildIdentityTerms(productName = "") {
  const rawName = String(productName || "").trim();
  const withoutPresentation = rawName
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ug|\u00b5g|ml)\b/gi, " ")
    .replace(/\b(?:vials?|kits?|bottles?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedName = normalizeText(rawName);
  const normalizedBase = normalizeText(withoutPresentation);
  const terms = [normalizedName, normalizedBase];

  IDENTITY_ALIASES.forEach(({ canonical, aliases }) => {
    if (
      aliases.some(
        (alias) =>
          containsTerm(normalizedName, normalizeText(alias)) ||
          containsTerm(normalizedBase, normalizeText(alias)),
      )
    ) {
      terms.push(canonical);
    }
  });

  const significantWords = normalizedBase
    .split(" ")
    .filter(
      (word) =>
        word.length >= 4 &&
        !["phase", "labz", "labs", "peptide", "research", "blend"].includes(word),
    );
  if (significantWords.length) terms.push(significantWords.join(" "));

  return unique(terms).sort((left, right) => right.length - left.length);
}

function scoreCandidate(candidate, term, { preferLine = false } = {}) {
  const text = candidate.normalized;
  if (!text || !term) return -Infinity;

  let score = -Infinity;
  if (text === term) score = 1_000;
  else if (containsTerm(text, term)) score = 820;
  else {
    const tokens = term.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((token) => containsTerm(text, token))) {
      score = 570;
    }
  }

  if (!Number.isFinite(score)) return score;
  if (preferLine && candidate.kind === "line") score += 25;
  if (candidate.kind === "item") score += 80;
  score += Math.min(term.length, 80);
  score -= Math.max(0, text.length - term.length) * 0.16;

  return score;
}

function findBestMatch(pages, terms, options = {}) {
  let best = null;

  pages.forEach((page) => {
    page.candidates.forEach((candidate) => {
      terms.forEach((term) => {
        let score = scoreCandidate(candidate, term, options);
        if (!Number.isFinite(score)) return;
        score -= (page.pageNumber - 1) * 25;

        if (!best || score > best.score) {
          best = {
            score,
            page: page.pageNumber,
            rect: padRect(candidate.rect),
            text: candidate.text,
          };
        }
      });
    });
  });

  return best;
}

const ANALYTICAL_TABLE_HEADERS = new Set([
  "analyte",
  "test",
  "specification",
  "result",
  "unit",
  "status",
  "sample",
]);

const ANALYTICAL_RESULT_PATTERN =
  /\b(pass|passed|confirmed|not detected|no growth|free|reported|complies|compliant|present|absent|positive|negative)\b/;

function rectHasVisibleArea(rect) {
  return Boolean(
    rect &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width >= 0.003 &&
      rect.height >= 0.003 &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= 1.001 &&
      rect.y + rect.height <= 1.001,
  );
}

function isUsableTextEntry(entry) {
  return Boolean(
    entry &&
      entry.kind === "item" &&
      entry.normalized &&
      !ANALYTICAL_TABLE_HEADERS.has(entry.normalized) &&
      rectHasVisibleArea(entry.rect),
  );
}

function normalizedTokens(value = "") {
  return normalizeText(value).split(" ").filter(Boolean);
}

function tokenCoverage(text = "", term = "") {
  const haystack = new Set(normalizedTokens(text));
  const tokens = normalizedTokens(term);
  if (!tokens.length) return 0;
  return tokens.filter((token) => haystack.has(token)).length / tokens.length;
}

function preciseCandidateRect(candidate, term) {
  if (!candidate?.rect) return null;
  if (candidate.kind === "item") return candidate.rect;

  const meaningfulTokens = normalizedTokens(term).filter(
    (token) => token.length > 1 && !/^\d+(?:mg|mcg|ug|ml)?$/.test(token),
  );
  const matchingEntries = (candidate.entries || []).filter((entry) => {
    const entryTokens = normalizedTokens(entry.normalized);
    return entryTokens.some((token) => meaningfulTokens.includes(token));
  });

  return unionRects(matchingEntries.map((entry) => entry.rect)) || candidate.rect;
}

function nearestEntry(entries, origin, predicate = () => true) {
  return entries
    .filter((entry) => entry !== origin && predicate(entry))
    .map((entry) => ({ entry, distance: rectDistance(origin.rect, entry.rect) }))
    .sort((left, right) => left.distance - right.distance)[0]?.entry || null;
}

function parseReportedNumber(value = "") {
  const match = String(value || "")
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function findPurityAnchor(pages, purity = "") {
  const expectedValue = parseReportedNumber(purity);
  const labels = pages.flatMap((page) =>
    page.entries
      .filter(
        (entry) =>
          isUsableTextEntry(entry) &&
          ["peptide purity", "purity", "purity hplc"].some(
            (label) =>
              entry.normalized === label || entry.normalized.startsWith(`${label} `),
          ) &&
          !/\b(identity|quantitation|testing|results?)\b/.test(entry.normalized),
      )
      .map((entry) => ({ ...entry, page: page.pageNumber })),
  );

  const values = pages.flatMap((page) =>
    page.entries
      .filter((entry) => {
        if (!isUsableTextEntry(entry)) return false;
        const number = parseReportedNumber(entry.text);
        if (!Number.isFinite(number)) return false;
        if (Number.isFinite(expectedValue)) {
          return Math.abs(number - expectedValue) <= 0.005;
        }
        return /%/.test(entry.text) && number >= 0 && number <= 100;
      })
      .map((entry) => ({ ...entry, page: page.pageNumber })),
  );

  let best = null;
  values.forEach((value) => {
    const label = nearestEntry(
      labels,
      value,
      (candidate) =>
        candidate.page === value.page && rectDistance(candidate.rect, value.rect) <= 0.48,
    );
    if (!label) return;

    const distance = rectDistance(label.rect, value.rect);
    let score = 1_200 - distance * 1_100;
    if (value.page === 1) score += 180;
    if (/%/.test(value.text)) score += 180;
    if (Math.abs(rectCenter(label.rect).x - rectCenter(value.rect).x) < 0.045) {
      score += 260;
    }
    if (value.rect.y < 0.42) score += 100;

    if (!best || score > best.score) {
      best = {
        score,
        page: value.page,
        rect: padRect(value.rect, 0.005, 0.004),
        contextRect: padRect(unionRects([label.rect, value.rect]), 0.018, 0.014),
        text: value.text,
      };
    }
  });

  return best;
}

function findIdentityAnchor(pages, productName) {
  const terms = buildIdentityTerms(productName);
  if (!terms.length) return null;

  const identityFieldLabels = new Set([
    "product",
    "product name",
    "sample",
    "sample name",
    "compound",
    "compound name",
  ]);
  for (const page of pages.filter((item) => item.pageNumber === 1)) {
    const labels = page.entries.filter((entry) =>
      identityFieldLabels.has(entry.normalized),
    );
    for (const label of labels) {
      const labelCenter = rectCenter(label.rect);
      const value = page.entries
        .filter((entry) => {
          if (entry === label) return false;
          const center = rectCenter(entry.rect);
          const matchesName = terms.some((term) =>
            Number.isFinite(scoreCandidate(entry, term)),
          );
          return (
            matchesName &&
            entry.rect.x >= label.rect.x + label.rect.width - 0.01 &&
            Math.abs(center.y - labelCenter.y) <=
              Math.max(0.014, label.rect.height * 1.6)
          );
        })
        .sort((left, right) => left.rect.x - right.rect.x)[0];

      if (value) {
        return {
          score: 2_000,
          page: page.pageNumber,
          rect: padRect(value.rect, 0.005, 0.004),
          contextRect: padRect(unionRects([label.rect, value.rect]), 0.02, 0.016),
          text: value.text,
        };
      }
    }
  }

  let best = null;
  pages
    .filter((page) => page.pageNumber === 1)
    .forEach((page) => {
    page.candidates.forEach((candidate) => {
      if (!candidate.normalized || !rectHasVisibleArea(candidate.rect)) return;
      if (
        /\b(tested for|analysis|result|method|notes|chromatogram|conformity|coa|lot|access code)\b/.test(
          candidate.normalized,
        )
      ) {
        return;
      }

      terms.forEach((term) => {
        let score = scoreCandidate(candidate, term, { preferLine: true });
        if (!Number.isFinite(score)) return;

        const coverage = tokenCoverage(candidate.normalized, term);
        if (coverage < 0.72) return;

        // A product identity belongs in the document header. Explicitly favor
        // the first-page name/presentation and reject similarly worded assay
        // rows farther down the report.
        score += coverage * 360;
        score += 240;
        if (candidate.rect.y < 0.34) score += 420;
        if (candidate.rect.y < 0.2) score += 160;
        if (candidate.kind === "item") score += 190;

        const preciseRect = preciseCandidateRect(candidate, term);
        if (!rectHasVisibleArea(preciseRect)) return;

        if (!best || score > best.score) {
          best = {
            score,
            page: page.pageNumber,
            rect: padRect(preciseRect, 0.005, 0.004),
            contextRect: padRect(candidate.rect, 0.025, 0.018),
            text: candidate.text,
          };
        }
      });
    });
  });

  return best && best.score >= 1_150 ? best : null;
}

function sameAnalyticalRow(left, right) {
  const tolerance = Math.max(
    0.006,
    Math.min(0.013, Math.max(left.rect.height, right.rect.height) * 1.15),
  );
  return Math.abs(rectCenter(left.rect).y - rectCenter(right.rect).y) <= tolerance;
}

function nearestTableHeader(page, header, rowEntry) {
  return page.entries
    .filter(
      (entry) =>
        entry.normalized === header &&
        entry.rect.y < rowEntry.rect.y &&
        rowEntry.rect.y - entry.rect.y <= 0.16,
    )
    .sort((left, right) => right.rect.y - left.rect.y)[0] || null;
}

function isMeaningfulAnalyticalResult(entry) {
  if (!isUsableTextEntry(entry)) return false;
  if (/^(?:nmt|nlt|report only|report result|cutoff)\b/.test(entry.normalized)) {
    return false;
  }
  return (
    ANALYTICAL_RESULT_PATTERN.test(entry.normalized) ||
    /\d/.test(entry.text) ||
    /^(?:n\s*a|nd|none)$/i.test(entry.normalized)
  );
}

function tableCellForHeader(page, rowEntries, rowLabel, headerName, predicate) {
  const header = nearestTableHeader(page, headerName, rowLabel);
  if (!header) return null;
  const headerX = rectCenter(header.rect).x;

  return rowEntries
    .filter(
      (entry) =>
        entry !== rowLabel &&
        entry.rect.x > rowLabel.rect.x + rowLabel.rect.width + 0.012 &&
        predicate(entry),
    )
    .map((entry) => ({
      entry,
      distance: Math.abs(rectCenter(entry.rect).x - headerX),
    }))
    .filter(({ distance }) => distance <= 0.14)
    .sort((left, right) => left.distance - right.distance)[0]?.entry || null;
}

function reportedTestCandidates(pages, definition) {
  const prefixes = definition.prefixes.map(normalizeText);
  const candidates = [];

  pages.forEach((page) => {
    page.entries.forEach((labelEntry) => {
      const prefix = prefixes
        .filter(
          (value) =>
            labelEntry.normalized === value ||
            labelEntry.normalized.startsWith(`${value} `),
        )
        .sort((left, right) => right.length - left.length)[0];
      if (!prefix) return;

      if (
        !isUsableTextEntry(labelEntry) ||
        /\b(testing|analysis|results?|screening|determined by|about this result|method|notes|acceptance criteria|how to read)\b/.test(
          labelEntry.normalized.slice(prefix.length),
        )
      ) {
        return;
      }

      const rowEntries = page.entries
        .filter((entry) => sameAnalyticalRow(labelEntry, entry))
        .sort((left, right) => left.rect.x - right.rect.x);
      if (rowEntries.length < 2) return;

      const resultEntry =
        tableCellForHeader(
          page,
          rowEntries,
          labelEntry,
          "result",
          isMeaningfulAnalyticalResult,
        ) ||
        (() => {
          const fallbackCells = rowEntries.filter(
            (entry) =>
              entry !== labelEntry &&
              entry.rect.x > labelEntry.rect.x + labelEntry.rect.width + 0.03,
          );
          return fallbackCells.length === 1 &&
            isMeaningfulAnalyticalResult(fallbackCells[0])
            ? fallbackCells[0]
            : null;
        })();
      if (!resultEntry) return;

      const statusEntry = tableCellForHeader(
        page,
        rowEntries,
        labelEntry,
        "status",
        (entry) =>
          isUsableTextEntry(entry) &&
          (ANALYTICAL_RESULT_PATTERN.test(entry.normalized) ||
            /^(?:n\s*a|reported)$/i.test(entry.normalized)),
      );

      const replicate = definition.repeatable
        ? labelEntry.normalized.match(/\breplicate\s+(\d+)\b/)?.[1] || ""
        : "";
      let score = 700 + prefix.length * 2;
      if (ANALYTICAL_RESULT_PATTERN.test(resultEntry.normalized)) score += 260;
      if (/\d/.test(resultEntry.text)) score += 80;
      if (statusEntry) score += 120;
      score += labelEntry.rect.y * 65;
      score -= (page.pageNumber - 1) * 5;

      const contextRect = padRect(
        unionRects(
          [labelEntry, resultEntry, statusEntry]
            .filter(Boolean)
            .map((entry) => entry.rect),
        ),
        0.018,
        0.016,
      );

      candidates.push({
        id: replicate ? `${definition.id}-${replicate}` : definition.id,
        canonicalId: definition.id,
        label: replicate ? `${definition.label} replicate ${replicate}` : definition.label,
        detail: `Reported result: ${resultEntry.text}${
          statusEntry && statusEntry.text !== resultEntry.text ? ` · ${statusEntry.text}` : ""
        }. ${definition.detail}`,
        purpose: definition.detail,
        metal: Boolean(definition.metal),
        page: page.pageNumber,
        rect: padRect(resultEntry.rect, 0.006, 0.005),
        contextRect,
        score,
        text: `${labelEntry.text}: ${resultEntry.text}`,
        analyteText: labelEntry.text,
        resultText: resultEntry.text,
        statusText:
          statusEntry && statusEntry.text !== resultEntry.text ? statusEntry.text : "",
      });
    });
  });

  return candidates;
}

function findReportedTests(pages) {
  const strongestById = new Map();
  TEST_DEFINITIONS.flatMap((definition) =>
    reportedTestCandidates(pages, definition),
  ).forEach((candidate) => {
    const existing = strongestById.get(candidate.id);
    if (!existing || candidate.score > existing.score) {
      strongestById.set(candidate.id, candidate);
    }
  });

  const detected = [...strongestById.values()];
  const hasIndividualMetals = detected.some((test) => test.metal);
  return detected
    .filter(
      (test) =>
        ((!hasIndividualMetals || test.canonicalId !== "elemental-impurities") &&
          rectHasVisibleArea(test.rect) &&
          rectHasVisibleArea(test.contextRect) &&
          Boolean(normalizeText(test.analyteText)) &&
          Boolean(normalizeText(test.resultText)) &&
          !ANALYTICAL_TABLE_HEADERS.has(normalizeText(test.resultText))),
    )
    .sort((left, right) => left.page - right.page || left.rect.y - right.rect.y);
}

function likelyFieldLabel(value = "") {
  const text = normalizeText(value);
  return [
    "lot number",
    "batch number",
    "batch lot",
    "batch",
    "lot",
    "analysis date",
    "appearance",
    "sample matrix",
    "volume",
    "date received",
  ].some((label) => text === label || text.startsWith(`${label} `));
}

function narrowRectToRawText(entry, rawNeedle) {
  const haystack = String(entry?.text || "");
  const needle = String(rawNeedle || "").trim();
  const index = haystack.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (!needle || index < 0 || !haystack.length) return entry.rect;

  const leftRatio = index / haystack.length;
  const widthRatio = needle.length / haystack.length;
  return {
    ...entry.rect,
    x: entry.rect.x + entry.rect.width * leftRatio,
    width: Math.max(0.004, entry.rect.width * widthRatio),
  };
}

function findBatchRedactions(page, batch = "") {
  const normalizedBatch = normalizeText(batch);
  const exact = normalizedBatch
    ? page.entries
        .filter((entry) => containsTerm(entry.normalized, normalizedBatch))
        .map((entry) => ({
          ...padRect(narrowRectToRawText(entry, batch), 0.004, 0.003),
          type: "batch",
        }))
    : [];

  if (exact.length) return exact;

  const labels = page.entries.filter((entry) =>
    ["lot number", "batch number", "batch lot", "batch"].some((label) =>
      containsTerm(entry.normalized, label),
    ),
  );

  return labels.flatMap((label) => {
    if (/\s[\w-]{4,}$/.test(label.text) && label.normalized.split(" ").length > 2) {
      return [{ ...padRect(label.rect, 0.004, 0.003), type: "batch" }];
    }

    const labelCenter = rectCenter(label.rect);
    const candidate = page.entries
      .filter((entry) => {
        if (entry === label || likelyFieldLabel(entry.text)) return false;
        const center = rectCenter(entry.rect);
        return (
          entry.normalized.length >= 3 &&
          entry.rect.x >= label.rect.x + label.rect.width - 0.01 &&
          Math.abs(center.y - labelCenter.y) <= Math.max(0.014, label.rect.height * 1.6)
        );
      })
      .sort((left, right) => left.rect.x - right.rect.x)[0];

    return candidate
      ? [{ ...padRect(candidate.rect, 0.004, 0.003), type: "batch" }]
      : [];
  });
}

function isIlsTemplate(pages) {
  return pages.some((page) =>
    [
      "ils laboratories",
      "ils labs",
      "ils lab com",
      "integrated laboratory services",
    ].some((term) => containsTerm(page.normalizedText, term)),
  );
}

function findIlsQrRedaction(page) {
  const scanLabel = findBestMatch([page], ["scan to verify", "authenticity at"]);
  if (scanLabel) {
    const width = 0.082;
    const height = 0.064;
    const center = rectCenter(scanLabel.rect);

    return {
      x: clamp(center.x - width / 2, 0, 1 - width),
      y: clamp(scanLabel.rect.y - height + 0.006, 0, 1 - height),
      width,
      height,
      type: "qr",
    };
  }

  return {
    x: 0.84,
    y: 0.158,
    width: 0.08,
    height: 0.064,
    type: "qr",
  };
}

function overlapRatio(left, right) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  if (x2 <= x1 || y2 <= y1) return 0;

  const intersection = (x2 - x1) * (y2 - y1);
  const smaller = Math.min(left.width * left.height, right.width * right.height);
  return smaller > 0 ? intersection / smaller : 0;
}

function dedupeRedactions(rectangles = []) {
  const result = [];
  rectangles.forEach((rect) => {
    if (!result.some((existing) => overlapRatio(existing, rect) > 0.72)) {
      result.push(rect);
    }
  });
  return result;
}

function analyzeDocument(pages, { batch, productName, purity }) {
  const anchors = {
    identity: findIdentityAnchor(pages, productName),
    purity: findPurityAnchor(pages, purity),
    tests: findReportedTests(pages),
  };
  const ilsTemplate = isIlsTemplate(pages);
  const redactionsByPage = {};

  pages.forEach((page) => {
    const redactions = findBatchRedactions(page, batch);
    if (ilsTemplate && page.pageNumber === 1) {
      redactions.push(findIlsQrRedaction(page));
    }
    redactionsByPage[page.pageNumber] = dedupeRedactions(redactions);
  });

  return { anchors, ilsTemplate, pages, redactionsByPage };
}

function safePdfUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > 8_192) return "";

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return "";
    if (!ALLOWED_COA_HOSTS.has(parsed.hostname.toLowerCase())) return "";
    if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
      return "";
    }
    if (!parsed.pathname.toLowerCase().endsWith(".pdf")) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function pdfCacheKey(sourceUrl, fallbackSourceUrl = "") {
  return `${sourceUrl}\n${fallbackSourceUrl}`;
}

async function fetchPdfBytes(sourceUrl, fallbackSourceUrl = "") {
  const proxyUrl = `/api/coa-document?url=${encodeURIComponent(sourceUrl)}`;
  const directUrl = fallbackSourceUrl ||
    (new URL(sourceUrl).hostname.toLowerCase() === "files.ils-lab.com"
      ? sourceUrl
      : "");
  const directCandidate = directUrl
    ? { channel: "laboratory-direct", url: directUrl, direct: true }
    : null;
  const proxyCandidate = {
    channel: "secure-proxy",
    url: proxyUrl,
    direct: false,
  };
  const preferDirect = directCandidate &&
    new URL(directCandidate.url).hostname.toLowerCase() === "files.ils-lab.com";
  const candidates = preferDirect
    ? [directCandidate, proxyCandidate]
    : [proxyCandidate, ...(directCandidate ? [directCandidate] : [])];
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, {
        cache: "force-cache",
        credentials: candidate.direct ? "omit" : "same-origin",
        headers: { Accept: "application/pdf" },
        mode: candidate.direct ? "cors" : "same-origin",
      });
      if (!response.ok) {
        throw new Error(`COA request failed (${response.status}).`);
      }
      const bytes = await response.arrayBuffer();
      const signature = new TextDecoder("ascii").decode(
        new Uint8Array(bytes, 0, Math.min(1_024, bytes.byteLength)),
      );
      if (!signature.includes("%PDF-")) {
        throw new Error("The COA response was not a PDF document.");
      }
      return { bytes, channel: candidate.channel };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No PDF source could be loaded.");
}

export function preloadCoaDocument(sourceUrl = "", fallbackSourceUrl = "") {
  const safeSource = safePdfUrl(sourceUrl);
  const safeFallback = safePdfUrl(fallbackSourceUrl);
  if (!safeSource) return Promise.reject(new Error("The COA source is not allowed."));

  const key = pdfCacheKey(safeSource, safeFallback);
  const cached = pdfBytesCache.get(key);
  if (cached) return cached;

  while (pdfBytesCache.size >= MAX_CACHED_PDFS) {
    pdfBytesCache.delete(pdfBytesCache.keys().next().value);
  }

  const request = fetchPdfBytes(safeSource, safeFallback).catch((error) => {
    pdfBytesCache.delete(key);
    throw error;
  });
  pdfBytesCache.set(key, request);
  return request;
}

function drawRedactions(context, canvas, redactions = []) {
  redactions.forEach((rect) => {
    const x = Math.floor(rect.x * canvas.width);
    const y = Math.floor(rect.y * canvas.height);
    const width = Math.ceil(rect.width * canvas.width);
    const height = Math.ceil(rect.height * canvas.height);
    const accentHeight = Math.max(2, Math.round(canvas.height * 0.0015));

    context.save();

    if (rect.type === "qr") {
      const bandHeight = Math.max(14, height * 0.42);
      context.beginPath();
      context.rect(x, y, width, height);
      context.clip();
      context.translate(x + width / 2, y + height / 2);
      context.rotate(-Math.PI / 7);
      context.fillStyle = "#06111d";
      context.fillRect(-width * 0.72, -bandHeight / 2, width * 1.44, bandHeight);
      context.fillStyle = "#22d3ee";
      context.fillRect(-width * 0.72, -bandHeight / 2, width * 1.44, accentHeight);
      context.fillRect(
        -width * 0.72,
        bandHeight / 2 - accentHeight,
        width * 1.44,
        accentHeight,
      );
      context.restore();
      return;
    }

    context.fillStyle = "#06111d";
    context.fillRect(x, y, width, height);
    context.fillStyle = "#22d3ee";
    context.fillRect(x, y, width, accentHeight);
    context.fillRect(x, y + height - accentHeight, width, accentHeight);

    if (width >= 90 && height >= 18) {
      const fontSize = Math.max(9, Math.min(18, Math.round(height * 0.34)));
      context.fillStyle = "#a5f3fc";
      context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
        "REDACTED",
        x + width / 2,
        y + height / 2,
        Math.max(0, width - 12),
      );
    }
    context.restore();
  });
}

function focusTargetFor(analysis, focusKey, testIndex = 0) {
  if (!analysis) return null;
  if (focusKey === "tests") {
    const tests = analysis.anchors.tests || [];
    return tests[testIndex % Math.max(tests.length, 1)] || null;
  }
  return DOCUMENT_FOCUS_KEYS.has(focusKey) ? analysis.anchors[focusKey] : null;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The COA snapshot could not be encoded."));
    }, "image/png");
  });
}

async function decodeSnapshotUrl(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;

  if (typeof image.decode === "function") {
    try {
      await image.decode();
      return image;
    } catch {
      // Fall through to the load event for browsers that reject early decode().
    }
  }

  if (image.complete && image.naturalWidth > 0) return image;
  await new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("The prepared COA snapshot could not be decoded.")),
      { once: true },
    );
  });
  return image;
}

async function renderPageSnapshot({ pdf, pageNumber, redactions }) {
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const renderScale = clamp(PAGE_SNAPSHOT_WIDTH / baseViewport.width, 1, 3);
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable.");

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  drawRedactions(context, canvas, redactions);

  const blob = await canvasToPngBlob(canvas);
  const url = URL.createObjectURL(blob);
  try {
    await decodeSnapshotUrl(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    url,
    width: canvas.width,
    height: canvas.height,
    aspectRatio: viewport.width / viewport.height,
    redactionSignature: redactionSignature(redactions),
  };
}

function focusCropRegion(target, sourceAspectRatio = 0.707, outputAspectRatio = 1.6) {
  const rect = target?.rect;
  if (!rect) return { x: 0, y: 0, width: 1, height: 1 };

  const isReportedTest = Boolean(target.analyteText || target.resultText);
  const normalizedCropAspect =
    outputAspectRatio / clamp(sourceAspectRatio || 0.707, 0.2, 4);

  // Focus on the exact reported value. Table labels and results can sit at
  // opposite ends of the page, so using their full union as the crop made the
  // "detail" look like another full-page preview with a microscopic marker.
  // The caption already carries the analyte name; this crop's job is to make
  // the source value and its immediate row context effortless to read.
  const minimumWidth = isReportedTest ? 0.32 : 0.38;
  const maximumWidth = isReportedTest ? 0.46 : 0.58;
  let width = clamp(
    Math.max(minimumWidth, rect.width * 3.25 + 0.08),
    minimumWidth,
    maximumWidth,
  );
  let height = width / normalizedCropAspect;

  // Keep several neighboring lines visible, while ensuring a tall/wrapped
  // value is never clipped. Recalculate width so the sampled source pixels
  // always have the same 1.6 ratio as the 1280 x 800 output canvas.
  const minimumHeight = Math.max(isReportedTest ? 0.12 : 0.14, rect.height * 5.5);
  if (height < minimumHeight) {
    height = minimumHeight;
    width = height * normalizedCropAspect;
  }

  const maximumHeight = isReportedTest ? 0.24 : 0.3;
  if (height > maximumHeight) {
    height = maximumHeight;
    width = height * normalizedCropAspect;
  }

  width = clamp(width, rect.width + 0.03, 0.68);
  height = width / normalizedCropAspect;

  const centerX = clamp(rect.x + rect.width / 2);
  const centerY = clamp(rect.y + rect.height / 2);
  const x = clamp(centerX - width / 2, 0, 1 - width);
  const y = clamp(centerY - height / 2, 0, 1 - height);
  return { x, y, width, height };
}

function focusSnapshotKey(target) {
  const rect = target?.rect || {};
  const contextRect = target?.contextRect || rect;
  return [
    target?.page || 1,
    target?.id || target?.label || "field",
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    contextRect.x,
    contextRect.y,
    contextRect.width,
    contextRect.height,
  ].join(":");
}

async function renderFocusSnapshot(snapshot, target) {
  const source = await decodeSnapshotUrl(snapshot.url);
  // The marker stays tightly bound to the actual value cell; the surrounding
  // crop supplies just enough row context to keep that value readable.
  const region = focusCropRegion(target, snapshot.aspectRatio, 1.6);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("COA focus rendering is unavailable.");

  canvas.width = 1280;
  canvas.height = 800;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    Math.round(region.x * source.naturalWidth),
    Math.round(region.y * source.naturalHeight),
    Math.round(region.width * source.naturalWidth),
    Math.round(region.height * source.naturalHeight),
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await canvasToPngBlob(canvas);
  const url = URL.createObjectURL(blob);
  try {
    await decodeSnapshotUrl(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    url,
    width: canvas.width,
    height: canvas.height,
    aspectRatio: canvas.width / canvas.height,
    anchor: {
      x: (target.rect.x - region.x) / region.width,
      y: (target.rect.y - region.y) / region.height,
      width: target.rect.width / region.width,
      height: target.rect.height / region.height,
    },
    region,
  };
}

function ensureFocusSnapshot(asset, snapshot, target) {
  if (!target?.rect) return Promise.resolve(null);
  asset.focusSnapshots ||= new Map();
  const key = focusSnapshotKey(target);
  const cached = asset.focusSnapshots.get(key);
  if (cached) return cached;

  const request = renderFocusSnapshot(snapshot, target)
    .then((focusSnapshot) => {
      asset.objectUrls.add(focusSnapshot.url);
      return focusSnapshot;
    })
    .catch((error) => {
      asset.focusSnapshots.delete(key);
      throw error;
    });
  asset.focusSnapshots.set(key, request);
  return request;
}

function preparedCoaKey({
  sourceUrl,
  fallbackSourceUrl,
  productName,
  batch,
  purity,
}) {
  return [
    sourceUrl,
    fallbackSourceUrl,
    normalizeText(productName),
    normalizeText(batch),
    normalizeText(purity),
  ].join("\n");
}

function disposePreparedAsset(asset) {
  if (!asset || asset.disposed) return;
  asset.disposed = true;
  asset.objectUrls?.forEach((url) => URL.revokeObjectURL(url));
  asset.objectUrls?.clear?.();
}

function disposePreparedEntry(entry) {
  if (!entry || entry.disposed) return;
  entry.disposed = true;
  if (entry.asset) disposePreparedAsset(entry.asset);
}

function trimPreparedCoaCache() {
  while (preparedCoaCache.size > MAX_PREPARED_COAS) {
    const candidate = [...preparedCoaCache.entries()].find(
      ([, entry]) => entry.consumers === 0,
    );
    if (!candidate) return;

    const [key, entry] = candidate;
    preparedCoaCache.delete(key);
    entry.evicted = true;
    if (entry.settled) disposePreparedEntry(entry);
  }
}

function createPreparedCoaEntry(options) {
  let resolvePreview;
  let rejectPreview;
  let previewSettled = false;
  const preview = new Promise((resolve, reject) => {
    resolvePreview = resolve;
    rejectPreview = reject;
  });
  const entry = {
    asset: null,
    complete: null,
    consumers: 0,
    disposed: false,
    evicted: false,
    preview,
    settled: false,
  };

  entry.complete = (async () => {
    let loadingTask = null;
    let asset = null;
    try {
      const [pdfjs, cachedDocument] = await Promise.all([
        loadPdfJs(),
        preloadCoaDocument(options.sourceUrl, options.fallbackSourceUrl),
      ]);
      loadingTask = pdfjs.getDocument({
        data: new Uint8Array(cachedDocument.bytes.slice(0)),
        enableXfa: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      const pages = [];

      const firstPage = await pdf.getPage(1);
      pages.push(await analyzePage(firstPage, 1, pdfjs.Util));
      const previewAnalysis = analyzeDocument(pages, options);
      const firstRedactions = previewAnalysis.redactionsByPage[1] || [];
      const firstSnapshot = await renderPageSnapshot({
        pdf,
        pageNumber: 1,
        redactions: firstRedactions,
      });

      asset = {
        analysis: previewAnalysis,
        channel: cachedDocument.channel,
        complete: pdf.numPages === 1,
        disposed: false,
        objectUrls: new Set([firstSnapshot.url]),
        pageCount: pdf.numPages,
        snapshots: new Map([[1, firstSnapshot]]),
      };
      entry.asset = asset;
      previewSettled = true;
      resolvePreview(asset);

      for (let pageNumber = 2; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        pages.push(await analyzePage(page, pageNumber, pdfjs.Util));
      }

      const completeAnalysis = analyzeDocument(pages, options);
      asset.analysis = completeAnalysis;
      const relevantPages = new Set([
        completeAnalysis.anchors.identity?.page || 1,
        completeAnalysis.anchors.purity?.page || 1,
        ...(completeAnalysis.anchors.tests || []).map((test) => test.page),
      ]);

      await Promise.all(
        [...relevantPages].map(async (pageNumber) => {
          const redactions = completeAnalysis.redactionsByPage[pageNumber] || [];
          const current = asset.snapshots.get(pageNumber);
          if (current?.redactionSignature === redactionSignature(redactions)) return;

          try {
            const snapshot = await renderPageSnapshot({
              pdf,
              pageNumber,
              redactions,
            });
            asset.objectUrls.add(snapshot.url);
            asset.snapshots.set(pageNumber, snapshot);
          } catch (error) {
            asset.snapshotErrors ||= new Map();
            asset.snapshotErrors.set(pageNumber, error);
          }
        }),
      );

      const focusTargets = [
        completeAnalysis.anchors.identity,
        completeAnalysis.anchors.purity,
        completeAnalysis.anchors.tests?.[0],
      ].filter(Boolean);
      await Promise.all(
        focusTargets.map(async (target) => {
          const snapshot = asset.snapshots.get(target.page || 1);
          if (!snapshot) return;
          await ensureFocusSnapshot(asset, snapshot, target).catch((error) => {
            asset.focusErrors ||= new Map();
            asset.focusErrors.set(focusSnapshotKey(target), error);
          });
        }),
      );
      asset.complete = true;
      return asset;
    } catch (error) {
      if (!previewSettled) {
        previewSettled = true;
        rejectPreview(error);
        throw error;
      }

      // Page one is already a valid, decoded image. Keep that useful preview
      // if a later page cannot be inspected instead of blanking the guide.
      if (asset) asset.backgroundError = error;
      return asset;
    } finally {
      if (loadingTask?.destroy) {
        await loadingTask.destroy().catch(() => {});
      }
    }
  })();

  entry.complete
    .then((asset) => {
      entry.asset = asset;
      entry.settled = true;
      if (entry.evicted && entry.consumers === 0) disposePreparedEntry(entry);
    })
    .catch(() => {
      entry.settled = true;
      if (preparedCoaCache.get(entry.key) === entry) {
        preparedCoaCache.delete(entry.key);
      }
      if (entry.consumers === 0) disposePreparedEntry(entry);
    });

  return entry;
}

function acquirePreparedCoa(options) {
  const key = preparedCoaKey(options);
  let entry = touchCacheEntry(preparedCoaCache, key);
  const cacheHit = Boolean(entry);

  if (!entry) {
    entry = createPreparedCoaEntry(options);
    entry.key = key;
    preparedCoaCache.set(key, entry);
  }

  entry.consumers += 1;
  trimPreparedCoaCache();
  return { cacheHit, entry };
}

function releasePreparedCoa(entry) {
  if (!entry) return;
  entry.consumers = Math.max(0, entry.consumers - 1);
  if (entry.evicted && entry.consumers === 0 && entry.settled) {
    disposePreparedEntry(entry);
  }
  trimPreparedCoaCache();
}

export function preloadPreparedCoa({
  sourceUrl = "",
  fallbackSourceUrl = "",
  productName = "",
  batch = "",
  purity = "",
} = {}) {
  const safeSource = safePdfUrl(sourceUrl);
  const safeFallbackSource = safePdfUrl(fallbackSourceUrl);
  if (!safeSource) {
    return Promise.reject(new Error("The COA source is not allowed."));
  }

  const { entry } = acquirePreparedCoa({
    sourceUrl: safeSource,
    fallbackSourceUrl: safeFallbackSource,
    productName,
    batch,
    purity,
  });
  return entry.complete.finally(() => releasePreparedCoa(entry));
}

function focusFallbackCopy(focusKey) {
  if (focusKey === "identity") return "Look for the compound or sample identity on the issued report.";
  if (focusKey === "purity") return "Look for Peptide Purity or Purity and read the result with its method.";
  if (focusKey === "tests") return "Only tests explicitly detected in the issued report are included in this tour.";
  return "Review the issued laboratory document directly.";
}

export default function CoaPdfCanvas({
  sourceUrl = "",
  fallbackSourceUrl = "",
  focusKey = "",
  productName = "",
  batch = "",
  purity = "",
  vialImage = null,
  onStatus,
}) {
  const safeSource = useMemo(() => safePdfUrl(sourceUrl), [sourceUrl]);
  const safeFallbackSource = useMemo(
    () => safePdfUrl(fallbackSourceUrl),
    [fallbackSourceUrl],
  );
  const normalizedFocus = normalizeText(focusKey).replace(/\s+/g, "-");
  const vialAsset = typeof vialImage === "string" ? { src: vialImage } : vialImage || {};
  const vialSource = vialAsset.src || vialAsset.fullSrc || "/coa-guide/vial-batch-cutout.webp";
  const stageRef = useRef(null);
  const analysisRef = useRef(null);
  const preparedAssetRef = useRef(null);
  const preparedCacheHitRef = useRef(false);
  const statusCallbackRef = useRef(onStatus);
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const [view, setView] = useState({
    status: safeSource ? "loading" : "error",
    error: safeSource ? "" : "The issued COA is not an allowed PDF source.",
    page: 1,
    pageCount: 0,
    anchor: null,
    located: false,
    redactionCount: 0,
    aspectRatio: 0.707,
    overviewAspectRatio: 0.707,
    hasSurface: false,
    imageUrl: "",
    overviewUrl: "",
    sourceAnchor: null,
    snapshot: "none",
    targetId: "",
    targetIndex: 0,
  });

  useEffect(() => {
    statusCallbackRef.current = onStatus;
  }, [onStatus]);

  const publishStatus = (status, detail = {}) => {
    statusCallbackRef.current?.({ status, focusKey: normalizedFocus, ...detail });
  };

  useEffect(() => {
    let cancelled = false;
    let preparedEntry = null;

    analysisRef.current = null;
    preparedAssetRef.current = null;
    preparedCacheHitRef.current = false;
    setAnalysisVersion((version) => version + 1);

    if (!safeSource) {
      const error = "The issued COA is not an allowed PDF source.";
      setView((current) => ({ ...current, status: "error", error, anchor: null }));
      publishStatus("error", { message: error });
      return undefined;
    }

    setView({
      status: "loading",
      error: "",
      page: 1,
      pageCount: 0,
      anchor: null,
      located: false,
      redactionCount: 0,
      aspectRatio: 0.707,
      overviewAspectRatio: 0.707,
      hasSurface: false,
      imageUrl: "",
      overviewUrl: "",
      sourceAnchor: null,
      snapshot: "none",
      targetId: "",
      targetIndex: 0,
    });
    publishStatus("loading", { sourceUrl: safeSource });

    const acquisition = acquirePreparedCoa({
      sourceUrl: safeSource,
      fallbackSourceUrl: safeFallbackSource,
      productName,
      batch,
      purity,
    });
    preparedEntry = acquisition.entry;
    preparedCacheHitRef.current = acquisition.cacheHit;

    const exposeAsset = (asset, complete) => {
      if (cancelled || !asset || asset.disposed) return;
      preparedAssetRef.current = asset;
      analysisRef.current = asset.analysis;
      const tests = asset.analysis?.anchors?.tests || [];
      publishStatus(complete ? "analyzed" : "preview-ready", {
        channel: asset.channel,
        pageCount: asset.pageCount,
        partial: !complete,
        preparedCache: acquisition.cacheHit ? "hit" : "miss",
        testCount: tests.length,
        tests: tests.map((test) => test.label),
      });
      setAnalysisVersion((version) => version + 1);
    };

    const handleLoadError = (error) => {
      if (cancelled) return;
      console.error("[COA PDF] Failed to prepare issued certificate image.", error);
      const message =
        error?.name === "PasswordException"
          ? "This COA is password protected and cannot be annotated."
          : "The actual COA could not be rendered safely.";
      setView((current) => ({
        ...current,
        status: "error",
        error: message,
        anchor: null,
        located: false,
      }));
      publishStatus("error", { message });
    };

    preparedEntry.preview
      .then((asset) => exposeAsset(asset, asset.complete))
      .catch(handleLoadError);
    preparedEntry.complete
      .then((asset) => exposeAsset(asset, Boolean(asset?.complete)))
      .catch(() => {
        // The preview promise reports first-page failures. If it succeeded,
        // createPreparedCoaEntry preserves that decoded image as a fallback.
      });

    return () => {
      cancelled = true;
      analysisRef.current = null;
      preparedAssetRef.current = null;
      releasePreparedCoa(preparedEntry);
    };
  }, [safeSource, safeFallbackSource, batch, productName, purity, retryToken]);

  useEffect(() => {
    if (normalizedFocus !== "tests") return undefined;
    const tests = analysisRef.current?.anchors?.tests || [];
    setTestIndex(0);
    if (
      tests.length < 2 ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTestIndex((current) => (current + 1) % tests.length);
    }, 2_650);
    return () => window.clearInterval(timer);
  }, [analysisVersion, normalizedFocus]);

  useEffect(() => {
    const analysis = analysisRef.current;
    const asset = preparedAssetRef.current;
    if (!asset || !analysis) return undefined;

    const testTargets = analysis.anchors.tests || [];
    const target = focusTargetFor(analysis, normalizedFocus, testIndex);
    const pageNumber = target?.page || 1;
    const targetId = target?.id || normalizedFocus;
    const redactions = analysis.redactionsByPage[pageNumber] || [];
    const snapshot = asset.snapshots.get(pageNumber);
    if (!snapshot) {
      setView((current) =>
        current.hasSurface
          ? { ...current, anchor: null, located: false }
          : { ...current, status: "rendering", error: "" },
      );
      publishStatus("rendering", { page: pageNumber, pageCount: asset.pageCount });
      return undefined;
    }

    setView((current) =>
      current.hasSurface && current.targetId !== targetId
        ? { ...current, anchor: null, located: false, targetId: "" }
        : current,
    );

    let cancelled = false;

    async function showFocusImage() {
      try {
        const focusSnapshot = target
          ? await ensureFocusSnapshot(asset, snapshot, target)
          : null;
        if (cancelled) return;

        const located = Boolean(target);
        const snapshotState = preparedCacheHitRef.current ? "cache" : "rendered";
        setView({
          status: "ready",
          error: "",
          page: pageNumber,
          pageCount: asset.pageCount,
          anchor: focusSnapshot?.anchor || null,
          located,
          redactionCount: redactions.length,
          aspectRatio: focusSnapshot?.aspectRatio || snapshot.aspectRatio,
          overviewAspectRatio: snapshot.aspectRatio,
          hasSurface: true,
          imageUrl: focusSnapshot?.url || snapshot.url,
          overviewUrl: snapshot.url,
          sourceAnchor: target?.rect || null,
          snapshot: snapshotState,
          targetId,
          targetIndex: normalizedFocus === "tests" ? testIndex : 0,
        });
        publishStatus("ready", {
          page: pageNumber,
          pageCount: asset.pageCount,
          located,
          redactionCount: redactions.length,
          template: analysis.ilsTemplate ? "ils" : "unknown",
          testCount: testTargets.length,
          tests: testTargets.map((test) => test.label),
          activeTest: normalizedFocus === "tests" ? target?.label || "" : "",
          activeTestDetail:
            normalizedFocus === "tests" && target
              ? {
                  id: target.id,
                  label: target.label,
                  purpose: target.purpose || target.detail,
                  result: [target.resultText, target.statusText].filter(Boolean).join(" · "),
                  interpretation: explainReportedResult(target),
                }
              : null,
          surfaceCache: preparedCacheHitRef.current ? "hit" : "prepared",
          visualMode: focusSnapshot ? "focus-image" : "full-image",
        });
      } catch (error) {
        if (cancelled) return;
        console.error("[COA PDF] Failed to prepare the focused COA image.", error);
        setView((current) => ({
          ...current,
          status: "ready",
          anchor: target?.rect || null,
          located: Boolean(target),
          page: pageNumber,
          pageCount: asset.pageCount,
          aspectRatio: snapshot.aspectRatio,
          overviewAspectRatio: snapshot.aspectRatio,
          hasSurface: true,
          imageUrl: snapshot.url,
          overviewUrl: snapshot.url,
          sourceAnchor: target?.rect || null,
          targetId,
          targetIndex: normalizedFocus === "tests" ? testIndex : 0,
        }));
        publishStatus("ready", {
          page: pageNumber,
          pageCount: asset.pageCount,
          located: Boolean(target),
          redactionCount: redactions.length,
          template: analysis.ilsTemplate ? "ils" : "unknown",
          testCount: testTargets.length,
          tests: testTargets.map((test) => test.label),
          activeTest: normalizedFocus === "tests" ? target?.label || "" : "",
          activeTestDetail:
            normalizedFocus === "tests" && target
              ? {
                  id: target.id,
                  label: target.label,
                  purpose: target.purpose || target.detail,
                  result: [target.resultText, target.statusText].filter(Boolean).join(" · "),
                  interpretation: explainReportedResult(target),
                }
              : null,
          surfaceCache: preparedCacheHitRef.current ? "hit" : "prepared",
          visualMode: "full-image-fallback",
        });
      }
    }

    showFocusImage();
    return () => {
      cancelled = true;
    };
  }, [analysisVersion, normalizedFocus, safeSource, testIndex]);

  if (view.status === "error") {
    const nativeSource = safeFallbackSource || safeSource;

    if (nativeSource) {
      return (
        <div className="coa-live-native" data-coa-live-state="native-fallback">
          <div className="coa-live-native__frame">
            <iframe
              src={`${nativeSource}#toolbar=0&navpanes=0&view=FitH`}
              title={`${productName} Certificate of Analysis`}
              loading="eager"
            />
            <span className="coa-live-native__badge">Issued COA • direct view</span>
          </div>
          <div className="coa-live-native__bar" role="status">
            <div>
              <strong>The matching certificate is open.</strong>
              <span>Interactive markers are temporarily unavailable in this direct view.</span>
            </div>
            <button type="button" onClick={() => setRetryToken((value) => value + 1)}>
              Retry guide
            </button>
            <a href={nativeSource} target="_blank" rel="noreferrer noopener">
              Open full COA
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="coa-live-fallback" role="status" data-coa-live-state="error">
        <span className="coa-live-fallback__eyebrow">Actual document</span>
        <strong>COA preview unavailable</strong>
        <p>{view.error || "The issued certificate could not be displayed."}</p>
        {safeSource ? (
          <a className="coa-live-fallback__open" href={safeSource} target="_blank" rel="noreferrer noopener">
            Open the issued COA
          </a>
        ) : null}
      </div>
    );
  }

  const testTargets = analysisRef.current?.anchors?.tests || [];
  const requestedTest =
    normalizedFocus === "tests" && testTargets.length
      ? testTargets[testIndex % testTargets.length]
      : null;
  const activeTest =
    normalizedFocus === "tests" && testTargets.length
      ? testTargets.find((test) => test.id === view.targetId) || requestedTest
      : null;
  const callout = activeTest
    ? { label: activeTest.label, detail: activeTest.detail }
    : CALLOUT_COPY[normalizedFocus];
  const anchorStyle = view.anchor
    ? {
        "--coa-live-x": `${view.anchor.x * 100}%`,
        "--coa-live-y": `${view.anchor.y * 100}%`,
        "--coa-live-width": `${view.anchor.width * 100}%`,
        "--coa-live-height": `${view.anchor.height * 100}%`,
        left: `${view.anchor.x * 100}%`,
        top: `${view.anchor.y * 100}%`,
        width: `${view.anchor.width * 100}%`,
        height: `${view.anchor.height * 100}%`,
      }
    : undefined;
  const sourceAnchorStyle = view.sourceAnchor
    ? {
        left: `${view.sourceAnchor.x * 100}%`,
        top: `${view.sourceAnchor.y * 100}%`,
        width: `${view.sourceAnchor.width * 100}%`,
        height: `${view.sourceAnchor.height * 100}%`,
      }
    : undefined;
  return (
    <div
      className={`coa-live coa-live--${view.status}`}
      data-coa-live-focus={normalizedFocus || "none"}
      data-coa-live-page={view.page}
      data-coa-live-tests={testTargets.length}
      data-coa-live-active-test={view.located ? activeTest?.id || "" : ""}
      data-coa-live-located={view.located ? "true" : "false"}
      data-coa-live-snapshot={view.snapshot || "none"}
      data-coa-live-mode="document-inspector"
      ref={stageRef}
    >
      <div className="coa-live-composition">
        {view.overviewUrl ? (
          <div
            className="coa-live-sheet"
            aria-label={`Full COA page ${view.page}`}
            style={{
              "--coa-sheet-aspect": String(view.overviewAspectRatio || 0.707),
            }}
          >
            <span className="coa-live-sheet__label">Overview</span>
            <img
              src={view.overviewUrl}
              alt={`Full issued certificate page ${view.page} of ${view.pageCount || 1}`}
              decoding="async"
              draggable="false"
            />
            {view.sourceAnchor ? (
              <i className="coa-live-sheet__target" style={sourceAnchorStyle} aria-hidden="true" />
            ) : null}
            <span className="coa-live-sheet__badge">COA · Page {view.page}</span>
          </div>
        ) : null}

        <div className="coa-live-vial-reference" aria-hidden="true">
          <img
            src={vialSource}
            srcSet={vialAsset.srcSet || undefined}
            sizes={vialAsset.sizes || undefined}
            alt=""
            decoding="async"
            draggable="false"
          />
          <span>{productName || "Selected vial"}</span>
        </div>

        <div className="coa-live-detail">
          <div className="coa-live-detail__header" aria-hidden="true">
            <span>Field detail</span>
            <small>Exact source</small>
          </div>
          <div
            className="coa-live-viewport"
            style={{
              "--coa-live-aspect": String(view.aspectRatio || 1.6),
              "--coa-live-focus-x": view.anchor
                ? `${(view.anchor.x + view.anchor.width / 2) * 100}%`
                : "50%",
              "--coa-live-focus-y": view.anchor
                ? `${(view.anchor.y + view.anchor.height / 2) * 100}%`
                : "35%",
            }}
          >
            {view.imageUrl ? (
              <img
                className="coa-live-image"
                src={view.imageUrl}
                alt={`Focused certificate detail from page ${view.page} of ${view.pageCount || 1}`}
                decoding="async"
                draggable="false"
              />
            ) : null}

            {view.anchor ? (
              <div
                className={`coa-live-focus coa-live-focus--${normalizedFocus}`}
                style={anchorStyle}
                data-coa-live-x={view.anchor.x.toFixed(5)}
                data-coa-live-y={view.anchor.y.toFixed(5)}
                data-coa-live-width={view.anchor.width.toFixed(5)}
                data-coa-live-height={view.anchor.height.toFixed(5)}
              >
                <span className="coa-live-focus__frame" aria-hidden="true" />
              </div>
            ) : null}

            {view.located && activeTest ? (
              <div className="coa-live-test-tour" role="group" aria-label="Reported test tour">
                <button
                  type="button"
                  onClick={() =>
                    setTestIndex((current) =>
                      (current - 1 + testTargets.length) % testTargets.length,
                    )
                  }
                  aria-label="Previous reported test"
                >
                  <span aria-hidden="true">&#8249;</span>
                </button>
                <div>
                  <strong>{view.targetIndex + 1}</strong>
                  <span>of {testTargets.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTestIndex((current) => (current + 1) % testTargets.length)
                  }
                  aria-label="Next reported test"
                >
                  <span aria-hidden="true">&#8250;</span>
                </button>
              </div>
            ) : null}

            {(view.status === "loading" || view.status === "rendering") && !view.hasSurface ? (
              <div className="coa-live-loading" role="status" aria-live="polite">
                <span className="coa-live-loading__spinner" aria-hidden="true" />
                <strong>
                  {view.status === "loading" ? "Scanning the matching COA" : "Preparing the exact field"}
                </strong>
              </div>
            ) : null}
          </div>

          {!activeTest ? (
            <div className="coa-live-detail-caption" role="note">
              <div>
                <strong>{view.located && callout ? callout.label : "No confident match"}</strong>
                <span>
                  {view.located && callout
                    ? callout.detail
                    : focusFallbackCopy(normalizedFocus)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="coa-live-meta" aria-label="Displayed COA page">
        <span>
          COA image • Page {view.page} of {view.pageCount || 1}
        </span>
        {view.redactionCount > 0 ? <strong>Private codes redacted in preview</strong> : null}
      </div>
    </div>
  );
}
