/**
 * App.jsx
 * --------
 * The root component of the AI Study Buddy frontend.
 *
 * WHAT THIS FILE DOES:
 * --------------------
 * - Owns ALL application state (messages, loading flags, errors, quiz, summary)
 * - Contains the functions that make API calls to the backend
 * - Passes data and callbacks DOWN to child components via props
 *
 * This pattern is called "lifting state up" — keeping state in the nearest
 * common ancestor so multiple child components can share it.
 *
 * COMPONENT TREE:
 *   <App>
 *     <UploadPanel>  — file picker and upload trigger
 *     <ChatPanel>    — message list and question input
 *     <SummaryPanel> — summary button and result
 *     <QuizPanel>    — quiz button and MCQ display
 *
 * API URL:
 *   Read from the VITE_API_URL environment variable (set in frontend/.env).
 *   This keeps the URL out of hardcoded strings and easy to change.
 */

import React, { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ChatPanel from "./components/ChatPanel";
import SummaryPanel from "./components/SummaryPanel";
import QuizPanel from "./components/QuizPanel";

// Read the backend base URL from Vite's environment variable system
// import.meta.env is Vite's equivalent of process.env for the browser
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  // ── State ──────────────────────────────────────────────────────────────────

  // Info about the currently loaded document (fileName, pages, chunks count)
  const [docInfo, setDocInfo] = useState(null);

  // Array of chat messages: { role: "user"|"ai", text: string, sources?: number[] }
  const [messages, setMessages] = useState([]);

  // Loading state for the /ask request
  const [isChatLoading, setIsChatLoading] = useState(false);

  // The document summary text
  const [summary, setSummary] = useState(null);

  // Loading state for the /summarize request
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // The quiz data: array of { question, options, answer }
  const [quiz, setQuiz] = useState(null);

  // Fallback raw text in case Gemini returns non-parseable JSON for the quiz
  const [rawQuiz, setRawQuiz] = useState(null);

  // Loading state for the /quiz request
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // Global error message shown in the red banner at the top
  const [error, setError] = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * handleUploadSuccess
   * --------------------
   * Called by UploadPanel after a successful POST /upload.
   * Resets all previous data since we have a new document.
   */
  const handleUploadSuccess = (data) => {
    setDocInfo(data);        // store file info for display
    setMessages([]);         // clear old chat history
    setSummary(null);        // clear old summary
    setQuiz(null);           // clear old quiz
    setRawQuiz(null);
    setError(null);
  };

  /**
   * handleAsk
   * ----------
   * Called when the user submits a question in ChatPanel.
   * Sends POST /ask and appends both the question and answer to the message list.
   *
   * @param {string} question - The user's question text
   */
  const handleAsk = async (question) => {
    // Add the user's message to the chat immediately (optimistic UI)
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setIsChatLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // tell Express this is JSON
        body: JSON.stringify({ question }),              // serialize the question
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to get an answer.");
        // Remove the user message if there was an error
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      // Append the AI's answer to the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer,
          sources: data.sources, // e.g. [2, 5] — page numbers
        },
      ]);
    } catch (err) {
      setError("Could not connect to the server. Is the backend running?");
      setMessages((prev) => prev.slice(0, -1)); // remove the failed user message
    } finally {
      setIsChatLoading(false);
    }
  };

  /**
   * handleSummarize
   * ----------------
   * Calls POST /summarize and stores the result in state.
   */
  const handleSummarize = async () => {
    setIsSummaryLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch(`${API_URL}/summarize`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Summarization failed.");
        return;
      }

      setSummary(data.summary);
    } catch (err) {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  /**
   * handleQuiz
   * -----------
   * Calls POST /quiz and stores the parsed quiz questions (or raw text) in state.
   */
  const handleQuiz = async () => {
    setIsQuizLoading(true);
    setError(null);
    setQuiz(null);
    setRawQuiz(null);

    try {
      const response = await fetch(`${API_URL}/quiz`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Quiz generation failed.");
        return;
      }

      if (data.questions) {
        setQuiz(data.questions); // structured JSON array
      } else if (data.raw) {
        setRawQuiz(data.raw);   // fallback: raw text from Gemini
      }
    } catch (err) {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setIsQuizLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // Full-page gradient background
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-8">
      {/* Page title */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-800 mb-1">
          🎓 AI Study Buddy
        </h1>
        <p className="text-gray-500 text-sm">
          Upload a PDF and chat with it — answers sourced only from your document
        </p>
      </header>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          {/* Dismiss button */}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Upload + Document info + Summary + Quiz */}
        <div className="flex flex-col gap-6 lg:col-span-1">

          {/* Upload section */}
          <UploadPanel onUploadSuccess={handleUploadSuccess} onError={setError} />

          {/* Document info card — only shown after a successful upload */}
          {docInfo && (
            <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">✅ Document loaded:</p>
              <p>📄 <span className="font-medium">{docInfo.fileName}</span></p>
              <p>📃 Pages: {docInfo.pages}</p>
              <p>🧩 Chunks embedded: {docInfo.chunks}</p>
            </div>
          )}

          {/* Summary section — only shown after a document is loaded */}
          {docInfo && (
            <SummaryPanel
              summary={summary}
              isLoading={isSummaryLoading}
              onSummarize={handleSummarize}
            />
          )}

          {/* Quiz section — only shown after a document is loaded */}
          {docInfo && (
            <QuizPanel
              quiz={quiz}
              rawQuiz={rawQuiz}
              isLoading={isQuizLoading}
              onQuiz={handleQuiz}
            />
          )}
        </div>

        {/* Right column: Chat panel (takes 2/3 of the width on large screens) */}
        <div className="lg:col-span-2">
          <ChatPanel
            messages={messages}
            onAsk={handleAsk}
            isLoading={isChatLoading}
            onError={setError}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
