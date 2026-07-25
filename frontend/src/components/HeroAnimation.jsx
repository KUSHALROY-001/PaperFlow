// ─────────────────────────────────────────────────────────────────────────────
// HeroAnimation.jsx  –  main orchestrator: owns scene state, timing, cursor
// Replaces the previous simple HeroAnimation.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { SCENE_DURATIONS, TOTAL_SCENES, EXPO, SPRING } from "./hero/constants";
import AnimCursor from "./hero/AnimCursor";
import AIStarBurst, { AIStarIcon } from "./hero/AIStarBurst";
import PDFScene from "./hero/PDFScene";
import MockTestScene from "./hero/MockTestScene";
import { ScanBeam, OCRBoxes, ScanParticles } from "./hero/ScanBeam";

// ── Cursor waypoints per scene ───────────────────────────────────────────────
const CURSOR_POSITIONS = {
  2: { x: "50%", y: "45%" }, // click PDF center
  3: { x: "52%", y: "46%" }, // stays near click
  7: { x: "78%", y: "14%" }, // starts off top-right before moving
  "7-click": { x: "22%", y: "43%" }, // clicks Option B (Stack) — calculated from layout
};

// ── Scene visibility helpers ─────────────────────────────────────────────────
const showPDF = (s) => s >= 0 && s <= 4;
const showScan = (s) => s >= 3 && s <= 4;
const showMockTest = (s) => s >= 5;
const showCursor = (s) => s === 2 || s === 3 || s >= 7;
const showStarBurst = (s) => s === 3;

export default function HeroAnimation() {
  const [scene, setScene] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [clickedOption, setClickedOption] = useState(null);
  const [clicking, setClicking] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: "75%", y: "22%" });
  const timerRef = useRef(null);

  // ── Scene advancement ────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      const next = scene + 1;
      if (next >= TOTAL_SCENES) {
        // Reset entire loop
        setScene(0);
        setLoopKey((k) => k + 1);
        setClickedOption(null);
        setClicking(false);
        setCursorPos({ x: "75%", y: "22%" });
      } else {
        setScene(next);
      }
    }, SCENE_DURATIONS[scene]);

    return () => clearTimeout(timerRef.current);
  }, [scene]);

  // ── Scene side effects (cursor moves, click triggers) ────────────────────
  useEffect(() => {
    if (scene === 2) {
      setCursorPos(CURSOR_POSITIONS[2]);
      // Simulate click after cursor arrives
      const t = setTimeout(() => {
        setClicking(true);
        setTimeout(() => setClicking(false), 240);
      }, 600);
      return () => clearTimeout(t);
    }

    if (scene === 3) {
      setCursorPos(CURSOR_POSITIONS[3]);
    }

    if (scene === 7) {
      // Move cursor from off-screen top-right to option B
      setCursorPos(CURSOR_POSITIONS[7]);
      const arrive = setTimeout(() => {
        setCursorPos(CURSOR_POSITIONS["7-click"]);
        // Simulate click
        const click = setTimeout(() => {
          setClicking(true);
          setTimeout(() => {
            setClicking(false);
            setClickedOption(1); // option B is index 1
          }, 160);
        }, 900);
        return () => clearTimeout(click);
      }, 600);
      return () => clearTimeout(arrive);
    }
  }, [scene]);

  // ── Derived booleans ─────────────────────────────────────────────────────
  const pdfVisible = showPDF(scene);
  const scanVisible = showScan(scene);
  const mockVisible = showMockTest(scene);
  const cursorVisible = showCursor(scene);
  const starVisible = showStarBurst(scene);

  return (
    <div
      key={loopKey}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        userSelect: "none",
      }}
    >
      {/* ── Background glow orb ── */}
      <div
        style={{
          position: "absolute",
          inset: "-50px",
          background:
            "radial-gradient(ellipse 75% 65% at 55% 50%, rgba(234,88,12,0.11), transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          BROWSER SHELL
      ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ scale: 0.86, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.75, ease: EXPO }}
        style={{ position: "relative", zIndex: 10 }}
      >
        {/* Floating idle wrapper */}
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay: 0.9,
          }}
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow:
              "0 28px 70px -12px rgba(0,0,0,0.22), 0 0 0 1px rgba(234,88,12,0.07), 0 10px 28px -5px rgba(0,0,0,0.14)",
          }}
        >
          {/* ── Browser chrome bar ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "11px 15px",
              borderBottom: "1px solid var(--border)",
              background: "var(--muted)",
            }}
          >
            {/* Traffic lights */}
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: c,
                  boxShadow: `0 0 0 0.5px rgba(0,0,0,0.15) inset`,
                }}
              />
            ))}

            {/* Address bar */}
            <div
              style={{
                flex: 1,
                marginLeft: "9px",
                background: "var(--card)",
                borderRadius: "7px",
                border: "1px solid var(--border)",
                padding: "3.5px 10px",
                fontSize: "9px",
                color: "var(--muted-foreground)",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {/* Lock icon */}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <rect
                  x="1"
                  y="3.5"
                  width="6"
                  height="4"
                  rx="0.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                />
                <path
                  d="M2.5 3.5V2.5a1.5 1.5 0 013 0v1"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  fill="none"
                />
              </svg>
              mockcraft.app/cluster/jeca-2024
            </div>

            {/* Reload icon */}
            <div style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M9.5 5.5A4 4 0 113.7 2"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M3.5 1.5L3.5 3.5L1.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* ── Content viewport ── */}
          <div
            style={{
              position: "relative",
              minHeight: "310px",
              overflow: "hidden",
              background: "var(--background)",
            }}
          >
            {/* Scene 0-4: Messy PDF */}
            <PDFScene scene={scene} visible={pdfVisible} />

            {/* Scenes 3-4: Scan overlay (sits on top of PDF) */}
            {scanVisible && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 15,
                  overflow: "hidden",
                }}
              >
                <ScanBeam active={scene === 4} />
                <ScanParticles active={scene === 4} />
                <OCRBoxes active={scene === 4} />
                {/* Scan tint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(234,88,12,0.03)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            )}

            {/* Scene 3: AI Star burst overlay */}
            <AIStarBurst active={starVisible} />

            {/* Scenes 5-8: Clean Mock Test */}
            <MockTestScene
              scene={scene}
              visible={mockVisible}
              clickedOption={clickedOption}
            />

            {/* Animated cursor — lives above all scenes */}
            <AnimCursor
              x={cursorPos.x}
              y={cursorPos.y}
              visible={cursorVisible}
              clicking={clicking}
            />

            {/* ── Scene label strip (bottom of viewport) ── */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "5px 12px",
                background:
                  "linear-gradient(to top, var(--card) 60%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 70,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={`label-${scene}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    fontSize: "7px",
                    fontWeight: 700,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {
                    [
                      "Uploading PDF",
                      "Scrolling document",
                      "Processing request",
                      "AI analyzing",
                      "OCR correction",
                      "Questions extracted",
                      "Mock test ready",
                      "Reviewing answers",
                      "Complete",
                    ][scene]
                  }
                </motion.span>
              </AnimatePresence>

              {/* Progress dots */}
              <div
                style={{ display: "flex", gap: "3px", alignItems: "center" }}
              >
                {SCENE_DURATIONS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: scene === i ? "14px" : "4px",
                      background:
                        scene === i
                          ? "#ea580c"
                          : i < scene
                            ? "rgba(234,88,12,0.35)"
                            : "var(--border)",
                    }}
                    transition={{ duration: 0.28 }}
                    style={{ height: "4px", borderRadius: "100px" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          FLOATING STATUS BADGES (outside the browser window)
      ══════════════════════════════════════════════════════════════════════ */}

      {/* "AI Scanning" badge — scenes 3-4 */}
      <motion.div
        animate={{
          opacity: scene >= 3 && scene <= 4 ? 1 : 0,
          y: scene >= 3 && scene <= 4 ? 0 : 8,
          scale: scene >= 3 && scene <= 4 ? 1 : 0.88,
        }}
        transition={{ duration: 0.38, ease: EXPO }}
        style={{
          position: "absolute",
          top: "-16px",
          right: "0px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 11px",
          borderRadius: "100px",
          background: "var(--card)",
          border: "1px solid rgba(168,85,247,0.45)",
          fontSize: "10px",
          fontWeight: 700,
          color: "rgb(168,85,247)",
          boxShadow: "0 4px 18px rgba(168,85,247,0.18)",
          zIndex: 20,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          backdropFilter: "blur(8px)",
        }}
      >
        <AIStarIcon size={13} style={{ color: "rgb(168,85,247)" }} />
        AI Scanning…
      </motion.div>

      {/* "Correct Answer!" badge — after clicking */}
      <motion.div
        animate={{
          opacity: clickedOption === 1 ? 1 : 0,
          y: clickedOption === 1 ? 0 : 8,
          scale: clickedOption === 1 ? 1 : 0.88,
        }}
        transition={{ duration: 0.38, ease: EXPO }}
        style={{
          position: "absolute",
          bottom: "2px",
          left: "-4px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 11px",
          borderRadius: "100px",
          background: "var(--card)",
          border: "1px solid rgba(34,197,94,0.45)",
          fontSize: "10px",
          fontWeight: 700,
          color: "rgb(34,197,94)",
          boxShadow: "0 4px 18px rgba(34,197,94,0.15)",
          zIndex: 20,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path
            d="M1.5 5.5L4.5 8.5L9.5 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Correct Answer!
      </motion.div>

      {/* "Questions extracted" badge — scene 5-6 */}
      <motion.div
        animate={{
          opacity: scene === 5 || scene === 6 ? 1 : 0,
          y: scene === 5 || scene === 6 ? 0 : 8,
          scale: scene === 5 || scene === 6 ? 1 : 0.88,
        }}
        transition={{ duration: 0.38, ease: EXPO }}
        style={{
          position: "absolute",
          top: "-16px",
          left: "0px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 11px",
          borderRadius: "100px",
          background: "var(--card)",
          border: "1px solid rgba(251,146,60,0.45)",
          fontSize: "10px",
          fontWeight: 700,
          color: "#ea580c",
          boxShadow: "0 4px 18px rgba(234,88,12,0.15)",
          zIndex: 20,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          backdropFilter: "blur(8px)",
        }}
      >
        ✦ 14 questions extracted
      </motion.div>
    </div>
  );
}
