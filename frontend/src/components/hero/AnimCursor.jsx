// ─────────────────────────────────────────────────────────────────────────────
// AnimCursor.jsx  –  spring-physics mouse cursor that follows target positions
// ─────────────────────────────────────────────────────────────────────────────
import { motion } from "framer-motion";

export default function AnimCursor({ x, y, visible, clicking }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 60,
        transformOrigin: "top left",
      }}
      animate={{
        left: x,
        top: y,
        opacity: visible ? 1 : 0,
        scale: clicking ? 0.82 : 1,
      }}
      transition={{
        left: { type: "spring", stiffness: 190, damping: 22 },
        top: { type: "spring", stiffness: 190, damping: 22 },
        opacity: { duration: 0.22 },
        scale: { duration: 0.12 },
      }}
    >
      <svg
        width="18"
        height="22"
        viewBox="0 0 18 22"
        fill="none"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.32))" }}
      >
        <path
          d="M1.5 1.5L6.5 17L8.8 11.2L14.5 8.8L1.5 1.5Z"
          fill="white"
          stroke="#1a1a1a"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
