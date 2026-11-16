/**
 * utils/similarity.js
 * --------------------
 * Implements cosine similarity from scratch — no external library.
 *
 * WHY COSINE SIMILARITY?
 * ----------------------
 * When we embed text with Gemini, each piece of text becomes a list of numbers
 * called a "vector" (think of it as a point in high-dimensional space).
 *
 * Two pieces of text that mean similar things will point in similar
 * *directions* from the origin, even if their magnitudes differ.
 *
 * Cosine similarity measures the angle between two vectors:
 *   - Score = 1.0  → identical direction (very similar meaning)
 *   - Score = 0.0  → perpendicular        (unrelated meaning)
 *   - Score = -1.0 → opposite direction   (opposite meaning)
 *
 * FORMULA:
 *            A · B
 *   cos θ = -------
 *           |A| |B|
 *
 * Where:
 *   A · B  = dot product   = Σ (A[i] * B[i])
 *   |A|    = magnitude of A = √(Σ A[i]²)
 *   |B|    = magnitude of B = √(Σ B[i]²)
 */

/**
 * dotProduct
 * -----------
 * Computes the dot product of two equal-length numeric arrays.
 * Dot product = sum of element-wise multiplications.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]; // multiply matching elements, accumulate
  }
  return sum;
}

/**
 * magnitude
 * ----------
 * Computes the Euclidean length (magnitude) of a vector.
 * magnitude = √(x₁² + x₂² + ... + xₙ²)
 *
 * @param {number[]} vec
 * @returns {number}
 */
function magnitude(vec) {
  let sumOfSquares = 0;
  for (const val of vec) {
    sumOfSquares += val * val;
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * cosineSimilarity
 * -----------------
 * Puts dotProduct and magnitude together to produce the cosine similarity score.
 *
 * @param {number[]} a - Embedding vector A
 * @param {number[]} b - Embedding vector B
 * @returns {number}   - Similarity score between -1 and 1
 */
function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);

  // Guard against division by zero (empty or zero vectors)
  if (magA === 0 || magB === 0) return 0;

  return dotProduct(a, b) / (magA * magB);
}

/**
 * getTopChunks
 * -------------
 * Given a query embedding and an array of stored chunks (each with their own
 * embedding), ranks all chunks by cosine similarity and returns the top N.
 *
 * @param {number[]} queryEmbedding          - Embedding of the user's question
 * @param {Array<{text, page, embedding}>} chunks - All stored document chunks
 * @param {number} topN                       - How many top results to return (default 3)
 * @returns {Array<{text, page, score}>}       - Top N chunks sorted by relevance
 */
function getTopChunks(queryEmbedding, chunks, topN = 3) {
  // Score every chunk against the query
  const scored = chunks.map((chunk) => ({
    text: chunk.text,
    page: chunk.page,
    score: cosineSimilarity(queryEmbedding, chunk.embedding), // compare vectors
  }));

  // Sort descending — highest similarity first
  scored.sort((a, b) => b.score - a.score);

  // Return only the top N results
  return scored.slice(0, topN);
}

module.exports = { cosineSimilarity, getTopChunks };
