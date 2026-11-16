/**
 * utils/chunk.js
 * ---------------
 * This file is responsible for splitting the text of each PDF page
 * into smaller "chunks". Why do we chunk?
 *
 *  - Embedding models have a token limit — you can't embed an entire document at once.
 *  - Smaller chunks make retrieval more precise (we find exactly the paragraph
 *    that answers the question, not an entire chapter).
 *  - Overlap between consecutive chunks ensures that a sentence at the boundary
 *    of two chunks is never lost.
 */

/**
 * splitIntoChunks
 * ----------------
 * Takes an array of { text, page } objects (one per PDF page) and splits
 * each page's text into overlapping word-windows.
 *
 * @param {Array<{text: string, page: number}>} pages  - Array of page objects from pdf-parse
 * @param {number} chunkSize   - Target number of words per chunk  (default 300)
 * @param {number} overlapSize - How many words to repeat at the start of the next chunk (default 50)
 * @returns {Array<{text: string, page: number}>} - Flat array of chunk objects, each tagged with its page number
 */
function splitIntoChunks(pages, chunkSize = 300, overlapSize = 50) {
  // This will hold all chunks from all pages
  const chunks = [];

  // Loop over every page
  for (const { text, page } of pages) {
    // Split the page text into individual words using whitespace as separator.
    // filter(Boolean) removes any empty strings caused by multiple spaces.
    const words = text.split(/\s+/).filter(Boolean);

    // If a page is blank or has very few words, skip it
    if (words.length === 0) continue;

    // Sliding-window loop:
    // - Start at word index 0
    // - Each iteration, advance by (chunkSize - overlapSize) words
    //   so the next chunk starts overlapping by overlapSize words
    let start = 0;
    while (start < words.length) {
      // Grab words from 'start' up to 'start + chunkSize'
      const chunkWords = words.slice(start, start + chunkSize);

      // Re-join the words back into a readable string
      const chunkText = chunkWords.join(" ");

      // Store the chunk alongside its source page number
      chunks.push({
        text: chunkText,
        page: page,
      });

      // Move the window forward (but keep 'overlapSize' words overlapping)
      start += chunkSize - overlapSize;
    }
  }

  return chunks;
}

// Export so other files (server.js / routes) can import this function
module.exports = { splitIntoChunks };
