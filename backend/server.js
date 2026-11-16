/**
 * server.js
 * ----------
 * The main entry point for the AI Study Buddy backend.
 *
 * This file:
 *   1. Loads environment variables from .env
 *   2. Creates an Express app
 *   3. Applies middleware (CORS, JSON parsing)
 *   4. Mounts route handlers for /upload, /ask, /summarize, /quiz
 *   5. Starts the HTTP server
 *
 * WHAT IS EXPRESS?
 * ----------------
 * Express is a lightweight Node.js framework for building web servers.
 * It lets you define "routes" — URL patterns paired with handler functions.
 *
 * WHAT IS CORS?
 * -------------
 * CORS (Cross-Origin Resource Sharing) is a browser security policy.
 * Since our frontend (port 5173) and backend (port 3001) run on different
 * ports, the browser will block requests unless the server explicitly says
 * "I allow requests from other origins." The 'cors' package does this.
 */

// ─── Load environment variables ───────────────────────────────────────────────
// dotenv reads the .env file and puts each key into process.env
// This MUST come before any code that uses process.env.GEMINI_API_KEY
require("dotenv").config();

// ─── Import dependencies ──────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");

// Import our route handler modules
const uploadRoute = require("./routes/upload");
const askRoute = require("./routes/ask");
const summarizeRoute = require("./routes/summarize");
const quizRoute = require("./routes/quiz");

// ─── Create Express app ───────────────────────────────────────────────────────
const app = express();

// The port the backend server will listen on
// We read from .env so it's easy to change; default to 3001
const PORT = process.env.PORT || 3001;

// ─── Apply Middleware ─────────────────────────────────────────────────────────

// cors() allows our React frontend to call this server from a different port
app.use(cors());

// express.json() parses incoming requests with a JSON body (e.g., POST /ask)
// Without this, req.body would be undefined for JSON requests
app.use(express.json());

// ─── Mount Routes ─────────────────────────────────────────────────────────────
// When a request comes in for /upload, hand it to the uploadRoute handler
app.use("/upload", uploadRoute);

// When a request comes in for /ask, hand it to the askRoute handler
app.use("/ask", askRoute);

// Summary and quiz bonus endpoints
app.use("/summarize", summarizeRoute);
app.use("/quiz", quizRoute);

// ─── Root health-check ────────────────────────────────────────────────────────
// A simple GET / so you can test the server is running in a browser
app.get("/", (req, res) => {
  res.json({ status: "AI Study Buddy backend is running!" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// This catches any errors that bubble up and weren't handled by a route.
// A 4-argument function signature tells Express this is an error-handling middleware.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error: " + err.message });
});

// ─── Start the server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ AI Study Buddy backend running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set in .env!");
  }
});
