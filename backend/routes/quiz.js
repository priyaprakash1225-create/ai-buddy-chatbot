/**
 * routes/quiz.js
 * ---------------
 * POST /quiz
 *
 * Generates 5 multiple-choice questions from the uploaded document.
 * Asks Gemini to return them as a JSON array so the frontend can render
 * them in a structured way.
 */

const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const documentStore = require("../documentStore");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// "gemini-flash-lite-latest" — confirmed working with this API key.
const TEXT_MODEL = "gemini-flash-lite-latest";

// ─── POST /quiz ───────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  console.log(`\n[POST /quiz] ${new Date().toISOString()}`);
  console.log(`  chunks in store: ${documentStore.chunks.length}`);

  try {
    if (documentStore.chunks.length === 0) {
      console.log("  → 400: no document loaded");
      return res
        .status(400)
        .json({ error: "No document uploaded yet. Please upload a PDF first." });
    }

    const fullText = documentStore.chunks.map((c) => c.text).join("\n\n");
    console.log(`  → Combined text length: ${fullText.length} chars`);

    const prompt = `Based ONLY on the following document, generate exactly 5 multiple-choice questions.
Return your response as a valid JSON array with this exact structure (no extra text, no markdown code fences):
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A) ..."
  }
]

Document:
${fullText}`;

    console.log(`  → Calling Gemini (${TEXT_MODEL})...`);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });

    // Strip markdown code fences if Gemini wrapped the JSON in them
    let raw = response.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }

    console.log(`  → Raw response (first 100 chars): ${raw.slice(0, 100)}`);

    let questions;
    try {
      questions = JSON.parse(raw);
      console.log(`  → 200 OK — parsed ${questions.length} questions`);
    } catch (parseErr) {
      console.warn("  → JSON parse failed, returning raw text");
      return res.json({
        questions: null,
        raw: raw,
        warning: "Could not parse quiz as JSON. Showing raw text.",
      });
    }

    return res.json({ questions });
  } catch (err) {
    console.error("  → ERROR in /quiz:", err.message);
    return res.status(500).json({ error: "Quiz generation failed: " + err.message });
  }
});

module.exports = router;
