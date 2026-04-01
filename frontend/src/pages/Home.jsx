import React, { useCallback, useState } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import JobList from "../components/JobList";
import Pagination from "../components/Pagination";
import SubscribeForm from "../components/SubscribeForm";
import CustomScrapePanel from "../components/CustomScrapePanel";
import { useJobs } from "../hooks/useJobs";

const DEFAULT_FILTERS = {
  keyword: "",
  location: "",
  days: "",
  source: "",
  page: 1,
  pageSize: 20,
};

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { jobs, total, totalPages, loading, error, refetch } = useJobs(filters);

  const handleSearch = useCallback(({ keyword, location }) => {
    setFilters((f) => ({ ...f, keyword, location, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((changes) => {
    setFilters((f) => ({ ...f, ...changes, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Search */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-500 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Find your next remote role
          </h1>
          <p className="text-indigo-200 text-base sm:text-lg">
            Aggregated from RemoteOK, We Work Remotely, Remotive, and more —
            updated daily.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <SearchBar
            initialKeyword={filters.keyword}
            initialLocation={filters.location}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Job feed — takes remaining width */}
          <div className="flex-1 min-w-0">
            {/* Filters bar */}
            <div className="mb-5">
              <Filters
                days={filters.days}
                source={filters.source}
                total={total}
                onFilterChange={handleFilterChange}
              />
            </div>

            {/* Job list */}
            <JobList
              jobs={jobs}
              loading={loading}
              error={error}
              keyword={filters.keyword}
              onRetry={refetch}
            />

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  page={filters.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
                <p className="text-center text-xs text-gray-400 mt-2">
                  Page {filters.page} of {totalPages}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            <CustomScrapePanel onJobsImported={refetch} />
            <SubscribeForm defaultKeywords={filters.keyword} />

            {/* Quick tips card */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Search tips</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Use multiple words to AND-search: <em>react senior</em>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Filter by <em>Remote</em> in location for remote-only jobs
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Use the date filter to see the freshest listings first
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Subscribe to get email alerts for saved searches
                </li>
              </ul>
            </div>

            {/* Trigger scrape (dev convenience) */}
            <TriggerScrapeCard />
          </aside>
        </div>
      </main>
    </div>
  );
}

function TriggerScrapeCard() {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);

  const handleScrape = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/scrape", { method: "POST" });
      const data = await res.json();
      setResult(data);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-800 mb-2">Manual scrape</h3>
      <p className="text-xs text-gray-500 mb-3">
        Fetch the latest jobs from all sources right now.
      </p>
      <button
        onClick={handleScrape}
        disabled={state === "loading"}
        className="btn-secondary text-sm w-full"
      >
        {state === "loading" ? "Scraping…" : "Run scraper now"}
      </button>
      {state === "done" && result && (
        <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          ✓ {result.inserted} new jobs added ({result.skipped} duplicates skipped)
        </p>
      )}
      {state === "error" && (
        <p className="mt-2 text-xs text-red-600">Scrape failed — check backend logs.</p>
      )}
    </div>
  );
}
