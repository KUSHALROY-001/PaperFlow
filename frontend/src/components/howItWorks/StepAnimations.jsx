// ─────────────────────────────────────────────────────────────────────────────
// StepAnimations.jsx  –  animations for steps 2, 3, 4 of "How It Works"
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Download, Eye } from "lucide-react";

const EXPO = [0.16, 1, 0.3, 1];

// ── Shared: small AI star ────────────────────────────────────────────────────
function AIStarSVG({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 14 8.5 20 11C14 13.5 12 20 12 20C12 20 10 13.5 4 11C10 8.5 12 2 12 2Z"
        fill={color}
      />
      <path
        d="M5 4C5 4 6 7 8.5 8C6 9 5 12 5 12C5 12 4 9 1.5 8C4 7 5 4 5 4Z"
        fill={color}
        opacity="0.55"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STEP 2 — OCR Correction
//  Loop: garbled text → beam sweeps → clean structured text (4.5s)
// ═══════════════════════════════════════════════════════════════════════════════
const OCR_SCENES = [900, 1800, 1800];

const GARBLED = [
  "Qu3s7ion 14) Wh1ch d@ta s+ructur3",
  "f0ll0ws L1F0 0rder!ng?",
  "A) Qu3u3  B) Sta|k",
  "C) Arr@y  D) H3@p",
  "@nsw3r: B",
];
const CLEAN = [
  "Question 14) Which data structure",
  "follows LIFO ordering?",
  "A) Queue  B) Stack ✓",
  "C) Array  D) Heap",
  "Answer: B",
];

export function OCRAnimation() {
  const [scene, setScene] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const t = useRef(null);

  useEffect(() => {
    t.current = setTimeout(() => {
      const next = scene + 1;
      if (next >= OCR_SCENES.length) {
        setTimeout(() => {
          setScene(0);
          setLoopKey((k) => k + 1);
        }, 600);
      } else setScene(next);
    }, OCR_SCENES[scene]);
    return () => clearTimeout(t.current);
  }, [scene]);

  return (
    <div
      key={loopKey}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        userSelect: "none",
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "8px",
              background: "rgba(59,130,246,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AIStarSVG size={13} color="rgb(59,130,246)" />
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            OCR Correction
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={scene}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginLeft: "auto",
                fontSize: "8px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "100px",
                background:
                  scene === 0
                    ? "rgba(239,68,68,0.1)"
                    : scene === 1
                      ? "rgba(234,88,12,0.1)"
                      : "rgba(34,197,94,0.1)",
                color:
                  scene === 0
                    ? "rgb(239,68,68)"
                    : scene === 1
                      ? "#ea580c"
                      : "rgb(34,197,94)",
                border: `1px solid ${scene === 0 ? "rgba(239,68,68,0.3)" : scene === 1 ? "rgba(234,88,12,0.3)" : "rgba(34,197,94,0.3)"}`,
              }}
            >
              {scene === 0
                ? "Raw OCR"
                : scene === 1
                  ? "Correcting…"
                  : "Cleaned ✓"}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Split panel: garbled | clean */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            position: "relative",
          }}
        >
          {/* Left: raw garbled */}
          <div
            style={{
              padding: "12px 10px 12px 12px",
              borderRight: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "7px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "rgb(239,68,68)",
                marginBottom: "8px",
              }}
            >
              Raw OCR
            </div>
            {GARBLED.map((line, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: scene === 2 ? 0.3 : 0.85,
                  filter: scene === 2 ? "blur(1.5px)" : "none",
                }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                style={{
                  fontSize: "7.5px",
                  fontFamily: "monospace",
                  color: "rgb(239,68,68)",
                  lineHeight: 1.7,
                }}
              >
                {line}
              </motion.div>
            ))}
          </div>

          {/* Right: clean output */}
          <div style={{ padding: "12px 12px 12px 10px" }}>
            <div
              style={{
                fontSize: "7px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "rgb(34,197,94)",
                marginBottom: "8px",
              }}
            >
              Corrected
            </div>
            <AnimatePresence>
              {scene >= 1 &&
                CLEAN.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{
                      delay: 0.2 + i * 0.18,
                      duration: 0.4,
                      ease: EXPO,
                    }}
                    style={{
                      fontSize: "7.5px",
                      fontFamily: "monospace",
                      color: line.includes("✓")
                        ? "rgb(34,197,94)"
                        : "var(--foreground)",
                      fontWeight: line.includes("✓") ? 700 : 400,
                      lineHeight: 1.7,
                    }}
                  >
                    {line}
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {/* Correction beam (scene 1) */}
          <AnimatePresence>
            {scene === 1 && (
              <motion.div
                key="beam"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "3px",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(234,88,12,0.8) 30%, rgba(234,88,12,1) 50%, rgba(234,88,12,0.8) 70%, transparent)",
                  boxShadow: "0 0 14px 4px rgba(234,88,12,0.4)",
                  zIndex: 10,
                }}
                initial={{ left: "0%" }}
                animate={{ left: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "linear" }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STEP 3 — Extract Questions
//  Loop: cleaned doc → Q boxes highlight one by one → count badge (5s)
// ═══════════════════════════════════════════════════════════════════════════════
const EXTRACT_SCENES = [800, 2400, 1800];

const QUESTIONS_DATA = [
  {
    num: "Q14",
    text: "Which data structure follows LIFO?",
    topic: "DS",
    conf: 97,
  },
  {
    num: "Q15",
    text: "What is the time complexity of binary search?",
    topic: "Algo",
    conf: 94,
  },
  {
    num: "Q16",
    text: "Define recursion with an example.",
    topic: "CS",
    conf: 91,
  },
];

export function ExtractAnimation() {
  const [scene, setScene] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const t = useRef(null);

  useEffect(() => {
    t.current = setTimeout(() => {
      const next = scene + 1;
      if (next >= EXTRACT_SCENES.length) {
        setTimeout(() => {
          setScene(0);
          setLoopKey((k) => k + 1);
        }, 600);
      } else setScene(next);
    }, EXTRACT_SCENES[scene]);
    return () => clearTimeout(t.current);
  }, [scene]);

  return (
    <div
      key={loopKey}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        userSelect: "none",
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "8px",
              background: "rgba(168,85,247,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AIStarSVG size={13} color="rgb(168,85,247)" />
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Extract Questions
          </span>
          <AnimatePresence mode="wait">
            {scene >= 2 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "8px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "100px",
                  background: "rgba(168,85,247,0.1)",
                  color: "rgb(168,85,247)",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                {QUESTIONS_DATA.length} MCQs found ✦
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content: extracted question cards */}
        <div
          style={{
            flex: 1,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "7.5px",
              fontWeight: 700,
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "2px",
            }}
          >
            {scene === 0
              ? "Scanning document…"
              : scene === 1
                ? "Extracting questions…"
                : "Extraction complete"}
          </div>
          {QUESTIONS_DATA.map((q, i) => (
            <AnimatePresence key={i}>
              {scene >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.38, duration: 0.4, ease: EXPO }}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Highlight sweep */}
                  <motion.div
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: [0, 1, 0] }}
                    transition={{ delay: i * 0.38, duration: 0.55, ease: EXPO }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(168,85,247,0.08)",
                      borderRadius: "10px",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "7px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "7.5px",
                        fontWeight: 800,
                        padding: "2px 5px",
                        borderRadius: "6px",
                        background: "rgba(168,85,247,0.1)",
                        color: "rgb(168,85,247)",
                        flexShrink: 0,
                      }}
                    >
                      {q.num}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 600,
                          color: "var(--foreground)",
                          lineHeight: 1.4,
                        }}
                      >
                        {q.text}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          marginTop: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "7px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "var(--muted)",
                            color: "var(--muted-foreground)",
                            fontWeight: 600,
                          }}
                        >
                          {q.topic}
                        </span>
                        <span
                          style={{
                            fontSize: "7px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(34,197,94,0.1)",
                            color: "rgb(34,197,94)",
                            fontWeight: 700,
                          }}
                        >
                          {q.conf}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ))}

          {/* Idle scanning dots */}
          {scene === 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {[80, 60, 70].map((w, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    height: "28px",
                    borderRadius: "10px",
                    background: "var(--muted)",
                    width: `${w}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STEP 4 — Review & Export
//  Loop: question list → approve checkmarks → download pulse → done (5s)
// ═══════════════════════════════════════════════════════════════════════════════
const EXPORT_SCENES = [800, 2000, 1600, 800];

const REVIEW_QUESTIONS = [
  { text: "Which data structure follows LIFO ordering?", status: "approved" },
  { text: "What is time complexity of binary search?", status: "approved" },
  { text: "Define recursion with an example.", status: "review" },
  { text: "What is a hash collision?", status: "approved" },
];

export function ExportAnimation() {
  const [scene, setScene] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const t = useRef(null);

  useEffect(() => {
    t.current = setTimeout(() => {
      const next = scene + 1;
      if (next >= EXPORT_SCENES.length) {
        setTimeout(() => {
          setScene(0);
          setLoopKey((k) => k + 1);
        }, 600);
      } else setScene(next);
    }, EXPORT_SCENES[scene]);
    return () => clearTimeout(t.current);
  }, [scene]);

  return (
    <div
      key={loopKey}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        userSelect: "none",
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "8px",
              background: "rgba(34,197,94,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Eye size={12} style={{ color: "rgb(34,197,94)" }} />
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Review &amp; Export
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "100px",
                background: "rgba(34,197,94,0.1)",
                color: "rgb(34,197,94)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              3 approved
            </span>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "100px",
                background: "rgba(234,88,12,0.1)",
                color: "#ea580c",
                border: "1px solid rgba(234,88,12,0.3)",
              }}
            >
              1 review
            </span>
          </div>
        </div>

        {/* Question list */}
        <div
          style={{
            flex: 1,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            overflow: "hidden",
          }}
        >
          {REVIEW_QUESTIONS.map((q, i) => {
            const isApproved = q.status === "approved";
            const showCheck = scene >= 1;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 8px",
                  borderRadius: "9px",
                  border: `1px solid ${isApproved ? "rgba(34,197,94,0.2)" : "rgba(234,88,12,0.2)"}`,
                  background: isApproved
                    ? "rgba(34,197,94,0.05)"
                    : "rgba(234,88,12,0.05)",
                }}
              >
                {/* Approve indicator */}
                <AnimatePresence>
                  {showCheck ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: i * 0.22,
                        type: "spring",
                        stiffness: 400,
                        damping: 18,
                      }}
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isApproved
                          ? "rgba(34,197,94,0.18)"
                          : "rgba(234,88,12,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        {isApproved ? (
                          <path
                            d="M1.2 4L3.2 6L6.8 1.5"
                            stroke="rgb(34,197,94)"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <path
                            d="M2 4h4"
                            stroke="#ea580c"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    </motion.div>
                  ) : (
                    <div
                      key="dot"
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "var(--muted)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </AnimatePresence>
                <span
                  style={{
                    fontSize: "8.5px",
                    color: "var(--foreground)",
                    lineHeight: 1.3,
                    flex: 1,
                  }}
                >
                  {q.text}
                </span>
              </div>
            );
          })}

          {/* Export button (scene 2+) */}
          <AnimatePresence>
            {scene >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EXPO }}
                style={{ marginTop: "6px" }}
              >
                <motion.button
                  animate={
                    scene === 2
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(234,88,12,0)",
                            "0 0 0 8px rgba(234,88,12,0.15)",
                            "0 0 0 0 rgba(234,88,12,0)",
                          ],
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 1.2, repeat: 1 }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "10px",
                    background:
                      scene === 3
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(234,88,12,0.1)",
                    border: `1px solid ${scene === 3 ? "rgba(34,197,94,0.4)" : "rgba(234,88,12,0.4)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  {scene === 3 ? (
                    <>
                      <CheckCircle
                        size={12}
                        style={{ color: "rgb(34,197,94)" }}
                      />
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: "rgb(34,197,94)",
                        }}
                      >
                        mock_test.json downloaded!
                      </span>
                    </>
                  ) : (
                    <>
                      <Download size={12} style={{ color: "#ea580c" }} />
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: "#ea580c",
                        }}
                      >
                        Export mock_test.json
                      </span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
