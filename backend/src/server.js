import "dotenv/config";
import dns from "node:dns";
import { createApp } from "./app.js";
import { closePdfExportBrowser } from "./lib/pdf-export/browser.js";

// Prevent IPv6 connection stalls and latency timeouts on cloud storage and external APIs
dns.setDefaultResultOrder("ipv4first");

const port = Number(process.env.PORT || 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`PaperFlow API listening on http://localhost:${port}`);
});

// Puppeteer's shared browser (src/lib/pdf-export/browser.js) is a real
// child OS process, not something Node's own process exit cleans up on
// its own. Without this, EVERY restart - and under `npm run dev` (node
// --watch) that's every file save during normal development - abandons
// the previous Chrome process as an orphan instead of closing it, since
// nothing was ever calling the exported closePdfExportBrowser(). Those
// orphans pile up across a dev session and are a likely contributor to
// PDF export intermittently failing with "Connection closed" - not
// because THIS request's browser died, but because system resources
// (memory/handles) were being eaten by however many old Chrome processes
// had already piled up un-closed by that point.
//
// `node --watch` sends SIGTERM to the running process before respawning
// on a change, so listening for it here is what actually makes this run
// on every dev-mode restart, not just on a manual Ctrl+C.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  await closePdfExportBrowser();
  server.close(() => process.exit(0));
  // Force-exit if something (an open keep-alive connection, etc.) keeps
  // the server from closing gracefully within a reasonable window.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
