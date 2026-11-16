/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind to scan these files for class names
  // so it only includes the CSS classes we actually use
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {}, // add custom colors/fonts/etc. here if needed later
  },
  plugins: [],
}
