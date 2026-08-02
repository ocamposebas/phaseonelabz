import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Gauge,
  HeartPulse,
  Info,
  Loader2,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;
const DISPLAY_TIME_ZONE = "America/Denver";

const STATUS_META = {
  operational: {
    label: "Operational",
    overallLabel: "All systems operational",
    description: "All monitored Phase One services are responding normally.",
    icon: CheckCircle2,
    dotClass: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.65)]",
    pillClass: "border-emerald-300/20 bg-emerald-300/[0.085] text-emerald-100",
    panelClass: "border-emerald-300/18 bg-emerald-300/[0.045]",
    iconClass: "border-emerald-300/20 bg-emerald-300/[0.1] text-emerald-200",
  },
  degraded: {
    label: "Degraded",
    overallLabel: "Some services are degraded",
    description: "Core services remain available, but one or more checks need attention.",
    icon: AlertTriangle,
    dotClass: "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.6)]",
    pillClass: "border-amber-300/20 bg-amber-300/[0.085] text-amber-100",
    panelClass: "border-amber-300/18 bg-amber-300/[0.045]",
    iconClass: "border-amber-300/20 bg-amber-300/[0.1] text-amber-200",
  },
  outage: {
    label: "Outage",
    overallLabel: "Service disruption detected",
    description: "One or more monitored services are currently unavailable.",
    icon: XCircle,
    dotClass: "bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,0.6)]",
    pillClass: "border-rose-300/20 bg-rose-300/[0.085] text-rose-100",
    panelClass: "border-rose-300/18 bg-rose-300/[0.045]",
    iconClass: "border-rose-300/20 bg-rose-300/[0.1] text-rose-200",
  },
  maintenance: {
    label: "Maintenance",
    overallLabel: "Scheduled maintenance in progress",
    description: "A planned maintenance window is currently affecting service availability.",
    icon: Wrench,
    dotClass: "bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.62)]",
    pillClass: "border-sky-300/20 bg-sky-300/[0.085] text-sky-100",
    panelClass: "border-sky-300/18 bg-sky-300/[0.045]",
    iconClass: "border-sky-300/20 bg-sky-300/[0.1] text-sky-200",
  },
  unknown: {
    label: "Unknown",
    overallLabel: "Status data unavailable",
    description: "We could not confirm the latest service state. Automatic checks will continue.",
    icon: Info,
    dotClass: "bg-slate-400 shadow-[0_0_16px_rgba(148,163,184,0.35)]",
    pillClass: "border-slate-300/15 bg-slate-300/[0.055] text-slate-300",
    panelClass: "border-slate-300/12 bg-slate-300/[0.025]",
    iconClass: "border-slate-300/15 bg-slate-300/[0.07] text-slate-300",
  },
};

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeToken(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function humanizeKey(value) {
  const text = cleanText(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Service";
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeIdentifier(value, fallback = "item") {
  const normalized = normalizeToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asNamedArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).map(([key, entry]) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return { __key: key, ...entry };
    }

    return {
      __key: key,
      name: humanizeKey(key),
      status: entry,
    };
  });
}

function firstNonEmptyCollection(...values) {
  for (const value of values) {
    const entries = asNamedArray(value);
    if (entries.length > 0) return entries;
  }

  return [];
}

function firstMeaningfulValue(...values) {
  return values.find((value) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
}

function normalizeStatus(value, source = {}) {
  if (typeof value === "boolean") return value ? "operational" : "outage";

  if (typeof value === "number") {
    if (value >= 200 && value < 400) return "operational";
    if (value >= 400) return "outage";
  }

  const token = normalizeToken(value);

  if (
    token.includes("maintenance") ||
    token.includes("scheduled") ||
    token.includes("under maintenance")
  ) {
    return "maintenance";
  }

  if (token.includes("partial outage")) {
    return "degraded";
  }

  if (
    token.includes("major outage") ||
    token.includes("outage") ||
    token.includes("down") ||
    token.includes("offline") ||
    token.includes("unavailable") ||
    token.includes("failed") ||
    token.includes("failure") ||
    token.includes("critical") ||
    token === "error"
  ) {
    return "outage";
  }

  if (
    token.includes("degraded") ||
    token.includes("warning") ||
    token.includes("partial") ||
    token.includes("slow") ||
    token.includes("issue") ||
    token.includes("unstable")
  ) {
    return "degraded";
  }

  if (
    token === "ok" ||
    token === "up" ||
    token === "pass" ||
    token === "passed" ||
    token === "success" ||
    token.includes("operational") ||
    token.includes("healthy") ||
    token.includes("online") ||
    token.includes("available")
  ) {
    return "operational";
  }

  const booleanState = firstValue(
    source.ok,
    source.healthy,
    source.available,
    source.success,
    source.online
  );

  if (typeof booleanState === "boolean") {
    return booleanState ? "operational" : "outage";
  }

  return "unknown";
}

function toFiniteNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeService(rawService, index, fallbackGroup = "Core services") {
  const source = rawService && typeof rawService === "object" ? rawService : {};
  const rawName = firstValue(
    source.name,
    source.label,
    source.title,
    source.service,
    source.component,
    source.__key
  );
  const name = cleanText(rawName) || `Service ${index + 1}`;
  const group = cleanText(
    firstValue(source.group, source.category, source.section, source.type, fallbackGroup)
  );
  const rawState = firstValue(
    source.status,
    source.state,
    source.health,
    source.result,
    source.httpStatus,
    source.http_status
  );

  return {
    id: cleanText(firstValue(source.id, source.slug, source.key, source.__key)) || `${group}-${name}-${index}`,
    name,
    group: group || fallbackGroup,
    status: normalizeStatus(rawState, source),
    message: cleanText(
      firstValue(
        source.message,
        source.description,
        source.detail,
        source.summary,
        source.note,
        source.error
      )
    ),
    latencyMs: toFiniteNumber(
      source.latencyMs,
      source.latency_ms,
      source.responseTimeMs,
      source.response_time_ms,
      source.durationMs,
      source.duration_ms,
      source.metrics?.latencyMs,
      source.metrics?.latency
    ),
    uptime: toFiniteNumber(
      source.uptime,
      source.uptimePercent,
      source.uptime_percent,
      source.availability
    ),
    checkedAt: firstValue(
      source.checkedAt,
      source.checked_at,
      source.lastChecked,
      source.last_checked,
      source.updatedAt,
      source.updated_at,
      source.timestamp
    ),
  };
}

function extractGroups(source) {
  const rawGroups = firstNonEmptyCollection(
    source.groups,
    source.serviceGroups,
    source.service_groups,
    source.categories
  );

  if (rawGroups.length > 0) {
    const groups = rawGroups
      .map((rawGroup, groupIndex) => {
        const groupName = cleanText(
          firstValue(
            rawGroup.name,
            rawGroup.label,
            rawGroup.title,
            rawGroup.category,
            rawGroup.__key
          )
        ) || `Service group ${groupIndex + 1}`;
        const rawServices = firstNonEmptyCollection(
          rawGroup.services,
          rawGroup.items,
          rawGroup.components,
          rawGroup.checks,
          rawGroup.endpoints
        );

        return {
          id: safeIdentifier(
            firstValue(rawGroup.id, rawGroup.slug, rawGroup.__key, groupName),
            `group-${groupIndex}`
          ),
          name: groupName,
          description: cleanText(firstValue(rawGroup.description, rawGroup.summary, rawGroup.message)),
          services: rawServices.map((service, serviceIndex) =>
            normalizeService(service, serviceIndex, groupName)
          ),
        };
      })
      .filter((group) => group.services.length > 0);

    if (groups.length > 0) return groups;
  }

  const rawServices = firstNonEmptyCollection(
    source.services,
    source.components,
    source.checks,
    source.endpoints
  );
  const grouped = new Map();

  rawServices.forEach((service, index) => {
    const normalized = normalizeService(service, index);
    if (!grouped.has(normalized.group)) grouped.set(normalized.group, []);
    grouped.get(normalized.group).push(normalized);
  });

  return Array.from(grouped.entries()).map(([name, services], index) => ({
    id: safeIdentifier(`group-${index}-${name}`, `group-${index}`),
    name,
    description: "",
    services,
  }));
}

function statusRank(status) {
  return {
    operational: 0,
    unknown: 1,
    maintenance: 2,
    degraded: 3,
    outage: 4,
  }[status] ?? 1;
}

function deriveStatus(services) {
  if (!services.length) return "unknown";

  return services.reduce((worst, service) =>
    statusRank(service.status) > statusRank(worst) ? service.status : worst
  , "operational");
}

function normalizeIncident(rawIncident, index) {
  const source = rawIncident && typeof rawIncident === "object" ? rawIncident : {};
  const rawUpdates = asNamedArray(
    firstValue(source.updates, source.timeline, source.events, source.messages)
  );
  const incidentStatus = normalizeToken(firstValue(source.status, source.state));
  const resolved = Boolean(
    source.resolved === true ||
      source.active === false ||
      incidentStatus.includes("resolved") ||
      incidentStatus.includes("closed")
  );

  return {
    id: cleanText(firstValue(source.id, source.slug, source.__key)) || `incident-${index}`,
    title: cleanText(firstValue(source.title, source.name, source.summary)) || "Service incident",
    description: cleanText(
      firstValue(source.description, source.message, source.detail, source.body)
    ),
    status: resolved
      ? "resolved"
      : cleanText(firstValue(source.status, source.state)) || "Investigating",
    severity: normalizeStatus(
      firstValue(source.severity, source.impact, source.status, source.state),
      source
    ),
    startedAt: firstValue(
      source.startedAt,
      source.started_at,
      source.createdAt,
      source.created_at,
      source.date
    ),
    updatedAt: firstValue(source.updatedAt, source.updated_at, source.lastUpdate, source.last_update),
    resolved,
    updates: rawUpdates.slice(0, 4).map((update, updateIndex) => ({
      id: cleanText(firstValue(update.id, update.__key)) || `update-${updateIndex}`,
      message: cleanText(firstValue(update.message, update.description, update.body, update.text)),
      createdAt: firstValue(
        update.createdAt,
        update.created_at,
        update.updatedAt,
        update.updated_at,
        update.timestamp,
        update.date
      ),
    })),
  };
}

function extractIncidents(source) {
  const incidentRoot = source.incidents;
  const directActive = firstNonEmptyCollection(
    source.activeIncidents,
    source.active_incidents
  );
  const nestedActive = firstNonEmptyCollection(
    incidentRoot?.active,
    incidentRoot?.items
  );
  const history = firstNonEmptyCollection(
    incidentRoot?.history,
    source.incidentHistory,
    source.incident_history
  );
  const fallback = Array.isArray(incidentRoot)
    ? incidentRoot
    : firstNonEmptyCollection(source.issues);
  const combined = [
    ...(directActive.length ? directActive : nestedActive),
    ...history,
    ...fallback,
  ];
  const seen = new Set();

  return combined
    .map(normalizeIncident)
    .filter((incident) => {
      const key = incident.id || `${incident.title}-${incident.startedAt || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeMaintenance(source) {
  const maintenanceRoot = firstMeaningfulValue(
    source.nextMaintenance,
    source.next_maintenance,
    source.scheduledMaintenance,
    source.scheduled_maintenance,
    source.scheduledMaintenances,
    source.scheduled_maintenances,
    source.maintenance
  );

  let candidates = [];

  if (Array.isArray(maintenanceRoot)) {
    candidates = maintenanceRoot;
  } else if (maintenanceRoot && typeof maintenanceRoot === "object") {
    const nested = firstValue(
      maintenanceRoot.next,
      maintenanceRoot.nextWindow,
      maintenanceRoot.next_window,
      maintenanceRoot.windows,
      maintenanceRoot.items
    );

    candidates = nested ? asNamedArray(nested) : [maintenanceRoot];
  } else if (maintenanceRoot) {
    candidates = [{ title: cleanText(maintenanceRoot) }];
  }

  const normalized = candidates.map((candidate, index) => ({
    id: cleanText(firstValue(candidate.id, candidate.slug, candidate.__key)) || `maintenance-${index}`,
    title: cleanText(firstValue(candidate.title, candidate.name, candidate.label)) || "Monthly maintenance window",
    description: cleanText(
      firstValue(candidate.description, candidate.message, candidate.summary, candidate.detail)
    ),
    startsAt: firstValue(
      candidate.startsAt,
      candidate.starts_at,
      candidate.startAt,
      candidate.start_at,
      candidate.start,
      candidate.scheduledFor,
      candidate.scheduled_for,
      candidate.date
    ),
    endsAt: firstValue(
      candidate.endsAt,
      candidate.ends_at,
      candidate.endAt,
      candidate.end_at,
      candidate.end
    ),
    recurrence: cleanText(
      firstValue(candidate.recurrence, candidate.frequency, candidate.schedule, candidate.cadence)
    ),
    status: humanizeKey(firstValue(candidate.status, candidate.state)) || "Scheduled",
  }));

  if (!normalized.length) {
    return {
      id: "monthly-maintenance",
      title: "Monthly maintenance window",
      description: "The next maintenance date has not been published yet.",
      startsAt: null,
      endsAt: null,
      recurrence: "Monthly",
      status: "Date pending",
    };
  }

  return normalized
    .filter((item) => normalizeToken(item.status) !== "cancelled")
    .sort((a, b) => {
      const aTime = new Date(a.startsAt || 8640000000000000).getTime();
      const bTime = new Date(b.startsAt || 8640000000000000).getTime();
      return aTime - bTime;
    })[0] || normalized[0];
}

function normalizeSnapshot(rawSnapshot) {
  const raw = rawSnapshot && typeof rawSnapshot === "object" ? rawSnapshot : {};
  const nested = firstValue(raw.data, raw.payload, raw.result);
  const source = nested && typeof nested === "object" && !Array.isArray(nested)
    ? { ...raw, ...nested }
    : raw;
  const groups = extractGroups(source);
  const services = groups.flatMap((group) => group.services);
  const derivedStatus = deriveStatus(services);
  const explicitStatus = normalizeStatus(
    firstValue(
      source.overallStatus,
      source.overall_status,
      source.overall?.status,
      source.status?.status,
      source.status,
      source.state,
      source.summary?.status,
      source.healthy
    ),
    source
  );
  const overallStatus =
    explicitStatus === "unknown" && services.length > 0
      ? derivedStatus
      : derivedStatus === "unknown"
      ? explicitStatus
      : statusRank(derivedStatus) > statusRank(explicitStatus)
      ? derivedStatus
      : explicitStatus;
  const averageLatency = services.length
    ? services.reduce(
        (total, service) => total + (service.latencyMs ?? 0),
        0
      ) / services.filter((service) => service.latencyMs !== null).length
    : null;
  const validAverageLatency = Number.isFinite(averageLatency) ? averageLatency : null;

  return {
    overallStatus,
    overallTitle: cleanText(
      firstValue(source.overall?.title, source.summary?.title, source.statusTitle)
    ),
    overallMessage: cleanText(
      firstValue(
        source.overall?.message,
        source.overall?.description,
        source.summary?.message,
        source.statusMessage
      )
    ),
    checkedAt: firstValue(
      source.checkedAt,
      source.checked_at,
      source.updatedAt,
      source.updated_at,
      source.timestamp,
      source.generatedAt,
      source.generated_at
    ),
    groups: groups.map((group) => ({
      ...group,
      status: deriveStatus(group.services),
    })),
    services,
    incidents: extractIncidents(source),
    maintenance: normalizeMaintenance(source),
    metrics: {
      total: services.length,
      operational: services.filter((service) => service.status === "operational").length,
      affected: services.filter((service) =>
        ["degraded", "outage", "maintenance"].includes(service.status)
      ).length,
      unknown: services.filter((service) => service.status === "unknown").length,
      averageLatency: validAverageLatency,
    },
  };
}

function formatDateTime(value, fallback = "Awaiting first check") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanText(value) || fallback;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

function formatLatency(value) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} s`;
  return `${Math.round(value)} ms`;
}

function formatUptime(value) {
  if (!Number.isFinite(value)) return "";
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(normalized >= 99 ? 2 : 1)}% uptime`;
}

function StatusPill({ status, compact = false }) {
  const meta = STATUS_META[status] || STATUS_META.unknown;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-black uppercase ${
        compact
          ? "px-2.5 py-1 text-[8px] tracking-[0.13em]"
          : "px-3 py-1.5 text-[8.5px] tracking-[0.15em]"
      } ${meta.pillClass}`}
      aria-label={`Status: ${meta.label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-[1.15rem] border border-cyan-200/10 bg-white/[0.022] p-4 sm:rounded-[1.35rem] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/45 sm:text-[9px]">
            {label}
          </p>
          <p className="mt-2 text-[25px] font-semibold tracking-[-0.055em] text-white sm:text-[30px]">
            {value}
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200/75">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500 sm:text-xs">{detail}</p>
    </div>
  );
}

function ServiceRow({ service }) {
  return (
    <li className="grid gap-3 border-t border-white/[0.07] px-4 py-4 first:border-t-0 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-6">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              (STATUS_META[service.status] || STATUS_META.unknown).dotClass
            }`}
            aria-hidden="true"
          />
          <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-white sm:text-[15px]">
            {service.name}
          </h3>
        </div>

        {service.message && (
          <p className="mt-1.5 pl-[18px] text-[11px] leading-5 text-slate-500 sm:text-xs">
            {service.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-[18px] md:justify-end md:pl-0">
        {service.latencyMs !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-[9px] font-bold text-slate-400">
            <Gauge size={11} aria-hidden="true" />
            {formatLatency(service.latencyMs)}
          </span>
        )}

        {service.uptime !== null && (
          <span className="hidden rounded-full border border-white/[0.075] bg-white/[0.025] px-2.5 py-1 text-[9px] font-bold text-slate-500 sm:inline-flex">
            {formatUptime(service.uptime)}
          </span>
        )}

        <StatusPill status={service.status} compact />
      </div>
    </li>
  );
}

function ServiceGroup({ group }) {
  return (
    <section
      className="overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/38 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur sm:rounded-[1.55rem]"
      aria-labelledby={`status-group-${group.id}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] bg-white/[0.018] px-4 py-4 sm:px-5 md:px-6">
        <div className="min-w-0">
          <h2
            id={`status-group-${group.id}`}
            className="truncate text-[16px] font-semibold tracking-[-0.035em] text-white sm:text-lg"
          >
            {group.name}
          </h2>
          <p className="mt-1 text-[10px] text-slate-500">
            {group.services.length} monitored {group.services.length === 1 ? "service" : "services"}
          </p>
        </div>
        <StatusPill status={group.status} compact />
      </div>

      <ul>
        {group.services.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </ul>
    </section>
  );
}

function IncidentCard({ incident }) {
  const severity = incident.resolved
    ? "operational"
    : incident.severity === "unknown"
    ? "degraded"
    : incident.severity;
  const meta = STATUS_META[severity] || STATUS_META.degraded;

  return (
    <article className="border-t border-white/[0.07] px-4 py-5 first:border-t-0 sm:px-5 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.025em] text-white">
            {incident.title}
          </h3>
          {incident.description && (
            <p className="mt-2 text-xs leading-6 text-slate-400">{incident.description}</p>
          )}
        </div>
        <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] ${meta.pillClass}`}>
          {incident.status}
        </span>
      </div>

      {(incident.startedAt || incident.updatedAt) && (
        <p className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
          <Clock3 size={11} aria-hidden="true" />
          {formatDateTime(incident.updatedAt || incident.startedAt)}
        </p>
      )}

      {incident.updates.length > 0 && (
        <ol className="mt-4 space-y-3 border-l border-cyan-200/10 pl-4">
          {incident.updates.map((update) => (
            <li key={update.id} className="relative">
              <span className="absolute -left-[19px] top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-200/45" aria-hidden="true" />
              {update.message && <p className="text-[11px] leading-5 text-slate-400">{update.message}</p>}
              {update.createdAt && (
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  {formatDateTime(update.createdAt)}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export default function StatusExperience({ initialSnapshot = {} }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot || {});
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const requestRef = useRef(null);

  const loadStatus = useCallback(async () => {
    if (requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setRefreshing(true);

    try {
      const response = await fetch(`/api/status/health?ts=${Date.now()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.reload();
        return;
      }

      if (!data || typeof data !== "object") {
        throw new Error("The latest system snapshot could not be loaded.");
      }

      setSnapshot(data);

      if (!response.ok) {
        setRefreshError(
          cleanText(
            firstValue(
              data.overall?.message,
              data.message,
              data.error
            )
          ) || "The status monitor returned an incomplete snapshot."
        );
      } else {
        setRefreshError("");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setRefreshError(
          error?.message || "The latest system snapshot could not be loaded."
        );
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setRefreshing(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      await fetch("/api/status/access", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
    } finally {
      window.location.reload();
    }
  }, [signingOut]);

  useEffect(() => {
    const needsInitialRetry =
      initialSnapshot?.unavailable ||
      (!initialSnapshot?.checkedAt &&
        !initialSnapshot?.updatedAt &&
        !initialSnapshot?.services?.length &&
        !initialSnapshot?.groups?.length);

    if (needsInitialRetry) loadStatus();

    const interval = window.setInterval(loadStatus, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [initialSnapshot, loadStatus]);

  const status = useMemo(() => normalizeSnapshot(snapshot), [snapshot]);
  const overallMeta = STATUS_META[status.overallStatus] || STATUS_META.unknown;
  const OverallIcon = overallMeta.icon;
  const activeIncidents = status.incidents.filter((incident) => !incident.resolved);
  const recentIncidents = status.incidents.filter((incident) => incident.resolved);
  const visibleIncidents = activeIncidents.length ? activeIncidents : recentIncidents.slice(0, 3);
  const maintenance = status.maintenance;

  return (
    <main className="relative isolate overflow-hidden px-5 pb-16 pt-10 text-white sm:px-6 sm:pb-20 sm:pt-14 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[-16%] top-[-2rem] h-80 w-80 rounded-full bg-cyan-300/[0.065] blur-[125px] sm:left-[2%]" />
        <div className="absolute right-[-22%] top-[28rem] h-96 w-96 rounded-full bg-blue-500/[0.075] blur-[150px] sm:right-[-5%]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${overallMeta.dotClass}`} aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.34em]">
                Live infrastructure
              </span>
            </div>

            <h1 className="max-w-[760px] text-[39px] font-semibold leading-[0.94] tracking-[-0.07em] text-white sm:text-[54px] lg:text-[64px] lg:leading-[1]">
              System health,
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
                clearly reported.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[13px] leading-7 text-slate-300/65 sm:text-[15px]">
              Current availability for the storefront, WordPress, checkout, account,
              documentation, and supporting services.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadStatus}
                disabled={refreshing}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-cyan-200/14 bg-cyan-300/[0.07] px-4 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100 transition hover:border-cyan-200/28 hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/40 disabled:cursor-wait disabled:opacity-65"
                aria-label="Refresh system status now"
              >
                {refreshing ? (
                  <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} aria-hidden="true" />
                )}
                {refreshing ? "Checking services" : "Refresh status"}
              </button>

              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 disabled:cursor-wait disabled:opacity-65"
                aria-label="Lock private status dashboard"
              >
                {signingOut ? (
                  <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <LogOut size={14} aria-hidden="true" />
                )}
                {signingOut ? "Locking" : "Lock dashboard"}
              </button>
            </div>

            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Automatic refresh every 60 seconds
            </p>
          </div>
        </header>

        {refreshError && (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3.5 text-amber-50/80"
            role="alert"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold">Live refresh was unsuccessful</p>
              <p className="mt-1 text-[11px] leading-5 text-amber-100/55">
                {refreshError} The most recent snapshot remains visible below.
              </p>
            </div>
          </div>
        )}

        <section
          className={`relative overflow-hidden rounded-[1.55rem] border p-5 shadow-[0_32px_110px_rgba(0,0,0,0.2)] backdrop-blur sm:rounded-[1.9rem] sm:p-7 lg:p-8 ${overallMeta.panelClass}`}
          aria-labelledby="overall-status-title"
          aria-live="polite"
          aria-busy={refreshing}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.025] via-transparent to-cyan-300/[0.025]" aria-hidden="true" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border sm:h-14 sm:w-14 ${overallMeta.iconClass}`}>
                <OverallIcon size={24} aria-hidden="true" />
              </span>

              <div>
                <p className="text-[8.5px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Current status
                </p>
                <h2 id="overall-status-title" className="mt-1 text-[22px] font-semibold tracking-[-0.045em] text-white sm:text-[28px]">
                  {status.overallTitle || overallMeta.overallLabel}
                </h2>
                <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-400 sm:text-xs sm:leading-6">
                  {status.overallMessage || overallMeta.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.08] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Last checked</p>
              <p className="mt-1.5 text-[10px] font-semibold text-slate-300 sm:text-[11px]">
                {formatDateTime(status.checkedAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Service status summary">
          <MetricCard
            icon={Server}
            label="Monitored"
            value={status.metrics.total}
            detail="Services in the latest snapshot"
          />
          <MetricCard
            icon={ShieldCheck}
            label="Operational"
            value={status.metrics.operational}
            detail="Checks responding normally"
          />
          <MetricCard
            icon={HeartPulse}
            label="Affected"
            value={status.metrics.affected}
            detail={status.metrics.unknown ? `${status.metrics.unknown} additional unknown` : "Degraded, offline, or in maintenance"}
          />
          <MetricCard
            icon={Activity}
            label="Avg response"
            value={formatLatency(status.metrics.averageLatency)}
            detail="Average reported check latency"
          />
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="services-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/50">
                Live checks
              </p>
              <h2 id="services-heading" className="mt-1 text-[25px] font-semibold tracking-[-0.045em] text-white sm:text-[30px]">
                Services
              </h2>
            </div>

            <p className="hidden text-right text-[10px] leading-5 text-slate-600 sm:block">
              Status reflects the latest completed<br />monitoring cycle.
            </p>
          </div>

          {status.groups.length > 0 ? (
            <div className="grid gap-4">
              {status.groups.map((group) => (
                <ServiceGroup key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 p-8 text-center backdrop-blur">
              {refreshing ? (
                <Loader2 size={27} className="animate-spin text-cyan-200 motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <TimerReset size={28} className="text-slate-500" aria-hidden="true" />
              )}
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.035em] text-white">
                {refreshing ? "Checking monitored services" : "No service snapshot yet"}
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500">
                {refreshing
                  ? "The live health endpoint is preparing the latest results."
                  : "Use refresh to request a new health snapshot."}
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] sm:mt-12" aria-label="Incidents and maintenance">
          <div>
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/50">
                Incident log
              </p>
              <h2 className="mt-1 text-[25px] font-semibold tracking-[-0.045em] text-white sm:text-[30px]">
                {activeIncidents.length ? "Active incidents" : "Recent incidents"}
              </h2>
            </div>

            <div className="overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/38 backdrop-blur sm:rounded-[1.55rem]">
              {visibleIncidents.length > 0 ? (
                visibleIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))
              ) : (
                <div className="flex min-h-[230px] flex-col items-center justify-center p-8 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200">
                    <CheckCircle2 size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.035em] text-white">
                    No incidents reported
                  </h3>
                  <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500">
                    There are no active or recent service incidents in this snapshot.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/50">
                Planned work
              </p>
              <h2 className="mt-1 text-[25px] font-semibold tracking-[-0.045em] text-white sm:text-[30px]">
                Maintenance
              </h2>
            </div>

            <article className="relative overflow-hidden rounded-[1.35rem] border border-sky-300/12 bg-sky-300/[0.035] p-5 backdrop-blur sm:rounded-[1.55rem] sm:p-6">
              <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-sky-300/[0.09] blur-3xl" aria-hidden="true" />

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/[0.075] text-sky-200">
                    <CalendarClock size={19} aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-sky-300/15 bg-sky-300/[0.065] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-sky-100">
                    {humanizeKey(maintenance.status)}
                  </span>
                </div>

                <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.04em] text-white">
                  {maintenance.title}
                </h3>

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  {maintenance.description || "Routine monthly checks and preventive platform maintenance."}
                </p>

                <dl className="mt-5 grid gap-3 border-t border-white/[0.08] pt-5">
                  <div>
                    <dt className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Next window</dt>
                    <dd className="mt-1.5 text-[11px] font-semibold leading-5 text-slate-300">
                      {formatDateTime(maintenance.startsAt, "Date to be announced")}
                    </dd>
                  </div>

                  {maintenance.endsAt && (
                    <div>
                      <dt className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Expected completion</dt>
                      <dd className="mt-1.5 text-[11px] font-semibold leading-5 text-slate-300">
                        {formatDateTime(maintenance.endsAt)}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Cadence</dt>
                    <dd className="mt-1.5 text-[11px] font-semibold text-slate-300">
                      {maintenance.recurrence || "Monthly"}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </section>

        <aside className="mt-8 flex flex-col gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Status reporting information">
          <div className="flex items-start gap-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-cyan-200" aria-hidden="true" />
            <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
              This page reports automated checks and published incidents. If you are
              experiencing an issue not shown here, contact support.
            </p>
          </div>
          <a
            href="mailto:support@phaseonelabz.com"
            className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.045] px-3 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
          >
            Contact support
          </a>
        </aside>
      </div>
    </main>
  );
}
