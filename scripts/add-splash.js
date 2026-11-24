/**
 * add-splash.js — injects a branded "PIXEL JUMPER" loading splash into the
 * exported dist/index.html. It lives inside #root, so React replaces it
 * automatically once the game bundle boots. Idempotent.
 */

const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "dist", "index.html");
let html = fs.readFileSync(file, "utf8");

if (html.includes("boot-splash")) {
  console.log("boot splash already present, skipping");
  process.exit(0);
}

const css = `<style id="boot-splash-css">
html,body{margin:0;padding:0;background:#0b0e12}
#boot-splash{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0e12;font-family:monospace}
#boot-splash .bs-title{color:#ffd94d;font-size:clamp(28px,8vw,64px);font-weight:bold;letter-spacing:.08em;text-shadow:0 0 24px rgba(255,217,77,.35)}
#boot-splash .bs-sub{color:#9adcff;font-size:16px;margin-top:18px;animation:bs-pulse 1.2s ease-in-out infinite}
@keyframes bs-pulse{0%,100%{opacity:.35}50%{opacity:1}}
</style>`;

const splash =
  '<div id="boot-splash"><div class="bs-title">PIXEL JUMPER</div>' +
  '<div class="bs-sub">Загрузка…</div></div>';

if (!html.includes('<div id="root"></div>')) {
  console.error("root div not found in dist/index.html");
  process.exit(1);
}

html = html
  .replace("</head>", `${css}\n</head>`)
  .replace('<div id="root"></div>', `<div id="root">${splash}</div>`);

fs.writeFileSync(file, html);
console.log("boot splash injected into dist/index.html");
