import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "🔍",
    title: "Aggregated from 6+ sources",
    desc: "RemoteOK, We Work Remotely, Remotive auto-scraped daily. Target LinkedIn, Indeed, Greenhouse & Lever boards with custom keyword scrapes.",
  },
  {
    icon: "🎯",
    title: "Targeted custom scraping",
    desc: "Enter your job title and location. We search every source and import matching listings instantly.",
  },
  {
    icon: "📬",
    title: "Email job alerts",
    desc: "Save keywords and get notified the moment a matching role is posted. No more daily manual checks.",
  },
  {
    icon: "⚡",
    title: "Relevance ranking",
    desc: "Results are scored by keyword match strength — the most relevant listings surface first.",
  },
  {
    icon: "🔄",
    title: "Updated daily",
    desc: "The scheduler automatically scrapes all sources every 24 hours so the feed stays fresh.",
  },
  {
    icon: "🔒",
    title: "Your account, your data",
    desc: "Saved searches and alert subscriptions are tied to your account and private to you.",
  },
];

const STEPS = [
  { n: "1", title: "Create your free account", desc: "Takes 30 seconds — just an email and password." },
  { n: "2", title: "Search or run a custom scrape", desc: "Find jobs by keyword, location, or target specific boards." },
  { n: "3", title: "Apply & subscribe to alerts", desc: "Click Apply on any card, or save a search to get email notifications." },
];

function StatCounter({ end, label }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-indigo-600">{count.toLocaleString()}+</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">ArcHire</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Sign in</Link>
            <Link to="/login?tab=register" className="btn-primary text-sm py-1.5 px-4">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-600 text-white py-24 px-4">
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6">
            🚀 Free to use — no credit card required
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Hiring people into<br className="hidden sm:block" /> their next evolution.
          </h1>
          <p className="text-lg sm:text-xl text-indigo-200 max-w-2xl mx-auto mb-10">
            ArcHire aggregates listings from RemoteOK, We Work Remotely, Remotive, LinkedIn,
            and Indeed — then ranks them by relevance so you find the right role faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login?tab=register"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Create free account →
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/30"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 sm:gap-12">
          <StatCounter end={278} label="Jobs aggregated" />
          <StatCounter end={6} label="Sources connected" />
          <StatCounter end={24} label="Hour refresh cycle" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need in a job search
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Stop juggling five browser tabs. One platform, all the listings.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 bg-indigo-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">Up and running in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute mt-6 ml-full w-8 border-t-2 border-dashed border-indigo-300" />
                )}
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready for your next evolution?</h2>
          <p className="text-indigo-200 mb-8">
            Create your free account and access hundreds of jobs right now.
          </p>
          <Link
            to="/login?tab=register"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors shadow-xl text-lg"
          >
            Get started — it's free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-white font-semibold">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            ArcHire
          </span>
          <span>© {new Date().getFullYear()} ArcHire — Hiring people into their next evolution.</span>
        </div>
      </footer>
    </div>
  );
}
