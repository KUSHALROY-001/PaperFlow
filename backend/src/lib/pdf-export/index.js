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

  return withPdfExportPage(async (page) => {
    // waitUntil: "networkidle0" is what actually matters here - it holds
    // until every subresource this HTML pulls in (katex.min.css, its
    // @font-face files, every diagram <img>) has finished loading, not
    // just until the HTML itself parsed. KaTeX's own math markup is
    // already fully rendered server-side (see math-html.js) before this
    // ever reaches the browser, so there's no client-side rendering pass
    // to race against the way Plan 1 originally described - only real
    // network loads to wait for.
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    return page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }, // @page margin in the CSS handles this instead
    });
  });
}
