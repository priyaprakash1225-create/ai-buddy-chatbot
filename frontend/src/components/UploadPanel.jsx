/**
 * components/UploadPanel.jsx
 * ---------------------------
 * This component handles PDF file selection and uploading.
 *
 * PROPS:
 *   onUploadSuccess(data) — called when upload completes; passes { fileName, pages, chunks }
 *   onError(message)      — called when an error occurs
 *
 * STATE (managed here):
 *   selectedFile  — the File object the user picked
 *   isUploading   — boolean; true while the network request is in flight
 */

import React, { useState } from "react";

// Read the backend URL from the Vite environment variable
// This is set in frontend/.env as VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL;

function UploadPanel({ onUploadSuccess, onError }) {
  // Track which file the user has selected (but not yet uploaded)
  const [selectedFile, setSelectedFile] = useState(null);

  // Track whether the upload is in progress (to show a spinner)
  const [isUploading, setIsUploading] = useState(false);

  /**
   * handleFileChange
   * -----------------
   * Called when the user picks a file from the file dialog.
   * We store the file in state so we can display its name and upload it later.
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0]; // only one file is allowed
    if (file) {
      setSelectedFile(file);
      onError(null); // clear any previous error
    }
  };

  /**
   * handleUpload
   * -------------
   * Sends the selected PDF to POST /upload as a multipart/form-data request.
   * Uses the browser's built-in FormData API — no extra library needed.
   */
  const handleUpload = async () => {
    // Guard: user clicked Upload without selecting a file
    if (!selectedFile) {
      onError("Please select a PDF file first.");
      return;
    }

    setIsUploading(true); // show "Processing..." state
    onError(null);        // clear any previous error

    try {
      // Build a FormData object — this is how multipart/form-data works in browsers
      const formData = new FormData();
      formData.append("file", selectedFile); // "file" matches the multer field name in the backend

      // Send the POST request to the backend
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
        // Note: do NOT set Content-Type manually — the browser sets it automatically
        // for FormData so multer can parse the file boundary correctly
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend returned an error (e.g., scanned PDF, wrong file type)
        onError(data.error || "Upload failed.");
        return;
      }

      // Success! Tell the parent component about the uploaded document
      onUploadSuccess(data);
    } catch (err) {
      // Network error (backend not running, etc.)
      onError("Could not connect to the server. Is the backend running?");
    } finally {
      setIsUploading(false); // hide the spinner regardless of outcome
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-indigo-700">📄 Upload PDF</h2>

      {/* File picker input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-600">
          Select a PDF file (max 10 MB):
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0 file:text-sm file:font-semibold
                     file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200
                     cursor-pointer"
        />
        {/* Show the selected file name */}
        {selectedFile && (
          <p className="text-sm text-gray-500">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className={`py-2 px-6 rounded-xl text-white font-semibold transition-colors
          ${isUploading || !selectedFile
            ? "bg-indigo-300 cursor-not-allowed"   // disabled look
            : "bg-indigo-600 hover:bg-indigo-700"  // active look
          }`}
      >
        {/* Show different text while processing */}
        {isUploading ? "⏳ Processing..." : "Upload & Process"}
      </button>
    </div>
  );
}

export default UploadPanel;
