import axios from "axios";

// Dev:  Vite proxy forwards /api → localhost:8000 (VITE_API_URL not needed)
// Prod: Set VITE_API_URL=https://your-app.railway.app in Vercel env vars
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
    }
    return Promise.reject(err);
  }
);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list: (params) => api.get("/jobs", { params }),
  get: (id) => api.get(`/jobs/${id}`),
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (email, password) => api.post("/auth/register", { email, password }),
  login: (email, password) => {
    // FastAPI OAuth2 expects form-encoded data
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => api.get("/auth/me"),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptionAPI = {
  subscribe: (email, keywords, locationFilter = "") =>
    api.post("/subscribe", { email, keywords, location_filter: locationFilter }),
  unsubscribe: (email) => api.post("/subscribe/cancel", { email }),
};

// ── Sources ───────────────────────────────────────────────────────────────────
export const sourcesAPI = {
  list: () => api.get("/sources"),
};

// ── Custom Scrape ─────────────────────────────────────────────────────────────
// Scrape requests can take several minutes (LinkedIn/Indeed need delays)
const SCRAPE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export const scrapeAPI = {
  getSources: () => api.get("/scrape/sources"),
  run: (keyword, location, sources, saveSpec = false, specName = "") =>
    api.post(
      "/scrape/run",
      { keyword, location, sources, save_spec: saveSpec, spec_name: specName },
      { timeout: SCRAPE_TIMEOUT }
    ),
  listSpecs: () => api.get("/scrape/specs"),
  createSpec: (data) => api.post("/scrape/specs", data),
  runSpec: (id) => api.post(`/scrape/specs/${id}/run`, {}, { timeout: SCRAPE_TIMEOUT }),
  deleteSpec: (id) => api.delete(`/scrape/specs/${id}`),
};

export default api;
