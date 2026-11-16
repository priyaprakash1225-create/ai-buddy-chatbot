/**
 * components/SummaryPanel.jsx
 * ----------------------------
 * Displays the result of calling POST /summarize.
 *
 * PROPS:
 *   summary    — the summary string returned from the backend (or null)
 *   isLoading  — boolean; true while the request is in flight
 *   onSummarize() — callback to trigger the summarization request
 */

import React from "react";

function SummaryPanel({ summary, isLoading, onSummarize }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-700">📝 Document Summary</h2>
        <button
          onClick={onSummarize}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors
            ${isLoading
              ? "bg-emerald-300 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700"
            }`}
        >
          {isLoading ? "⏳ Summarizing..." : "Summarize"}
        </button>
      </div>

      {/* Show the summary once it's available */}
      {summary ? (
        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </div>
      ) : (
        !isLoading && (
          <p className="text-sm text-gray-400">
            Click "Summarize" to generate a summary of the uploaded document.
          </p>
        )
      )}

      {/* Loading placeholder */}
      {isLoading && (
        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-600 animate-pulse">
          Generating summary...
        </div>
      )}
    </div>
  );
}

export default SummaryPanel;
