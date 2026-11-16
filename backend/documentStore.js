/**
 * documentStore.js
 * -----------------
 * This is our in-memory "database" — just a plain JavaScript object.
 *
 * WHY THIS APPROACH?
 * ------------------
 * For a small demo/study project, we don't need a real database.
 * Node.js modules are cached after the first require(), so every file
 * that does `require('./documentStore')` gets the SAME object instance.
 * This means changes made in one route file (e.g., upload.js) are
 * immediately visible in another (e.g., ask.js). It's shared state.
 *
 * LIMITATION:
 * -----------
 * All data is lost when the server restarts. Only one document can be
 * stored at a time. This is fine for a local study tool.
 */

const documentStore = {
  // The name of the currently loaded file (for display purposes)
  fileName: null,

  // Array of chunk objects: { text: string, page: number, embedding: number[] }
  // Each element is one chunk of the PDF, tagged with its source page and embedding.
  chunks: [],
};

module.exports = documentStore;
