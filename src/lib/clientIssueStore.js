import { createHash } from "node:crypto";

const ISSUE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ACTION_WINDOW_MS = 15 * 60 * 1000;
const ACTION_THRESHOLD = 3;
const MAX_FINGERPRINTS = 100;
const MAX_TIMESTAMPS_PER_ISSUE = 50;

const issueState =
  globalThis.__phaseoneClientIssueState || {
    issues: new Map(),
  };

globalThis.__phaseoneClientIssueState = issueState;

function cleanText(value, maximumLength) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function normalizePagePath(value) {
  let pathname = "/";

  try {
    pathname = new URL(String(value || "/"), "https://phaseone.invalid").pathname;
  } catch {
    pathname = "/";
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const decoded = (() => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })();

      if (/^\d{5,}$/.test(decoded)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(decoded)) return ":id";
      if (/^[A-Za-z0-9_-]{48,}$/.test(decoded)) return ":token";
      return decoded.replace(/[^A-Za-z0-9._~-]/g, "-").slice(0, 80);
    });

  return `/${segments.join("/")}`.slice(0, 240) || "/";
}

function normalizeAssetOrigin(value) {
  const origin = String(value || "").trim().toLowerCase();
  if (origin === "self") return "self";
  return /^[a-z0-9.-]{1,120}$/.test(origin) ? origin : "unknown";
}

function normalizeIssue(input) {
  const allowedTypes = new Set([
    "javascript_error",
    "unhandled_rejection",
    "resource_error",
  ]);
  const type = String(input?.type || "").trim().toLowerCase();
  if (!allowedTypes.has(type)) return null;

  const errorName = cleanText(input?.errorName || "Error", 64).replace(
    /[^A-Za-z0-9_.:-]/g,
    "",
  );
  const message = cleanText(input?.message || "Browser runtime error", 240);
  const assetKind = cleanText(input?.assetKind, 16).toLowerCase();
  const line = Math.min(1_000_000, Math.max(0, Number(input?.line) || 0));
  const column = Math.min(1_000_000, Math.max(0, Number(input?.column) || 0));

  return {
    type,
    errorName: errorName || "Error",
    message: message || "Browser runtime error",
    pagePath: normalizePagePath(input?.pagePath),
    assetKind: ["script", "style", "image"].includes(assetKind)
      ? assetKind
      : "",
    assetOrigin: normalizeAssetOrigin(input?.assetOrigin),
    assetFile: cleanText(input?.assetFile, 100).replace(
      /[^A-Za-z0-9._~-]/g,
      "-",
    ),
    line,
    column,
    buildId: cleanText(input?.buildId, 24).replace(/[^A-Za-z0-9._-]/g, ""),
  };
}

function pruneIssues(now) {
  for (const [fingerprint, issue] of issueState.issues.entries()) {
    issue.timestamps = issue.timestamps.filter(
      (timestamp) => now - timestamp <= ISSUE_RETENTION_MS,
    );

    if (!issue.timestamps.length) issueState.issues.delete(fingerprint);
  }

  if (issueState.issues.size <= MAX_FINGERPRINTS) return;

  const oldest = Array.from(issueState.issues.entries()).sort(
    ([, left], [, right]) => left.lastSeen - right.lastSeen,
  );

  for (const [fingerprint] of oldest.slice(
    0,
    issueState.issues.size - MAX_FINGERPRINTS,
  )) {
    issueState.issues.delete(fingerprint);
  }
}

export function recordClientIssue(input, now = Date.now()) {
  const normalized = normalizeIssue(input);
  if (!normalized) return false;

  pruneIssues(now);

  const fingerprint = createHash("sha256")
    .update(
      [
        normalized.type,
        normalized.errorName,
        normalized.message,
        normalized.assetKind,
        normalized.assetOrigin,
        normalized.assetFile,
        normalized.line,
      ].join("|"),
      "utf8",
    )
    .digest("hex")
    .slice(0, 20);
  const existing = issueState.issues.get(fingerprint);

  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    existing.pages.add(normalized.pagePath);
    existing.timestamps.push(now);
    existing.timestamps = existing.timestamps.slice(-MAX_TIMESTAMPS_PER_ISSUE);
    if (normalized.buildId) existing.buildId = normalized.buildId;
  } else {
    issueState.issues.set(fingerprint, {
      ...normalized,
      fingerprint,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      pages: new Set([normalized.pagePath]),
      timestamps: [now],
    });
  }

  pruneIssues(now);
  return true;
}

export function getClientIssueSummary(now = Date.now()) {
  pruneIssues(now);

  const issues = Array.from(issueState.issues.values())
    .map((issue) => {
      const recentCount = issue.timestamps.filter(
        (timestamp) => now - timestamp <= ACTION_WINDOW_MS,
      ).length;

      return {
        id: `client-${issue.fingerprint}`,
        type: issue.type,
        errorName: issue.errorName,
        message: issue.message,
        assetKind: issue.assetKind,
        assetOrigin: issue.assetOrigin,
        assetFile: issue.assetFile,
        line: issue.line,
        buildId: issue.buildId,
        count: issue.count,
        recentCount,
        firstSeen: new Date(issue.firstSeen).toISOString(),
        lastSeen: new Date(issue.lastSeen).toISOString(),
        pages: Array.from(issue.pages).sort().slice(0, 8),
      };
    })
    .filter((issue) => issue.recentCount >= ACTION_THRESHOLD)
    .sort((left, right) => {
      if (left.recentCount !== right.recentCount) {
        return right.recentCount - left.recentCount;
      }
      return new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime();
    });

  return {
    status: "available",
    threshold: ACTION_THRESHOLD,
    windowMinutes: Math.round(ACTION_WINDOW_MS / 60000),
    actionableCount: issues.length,
    issues,
  };
}
