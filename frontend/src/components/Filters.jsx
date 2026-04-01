import React from "react";

const DAY_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Last 24 h", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
];

const SOURCE_OPTIONS = [
  { label: "All sources", value: "" },
  { label: "RemoteOK", value: "RemoteOK" },
  { label: "We Work Remotely", value: "We Work Remotely" },
  { label: "Remotive", value: "Remotive" },
];

export default function Filters({ days, source, total, onFilterChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Result count */}
      <span className="text-sm text-gray-500 mr-auto">
        {total > 0 ? (
          <>{total.toLocaleString()} job{total !== 1 ? "s" : ""} found</>
        ) : (
          "No jobs found"
        )}
      </span>

      {/* Date filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Date posted
        </label>
        <select
          value={days}
          onChange={(e) => onFilterChange({ days: e.target.value })}
          className="input py-1.5 text-sm w-auto min-w-[130px]"
        >
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Source filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Source
        </label>
        <select
          value={source}
          onChange={(e) => onFilterChange({ source: e.target.value })}
          className="input py-1.5 text-sm w-auto min-w-[150px]"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
