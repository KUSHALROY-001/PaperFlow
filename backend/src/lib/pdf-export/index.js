import { withPdfExportPage } from "./browser.js";
import { renderMockTestHtml } from "./render-html.js";

// baseUrl must be an address Puppeteer's OWN browser process can reach
// over real HTTP - it's a separate process from the Express server
// handling this request, not the same in-process call the rest of the
// backend makes to itself. Defaults to loopback rather than a public
// hostname/DNS entry, since the browser and the API it's fetching
// diagrams/katex.min.css from always run on the same host here.
export async function renderMockTestPdf({ mockTest, questions, baseUrl }) {
  const html = renderMockTestHtml({ mockTest, questions, baseUrl });

  // TEMP DIAGNOSTIC - the networkidle0 timeout for a 200-question export
  // showed zero network activity after t+5193ms (all 4 subresources -
  // katex.min.css + 3 fonts - finished, no diagram requests at all in
  // this particular test), yet the timeout still fired at 360000ms. That
  // rules out network load as the cause here - Puppeteer was waiting on
  // the page's own `load` lifecycle event, which never fired, with
  // nothing left to fetch. The size of the generated HTML is the one
  // variable known to differ hugely between the passing 64-question case
  // and the failing 200-question one (KaTeX's server-rendered markup is
  // verbose - many nested spans per equation), so logging it directly
  // ties a concrete number to "how much bigger is the failing document."
  console.info(
    `[pdf-export] generated HTML is ${html.length} bytes for ${questions.length} questions`,
  );

  return withPdfExportPage(async (page) => {
    // TEMP DIAGNOSTIC - remove once the networkidle0 timeout investigation
    // is done. Logs every subresource this HTML actually triggers (katex
    // CSS/fonts, each diagram's redirect-to-Cloudinary hop) with timing,
    // so a slow/failing export tells us exactly which request(s) never
    // finished within the window instead of us guessing at a bigger
    // number blind. Visible in Render's normal Logs tab - no extra
    // access needed.
    const startedAt = Date.now();
    const pending = new Set();
    page.on("request", (req) => {
      pending.add(req.url());
      console.info(
        `[pdf-export] -> ${req.method()} ${req.url()} (t+${Date.now() - startedAt}ms, ${pending.size} pending)`,
      );
    });
    page.on("requestfinished", (req) => {
      pending.delete(req.url());
      const res = req.response();
      console.info(
        `[pdf-export] <- ${res?.status()} ${req.url()} (t+${Date.now() - startedAt}ms, ${pending.size} pending)`,
      );
    });
    page.on("requestfailed", (req) => {
      pending.delete(req.url());
      console.warn(
        `[pdf-export] X  ${req.url()} failed: ${req.failure()?.errorText} (t+${Date.now() - startedAt}ms, ${pending.size} pending)`,
      );
    });

    // TEMP DIAGNOSTIC - these three are the ones that would confirm/rule
    // out "Chrome's renderer is actually crashing or erroring", as
    // distinct from "still legitimately busy laying out a huge DOM".
    // Puppeteer's Page 'error' event fires specifically when the
    // renderer process itself crashes/dies (the OOM-kill case) - a plain
    // slow-layout case would NOT fire this at all and would just keep
    // running past whatever timeout is set instead.
    page.on("error", (err) => {
      console.error(
        `[pdf-export] PAGE CRASHED (t+${Date.now() - startedAt}ms): ${err.message}`,
      );
    });
    page.on("pageerror", (err) => {
      console.error(
        `[pdf-export] in-page JS error (t+${Date.now() - startedAt}ms): ${err.message}`,
      );
    });
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.warn(
          `[pdf-export] page console.${msg.type()} (t+${Date.now() - startedAt}ms): ${msg.text()}`,
        );
      }
    });

    // waitUntil: "networkidle0" is what actually matters here - it holds
    // until every subresource this HTML pulls in (katex.min.css, its
    // @font-face files, every diagram <img>) has finished loading, not
    // just until the HTML itself parsed. KaTeX's own math markup is
    // already fully rendered server-side (see math-html.js) before this
    // ever reaches the browser, so there's no client-side rendering pass
    // to race against the way Plan 1 originally described - only real
    // network loads to wait for.
    //
    // Raised from 30000 to 120000 as an immediate stopgap (see
    // docs/engineering-log/DEBUG_LOG.md, pdf-export timeout investigation):
    // every diagram <img> round-trips through this same Node process via
    // a 302 redirect to Cloudinary before the real image loads, and on
    // Render's free tier that chain, multiplied across every diagram in
    // a test, was plausibly just outrunning 30s under load - not
    // confirmed root cause yet, the logging above is what will confirm
    // it on the next real export.
    // UPDATE: for a 200-question export, the [pdf-export] request log
    // showed all network activity finishing by t+5193ms (0 pending) with
    // no diagram requests at all in that test, yet the export still hit
    // the full timeout with nothing further logged - meaning this is NOT
    // a network-load problem for that case. Raised to 360000 (6 min) as
    // a stopgap while diagnosing what page 'load' is actually waiting on;
    // the listeners above are what will confirm whether it's an outright
    // crash (OOM) vs. just very slow layout of a large generated DOM.
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 360000 });

    if (pending.size > 0) {
      console.warn(
        `[pdf-export] setContent resolved with ${pending.size} still-pending request(s): ${[...pending].join(", ")}`,
      );
    }

    return page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }, // @page margin in the CSS handles this instead
    });
  });
}
