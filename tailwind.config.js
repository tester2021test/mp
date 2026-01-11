/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tailwind v3 includes 'slate', 'cyan', 'violet' by default, 
      // so no extra color configuration is needed for the Cyber Encryptor code.
    },
  },
  plugins: [],
}
