import React, { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import TailorCVModal from "./TailorCVModal";

function stripHtml(html) {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  } catch {
    return html.replace(/<[^>]*>/g, "");
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return null;
  }
}

function SourceBadge({ source }) {
  const colors = {
    RemoteOK: "bg-green-50 text-green-700",
    "We Work Remotely": "bg-blue-50 text-blue-700",
    Remotive: "bg-purple-50 text-purple-700",
    Greenhouse: "bg-emerald-50 text-emerald-700",
    Lever: "bg-teal-50 text-teal-700",
    Indeed: "bg-yellow-50 text-yellow-700",
    LinkedIn: "bg-sky-50 text-sky-700",
  };
  const cls = colors[source] || "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {source}
    </span>
  );
}

export default function JobCard({ job }) {
  const [showTailor, setShowTailor] = useState(false);
  const posted = timeAgo(job.date_posted || job.created_at);
  const tags = (job.tags || []).filter(Boolean).slice(0, 5);

  return (
    <article className="card p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-indigo-700 hover:text-indigo-900
                       hover:underline line-clamp-2 leading-snug"
          >
            {job.title}
          </a>
          {job.company && (
            <p className="mt-1 text-sm font-medium text-gray-800 truncate">
              {job.company}
            </p>
          )}
        </div>
        {job.source && (
          <div className="shrink-0 mt-0.5">
            <SourceBadge source={job.source} />
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        {job.location && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.location}
          </span>
        )}
        {posted && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {posted}
          </span>
        )}
      </div>

      {/* Description excerpt */}
      {job.description && (
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {stripHtml(job.description)}
        </p>
      )}

      {/* Footer: tags + buttons */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowTailor(true)}
            className="text-sm py-1.5 px-3 rounded-lg border border-indigo-300 text-indigo-700
                       hover:bg-indigo-50 transition-colors whitespace-nowrap font-medium"
            title="Tailor your CV for this job with AI"
          >
            ✨ Tailor CV
          </button>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm py-1.5 px-4 whitespace-nowrap"
          >
            Apply →
          </a>
        </div>
      </div>

      {showTailor && <TailorCVModal job={job} onClose={() => setShowTailor(false)} />}
    </article>
  );
}
