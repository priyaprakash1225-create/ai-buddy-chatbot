/**
 * main.jsx
 * ---------
 * This is the JavaScript entry point for the React app.
 * It mounts the <App /> component into the <div id="root"> in index.html.
 *
 * React.StrictMode wraps the app to surface potential problems during development
 * (like deprecated APIs or unexpected side effects). It doesn't affect production.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Load Tailwind CSS globally

// Find the <div id="root"> in index.html and render our App into it
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
