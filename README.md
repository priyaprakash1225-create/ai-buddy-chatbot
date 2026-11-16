# 🎓 AI Study Buddy

A full-stack RAG (Retrieval-Augmented Generation) application that lets you upload a PDF and chat with it. All answers come **only** from your document, with page-number citations.

---

## 📁 Project Structure

```
ai-study-buddy/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── documentStore.js       # In-memory chunk storage
│   ├── package.json
│   ├── .env.example           # Copy to .env and fill in your key
│   ├── routes/
│   │   ├── upload.js          # POST /upload
│   │   ├── ask.js             # POST /ask  (RAG pipeline)
│   │   ├── summarize.js       # POST /summarize
│   │   └── quiz.js            # POST /quiz
│   └── utils/
│       ├── chunk.js           # Word-window chunking with overlap
│       ├── embed.js           # Gemini embedding API calls
│       └── similarity.js      # Hand-written cosine similarity
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env                   # VITE_API_URL=http://localhost:3001
    └── src/
        ├── main.jsx
        ├── App.jsx            # Root component, all state lives here
        ├── index.css
        └── components/
            ├── UploadPanel.jsx
            ├── ChatPanel.jsx
            ├── SummaryPanel.jsx
            └── QuizPanel.jsx
```

---

## 🚀 Setup & Running Locally

### Prerequisites
- Node.js 18+ installed
- A Google Gemini API key (free) from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Step 1 — Set up the Backend

```bash
# Navigate to the backend folder
cd backend

# Install dependencies
npm install

# Create your .env file from the template
copy .env.example .env
```

Open `backend/.env` and add your API key:
```
GEMINI_API_KEY=your_actual_key_here
PORT=3001
```

---

### Step 2 — Set up the Frontend

```bash
# Navigate to the frontend folder
cd ../frontend

# Install dependencies
npm install
```

The `frontend/.env` file is already configured with:
```
VITE_API_URL=http://localhost:3001
```
You don't need to change this unless your backend runs on a different port.

---

### Step 3 — Run Both Servers

Open **two separate terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
# Server starts at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

---

## 🔑 Environment Variables

| Variable | Location | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `backend/.env` | ✅ Yes | Your Google Gemini API key |
| `PORT` | `backend/.env` | ❌ No (default: 3001) | Backend port |
| `VITE_API_URL` | `frontend/.env` | ✅ Yes | Backend URL for the browser |

> ⚠️ **Never** put your `GEMINI_API_KEY` in the frontend or commit `.env` to git.

---

## 🔌 API Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/upload` | `multipart/form-data` file field `"file"` | Upload & process a PDF |
| POST | `/ask` | `{ "question": "..." }` | Ask a question (RAG) |
| POST | `/summarize` | *(empty)* | Summarize the document |
| POST | `/quiz` | *(empty)* | Generate 5 MCQs |
| GET | `/` | — | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Multer, pdf-parse |
| AI | Google Gemini API (`@google/genai`) |
| Text model | `gemini-2.0-flash` |
| Embedding model | `gemini-embedding-001` |
| Storage | In-memory JS array (no database) |
