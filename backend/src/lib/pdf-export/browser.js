import puppeteer from "puppeteer";

// Shared browser instance, launched lazily on first export and kept alive for
// the life of the Node process.
let browserPromise = null;

function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (!b || !b.connected) {
        browserPromise = null;
      }
    } catch {
      browserPromise = null;
    }
  }

  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

function isConnectionLostError(error) {
  // Puppeteer's Connection class rejects every pending CDP command with an
  // error like this when the WebSocket to Chrome drops mid-flight - the
  // browser crashed, got OOM-killed, or (common on a Windows dev machine)
  // the laptop slept and took the child Chrome process's pipe down with
  // it. This is distinct from a launch failure (missing Chrome binary,
  // etc.), which throws a different, more specific message and should NOT
  // be silently retried into an infinite loop.
  const message = String(error?.message || error || "");
  return (
    message.includes("Connection closed") ||
    message.includes("Target closed") ||
    message.includes("Session closed") ||
    message.includes("Protocol error")
  );
}

// Runs `callback` with a fresh page from the shared browser, closing the
// page afterward regardless of success/failure so a failed export never
// leaks pages across requests. If the browser dies partway through
// `callback` (see isConnectionLostError above), retries ONCE against a
// freshly launched browser rather than surfacing a bare "Connection
// closed" straight to the user for what's usually a one-off flake - a
// second failure in a row still throws normally rather than looping.
async function runExportAttempt(callback, isRetry) {
  let browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
  } catch {
    // If the browser was closed/disconnected, reset cached instance and launch fresh
    if (isRetry) throw new Error("Connection closed");
    browserPromise = null;
    browser = await getBrowser();
    page = await browser.newPage();
  }

  try {
    return await callback(page);
  } catch (error) {
    if (!isRetry && isConnectionLostError(error)) {
      browserPromise = null;
      return runExportAttempt(callback, true);
    }
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore page close error - already gone if the browser itself died
      }
    }
  }
}

export function withPdfExportPage(callback) {
  return runExportAttempt(callback, false);
}

export async function closePdfExportBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch {
      // Ignore error
    }
    browserPromise = null;
  }
}
