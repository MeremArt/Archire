import { useCallback, useEffect, useRef, useState } from "react";
import { jobsAPI } from "../services/api";

export function useJobs(filters) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.location) params.location = filters.location;
      if (filters.days) params.days = filters.days;
      if (filters.source) params.source = filters.source;
      params.page = filters.page || 1;
      params.page_size = filters.pageSize || 20;

      const res = await jobsAPI.list(params);
      setJobs(res.data.jobs);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        setError(err.response?.data?.detail || "Failed to load jobs");
      }
    } finally {
      setLoading(false);
    }
  }, [
    filters.keyword,
    filters.location,
    filters.days,
    filters.source,
    filters.page,
    filters.pageSize,
  ]);

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  return { jobs, total, totalPages, loading, error, refetch: fetch };
}
