import dns from "node:dns";
import https from "node:https";
import { Router } from "express";

// TEMPORARY - for isolating a specific bug, remove once resolved (see the
// PaperFlow worker "stuck in queued" investigation). Render's free web
// services have no Shell/SSH access at all (confirmed: paid-plan-only
// feature), so there's no way to run `nslookup` or `curl -v` FROM INSIDE
// this container through Render's dashboard. This route does the
// equivalent from inside the actual running Node process instead - same
// container, same outbound network path the real kickWorker() calls
// already use - and returns the result as plain JSON any browser can
// hit, no shell needed.
//
// Gated by the same WORKER_TRIGGER_SECRET already used elsewhere (not
// requireAuth) specifically so it can be opened directly in a browser
// tab by pasting the URL with ?token=..., the simplest thing to ask for
// mid-investigation - this is not meant to stay in the codebase long
// term.
export const debugRouter = Router();

const WORKER_TRIGGER_SECRET = (process.env.WORKER_TRIGGER_SECRET || "").trim();
const WORKER_SERVICE_URL = (process.env.WORKER_SERVICE_URL || "")
  .trim()
  .replace(/\/+$/, "");

function lookupHost(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, { all: true }, (error, addresses) => {
      if (error) {
        resolve({ error: error.message });
        return;
      }
      resolve({ addresses });
    });
  });
}

function requestOnce(targetUrl, { userAgent } = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const startedAt = Date.now();
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: userAgent ? { "User-Agent": userAgent, Accept: "*/*" } : {},
        timeout: 20_000,
      },
      (res) => {
        // Record which actual IP this connection went to - the whole
        // point of this diagnostic - not just the DNS answer, in case
        // Node's own connection pooling/resolution takes a different
        // path than dns.lookup() alone would predict.
        const remoteAddress = res.socket?.remoteAddress || null;
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            remoteAddress,
            elapsedMs: Date.now() - startedAt,
            bodyPreview: body.slice(0, 200),
          });
        });
        res.on("error", (error) => resolve({ error: error.message }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timed out after 20s")));
    req.on("error", (error) =>
      resolve({ error: error.message, elapsedMs: Date.now() - startedAt }),
    );
    req.end();
  });
}

debugRouter.get("/debug/worker-network-check", async (req, res) => {
  if (!WORKER_TRIGGER_SECRET || req.query.token !== WORKER_TRIGGER_SECRET) {
    res.status(403).json({ error: "invalid or missing token" });
    return;
  }

  if (!WORKER_SERVICE_URL) {
    res.status(500).json({ error: "WORKER_SERVICE_URL is not configured" });
    return;
  }

  const workerHost = new URL(WORKER_SERVICE_URL).hostname;

  const [dnsResult, plainRequest, curlLikeRequest] = await Promise.all([
    lookupHost(workerHost),
    requestOnce(`https://${workerHost}/`),
    requestOnce(`https://${workerHost}/`, { userAgent: "curl/8.5.0" }),
  ]);

  res.json({
    resolvedFrom: "inside the Node backend's own Render container",
    workerHostname: workerHost,
    dns: dnsResult,
    requestWithNodeDefaultHeaders: plainRequest,
    requestWithCurlLikeHeaders: curlLikeRequest,
    note:
      "Compare 'addresses'/'remoteAddress' here against running " +
      "'nslookup " +
      workerHost +
      "' from your own PC's Command Prompt. Different IPs would mean " +
      "this backend's outbound traffic takes a different network path " +
      "than your PC's ever does.",
  });
});
