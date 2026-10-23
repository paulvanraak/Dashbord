// Builds the standalone home-screen app in /docs (served by GitHub Pages) from days-after/index.html.
import { readFileSync, writeFileSync } from "node:fs";

const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Days After">
<meta name="theme-color" content="#F4F7FB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#08111F" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;
const tail = `
<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});</script>
</body>
</html>
`;
writeFileSync(new URL("../docs/index.html", import.meta.url), head + page + tail);
writeFileSync(new URL("../docs/manifest.webmanifest", import.meta.url), JSON.stringify({
  name: "Days After", short_name: "Days After", start_url: "./", scope: "./", display: "standalone",
  background_color: "#F4F7FB", theme_color: "#1D55D8",
  icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }]
}, null, 2));
writeFileSync(new URL("../docs/sw.js", import.meta.url), `// Network first, so every push shows up on next open; cache is only an offline fallback.
const CACHE = "days-after";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
`);
console.log("built docs/");
