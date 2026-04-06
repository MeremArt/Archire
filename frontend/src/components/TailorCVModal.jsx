import React, { useState } from "react";
import { cvAPI } from "../services/api";

const STATUS_COLORS = {
  saved: "bg-gray-100 text-gray-600",
  applied: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-gray-100 text-gray-500",
};

function ScoreRing({ score }) {
  const color = score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-500" : "text-red-500";
  return (
    <div className={`text-4xl font-extrabold ${color}`}>
      {score}<span className="text-lg font-normal text-gray-400">/100</span>
    </div>
  );
}

export default function TailorCVModal({ job, onClose }) {
  const [step, setStep] = useState("idle"); // idle | loading | done | error | no_cv
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleTailor = async () => {
    setStep("loading");
    try {
      const { data } = await cvAPI.tailor(job.id);
      setResult(data);
      setStep("done");
    } catch (err) {
      const detail = err.response?.data?.detail || "";
      if (detail.includes("Upload your master CV")) setStep("no_cv");
      else setStep("error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.tailored_cv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.tailored_cv], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-${(job.company || "archire").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
            <p className="text-sm text-gray-500">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {step === "idle" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">AI CV Tailoring</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                Claude will analyze this job, extract its keywords, and rewrite your CV to
                maximise ATS relevance — without inventing anything.
              </p>
              <button onClick={handleTailor} className="btn-primary px-8 py-2.5">
                Tailor my CV for this job
              </button>
            </div>
          )}

          {step === "loading" && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Tailoring your CV…</p>
              <p className="text-gray-400 text-sm mt-1">Analysing job, extracting keywords, rewriting bullets</p>
            </div>
          )}

          {step === "no_cv" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No master CV found</h3>
              <p className="text-gray-500 text-sm mb-4">Upload your CV first, then come back to tailor it for this job.</p>
              <a href="/cv" onClick={onClose} className="btn-primary px-6 py-2">Go to CV page →</a>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">Tailoring failed. Check that ANTHROPIC_API_KEY is set in Railway.</p>
              <button onClick={() => setStep("idle")} className="mt-4 text-indigo-600 text-sm underline">Try again</button>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <ScoreRing score={result.score} />
                  <p className="text-xs text-gray-400 mt-1">Fit score</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-3">{result.summary}</p>
                  {result.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                      <ul className="space-y-0.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-green-500">✓</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-1">Gaps</p>
                      <ul className="space-y-0.5">
                        {result.gaps.map((g, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-yellow-500">△</span>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Tailored CV */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">Tailored CV</h3>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className="text-xs btn-secondary py-1 px-3">
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                    <button onClick={handleDownload} className="text-xs btn-secondary py-1 px-3">
                      Download .md
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                  {result.tailored_cv}
                </pre>
              </div>

              <p className="text-xs text-gray-400 text-center">
                This CV has been saved to your Applications tracker with status <span className="font-medium">Saved</span>. Mark it as Applied once you submit.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "done" && (
          <div className="p-4 border-t flex gap-3">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-2">
              Apply now →
            </a>
            <a href="/applications" onClick={onClose} className="btn-secondary flex-1 text-center py-2">
              View tracker
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
