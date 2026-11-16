# 📚 EXPLAIN.md — AI Study Buddy: Everything You Need for Your Viva

---

## 1. Architecture in Simple Words

Imagine you have a very smart friend who can only answer questions about a book if you first read the relevant pages to them.

That is exactly what this app does:

1. You give it a PDF.
2. The app reads every page and breaks the text into small pieces called **chunks**.
3. It converts each chunk into a list of numbers (an **embedding**) that captures the chunk's *meaning*.
4. When you ask a question, the app converts your question into numbers too.
5. It compares your question's numbers against every chunk's numbers to find the most similar ones (**cosine similarity**).
6. It gives those top chunks to Gemini AI and says: "Answer the question using ONLY these pieces of text."
7. Gemini gives an answer, citing the pages the chunks came from.

This technique is called **RAG — Retrieval-Augmented Generation**.

```
  ┌────────────┐      PDF bytes      ┌──────────────┐
  │  Browser   │ ─────────────────▶  │  Express     │
  │ (React UI) │                     │  /upload     │
  └────────────┘                     └──────┬───────┘
                                            │ extract text per page
                                            ▼
                                     ┌──────────────┐
                                     │  chunk.js    │  split into ~300-word windows
                                     └──────┬───────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │  embed.js    │  call Gemini embedding API
                                     └──────┬───────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │documentStore │  store { text, page, embedding[] }
                                     └──────────────┘

  User types a question
        │
        ▼
  POST /ask  ──▶  embed question  ──▶  cosine similarity  ──▶  top 3 chunks
        │                                                           │
        │                                                           ▼
        │                                                    build prompt
        │                                                           │
        └──────────────────────────────────────────────────▶  Gemini /generateContent
                                                                    │
                                                                    ▼
                                                          { answer, sources: [pages] }
```

---

## 2. File-by-File Explanation

### Backend

| File | Purpose |
|------|---------|
| `server.js` | Creates the Express server. Loads `.env`, applies CORS and JSON middleware, mounts the four route files, starts listening on port 3001. |
| `documentStore.js` | A single exported JavaScript object `{ fileName, chunks: [] }`. Because Node.js caches `require()` calls, every route file that imports this gets the **same** object — this is our in-memory "database". |
| `routes/upload.js` | Receives the PDF via Multer, parses it with `pdf-parse` to get per-page text, calls `splitIntoChunks`, calls `embedChunks`, and stores everything in `documentStore`. |
| `routes/ask.js` | The RAG endpoint. Embeds the question, runs `getTopChunks` for the 3 nearest chunks, builds a grounded prompt, calls Gemini's text model, and returns `{ answer, sources }`. |
| `routes/summarize.js` | Concatenates all chunk texts and asks Gemini to produce a bullet-point summary. |
| `routes/quiz.js` | Asks Gemini to output 5 MCQs as a JSON array; strips any markdown fences; parses the JSON. |
| `utils/chunk.js` | `splitIntoChunks(pages, chunkSize=300, overlapSize=50)` — sliding-window word chunker. |
| `utils/embed.js` | `embedText(text)` calls `gemini-embedding-001`; `embedChunks(chunks)` loops over all chunks. |
| `utils/similarity.js` | Hand-written `dotProduct`, `magnitude`, `cosineSimilarity`, and `getTopChunks`. No external library. |

### Frontend

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component. Owns ALL state. Contains the four async handler functions (`handleAsk`, `handleUploadSuccess`, `handleSummarize`, `handleQuiz`). Passes data down as props. |
| `src/components/UploadPanel.jsx` | File `<input>`, file name display, upload button with "Processing..." state. Calls `POST /upload` with `FormData`. |
| `src/components/ChatPanel.jsx` | Scrollable message list with user (purple, right) and AI (grey, left) bubbles. Shows "Source: Page X" under AI answers. Auto-scrolls to the latest message. |
| `src/components/SummaryPanel.jsx` | Summarize button + result display area. |
| `src/components/QuizPanel.jsx` | Quiz button + renders 5 MCQs with show/hide answer toggles. |
| `src/main.jsx` | Mounts `<App>` into `<div id="root">`. |
| `src/index.css` | Three Tailwind `@tailwind` directives. |
| `vite.config.js` | Tells Vite to use the React plugin (for JSX). |
| `tailwind.config.js` | Tells Tailwind which files to scan for class names. |
| `.env` | Contains `VITE_API_URL=http://localhost:3001`. Variables prefixed `VITE_` are exposed to browser code by Vite. |

---

## 3. The RAG Flow — Step by Step

### Upload time (happens once per document)

```
Step 1  User selects a PDF and clicks "Upload & Process"
Step 2  Frontend sends the file as multipart/form-data to POST /upload
Step 3  Multer middleware unpacks the file into req.file.buffer (RAM)
Step 4  pdf-parse reads the buffer and calls the pagerender callback
         → pagerender collects the text of every page into pageTexts[]
Step 5  splitIntoChunks() slides a 300-word window across each page's text
         with 50-word overlap → produces rawChunks[]
Step 6  embedChunks() calls Gemini's embedding API once per chunk
         → each chunk becomes { text, page, embedding: number[] }
Step 7  documentStore.chunks is cleared and refilled with the new chunks
Step 8  Backend responds with { fileName, pages, chunks }
Step 9  Frontend shows the document info panel
```

### Query time (happens for each question)

```
Step 1  User types a question and presses "Ask"
Step 2  Frontend sends POST /ask with { question: "..." }
Step 3  embedText(question) calls Gemini embedding API
         → questionEmbedding: number[]
Step 4  getTopChunks() computes cosine similarity between questionEmbedding
         and every stored chunk's embedding → scores every chunk
Step 5  Top 3 chunks (highest similarity) are selected
Step 6  A prompt is built:
         "Answer ONLY using the context below..."
         [Context 1 — Page 3] ...chunk text...
         [Context 2 — Page 7] ...chunk text...
         [Context 3 — Page 3] ...chunk text...
         Question: <user's question>
Step 7  Gemini's text model (gemini-2.0-flash) generates an answer
Step 8  Backend extracts unique page numbers from top 3 chunks → sources
Step 9  Frontend receives { answer, sources: [3, 7] }
Step 10 ChatPanel displays the answer bubble + "📌 Source: Page 3, 7"
```

---

## 4. Why Chunking?

**Problem**: Embedding models have token limits. You cannot embed an entire 100-page document as one unit.

**Solution**: Break the document into small, manageable pieces.

**Why ~300 words?**
- Small enough to fit comfortably in an embedding model's window.
- Large enough to contain a complete thought or paragraph.
- Each chunk can be compared independently against a question.

**Why overlap (50 words)?**
- If a sentence falls exactly on the boundary of two chunks, it would be split and potentially lost.
- Repeating the last 50 words of chunk N at the start of chunk N+1 ensures no information is missed at boundaries.

```
Chunk 1:  |============================|
Chunk 2:              |============================|
                      ^ 50-word overlap
```

---

## 5. Why Embeddings?

Traditional keyword search fails when you ask "What is the capital of France?" and the document says "Paris is the seat of the French government." The word "capital" doesn't appear, so keyword search finds nothing.

Embeddings solve this by converting text into vectors where **meaning** determines proximity, not exact words. A model trained on billions of sentences learns that "capital" and "seat of government" are semantically close, so their vectors point in similar directions.

We use **gemini-embedding-001**, Google's free-tier embedding model, which produces a 768-dimensional vector for any input text.

---

## 6. Why Cosine Similarity?

We need a way to measure how similar two vectors are.

**Cosine similarity** measures the **angle** between two vectors, not their length:

$$\text{cos}(\theta) = \frac{\vec{A} \cdot \vec{B}}{|\vec{A}| \cdot |\vec{B}|}$$

- **Why angle, not distance?** Two texts can have different lengths (many words vs few words) which affects magnitude. The *direction* (angle) stays stable and purely reflects meaning.
- Score = **1.0** → same direction → very similar meaning
- Score = **0.0** → perpendicular → unrelated
- Score = **−1.0** → opposite → opposing meaning

We write this by hand in `utils/similarity.js` using three functions:
1. `dotProduct(a, b)` — sum of element-wise products
2. `magnitude(v)` — √(sum of squares)
3. `cosineSimilarity(a, b)` — dot product ÷ (magnitude A × magnitude B)

---

## 7. How Hallucination Is Controlled

Hallucination = when an AI makes up facts that aren't in its training data.

**We prevent this with two strategies:**

1. **Prompt engineering**: The system prompt explicitly says:
   > *"Answer ONLY using the context below. If the answer is not in the context, reply exactly: 'Not found in the document.'"*

2. **Context-only input**: We only send 3 retrieved chunks to Gemini — not the whole document, and not an open-ended question. Gemini is forced to work within that narrow context.

**Limitation**: Gemini is still a language model — it *could* still hallucinate if the retrieved chunks are ambiguous or if the model disobeys the instruction. The prompt reduces this risk but doesn't eliminate it entirely.

---

## 8. Limitations

| Limitation | Reason |
|------------|--------|
| Data lost on restart | In-memory storage — no database |
| One document at a time | Simple design for demo purposes |
| Scanned PDFs fail | pdf-parse can only extract text, not OCR images |
| Slow upload for large PDFs | Each chunk requires a separate API call to embed |
| Hallucination still possible | LLMs aren't perfectly obedient |
| No streaming | Gemini response is returned all at once |

---

## 9. Future Improvements

- **Vector database** (e.g., ChromaDB, Pinecone) for persistent, scalable storage
- **OCR** (e.g., Tesseract) for scanned PDFs
- **Streaming responses** using Gemini's streaming API for faster perceived responses
- **Multi-document support** with per-session stores
- **Re-ranker** to refine chunk selection after cosine similarity
- **Hybrid search** combining keyword (BM25) + semantic (cosine) search
- **User authentication** so each user has their own document
- **Source highlighting** — show exactly which sentence in the PDF was used

---

## 10. 15 Likely Viva Questions & Short Answers

**Q1. What is RAG?**
> RAG stands for Retrieval-Augmented Generation. Instead of asking an AI to answer from memory, you first retrieve relevant text from a document and then give that text to the AI as context. The AI generates an answer based only on the retrieved context.

**Q2. Why not just send the entire PDF to Gemini?**
> LLMs have a context window limit (maximum input size). Very large PDFs would exceed this limit. Also, sending less, more-targeted text leads to more accurate and faster answers.

**Q3. What is a vector embedding?**
> An embedding is a list of numbers (a vector) that represents the meaning of a piece of text. Similar texts have vectors that point in similar directions in a high-dimensional space.

**Q4. Why do we use the same embedding model for both chunks and questions?**
> Both must live in the same mathematical "space" for comparison to be meaningful. Using different models would produce incompatible vectors — like comparing miles and kilometers without converting.

**Q5. What is cosine similarity and why do we use it over Euclidean distance?**
> Cosine similarity measures the angle between two vectors. We use it because it's invariant to magnitude — a short summary and a long paragraph about the same topic can have the same angle even though their magnitudes differ. Euclidean distance would penalize length differences unfairly.

**Q6. What is the purpose of chunking overlap?**
> If a sentence falls on the boundary between two chunks, it gets split across both. Overlapping ensures the last 50 words of chunk N appear at the start of chunk N+1, so no sentence is ever completely lost.

**Q7. What is Multer and why do we need it?**
> Multer is Express middleware that parses `multipart/form-data` requests (which is how browsers send file uploads). Without it, Express cannot access the uploaded file from `req.file`.

**Q8. What is CORS and why is it needed here?**
> CORS (Cross-Origin Resource Sharing) is a browser security policy that blocks web pages from making requests to a different domain/port than the one that served the page. Since our React app (port 5173) calls the backend (port 3001), we need the backend to send CORS headers permitting this.

**Q9. How does the in-memory store work without a database?**
> Node.js caches `require()` calls — the same module object is returned to every file that imports it. So `documentStore.js` exports a plain object, and when any route file modifies `documentStore.chunks`, all other route files immediately see the updated array.

**Q10. How do you prevent the AI from using knowledge outside the document?**
> The prompt explicitly instructs Gemini: *"Answer ONLY using the context below. If the answer is not in the context, reply exactly: 'Not found in the document.'"* Only the retrieved chunks are provided as context, not the full document or any external knowledge.

**Q11. What is pdf-parse and what are its limitations?**
> `pdf-parse` is a Node.js library that extracts text from PDF files. Its main limitation is that it only works on text-based PDFs. If the PDF is a scanned image, it returns empty text because it can't perform OCR (optical character recognition).

**Q12. Why is the API key stored only in the backend .env?**
> The frontend runs in the user's browser — any code or variables in the frontend bundle are visible to anyone who opens developer tools. Storing the API key on the backend keeps it server-side where users cannot access it.

**Q13. What does `import.meta.env.VITE_API_URL` mean?**
> Vite (the frontend build tool) exposes environment variables prefixed with `VITE_` to the browser bundle. `import.meta.env` is Vite's equivalent of `process.env`. We use this to configure the backend URL without hardcoding it.

**Q14. What happens if the top 3 retrieved chunks don't contain the answer?**
> Gemini's prompt includes the instruction to reply *"Not found in the document."* The system is designed to respond honestly rather than hallucinate. That said, the user might also try rephrasing their question.

**Q15. What would you change to scale this to production?**
> (1) Use a vector database like ChromaDB or Pinecone instead of a plain array. (2) Add a proper database (PostgreSQL) for user accounts and document history. (3) Use a job queue for embedding (embedding can be slow). (4) Add streaming for faster perceived response times. (5) Deploy backend on a server (not localhost) with proper secrets management.
