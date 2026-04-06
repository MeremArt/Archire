import React, { useEffect, useState } from "react";
import { applicationsAPI } from "../services/api";

const STATUSES = ["saved", "applied", "screening", "interview", "offer", "rejected", "withdrawn"];

const STATUS_STYLE = {
  saved:      "bg-gray-100 text-gray-600",
  applied:    "bg-blue-100 text-blue-700",
  screening:  "bg-yellow-100 text-yellow-700",
  interview:  "bg-purple-100 text-purple-700",
  offer:      "bg-green-100 text-green-700",
  rejected:   "bg-red-100 text-red-600",
  withdrawn:  "bg-gray-100 text-gray-400",
};

const PIPELINE = ["saved", "applied", "screening", "interview", "offer"];

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function ScoreBadge({ score }) {
  if (!score) return null;
  const color = score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-500" : "text-red-500";
  return <span className={`text-sm font-bold ${color}`}>{score}</span>;
}

function AppRow({ app, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(app.notes || "");
  const [showCV, setShowCV] = useState(false);

  const update = async (data) => {
    await applicationsAPI.update(app.id, data);
    onUpdate();
  };

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4">
          <a href={app.job_url} target="_blank" rel="noopener noreferrer"
            className="font-medium text-indigo-700 hover:underline line-clamp-1">
            {app.job_title || "Untitled"}
          </a>
          <p className="text-xs text-gray-500 mt-0.5">{app.company}</p>
        </td>
        <td className="py-3 px-4">
          <ScoreBadge score={app.score} />
        </td>
        <td className="py-3 px-4">
          <select
            value={app.status}
            onChange={(e) => update({ status: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </td>
        <td className="py-3 px-4 text-xs text-gray-500">
          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() :
           app.status === "applied" ? "—" : "Not applied"}
        </td>
        <td className="py-3 px-4">
          {editing ? (
            <div className="flex gap-1">
              <input
                className="text-xs border rounded px-2 py-1 flex-1 focus:outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => { update({ notes }); setEditing(false); }}
                autoFocus
              />
            </div>
          ) : (
            <p className="text-xs text-gray-500 cursor-pointer hover:text-gray-800 line-clamp-1"
              onClick={() => setEditing(true)}>
              {app.notes || <span className="text-gray-300 italic">Add note…</span>}
            </p>
          )}
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-2">
            {app.tailored_cv && (
              <button onClick={() => setShowCV(!showCV)}
                className="text-xs text-indigo-600 hover:underline">
                {showCV ? "Hide CV" : "View CV"}
              </button>
            )}
            <button onClick={() => { if (confirm("Delete this application?")) { applicationsAPI.delete(app.id).then(onUpdate); } }}
              className="text-xs text-red-400 hover:text-red-600">
              Delete
            </button>
          </div>
        </td>
      </tr>
      {showCV && app.tailored_cv && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 pb-4">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-gray-600">Tailored CV</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(app.tailored_cv); }}
                  className="text-xs text-indigo-600 hover:underline">
                  Copy
                </button>
              </div>
              <pre className="text-xs font-mono bg-white border rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {app.tailored_cv}
              </pre>
              {app.ai_notes && <p className="text-xs text-gray-500 mt-2 italic">{app.ai_notes}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = () => {
    applicationsAPI.list()
      .then((r) => setApps(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter((a) => a.status === s).length;
    return acc;
  }, {});

  const visible = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1">{apps.length} total · {counts.interview || 0} at interview stage</p>
        </div>
        <a href="/cv" className="btn-secondary text-sm py-1.5 px-4">Manage CV →</a>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {PIPELINE.map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
            className={`p-3 rounded-xl border text-center transition-all ${filter === s ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
            <p className="text-2xl font-bold text-gray-800">{counts[s] || 0}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{s}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No applications yet</p>
          <p className="text-sm mt-1">Click <strong>✨ Tailor CV</strong> on any job card to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Job</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Fit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Applied</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Notes</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((app) => (
                <AppRow key={app.id} app={app} onUpdate={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
