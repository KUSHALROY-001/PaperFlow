// ─────────────────────────────────────────────────────────────────────────────
// ScanBeam.jsx  –  animated OCR scan laser line with glow trail + OCR boxes
// ─────────────────────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { AIStarIcon } from "./AIStarBurst";
import { EXPO, OCR_BOXES, OCR_CONFIDENCE } from "./constants";

/** Animated horizontal scan laser that sweeps top → bottom */
export function ScanBeam({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="scan-beam"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            pointerEvents: "none",
            zIndex: 20,
          }}
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.9, ease: "linear" }}
        >
          {/* Glow trail above the beam */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "70px",
              background:
                "linear-gradient(to top, rgba(234,88,12,0.12) 0%, transparent 100%)",
            }}
          />
          {/* Main beam line */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "2px",
              background:
                "linear-gradient(90deg, transparent 0%, #ea580c 12%, #fb923c 50%, #ea580c 88%, transparent 100%)",
              boxShadow:
                "0 0 18px 5px rgba(234,88,12,0.55), 0 0 5px 1px rgba(234,88,12,0.9)",
            }}
          />
          {/* AI star riding the beam */}
          <div
            style={{
              position: "absolute",
              bottom: "-11px",
              right: "6px",
              color: "#ea580c",
              filter: "drop-shadow(0 0 6px rgba(234,88,12,0.7))",
            }}
          >
            <AIStarIcon size={22} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** SVG bounding boxes that draw in progressively during scan */
export function OCRBoxes({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.svg
          key="ocr-overlay"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 25,
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {OCR_BOXES.map((box, i) => {
            const perimeter = 2 * (box.w + box.h);
            const conf = OCR_CONFIDENCE[i];
            return (
              <g key={i}>
                {/* Bounding rect draws itself in */}
                <motion.rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx="0.8"
                  fill={box.stroke
                    .replace("0.8", "0.07")
                    .replace("0.7", "0.06")
                    .replace("0.65", "0.05")
                    .replace("0.6", "0.04")}
                  stroke={box.stroke}
                  strokeWidth="0.7"
                  strokeDasharray={perimeter}
                  initial={{ strokeDashoffset: perimeter, opacity: 0 }}
                  animate={{ strokeDashoffset: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    strokeDashoffset: {
                      delay: box.delay,
                      duration: 0.5,
                      ease: EXPO,
                    },
                    opacity: { delay: box.delay, duration: 0.2 },
                  }}
                />
                {/* Confidence label */}
                <motion.text
                  x={box.x + box.w + 0.8}
                  y={box.y + 6.5}
                  fontSize="4"
                  fill={box.stroke}
                  fontFamily="monospace"
                  fontWeight="700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: box.delay + 0.4, duration: 0.3 }}
                >
                  {Math.round(conf * 100)}%
                </motion.text>
              </g>
            );
          })}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

/** Subtle scanning particles floating upward during scan */
export function ScanParticles({ active }) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 10 + i * 9,
    delay: i * 0.25,
    size: i % 3 === 0 ? 2.5 : 1.8,
  }));

  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 18,
            overflow: "hidden",
          }}
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: "#ea580c",
                boxShadow: "0 0 4px rgba(234,88,12,0.7)",
              }}
              initial={{ bottom: "0%", opacity: 0.8 }}
              animate={{ bottom: "100%", opacity: 0 }}
              transition={{
                duration: 2.4,
                ease: "easeOut",
                delay: p.delay,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
