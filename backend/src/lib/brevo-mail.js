// Sends transactional email through Brevo's REST API (no SDK dependency -
// just fetch, same "no new package for a single HTTP call" reasoning as
// google-oauth.js reaches for the official client only because token
// verification genuinely needs it). Same "warn in dev, throw in
// production" pattern as google-oauth.js's GOOGLE_CLIENT_ID check below.
const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || "PaperFlow";

if (!apiKey || !senderEmail) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BREVO_API_KEY and BREVO_SENDER_EMAIL are required in production",
    );
  }
  console.warn(
    "[brevo-mail] BREVO_API_KEY/BREVO_SENDER_EMAIL are not set. Verification emails will fail until they're configured.",
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOtpEmail({ name, otp }) {
  const safeName = escapeHtml(name);
  const subject = "Your PaperFlow verification code";

  const textContent = [
    `Hello ${name},`,
    "",
    "Your PaperFlow verification code is:",
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "",
    "If you didn't create a PaperFlow account, you can safely ignore this email.",
  ].join("\n");

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="font-size: 18px; margin-bottom: 16px;">Your PaperFlow verification code</h2>
      <p style="font-size: 14px; margin-bottom: 8px;">Hello ${safeName},</p>
      <p style="font-size: 14px; margin-bottom: 8px;">Your PaperFlow verification code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 20px 0; text-align: center;">
        ${otp}
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">This code expires in 10 minutes.</p>
      <p style="font-size: 13px; color: #6b7280;">
        If you didn't create a PaperFlow account, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, textContent, htmlContent };
}

// Throws on any non-2xx response rather than swallowing failures - callers
// (auth.service.js) rely on this to roll back signup / surface a 502 to
// the person, the same "don't silently pretend it worked" reasoning as
// uploadAvatarBuffer's Cloudinary error handling.
export async function sendOtpEmail({ to, name, otp }) {
  const { subject, textContent, htmlContent } = buildOtpEmail({ name, otp });

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, name }],
      subject,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo send failed (${response.status}): ${body}`);
  }
}
