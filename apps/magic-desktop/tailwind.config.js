import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const extend = require("./src/theme/tailwind-extend.json");

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend },
};
