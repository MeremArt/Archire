import React from "react";
import JobCard from "./JobCard";

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex justify-between gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-5 bg-gray-200 rounded-full w-20" />
      </div>
      <div className="flex gap-3 mb-3">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5">
          <div className="h-5 bg-gray-200 rounded-full w-14" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
        </div>
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
      </div>
    </div>
  );
}

function EmptyState({ keyword }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">No jobs found</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        {keyword
          ? `No results for "${keyword}". Try different keywords or broaden your filters.`
          : "No jobs are available right now. Try running the scraper or check back later."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">Something went wrong</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <button onClick={onRetry} className="btn-secondary text-sm">
        Try again
      </button>
    </div>
  );
}

export default function JobList({ jobs, loading, error, keyword, onRetry }) {
  if (error) {
    return (
      <div className="grid">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="grid">
        <EmptyState keyword={keyword} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
