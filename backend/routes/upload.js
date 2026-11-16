/**
 * routes/upload.js
 * -----------------
 * Defines the POST /upload endpoint.
 *
 * FLOW:
 *   1. Multer middleware validates the uploaded file (PDF only, max 10 MB).
 *   2. pdf-parse extracts text page by page using the pagerender callback.
 *      We track the current page number via a closure counter because
 *      pdf-parse calls the render function in page order (1, 2, 3...).
 *   3. We validate that there is extractable text (not a scanned image PDF).
 *   4. Each page's text is split into overlapping word chunks.
 *   5. Every chunk is embedded using the Gemini embedding model.
 *   6. All embedded chunks are stored in a shared in-memory array (documentStore).
 *   7. We return a summary { fileName, pages, chunks } to the client.
 */

const express = require("express");
const router = express.Router(); // Express mini-router — keeps route files tidy
const multer = require("multer");
const pdfParse = require("pdf-parse");

// Our utility functions
const { splitIntoChunks } = require("../utils/chunk");
const { embedChunks } = require("../utils/embed");

// documentStore is the shared in-memory "database".
// It's a plain JS array that lives in RAM.
const documentStore = require("../documentStore");

// ─── Multer Configuration ───────────────────────────────────────────────────
// multer handles multipart/form-data (file uploads).
// We use memoryStorage so the file is kept in RAM (Buffer) instead of disk.
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,

  // Limit the file size to 10 MB (10 * 1024 * 1024 bytes)
  limits: { fileSize: 10 * 1024 * 1024 },

  // fileFilter runs before the file is stored; we reject anything that isn't a PDF
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true); // accept the file
    } else {
      // Reject with a descriptive error — multer will pass this to our error handler
      cb(new Error("Only PDF files are accepted."), false);
    }
  },
});

// ─── POST /upload ────────────────────────────────────────────────────────────
// upload.single("file") is multer middleware that expects one file
// in the form field named "file".
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // If multer didn't attach a file, the user sent an empty request
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // ── Per-page text extraction ───────────────────────────────────────────
    // pdf-parse calls our pagerender function once per page, in order.
    // We use a simple counter to track which page we are on.
    // The counter starts at 0 and increments each time pagerender is called.
    const pageTexts = []; // will hold { text, page } for each page
    let pageCounter = 0;  // tracks the current page number (1-indexed)

    await pdfParse(req.file.buffer, {
      // pagerender is called once per page by pdf-parse, in page order.
      // pageData is the pdf.js page object; we call getTextContent() on it.
      pagerender: (pageData) => {
        pageCounter++; // increment before use so the first page = 1
        const currentPage = pageCounter; // capture in closure for the async callback

        return pageData
          .getTextContent()
          .then((textContent) => {
            // textContent.items is an array of text fragments on this page.
            // Each item has a `.str` property with the actual string.
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ")
              .replace(/\s+/g, " ") // collapse multiple spaces
              .trim();

            // Store this page's text along with its page number
            pageTexts.push({
              text: pageText,
              page: currentPage,
            });

            return pageText; // pdf-parse uses this return value to build its .text property
          });
      },
    });

    // ── Validate: check if any text was extracted ──────────────────────────
    const totalText = pageTexts.map((p) => p.text).join("").trim();
    if (!totalText) {
      return res.status(422).json({
        error:
          "No extractable text found. This PDF may be a scanned image. Please use a text-based PDF.",
      });
    }

    // ── Chunk the pages ────────────────────────────────────────────────────
    // Split each page's text into ~300-word chunks with ~50-word overlap
    const rawChunks = splitIntoChunks(pageTexts);

    // ── Embed every chunk ──────────────────────────────────────────────────
    // This calls the Gemini API once per chunk — may take several seconds
    const embeddedChunks = await embedChunks(rawChunks);

    // ── Store in memory ────────────────────────────────────────────────────
    // Clear any previously uploaded document first (we support one doc at a time)
    documentStore.chunks.length = 0; // empty the array in-place
    documentStore.fileName = req.file.originalname;

    // Push all new embedded chunks into the shared store
    embeddedChunks.forEach((chunk) => documentStore.chunks.push(chunk));

    // ── Respond ────────────────────────────────────────────────────────────
    return res.json({
      fileName: req.file.originalname,
      pages: pageTexts.length,
      chunks: embeddedChunks.length,
    });
  } catch (err) {
    // Catch unexpected errors (API failures, corrupted PDFs, etc.)
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ─── Multer Error Handler ────────────────────────────────────────────────────
// Multer throws its own error type for file-size and fileFilter rejections.
// We need a special 4-argument error middleware to catch them.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // e.g. file too large
    return res.status(400).json({ error: "Upload error: " + err.message });
  }
  if (err) {
    // e.g. wrong file type (from our fileFilter)
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
