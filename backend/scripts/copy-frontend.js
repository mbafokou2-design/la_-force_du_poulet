const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "..", "..", "frontend");
const targetDir = path.resolve(__dirname, "..", "public", "site");

function copyDir(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Frontend source not found: ${source}`);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

try {
  const targetIndex = path.join(targetDir, "index.html");
  if (fs.existsSync(targetIndex)) {
    console.log(`[copy-frontend] Frontend already present at ${targetDir}`);
    process.exit(0);
  }

  copyDir(sourceDir, targetDir);
  console.log(`[copy-frontend] Copied ${sourceDir} -> ${targetDir}`);
} catch (err) {
  console.error("[copy-frontend] Failed to copy frontend:", err.message);
  process.exit(1);
}
