import React, { useState } from "react";
import { subscriptionAPI } from "../services/api";

export default function SubscribeForm({ defaultKeywords = "" }) {
  const [email, setEmail] = useState("");
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const kwList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (!kwList.length) {
      setStatus("error");
      setMessage("Please enter at least one keyword.");
      return;
    }

    try {
      const res = await subscriptionAPI.subscribe(email, kwList, location);
      setStatus("success");
      setMessage(res.data.message);
    } catch (err) {
      setStatus("error");
      setMessage(
        err.response?.data?.detail || "Failed to subscribe. Please try again."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-green-800 mb-1">You're subscribed!</h3>
        <p className="text-sm text-green-700">{message}</p>
        <button
          className="mt-4 text-sm text-green-600 underline"
          onClick={() => {
            setStatus(null);
            setEmail("");
            setKeywords(defaultKeywords);
            setLocation("");
          }}
        >
          Subscribe to more keywords
        </button>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Get job alerts</h2>
        <p className="text-sm text-gray-600 mt-1">
          Receive email notifications when new matching jobs are posted.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keywords{" "}
            <span className="font-normal text-gray-400">(comma-separated)</span>
          </label>
          <input
            type="text"
            required
            className="input"
            placeholder="e.g. react, senior engineer, remote"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location filter{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Remote, New York"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary w-full"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe to alerts"}
        </button>
      </form>
    </div>
  );
}
