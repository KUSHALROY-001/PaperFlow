// ─────────────────────────────────────────────────────────────────────────────
// AIStarBurst.jsx  –  brand AI star with glow rings + particle explosion
// ─────────────────────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { EXPO, PARTICLE_ANGLES } from "./constants";

/** MockCraft brand 4-point star (not Gemini's logo) */
export function AIStarIcon({ size = 32, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={style}
    >
      {/* Large north-south ray */}
      <path
        d="M16 2C16 2 18.8 11.2 26 14C18.8 16.8 16 26 16 26C16 26 13.2 16.8 6 14C13.2 11.2 16 2 16 2Z"
        fill="currentColor"
      />
      {/* Small west spark */}
      <path
        d="M7 6C7 6 8.3 9.8 11.5 11C8.3 12.2 7 16 7 16C7 16 5.7 12.2 2.5 11C5.7 9.8 7 6 7 6Z"
        fill="currentColor"
        opacity="0.65"
      />
      {/* Small east spark */}
      <path
        d="M25 18C25 18 26.3 21.8 29.5 23C26.3 24.2 25 28 25 28C25 28 23.7 24.2 20.5 23C23.7 21.8 25 18 25 18Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

/** Radiating particle burst – appears on scene 3 */
export default function AIStarBurst({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="star-burst"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            background: "rgba(0,0,0,0.07)",
            backdropFilter: "blur(1.5px)",
          }}
        >
          {/* Concentric glow rings */}
          {[0.9, 0.55, 0.28].map((delay, i) => (
            <motion.div
              key={`ring-${i}`}
              style={{
                position: "absolute",
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: `${2 - i * 0.5}px solid rgba(234,88,12,${0.55 - i * 0.1})`,
              }}
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 3.4 + i * 0.6, opacity: 0 }}
              transition={{ duration: 1.1, ease: EXPO, delay: i * 0.18 }}
            />
          ))}

          {/* Inner soft glow blob */}
          <motion.div
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(234,88,12,0.35) 0%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.8, opacity: [0, 1, 0] }}
            transition={{ duration: 1.0, ease: EXPO }}
          />

          {/* The star icon */}
          <motion.div
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.65, ease: EXPO }}
            style={{
              position: "relative",
              color: "#ea580c",
              zIndex: 2,
              filter:
                "drop-shadow(0 0 18px rgba(234,88,12,0.9)) drop-shadow(0 0 8px rgba(234,88,12,0.7))",
            }}
          >
            <AIStarIcon size={52} />
          </motion.div>

          {/* Particles */}
          {PARTICLE_ANGLES.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const dist = 50 + (i % 3) * 14;
            return (
              <motion.div
                key={`particle-${angle}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * dist,
                  y: Math.sin(rad) * dist,
                  opacity: 0,
                  scale: 0.2,
                }}
                transition={{
                  duration: 0.9,
                  ease: EXPO,
                  delay: 0.1 + i * 0.04,
                }}
                style={{
                  position: "absolute",
                  width: i % 2 === 0 ? 7 : 5,
                  height: i % 2 === 0 ? 7 : 5,
                  borderRadius: "50%",
                  background:
                    i % 3 === 0
                      ? "#ea580c"
                      : i % 3 === 1
                        ? "#f59e0b"
                        : "#a855f7",
                  boxShadow:
                    i % 3 === 0
                      ? "0 0 8px rgba(234,88,12,0.8)"
                      : i % 3 === 1
                        ? "0 0 8px rgba(245,158,11,0.8)"
                        : "0 0 8px rgba(168,85,247,0.8)",
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
