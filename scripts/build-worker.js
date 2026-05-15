const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "dist", "public");
const workerDir = path.join(root, "worker");

const staticEntries = [
  "index.html",
  "styles.css",
  "script.js",
  "demo-widget.html",
  "assets/flamy.png",
  "widget/flamy-widget.js"
];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(workerDir, { recursive: true });

for (const entry of staticEntries) {
  const source = path.join(root, entry);
  const target = path.join(publicDir, entry);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const knowledge = fs.readFileSync(path.join(root, "knowledge", "cmc.md"), "utf8");
fs.writeFileSync(
  path.join(workerDir, "generated-knowledge.js"),
  `export const localKnowledge = ${JSON.stringify(knowledge)};\n`
);

console.log("Cloudflare Worker assets prepared in dist/public.");
