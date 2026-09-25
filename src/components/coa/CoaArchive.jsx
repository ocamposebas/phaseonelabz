import "./coa-archive.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Archive, RefreshCcw, Search, X } from "lucide-react";
import {
  groupCoaCatalog,
  scoreCoaPresentation,
} from "../../lib/coaModel.js";
import CoaCertificateViewer from "./CoaCertificateViewer.jsx";
import CoaEducationGuide from "./CoaEducationGuide.jsx";
import CoaRecord from "./CoaRecord.jsx";

const PAGE_SIZE = 10;

function pageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.min(Math.max(current - 2, 1), total - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function ArchivePagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="coa-pagination" aria-label="COA result pages">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>
      <div>
        {pageNumbers(page, totalPages).map((number) => (
          <button
            key={number}
            type="button"
            className={number === page ? "is-current" : ""}
            aria-current={number === page ? "page" : undefined}
            aria-label={`Page ${number}`}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </nav>
  );
}

function ArchiveLoading() {
  return (
    <div className="coa-archive__loading" role="status" aria-live="polite">
      <span className="sr-only">Loading certificates</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="coa-archive__skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}

export default function CoaArchive({ endpoint = "/api/coas" }) {
  const [status, setStatus] = useState("loading");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewer, setViewer] = useState(null);
  const [education, setEducation] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const resultsRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      setError("");

      try {
        const response = await fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "The certificate catalog could not be loaded.");
        }

        setRecords(Array.isArray(data?.records) ? data.records : []);
        setSummary(data?.summary && typeof data.summary === "object" ? data.summary : {});
        setStale(Boolean(data?.stale));
        setStatus("ready");
      } catch (loadError) {
        if (loadError?.name === "AbortError") return;
        setRecords([]);
        setError(loadError?.message || "The certificate catalog could not be loaded.");
        setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, [endpoint, reloadKey]);

  const families = useMemo(() => groupCoaCatalog(records), [records]);

  const filtered = useMemo(() => {
    return families
      .map((family) => {
        const presentations = family.presentations.filter((presentation) => {
          if (filter === "current") return Boolean(presentation.currentRecord);
          if (filter === "historical") {
            return Boolean(presentation.historicalRecords?.length);
          }
          return true;
        });
        const ranked = presentations
          .map((presentation) => ({
            presentation,
            score: scoreCoaPresentation(presentation, debouncedQuery),
          }))
          .sort((left, right) => right.score - left.score);

        return {
          family,
          presentations,
          preferredPresentation: ranked[0]?.presentation || null,
          score: ranked[0]?.score || 0,
        };
      })
      .filter(
        (item) =>
          item.presentations.length > 0 &&
          (!debouncedQuery || item.score > 0)
      )
      .sort((left, right) => {
        if (debouncedQuery && right.score !== left.score) {
          return right.score - left.score;
        }
        return left.family.name.localeCompare(right.family.name);
      });
  }, [debouncedQuery, families, filter]);

  useEffect(() => setPage(1), [debouncedQuery, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const changePage = (nextPage) => {
    const safeNext = Math.min(Math.max(nextPage, 1), totalPages);
    if (safeNext === safePage) return;
    setPage(safeNext);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      resultsRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <section className="coa-archive" aria-labelledby="coa-archive-title">
      <div className="coa-archive__inner">
        <header className="coa-archive__header">
          <div>
            <p>Phase One laboratory archive</p>
            <h1 id="coa-archive-title">Certificates of Analysis</h1>
            <span>
              Find the current or historical certificate for a specific product and batch.
            </span>
          </div>
          <div className="coa-archive__summary" aria-label="Certificate summary">
            <div>
              <strong>{summary.current ?? "—"}</strong>
              <span>Current lots</span>
            </div>
            <div>
              <strong>{summary.historical ?? "—"}</strong>
              <span>Historical</span>
            </div>
          </div>
        </header>

        <div className="coa-archive__tools">
          <label className="coa-archive__search">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Search certificates</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, batch or COA"
              autoComplete="off"
            />
            {query ? (
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X size={16} />
              </button>
            ) : null}
          </label>

          <div className="coa-archive__filters" aria-label="Filter certificates">
            {[
              ["all", "All"],
              ["current", "Current"],
              ["historical", "Historical"],
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

        <div ref={resultsRef} className="coa-archive__results-heading">
          <div>
            <p>Certificate records</p>
            <h2>
              {status === "ready"
                ? `${filtered.length} product ${filtered.length === 1 ? "family" : "families"}`
                : "Laboratory records"}
            </h2>
          </div>
          {stale ? (
            <span className="coa-archive__stale">
              Showing the most recent cached response
            </span>
          ) : null}
        </div>

        {status === "loading" ? <ArchiveLoading /> : null}

        {status === "error" ? (
          <div className="coa-archive__state" role="alert">
            <AlertCircle size={24} />
            <div>
              <h2>Certificates are temporarily unavailable</h2>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCcw size={15} /> Try again
            </button>
          </div>
        ) : null}

        {status === "ready" && visible.length === 0 ? (
          <div className="coa-archive__state">
            <Archive size={24} />
            <div>
              <h2>No matching certificates</h2>
              <p>Try another product, SKU, batch or COA number.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearSearch();
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {status === "ready" && visible.length ? (
          <div className="coa-archive__records">
            {visible.map(({ family, presentations, preferredPresentation }) => (
              <CoaRecord
                key={family.key}
                family={family}
                presentations={presentations}
                preferredPresentation={preferredPresentation}
                query={debouncedQuery}
                filter={filter}
                onLearn={setEducation}
                onView={(record) =>
                  setViewer({ record, productName: family.name })
                }
              />
            ))}
          </div>
        ) : null}

        <ArchivePagination
          page={safePage}
          totalPages={totalPages}
          onChange={changePage}
        />

        <footer className="coa-archive__note">
          <strong>About current shipping lots</strong>
          <p>
            This status identifies the lot currently being distributed. It does not identify the lot received in a historical customer order.
          </p>
        </footer>
      </div>

      {viewer ? (
        <CoaCertificateViewer
          record={viewer.record}
          productName={viewer.productName}
          onClose={() => setViewer(null)}
        />
      ) : null}

      {education ? (
        <CoaEducationGuide
          record={education.record}
          productName={education.productName}
          productImage={education.productImage}
          onClose={() => setEducation(null)}
          onOpenCertificate={(record) => {
            const productName = education.productName;
            setEducation(null);
            setViewer({ record, productName });
          }}
        />
      ) : null}
    </section>
  );
}
