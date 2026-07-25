// ─────────────────────────────────────────────────────────────────────────────
// UploadAnimation.jsx  –  7-scene Upload PDF hero animation (6-8s loop)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle } from "lucide-react";

// ── Timing (ms per scene) ─────────────────────────────────────────────────────
const DURATIONS = [
  900, // 0 – idle: upload card floats
  1300, // 1 – cursor enters + hover glow
  1200, // 2 – PDF thumbnail dragged over card
  650, // 3 – drop: ripple + bounce + file slides in
  2100, // 4 – validation checklist one-by-one
  2000, // 5 – AI scan beam + OCR boxes
  1200, // 6 – success: "Ready for AI Processing"
];

const EXPO = [0.16, 1, 0.3, 1];

const VALIDATION_ITEMS = [
  { text: "PDF detected", delay: 0.0 },
  { text: "8 pages found", delay: 0.42 },
  { text: "Handwriting recognised", delay: 0.84 },
  { text: "Ready for AI extraction", delay: 1.28 },
];

// ── Shared icons ──────────────────────────────────────────────────────────────
function CursorSVG() {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      style={{
        filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.28))",
        display: "block",
      }}
    >
      <path
        d="M1 1L5.5 14.5L7.8 9.4L13.2 7L1 1Z"
        fill="white"
        stroke="#111"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AIStarSVG({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 14 8.5 20 11C14 13.5 12 20 12 20C12 20 10 13.5 4 11C10 8.5 12 2 12 2Z"
        fill={color}
      />
      <path
        d="M5.5 4C5.5 4 6.5 7.2 9.2 8.3C6.5 9.4 5.5 12.6 5.5 12.6C5.5 12.6 4.5 9.4 1.8 8.3C4.5 7.2 5.5 4 5.5 4Z"
        fill={color}
        opacity="0.6"
      />
      <path
        d="M19 14C19 14 20 17.2 22.7 18.3C20 19.4 19 22.6 19 22.6C19 22.6 18 19.4 15.3 18.3C18 17.2 19 14 19 14Z"
        fill={color}
        opacity="0.45"
      />
    </svg>
  );
}

// ── Validation check item ─────────────────────────────────────────────────────
function ValidationItem({ text, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.32, ease: EXPO }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 9px",
        borderRadius: "9px",
        border: "1px solid rgba(34,197,94,0.28)",
        background: "rgba(34,197,94,0.07)",
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: delay + 0.06,
          type: "spring",
          stiffness: 420,
          damping: 18,
        }}
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "rgba(34,197,94,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d="M1.2 4L3.2 6L6.8 1.5"
            stroke="rgb(34,197,94)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
      <span
        style={{ fontSize: "9.5px", fontWeight: 600, color: "rgb(34,197,94)" }}
      >
        {text}
      </span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadAnimation() {
  const [scene, setScene] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [dropped, setDropped] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [cursorXY, setCursorXY] = useState({ left: "-10%", top: "72%" });
  const timer = useRef(null);

  // ── Scene timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    timer.current = setTimeout(() => {
      const next = scene + 1;
      if (next >= DURATIONS.length) {
        setTimeout(() => {
          setScene(0);
          setLoopKey((k) => k + 1);
          setDropped(false);
          setClicking(false);
          setCursorXY({ left: "-10%", top: "72%" });
        }, 500);
      } else {
        setScene(next);
      }
    }, DURATIONS[scene]);
    return () => clearTimeout(timer.current);
  }, [scene]);

  // ── Scene side-effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (scene === 1) setCursorXY({ left: "44%", top: "46%" });
    if (scene === 2) setCursorXY({ left: "36%", top: "38%" });
    if (scene === 3) {
      setClicking(true);
      const t1 = setTimeout(() => {
        setClicking(false);
        setDropped(true);
      }, 220);
      return () => clearTimeout(t1);
    }
  }, [scene]);

  const isDropZoneActive = scene === 2 || scene === 1;
  const showCursor = scene >= 1 && scene <= 3;
  const showDragFile = scene === 2;
  const showDropRipple = scene === 3 && dropped;
  const showValidation = scene === 4;
  const showAIScan = scene === 5;
  const showSuccess = scene === 6;

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
      {/* ══ Main card ══ */}
      <motion.div
        animate={{ y: scene === 0 ? [0, -5, 0] : 0 }}
        transition={
          scene === 0
            ? {
                duration: 3.2,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }
            : {}
        }
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 8px 32px -6px rgba(0,0,0,0.12)",
        }}
      >
        {/* Chrome header */}
        <div
          style={{
            padding: "10px 14px 9px",
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
              background: "rgba(234,88,12,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Upload size={12} style={{ color: "#ea580c" }} />
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Upload your PDF
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* ── Scene 0-3: Drop zone ── */}
          <AnimatePresence>
            {scene <= 3 && (
              <motion.div
                key="dropzone"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px",
                }}
              >
                <motion.div
                  animate={{
                    borderColor: isDropZoneActive
                      ? "rgba(234,88,12,0.65)"
                      : "rgba(var(--border-rgb),1)",
                    backgroundColor: isDropZoneActive
                      ? "rgba(234,88,12,0.05)"
                      : "rgba(var(--muted-rgb),1)",
                    boxShadow: isDropZoneActive
                      ? "0 0 0 5px rgba(234,88,12,0.07), inset 0 0 18px rgba(234,88,12,0.04)"
                      : "none",
                    scale: isDropZoneActive ? 1.025 : 1,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "13px",
                    border: "2px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    position: "relative",
                    overflow: "hidden",
                    background: "var(--muted)",
                  }}
                >
                  {/* Upload icon */}
                  <motion.div
                    animate={{
                      scale: isDropZoneActive ? 1.12 : 1,
                      y: isDropZoneActive ? -2 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      background: "rgba(234,88,12,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ea580c",
                    }}
                  >
                    <Upload size={22} />
                  </motion.div>

                  <div style={{ textAlign: "center", lineHeight: 1.4 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--foreground)",
                      }}
                    >
                      Drag &amp; Drop
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "var(--muted-foreground)",
                        margin: "2px 0",
                      }}
                    >
                      or
                    </div>
                    <motion.div
                      animate={{
                        color: isDropZoneActive ? "#ea580c" : "#ea580c",
                      }}
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 600,
                        color: "#ea580c",
                        textDecoration: "underline",
                      }}
                    >
                      Browse Files
                    </motion.div>
                  </div>
                  <div
                    style={{
                      fontSize: "8.5px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    PDF up to 25 MB
                  </div>

                  {/* Active-state corner brackets */}
                  <AnimatePresence>
                    {isDropZoneActive && (
                      <>
                        {[
                          { top: "6px", left: "6px" },
                          { top: "6px", right: "6px" },
                          { bottom: "6px", left: "6px" },
                          { bottom: "6px", right: "6px" },
                        ].map((pos, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{
                              delay: i * 0.04,
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                            style={{
                              position: "absolute",
                              ...pos,
                              width: "10px",
                              height: "10px",
                              borderRadius: "3px",
                              background: "rgba(234,88,12,0.45)",
                            }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>

                  {/* Active tint */}
                  <AnimatePresence>
                    {isDropZoneActive && (
                      <motion.div
                        key="tint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "11px",
                          background: "rgba(234,88,12,0.04)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Drop ripple */}
                  <AnimatePresence>
                    {showDropRipple && (
                      <>
                        {[0.7, 0.45].map((opacity, i) => (
                          <motion.div
                            key={i}
                            style={{
                              position: "absolute",
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              border: `2px solid rgba(234,88,12,${opacity})`,
                            }}
                            initial={{ scale: 0, opacity: opacity }}
                            animate={{ scale: 5 + i * 1.5, opacity: 0 }}
                            transition={{
                              duration: 0.7,
                              ease: "easeOut",
                              delay: i * 0.12,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scene 4: Validation checklist ── */}
          <AnimatePresence>
            {showValidation && (
              <motion.div
                key="validation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                }}
              >
                {/* File chip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 10px",
                    borderRadius: "10px",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "7px",
                      background: "rgba(234,88,12,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={12} style={{ color: "#ea580c" }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "var(--foreground)",
                      }}
                    >
                      Mathematics_Test.pdf
                    </div>
                    <div
                      style={{
                        fontSize: "7.5px",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      18 MB · 8 pages
                    </div>
                  </div>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{
                      marginLeft: "auto",
                      fontSize: "7.5px",
                      fontWeight: 700,
                      color: "#ea580c",
                    }}
                  >
                    ●
                  </motion.div>
                </div>

                <div
                  style={{
                    fontSize: "7.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--muted-foreground)",
                    marginBottom: "3px",
                    paddingLeft: "2px",
                  }}
                >
                  Checking document…
                </div>

                {VALIDATION_ITEMS.map((item, i) => (
                  <ValidationItem key={i} text={item.text} delay={item.delay} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scene 5: AI scan ── */}
          <AnimatePresence>
            {showAIScan && (
              <motion.div
                key="ai-scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* AI header */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "8px",
                      background: "rgba(168,85,247,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AIStarSVG size={14} color="rgb(168,85,247)" />
                  </motion.div>
                  <div>
                    <div
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        color: "var(--foreground)",
                      }}
                    >
                      AI analysing…
                    </div>
                    <div
                      style={{
                        fontSize: "8px",
                        color: "rgb(168,85,247)",
                        fontWeight: 600,
                      }}
                    >
                      OCR correction &amp; extraction
                    </div>
                  </div>
                  {/* Progress indicator */}
                  <div style={{ marginLeft: "auto" }}>
                    <motion.div
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "rgb(168,85,247)",
                      }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    >
                      ●●●
                    </motion.div>
                  </div>
                </div>

                {/* Mini PDF being scanned */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: "11px",
                    border: "1px solid var(--border)",
                    background:
                      "linear-gradient(155deg, #fdf9f0 0%, #fef8e8 100%)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Notebook lines */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: `${8 + i * 9}%`,
                        height: "1px",
                        background: "rgba(140,170,200,0.15)",
                      }}
                    />
                  ))}
                  {/* Messy scrawl bars */}
                  {[78, 60, 85, 52, 70, 58].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        top: `${10 + i * 13}%`,
                        left: "8%",
                        width: `${w}%`,
                        height: "5px",
                        borderRadius: "1px 4px 2px 1px",
                        background: `rgba(55,28,8,${0.28 + i * 0.03})`,
                        transform: `skewX(${i % 2 === 0 ? -0.7 : 0.5}deg)`,
                      }}
                    />
                  ))}
                  {/* Purple scan beam */}
                  <motion.div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: "2px",
                      background:
                        "linear-gradient(90deg, transparent, rgba(168,85,247,0.85) 30%, rgba(168,85,247,1) 50%, rgba(168,85,247,0.85) 70%, transparent)",
                      boxShadow: "0 0 14px 4px rgba(168,85,247,0.45)",
                    }}
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{
                      duration: 1.5,
                      ease: "linear",
                      repeat: 1,
                      repeatDelay: 0.1,
                    }}
                  />
                  {/* SVG OCR boxes */}
                  <svg
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                    }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {[
                      { x: 6, y: 7, w: 74, h: 9, delay: 0.2 },
                      { x: 6, y: 22, w: 56, h: 9, delay: 0.55 },
                      { x: 6, y: 37, w: 66, h: 9, delay: 0.9 },
                      { x: 6, y: 52, w: 44, h: 9, delay: 1.25 },
                    ].map((b, i) => {
                      const p = 2 * (b.w + b.h);
                      return (
                        <motion.rect
                          key={i}
                          x={b.x}
                          y={b.y}
                          width={b.w}
                          height={b.h}
                          rx="1"
                          fill="rgba(168,85,247,0.06)"
                          stroke="rgba(168,85,247,0.7)"
                          strokeWidth="0.8"
                          strokeDasharray={p}
                          initial={{ strokeDashoffset: p, opacity: 0 }}
                          animate={{ strokeDashoffset: 0, opacity: 1 }}
                          transition={{
                            delay: b.delay,
                            duration: 0.45,
                            ease: EXPO,
                          }}
                        />
                      );
                    })}
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scene 6: Success ── */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EXPO }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "16px",
                }}
              >
                {/* Pulsing success ring */}
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "2px solid rgba(34,197,94,0.55)",
                    }}
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.12)",
                      border: "2px solid rgba(34,197,94,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle
                      size={26}
                      style={{ color: "rgb(34,197,94)" }}
                    />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.4, ease: EXPO }}
                  style={{ textAlign: "center" }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "rgb(22,163,74)",
                    }}
                  >
                    Ready for AI Processing
                  </div>
                  <div
                    style={{
                      fontSize: "8.5px",
                      color: "var(--muted-foreground)",
                      marginTop: "3px",
                    }}
                  >
                    Mathematics_Test.pdf · 8 pages · Handwritten
                  </div>
                </motion.div>

                {/* Bottom status row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: "flex",
                    gap: "6px",
                  }}
                >
                  {["PDF ✓", "OCR ready", "AI queued"].map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "7.5px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "100px",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        color: "rgb(34,197,94)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ══ Animated cursor ══ */}
      <AnimatePresence>
        {showCursor && (
          <motion.div
            key="cursor"
            style={{ position: "absolute", pointerEvents: "none", zIndex: 30 }}
            initial={{ left: "-8%", top: "72%", opacity: 0 }}
            animate={{
              left: cursorXY.left,
              top: cursorXY.top,
              opacity: 1,
              scale: clicking ? 0.82 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              left: { type: "spring", stiffness: 160, damping: 20 },
              top: { type: "spring", stiffness: 160, damping: 20 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.1 },
            }}
          >
            <CursorSVG />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PDF thumbnail being dragged ══ */}
      <AnimatePresence>
        {showDragFile && (
          <motion.div
            key="drag-file"
            initial={{ opacity: 0, scale: 0.75, left: "-5%", top: "68%" }}
            animate={{ opacity: 1, scale: 1, left: "26%", top: "28%" }}
            exit={{
              opacity: 0,
              scale: 0.88,
              top: "42%",
              transition: { duration: 0.22 },
            }}
            transition={{ duration: 0.62, ease: EXPO }}
            style={{
              position: "absolute",
              zIndex: 25,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 11px",
              borderRadius: "11px",
              background: "var(--card)",
              border: "1px solid rgba(234,88,12,0.35)",
              boxShadow:
                "0 10px 28px rgba(0,0,0,0.16), 0 0 0 1px rgba(234,88,12,0.1)",
              whiteSpace: "nowrap",
              rotate: "-3deg",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "7px",
                background: "rgba(234,88,12,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={12} style={{ color: "#ea580c" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                }}
              >
                Mathematics_Test.pdf
              </div>
              <div
                style={{ fontSize: "7px", color: "var(--muted-foreground)" }}
              >
                18 MB
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
