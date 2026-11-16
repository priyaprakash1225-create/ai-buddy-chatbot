/**
 * routes/summarize.js
 * --------------------
 * POST /summarize
 *
 * Uses the full text of the uploaded document to ask Gemini for a summary.
 * We concatenate all stored chunk texts and send them as context.
 */

const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const documentStore = require("../documentStore");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// "gemini-flash-lite-latest" — confirmed working with this API key.
const TEXT_MODEL = "gemini-flash-lite-latest";

// ─── POST /summarize ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  console.log(`\n[POST /summarize] ${new Date().toISOString()}`);
  console.log(`  chunks in store: ${documentStore.chunks.length}`);

  try {
    if (documentStore.chunks.length === 0) {
      console.log("  → 400: no document loaded");
      return res
        .status(400)
        .json({ error: "No document uploaded yet. Please upload a PDF first." });
    }

    // Combine all chunk texts into one big string
    const fullText = documentStore.chunks.map((c) => c.text).join("\n\n");
    console.log(`  → Combined text length: ${fullText.length} chars`);

    const prompt = `Summarize the following document in clear, concise bullet points.
Only use information present in the document.

Document:
${fullText}

Summary:`;

    console.log(`  → Calling Gemini (${TEXT_MODEL})...`);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });

    console.log("  → 200 OK — summary generated");
    return res.json({ summary: response.text });
  } catch (err) {
    console.error("  → ERROR in /summarize:", err.message);
    return res.status(500).json({ error: "Summarization failed: " + err.message });
  }
});

module.exports = router;
