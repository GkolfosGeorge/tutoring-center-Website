// pdf.js needs its worker file served as a plain static asset — copying it into
// public/ avoids relying on bundler-specific worker resolution (webpack vs Turbopack).
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("Copied pdf.worker.min.mjs to public/");
} else {
  console.warn("pdfjs-dist worker file not found, skipping copy:", src);
}
