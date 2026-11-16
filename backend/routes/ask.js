/**
 * routes/ask.js
 * --------------
 * Defines the POST /ask endpoint — the heart of the RAG pipeline.
 *
 * FLOW:
 *   1. Receive { question } from the client.
 *   2. Embed the question using the same Gemini embedding model.
 *   3. Compare the question embedding against every stored chunk using cosine similarity.
 *   4. Pick the top 3 most relevant chunks.
 *   5. Build a prompt that includes those chunks as "context" and sends it to Gemini.
 *   6. Return { answer, sources } where sources is an array of page numbers.
 *
 * WHY DOES THIS PREVENT HALLUCINATION?
 *   The prompt explicitly tells Gemini to answer ONLY from the provided context
 *   and to say "Not found in the document." if the answer isn't there.
 *   We don't give Gemini free rein to use its general knowledge.
 */

const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const { embedText } = require("../utils/embed");
const { getTopChunks } = require("../utils/similarity");
const documentStore = require("../documentStore");

// Reuse a single AI client instance (same API key from .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The text generation model.
// "gemini-flash-lite-latest" is a stable alias that always routes to the
// latest available flash-lite model — confirmed working with this API key.
const TEXT_MODEL = "gemini-flash-lite-latest";

// ─── POST /ask ───────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  // Log every incoming /ask request to the terminal for easy debugging
  console.log(`\n[POST /ask] ${new Date().toISOString()}`);
  console.log(`  chunks in store: ${documentStore.chunks.length}`);
  console.log(`  question: "${(req.body?.question || "").slice(0, 80)}"`);

  try {
    const { question } = req.body;

    // ── Validate input ─────────────────────────────────────────────────────
    if (!question || question.trim() === "") {
      console.log("  → 400: empty question");
      return res.status(400).json({ error: "Question cannot be empty." });
    }

    // ── Check that a document has been uploaded ────────────────────────────
    if (documentStore.chunks.length === 0) {
      console.log("  → 400: no document loaded");
      return res
        .status(400)
        .json({ error: "No document uploaded yet. Please upload a PDF first." });
    }

    // ── Step 1: Embed the question ─────────────────────────────────────────
    console.log("  → Embedding question...");
    const questionEmbedding = await embedText(question);

    // ── Step 2: Find the top 3 relevant chunks ─────────────────────────────
    const topChunks = getTopChunks(questionEmbedding, documentStore.chunks, 3);
    console.log(
      `  → Top chunks: pages [${topChunks.map((c) => c.page).join(", ")}]`,
      `scores: [${topChunks.map((c) => c.score.toFixed(3)).join(", ")}]`
    );

    // ── Step 3: Build the prompt ───────────────────────────────────────────
    const contextText = topChunks
      .map(
        (chunk, i) =>
          `[Context ${i + 1} — Page ${chunk.page}]\n${chunk.text}`
      )
      .join("\n\n");

    const prompt = `You are a helpful study assistant. Answer ONLY using the context below.
If the answer is not in the context, reply exactly: "Not found in the document."
Be concise and cite page numbers where relevant.

${contextText}

Question: ${question}
Answer:`;

    // ── Step 4: Call Gemini text generation ───────────────────────────────
    console.log(`  → Calling Gemini (${TEXT_MODEL})...`);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });

    const answer = response.text;
    console.log(`  → Answer: "${answer.slice(0, 80).replace(/\n/g, " ")}..."`);

    // ── Step 5: Collect unique source page numbers ─────────────────────────
    const sourcePages = [...new Set(topChunks.map((c) => c.page))].sort(
      (a, b) => a - b
    );

    // ── Respond ───────────────────────────────────────────────────────────
    console.log(`  → 200 OK — sources: [${sourcePages.join(", ")}]`);
    return res.json({
      answer: answer,
      sources: sourcePages,
    });
  } catch (err) {
    // Log the full error so it's visible in the terminal
    console.error("  → ERROR in /ask:", err.message);
    // Send the real error message to the frontend so it can display it
    return res.status(500).json({ error: "Failed to get answer: " + err.message });
  }
});

module.exports = router;
