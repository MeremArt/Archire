import React, { useEffect, useState } from "react";
import { cvAPI } from "../services/api";

export default function CVPage() {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cvAPI.get()
      .then((r) => setContent(r.data.content))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError("");
    try {
      await cvAPI.upload(content.trim(), "master-cv.md");
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || "Unknown error";
      setError(`Failed to save: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Master CV</h1>
        <p className="text-gray-500 mt-1">
          Paste or upload your CV once. ArcHire will tailor it to each job using AI — rewriting
          your summary, reordering bullets, and injecting ATS keywords without inventing anything.
        </p>
      </div>

      {/* Upload file */}
      <label className="flex items-center gap-3 cursor-pointer mb-4 w-fit">
        <span className="btn-secondary text-sm py-1.5 px-4">
          Upload .txt / .md file
        </span>
        <input type="file" accept=".txt,.md,.text" className="hidden" onChange={handleFile} />
      </label>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <textarea
          className="w-full h-[500px] font-mono text-sm border border-gray-200 rounded-xl p-4
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
          placeholder={`Paste your CV here in plain text or markdown...\n\nExample:\n# Jane Doe\njane@example.com | linkedin.com/in/jane\n\n## Experience\n### Senior Engineer @ Acme Corp (2021–Present)\n- Led migration of monolith to microservices, reducing deploy time by 60%\n- ...\n\n## Skills\nPython, TypeScript, AWS, PostgreSQL, ...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="btn-primary py-2 px-6"
        >
          {saving ? "Saving…" : "Save CV"}
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-1 rounded-lg">
            ✓ CV saved successfully
          </span>
        )}
        {error && (
          <span className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
            {error}
          </span>
        )}
        {content && (
          <span className="text-gray-400 text-sm ml-auto">
            {content.split(/\s+/).filter(Boolean).length} words
          </span>
        )}
      </div>

      <div className="mt-8 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800 space-y-1">
        <p className="font-semibold">How AI tailoring works</p>
        <ul className="list-disc list-inside space-y-1 text-indigo-700">
          <li>Extracts 15–20 keywords from the job description</li>
          <li>Rewrites your summary to mirror the role's language</li>
          <li>Reorders bullet points to lead with the most relevant experience</li>
          <li>Never invents skills or achievements — only reformulates what's here</li>
          <li>Scores your fit 1–100 and highlights strengths & gaps</li>
        </ul>
      </div>
    </div>
  );
}
