// ─────────────────────────────────────────────────────────────────────────────
// MockTestScene.jsx  –  scenes 5-8: clean MCQ test slides in, cursor clicks option
// ─────────────────────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { MCQ_QUESTION, MCQ_OPTIONS, EXPO, SMOOTH } from "./constants";
import { CheckCircle } from "lucide-react";

/** Animated checkmark path that draws itself in */
function Checkmark() {
  return (
    <motion.svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.path
        d="M1.5 5.5L4.5 8.5L9.5 2"
        stroke="rgb(22,163,74)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.38, ease: "easeOut", delay: 0.05 }}
      />
    </motion.svg>
  );
}

/** Single MCQ option row */
function MCQOption({ opt, index, clickedIndex, morphDelay }) {
  const isClicked = clickedIndex === index;
  const isCorrect = opt.correct;
  const showGreen = isClicked && isCorrect;
  const showWrong = isClicked && !isCorrect;

  let optionBackgroundColor;
  let optionBorderColor;
  if (showGreen) {
    optionBackgroundColor = "rgba(34,197,94,0.12)";
    optionBorderColor = "rgba(34,197,94,0.5)";
  } else if (showWrong) {
    optionBackgroundColor = "rgba(239,68,68,0.08)";
    optionBorderColor = "rgba(239,68,68,0.4)";
  } else {
    optionBackgroundColor = "var(--card)";
    optionBorderColor = "var(--border)";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        delay: morphDelay + index * 0.1,
        duration: 0.4,
        ease: EXPO,
      }}
    >
      <motion.div
        animate={{
          backgroundColor: optionBackgroundColor,
          borderColor: optionBorderColor,
          scale: showGreen ? 1.018 : 1,
        }}
        transition={{ duration: 0.38, ease: SMOOTH }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 9px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          marginBottom: "4px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Correct answer fill animation */}
        {showGreen && (
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(34,197,94,0.08)",
              borderRadius: "10px",
            }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.38, ease: SMOOTH }}
          />
        )}

        {/* Label circle */}
        <motion.div
          animate={{
            background: showGreen ? "rgba(34,197,94,0.2)" : "var(--muted)",
            color: showGreen ? "rgb(22,163,74)" : "var(--muted-foreground)",
          }}
          transition={{ duration: 0.3 }}
          style={{
            width: "17px",
            height: "17px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7.5px",
            fontWeight: 700,
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          {opt.label}
        </motion.div>

        {/* Option text */}
        <motion.span
          animate={{
            color: showGreen ? "rgb(22,163,74)" : "var(--foreground)",
            fontWeight: showGreen ? 600 : 400,
          }}
          style={{
            fontSize: "9.5px",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {opt.text}
        </motion.span>

        {/* Checkmark */}
        {showGreen && (
          <div style={{ position: "relative", zIndex: 1 }}>
            <Checkmark />
          </div>
        )}

        {/* Success glow */}
        {showGreen && (
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "10px",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.25)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.7, ease: "easeOut", times: [0, 0.4, 1] }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

/** Full clean mock test scene */
export default function MockTestScene({ scene, visible, clickedOption }) {
  const morphDelay = 0.1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mock-test-scene"
          initial={{ x: "118%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "118%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          style={{ position: "absolute", inset: 0, overflow: "auto" }}
        >
          <div style={{ padding: "14px 14px 10px" }}>
            {/* ── Header ── */}
            <motion.div
              initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: morphDelay, duration: 0.45, ease: EXPO }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "8px",
                  background: "rgba(34,197,94,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle size={12} style={{ color: "rgb(34,197,94)" }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "6.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    color: "var(--muted-foreground)",
                    lineHeight: 1,
                  }}
                >
                  Q14 · Computer Science
                </div>
                <div
                  style={{
                    fontSize: "6px",
                    color: "rgb(34,197,94)",
                    fontWeight: 600,
                    marginTop: "1px",
                  }}
                >
                  Generated · Ready
                </div>
              </div>

              {/* Meta badges */}
              <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                {["MCQ", "1 mark"].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "5.5px",
                      fontWeight: 700,
                      padding: "2px 5px",
                      borderRadius: "6px",
                      background: "rgba(234,88,12,0.1)",
                      color: "#ea580c",
                      border: "1px solid rgba(234,88,12,0.2)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* ── Divider ── */}
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: morphDelay + 0.1,
                duration: 0.5,
                ease: EXPO,
              }}
              style={{
                height: "1px",
                background: "var(--border)",
                marginBottom: "10px",
              }}
            />

            {/* ── Question stem ── */}
            <motion.p
              initial={{ opacity: 0, y: 5, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: morphDelay + 0.12,
                duration: 0.45,
                ease: EXPO,
              }}
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--foreground)",
                lineHeight: 1.45,
                marginBottom: "10px",
              }}
            >
              {MCQ_QUESTION}
            </motion.p>

            {/* ── Options ── */}
            {MCQ_OPTIONS.map((opt, i) => (
              <MCQOption
                key={opt.label}
                opt={opt}
                index={i}
                clickedIndex={clickedOption}
                morphDelay={morphDelay + 0.22}
              />
            ))}

            {/* ── Topic tags ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: morphDelay + 0.6, duration: 0.4 }}
              style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              {["Data Structures", "LIFO", "Memory"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "6px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
