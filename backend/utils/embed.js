/**
 * utils/embed.js
 * ---------------
 * This module handles converting text into numerical "embeddings" using
 * Google Gemini's embedding model.
 *
 * WHAT IS AN EMBEDDING?
 * ----------------------
 * An embedding is a list of floating-point numbers (a vector) that represents
 * the *meaning* of a piece of text in a mathematical space. Words or sentences
 * with similar meanings will have vectors that point in similar directions.
 *
 * We use embeddings for two things:
 *   1. Embed every chunk of the uploaded PDF (done once at upload time).
 *   2. Embed the user's question at query time.
 * Then we compare them with cosine similarity to find the most relevant chunks.
 *
 * MODEL USED: "gemini-embedding-001"
 * This is Google's free-tier embedding model available through the Gemini API.
 */

// Load environment variables from .env (must have GEMINI_API_KEY)
require("dotenv").config();

// Import the official Google Gen AI SDK
const { GoogleGenAI } = require("@google/genai");

// Create a single shared AI client using our API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The name of the Gemini embedding model we want to use
const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * embedText
 * ----------
 * Sends a string of text to the Gemini embedding API and returns
 * the resulting embedding vector (an array of numbers).
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 * @throws Will throw if the API call fails
 */
async function embedText(text) {
  // Call the Gemini embedContent API
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text, // the text we want to embed
  });

  // The API returns an object; the actual vector lives at response.embeddings[0].values
  // This is an array of floating-point numbers, e.g. [0.123, -0.456, ...]
  return response.embeddings[0].values;
}

/**
 * embedChunks
 * ------------
 * Takes an array of chunk objects ({ text, page }) and adds an embedding
 * to each one. Processes them one by one to avoid rate-limit errors.
 *
 * @param {Array<{text: string, page: number}>} chunks
 * @returns {Promise<Array<{text: string, page: number, embedding: number[]}>>}
 */
async function embedChunks(chunks) {
  const embedded = [];

  for (const chunk of chunks) {
    // Get the embedding for this chunk's text
    const embedding = await embedText(chunk.text);

    // Add the embedding to the chunk object and store it
    embedded.push({
      text: chunk.text,
      page: chunk.page,
      embedding: embedding, // the numerical vector
    });
  }

  return embedded;
}

module.exports = { embedText, embedChunks };
