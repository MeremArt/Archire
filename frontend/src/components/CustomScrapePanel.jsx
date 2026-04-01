import React, { useEffect, useRef, useState } from "react";
import { scrapeAPI } from "../services/api";

// ── Source metadata ────────────────────────────────────────────────────────────

const SOURCE_META = [
  {
    name: "RemoteOK",
    type: "api",
    badge: "API",
    badgeColor: "bg-green-100 text-green-700",
    description: "Remote jobs JSON API",
    requiresJs: false,
  },
  {
    name: "We Work Remotely",
    type: "rss",
    badge: "RSS",
    badgeColor: "bg-blue-100 text-blue-700",
    description: "Remote jobs RSS feed",
    requiresJs: false,
  },
  {
    name: "Remotive",
    type: "api",
    badge: "API",
    badgeColor: "bg-green-100 text-green-700",
    description: "Remote jobs JSON API",
    requiresJs: false,
  },
  {
    name: "Greenhouse",
    type: "greenhouse",
    badge: "ATS",
    badgeColor: "bg-emerald-100 text-emerald-700",
    description: "30+ companies — Stripe, Figma, Notion, Ramp & more",
    requiresJs: false,
  },
  {
    name: "Lever",
    type: "lever",
    badge: "ATS",
    badgeColor: "bg-emerald-100 text-emerald-700",
    description: "25+ companies — OpenAI, Anthropic, Reddit, Discord & more",
    requiresJs: false,
  },
  {
    name: "Indeed",
    type: "search_html",
    badge: "HTML",
    badgeColor: "bg-yellow-100 text-yellow-700",
    description: "Targeted job board search",
    requiresJs: false,
  },
  {
    name: "LinkedIn",
    type: "search_html",
    badge: "HTML",
    badgeColor: "bg-yellow-100 text-yellow-700",
    description: "Public job search (no login)",
    requiresJs: false,
  },
  {
    name: "Glassdoor",
    type: "search_html",
    badge: "JS*",
    badgeColor: "bg-orange-100 text-orange-700",
    description: "Needs Selenium for full results",
    requiresJs: true,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceCard({ meta, checked, onChange }) {
  return (
    <label
      className={[
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        checked
          ? "border-indigo-300 bg-indigo-50"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(meta.name, e.target.checked)}
        className="mt-0.5 accent-indigo-600"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-800">{meta.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta.badgeColor}`}>
            {meta.badge}
          </span>
          {meta.requiresJs && (
            <span
              title="Requires Selenium + chromedriver for full results"
              className="text-xs text-orange-600 cursor-help"
            >
              ⚠ JS required
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
      </div>
    </label>
  );
}

function ResultBadge({ result }) {
  const hasError = Boolean(result.error);
  return (
    <div
      className={[
        "flex items-center justify-between text-xs px-3 py-1.5 rounded-lg",
        hasError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700",
      ].join(" ")}
    >
      <span className="font-medium">{result.source}</span>
      <span>
        {hasError ? `Error: ${result.error.slice(0, 60)}` : `${result.count} jobs`}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CustomScrapePanel({ onJobsImported }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState(
    Object.fromEntries(SOURCE_META.map((s) => [s.name, true]))
  );
  const [saveSpec, setSaveSpec] = useState(false);
  const [specName, setSpecName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [savedSpecs, setSavedSpecs] = useState([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [runningSpecId, setRunningSpecId] = useState(null);
  const panelRef = useRef(null);

  const selectedSources = SOURCE_META.filter((s) => selected[s.name]).map((s) => s.name);

  // Load saved specs when panel opens
  useEffect(() => {
    if (!open) return;
    setSpecsLoading(true);
    scrapeAPI
      .listSpecs()
      .then((res) => setSavedSpecs(res.data))
      .catch(() => {})
      .finally(() => setSpecsLoading(false));
  }, [open]);

  const toggleSource = (name, checked) => {
    setSelected((prev) => ({ ...prev, [name]: checked }));
  };

  const toggleAll = (checked) => {
    setSelected(Object.fromEntries(SOURCE_META.map((s) => [s.name, checked])));
  };

  const handleRun = async () => {
    if (!keyword.trim()) {
      setResult({ error: "Please enter a keyword before scraping." });
      setStatus("error");
      return;
    }
    if (!selectedSources.length) {
      setResult({ error: "Select at least one source." });
      setStatus("error");
      return;
    }

    setStatus("running");
    setResult(null);

    try {
      const res = await scrapeAPI.run(
        keyword.trim(),
        location.trim(),
        selectedSources,
        saveSpec,
        specName.trim() || `${keyword} — ${location || "anywhere"}`,
      );
      setResult(res.data);
      setStatus("done");
      if (res.data.inserted > 0 && onJobsImported) {
        onJobsImported();
      }
      // Refresh saved specs list if we saved one
      if (saveSpec) {
        scrapeAPI.listSpecs().then((r) => setSavedSpecs(r.data)).catch(() => {});
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let errorMsg;
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        errorMsg = "Request timed out — the scrape is taking too long. Try fewer sources.";
      } else if (!err.response) {
        errorMsg = "Cannot reach backend — is the server running on port 8000?";
      } else if (typeof detail === "string") {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail.map((e) => e.msg?.replace("Value error, ", "") ?? JSON.stringify(e)).join("; ");
      } else {
        errorMsg = `Server error (${err.response?.status ?? "unknown"})`;
      }
      setResult({ error: errorMsg });
      setStatus("error");
    }
  };

  const handleRunSpec = async (specId) => {
    setRunningSpecId(specId);
    try {
      const res = await scrapeAPI.runSpec(specId);
      if (res.data.inserted > 0 && onJobsImported) onJobsImported();
      setSavedSpecs((prev) =>
        prev.map((s) =>
          s.id === specId
            ? {
                ...s,
                last_run_at: new Date().toISOString(),
                last_run_inserted: res.data.inserted,
              }
            : s
        )
      );
    } catch {
      // silent — individual spec errors don't break the whole panel
    } finally {
      setRunningSpecId(null);
    }
  };

  const handleDeleteSpec = async (specId) => {
    await scrapeAPI.deleteSpec(specId).catch(() => {});
    setSavedSpecs((prev) => prev.filter((s) => s.id !== specId));
  };

  return (
    <div className="card overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Custom Scrape</p>
            <p className="text-xs text-gray-500">
              Search Indeed, LinkedIn, Glassdoor &amp; more by keyword
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 space-y-5" ref={panelRef}>
          {/* ── Search inputs ── */}
          <div className="pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Job title / keywords <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input text-sm"
                placeholder="e.g. senior react developer"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRun()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                className="input text-sm"
                placeholder="e.g. Remote, New York, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* ── Source selector ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Sources</label>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => toggleAll(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SOURCE_META.map((meta) => (
                <SourceCard
                  key={meta.name}
                  meta={meta}
                  checked={selected[meta.name]}
                  onChange={toggleSource}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              * JS-required sources need{" "}
              <code className="bg-gray-100 px-1 rounded">selenium</code> +{" "}
              <code className="bg-gray-100 px-1 rounded">chromedriver</code> installed.
            </p>
          </div>

          {/* ── Save spec option ── */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveSpec}
                onChange={(e) => setSaveSpec(e.target.checked)}
                className="accent-indigo-600"
              />
              <span className="text-xs font-medium text-gray-700">
                Save as a reusable spec
              </span>
            </label>
            {saveSpec && (
              <input
                type="text"
                className="input text-xs"
                placeholder={`Name (default: "${keyword || "my search"} — ${location || "anywhere"}")`}
                value={specName}
                onChange={(e) => setSpecName(e.target.value)}
              />
            )}
          </div>

          {/* ── Run button ── */}
          <button
            onClick={handleRun}
            disabled={status === "running" || !keyword.trim() || !selectedSources.length}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {status === "running" ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Scraping…
              </>
            ) : (
              <>🚀 Scrape &amp; Import Jobs</>
            )}
          </button>

          {/* ── Results ── */}
          {status === "done" && result && (
            <div className="space-y-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-indigo-800">
                  ✅ {result.inserted} new job{result.inserted !== 1 ? "s" : ""} imported
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  {result.total_scraped} scraped · {result.skipped} duplicates skipped
                  {result.spec_id && " · spec saved"}
                </p>
              </div>
              <div className="space-y-1">
                {(result.sources || []).map((sr) => (
                  <ResultBadge key={sr.source} result={sr} />
                ))}
              </div>
            </div>
          )}

          {status === "error" && result?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {result.error}
            </p>
          )}

          {/* ── Saved specs ── */}
          {savedSpecs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Saved specs</p>
              <div className="space-y-2">
                {savedSpecs.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{spec.name}</p>
                      <p className="text-xs text-gray-500">
                        {spec.keyword}
                        {spec.location ? ` · ${spec.location}` : ""}
                        {spec.last_run_inserted != null
                          ? ` · last: ${spec.last_run_inserted} new`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRunSpec(spec.id)}
                        disabled={runningSpecId === spec.id}
                        className="text-xs btn-secondary py-1 px-2"
                        title="Run this spec"
                      >
                        {runningSpecId === spec.id ? "…" : "▶ Run"}
                      </button>
                      <button
                        onClick={() => handleDeleteSpec(spec.id)}
                        className="text-xs text-red-500 hover:text-red-700 p-1"
                        title="Delete spec"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {specsLoading && (
            <p className="text-xs text-gray-400 text-center">Loading saved specs…</p>
          )}
        </div>
      )}
    </div>
  );
}
