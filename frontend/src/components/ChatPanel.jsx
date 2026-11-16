/**
 * components/ChatPanel.jsx
 * -------------------------
 * The main chat interface where the user types questions and sees answers.
 *
 * PROPS:
 *   messages  — array of { role: "user"|"ai", text, sources? } objects
 *   onAsk(question) — callback when user submits a question
 *   isLoading — boolean; true while waiting for the AI answer
 *   onError(msg) — callback for errors
 */

import React, { useState, useRef, useEffect } from "react";

function ChatPanel({ messages, onAsk, isLoading, onError }) {
  // The text currently typed in the input box
  const [inputText, setInputText] = useState("");

  // A ref to the bottom of the message list — we scroll here after each new message
  const messagesEndRef = useRef(null);

  /**
   * Auto-scroll to the latest message whenever the messages array changes
   * or when the loading indicator appears.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /**
   * handleSubmit
   * -------------
   * Called when the user presses Enter or clicks "Ask".
   * Passes the question text up to the parent (App.jsx) for processing.
   */
  const handleSubmit = (e) => {
    e.preventDefault(); // prevent page reload on form submit
    if (inputText.trim() === "") return; // ignore empty input
    onAsk(inputText.trim());
    setInputText(""); // clear the input after submitting
  };

  return (
    <div className="bg-white rounded-2xl shadow flex flex-col h-[600px]">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-2xl">
        <h2 className="text-xl font-bold">💬 Chat with your PDF</h2>
        <p className="text-sm text-indigo-200">Answers come only from your document</p>
      </div>

      {/* ── Message list ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Show a placeholder if no messages yet */}
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-20 text-sm">
            Upload a PDF and start asking questions...
          </p>
        )}

        {/* Render each message bubble */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"   // user: right, purple
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"  // AI: left, gray
                }`}
            >
              {/* The message text */}
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Source pages (only shown for AI messages that have sources) */}
              {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                <p className="mt-2 text-xs text-indigo-500 font-medium">
                  📌 Source: Page {msg.sources.join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator — shown while waiting for the AI response */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
              <span className="animate-pulse">🤔 Thinking...</span>
            </div>
          </div>
        )}

        {/* Invisible div at the bottom — we scroll to this after each message */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ─────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 px-4 py-3 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about the document..."
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400
                     disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || inputText.trim() === ""}
          className={`px-5 py-2 rounded-xl text-white text-sm font-semibold transition-colors
            ${isLoading || inputText.trim() === ""
              ? "bg-indigo-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          Ask
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
