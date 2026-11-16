/**
 * components/QuizPanel.jsx
 * -------------------------
 * Displays the result of calling POST /quiz.
 * Shows 5 multiple-choice questions from the document.
 *
 * PROPS:
 *   quiz       — array of { question, options, answer } objects (or null)
 *   rawQuiz    — fallback raw text if JSON parsing failed
 *   isLoading  — boolean; true while the request is in flight
 *   onQuiz()   — callback to trigger the quiz generation request
 */

import React, { useState } from "react";

function QuizPanel({ quiz, rawQuiz, isLoading, onQuiz }) {
  // Track which answers the user has revealed (by question index)
  const [revealed, setRevealed] = useState({});

  // Toggle revealing the answer for a specific question
  const toggleReveal = (index) => {
    setRevealed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-700">🧠 Quiz</h2>
        <button
          onClick={() => { setRevealed({}); onQuiz(); }} // reset revealed answers on regenerate
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors
            ${isLoading
              ? "bg-amber-300 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600"
            }`}
        >
          {isLoading ? "⏳ Generating..." : "Generate Quiz"}
        </button>
      </div>

      {/* Loading placeholder */}
      {isLoading && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-600 animate-pulse">
          Generating quiz questions...
        </div>
      )}

      {/* Render structured quiz questions */}
      {quiz && !isLoading && (
        <div className="flex flex-col gap-4">
          {quiz.map((item, index) => (
            <div key={index} className="bg-amber-50 rounded-xl p-4">
              {/* Question text */}
              <p className="font-semibold text-gray-800 mb-2">
                {index + 1}. {item.question}
              </p>

              {/* Options list */}
              <ul className="text-sm text-gray-700 flex flex-col gap-1 mb-2 ml-2">
                {item.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>

              {/* Reveal answer button */}
              <button
                onClick={() => toggleReveal(index)}
                className="text-xs text-amber-700 font-medium underline"
              >
                {revealed[index] ? "Hide Answer" : "Show Answer"}
              </button>

              {/* Show the answer only after clicking reveal */}
              {revealed[index] && (
                <p className="text-sm text-green-700 font-medium mt-1">
                  ✅ {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback: show raw text if JSON parsing failed */}
      {rawQuiz && !isLoading && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
          {rawQuiz}
        </div>
      )}

      {/* Empty state */}
      {!quiz && !rawQuiz && !isLoading && (
        <p className="text-sm text-gray-400">
          Click "Generate Quiz" to create 5 multiple-choice questions from the document.
        </p>
      )}
    </div>
  );
}

export default QuizPanel;
