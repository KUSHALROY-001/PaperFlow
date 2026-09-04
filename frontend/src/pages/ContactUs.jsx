import { useId, useState, useEffect } from "react";
import {
  Mail,
  Clock,
  HelpCircle,
  ChevronDown,
  Globe,
  Headphones,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const TARGET_EMAIL = "kushalroy235@gmail.com";

const CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "PDF Extraction & OCR Help" },
  { value: "ai", label: "AI Question Generation / Quality" },
  { value: "bug", label: "Report a Bug or Issue" },
  { value: "feature", label: "Feature Request / Feedback" },
  { value: "account", label: "Account & Workspace Settings" },
];

const FAQS = [
  {
    q: "Why is my PDF extraction job in queued status?",
    a: "Queued status means the background worker is picking up the job. If your worker process isn't active, starting it via `npm run worker` in the backend will immediately process all pending jobs.",
  },
  {
    q: "What PDF formats and sizes are supported?",
    a: "PaperFlow supports standard searchable and scanned PDF documents up to 25MB. Scanned papers are automatically processed through the built-in OCR pipeline.",
  },
  {
    q: "How do I share mock tests with students?",
    a: "You can publish a test to make it available to your workspace members, or use the 'Share' feature to generate a direct student session link.",
  },
  {
    q: "Can I manually crop or edit question diagrams?",
    a: "Yes! Open any question in the Question Editor - use the Diagram Crop & Upload controls to adjust bounds or replace images, and the Insert Image button in the text editor to place a diagram anywhere in the question, just like inserting an image in a word processor.",
  },
];

export default function ContactUs() {
  const uid = useId();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [lastGmailUrl, setLastGmailUrl] = useState("");

  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(TARGET_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const selectedCategory =
        CATEGORIES.find((c) => c.value === category)?.label ||
        "General Inquiry";

      const emailSubject = subject.trim()
        ? `[${selectedCategory}] ${subject.trim()}`
        : `[PaperFlow] ${selectedCategory} - from ${name.trim()}`;

      const emailBody = `Hello PaperFlow Support Team,

${message.trim()}

---
Sender Information:
• Name: ${name.trim()}
• Reply Email: ${email.trim()}
• Category: ${selectedCategory}
• Workspace User: ${user?.name ? `${user.name} (${user.email || ""})` : "Guest / Direct Contact"}
• Sent via: PaperFlow Web App (${new Date().toLocaleString()})`;

      // Native Gmail Web Compose URL ONLY - no mailto
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        TARGET_EMAIL,
      )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
        emailBody,
      )}`;

      setLastGmailUrl(gmailUrl);

      // Open Gmail in a new tab
      window.open(gmailUrl, "_blank");

      // crypto.getRandomValues() rather than Math.random() (javascript:S2245) -
      // Math.random() isn't cryptographically strong, so avoid it even for a
      // display-only ticket number.
      const ticketNumber = 100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
      const generatedId = `TKT-${ticketNumber}`;
      setTicketId(generatedId);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || "Failed to open Gmail. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubject("");
    setMessage("");
    setTicketId("");
    setErrorMessage("");
    setLastGmailUrl("");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl surface-card border border-border p-6 sm:p-10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-500/20">
            <Headphones className="w-3.5 h-3.5" /> Support &amp; Feedback
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            How can we help you?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
            Have questions about PDF extraction, AI generation, workspace
            management, or need custom assistance? Send us a message and our
            team will get back to you promptly.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Average response time: &lt; 24 hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Global 24/7 Monitoring</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column (7 cols) */}
        <div className="lg:col-span-7">
          <div className="surface-card rounded-3xl border border-border p-6 sm:p-8 shadow-xs">
            {isSubmitted ? (
              <div className="text-center py-6 sm:py-8 space-y-5">
                <div className="w-16 h-16 bg-orange-500/15 text-orange-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-500/10">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">
                    Gmail Compose Window Opened!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
                    We've opened a new tab with your inquiry pre-filled and
                    addressed to{" "}
                    <span className="font-semibold text-foreground">
                      {TARGET_EMAIL}
                    </span>
                    . Please switch to your Gmail tab and click{" "}
                    <strong className="text-foreground font-bold">Send</strong>{" "}
                    to deliver your message.
                  </p>
                </div>

                <div className="bg-muted/60 border border-border rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">
                      Reference ID
                    </span>
                    <span className="font-mono font-bold text-orange-500">
                      {ticketId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-muted-foreground font-semibold">
                      Sender
                    </span>
                    <span className="font-medium text-foreground truncate max-w-50">
                      {name} ({email})
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-muted-foreground font-semibold">
                      Recipient
                    </span>
                    <span className="font-medium text-foreground">
                      {TARGET_EMAIL}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                  {lastGmailUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(lastGmailUrl, "_blank")}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs sm:text-sm rounded-md transition-all shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" /> Re-open in Gmail
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-border bg-card hover:bg-muted text-foreground font-semibold rounded-md text-xs sm:text-sm transition-all"
                  >
                    Edit / Send Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Send a Message
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fill out the details below and it will open directly in
                    Gmail.
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${uid}-name`}
                      className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Your Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      id={`${uid}-name`}
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kushal Roy"
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${uid}-email`}
                      className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Email Address <span className="text-orange-500">*</span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`${uid}-category`}
                    className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Inquiry Topic
                  </label>
                  <select
                    id={`${uid}-category`}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`${uid}-subject`}
                    className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Subject
                  </label>
                  <input
                    id={`${uid}-subject`}
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your inquiry"
                    className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`${uid}-message`}
                      className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Message <span className="text-orange-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {message.length} characters
                    </span>
                  </div>
                  <textarea
                    id={`${uid}-message`}
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your query, issue, or feedback..."
                    className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm rounded-md shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Open in Gmail &amp; Send</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Info & FAQ Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Direct Support Card */}
          <div className="surface-card rounded-md border border-border p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-500" /> Direct Support
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Prefer writing directly from your email client? Reach our support
              desk anytime:
            </p>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/60 border border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">
                    {TARGET_EMAIL}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Direct Support Inbox
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                title="Copy Email"
                className="p-2 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                {copiedEmail ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
              <span className="font-semibold">PaperFlow Cloud v1.2</span>
            </div>
          </div>

          {/* FAQ Accordion Card */}
          <div className="surface-card rounded-md border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" /> Quick Answers
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground">
                FAQs
              </span>
            </div>

            <div className="space-y-2">
              {FAQS.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-border rounded-md overflow-hidden bg-card transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isExpanded ? null : index)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-foreground hover:text-orange-500 transition-colors gap-2"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-orange-500" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
