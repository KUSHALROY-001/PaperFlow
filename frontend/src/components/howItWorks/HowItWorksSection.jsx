// ─────────────────────────────────────────────────────────────────────────────
// HowItWorksSection.jsx
// Layout: 4 horizontal cards in a grid.
// On hover → animation panel expands smoothly BELOW each card's info.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Wand2, ListChecks, Download, ArrowRight } from "lucide-react";

import UploadAnimation from "./UploadAnimation";
import {
  OCRAnimation,
  ExtractAnimation,
  ExportAnimation,
} from "./StepAnimations";

const EXPO = [0.16, 1, 0.3, 1];

const STEPS = [
  {
    num: "01",
    icon: Upload,
    iconBg: "rgba(234,88,12,0.12)",
    iconColor: "#ea580c",
    accent: "#ea580c",
    accentAlpha: "rgba(234,88,12,",
    title: "Upload PDF",
    desc: "Drop any scanned question paper or handwritten notes — blurry or crisp, we handle it.",
    tags: ["PDF", "25 MB max", "Any scan"],
    Animation: UploadAnimation,
  },
  {
    num: "02",
    icon: Wand2,
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "rgb(59,130,246)",
    accent: "rgb(59,130,246)",
    accentAlpha: "rgba(59,130,246,",
    title: "OCR Correction",
    desc: "Phase 1 AI cleans garbled OCR output into readable, structured plain text automatically.",
    tags: ["Phase 1", "AI-powered", "Auto-fix"],
    Animation: OCRAnimation,
  },
  {
    num: "03",
    icon: ListChecks,
    iconBg: "rgba(168,85,247,0.12)",
    iconColor: "rgb(168,85,247)",
    accent: "rgb(168,85,247)",
    accentAlpha: "rgba(168,85,247,",
    title: "Extract Questions",
    desc: "Phase 2 detects MCQs, options A–D, and answers — building a typed JSON schema with confidence scores.",
    tags: ["Phase 2", "MCQ detection", "Confidence %"],
    Animation: ExtractAnimation,
  },
  {
    num: "04",
    icon: Download,
    iconBg: "rgba(34,197,94,0.12)",
    iconColor: "rgb(34,197,94)",
    accent: "rgb(34,197,94)",
    accentAlpha: "rgba(34,197,94,",
    title: "Review & Export",
    desc: "Approve questions, flag edge cases, then download clean mock JSON ready for your test platform.",
    tags: ["Review", "JSON export", "1-click"],
    Animation: ExportAnimation,
  },
];

// ── Height of the animation panel when expanded ───────────────────────────────
const ANIM_HEIGHT = 230;

export default function HowItWorksSection() {
  const [hoveredStep, setHoveredStep] = useState(null);

  return (
    <section
      id="how-it-works"
      style={{ padding: "80px 0", background: "var(--background)" }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        {/* ── Section header ── */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "100px",
              background: "rgba(234,88,12,0.08)",
              border: "1px solid rgba(234,88,12,0.2)",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ea580c",
              marginBottom: "16px",
            }}
          >
            ✦ Step-by-step
          </div>

          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 800,
              color: "var(--foreground)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "12px",
            }}
          >
            How It Works
          </h2>

          <p
            style={{
              fontSize: "15px",
              color: "var(--muted-foreground)",
              maxWidth: "460px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Four automated steps — from raw scanned PDF to production-ready mock
            JSON.
          </p>
        </div>

        {/* ── 4-card horizontal grid ── */}
        <div
          className="hiw-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
            alignItems: "start" /* cards size independently */,
          }}
        >
          {STEPS.map((step, i) => {
            const isHovered = hoveredStep === i;
            const Icon = step.icon;

            return (
              <motion.div
                key={i}
                onHoverStart={() => setHoveredStep(i)}
                onHoverEnd={() => setHoveredStep(null)}
                animate={{
                  borderColor: isHovered
                    ? `${step.accentAlpha}0.38)`
                    : "var(--border)",
                  boxShadow: isHovered
                    ? `0 16px 40px -8px ${step.accentAlpha}0.14), 0 4px 12px -2px rgba(0,0,0,0.08)`
                    : "0 2px 8px -2px rgba(0,0,0,0.06)",
                  y: isHovered ? -2 : 0,
                }}
                transition={{ duration: 0.3, ease: EXPO }}
                style={{
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  overflow: "hidden",
                  cursor: "default",
                  position: "relative",
                }}
              >
                {/* Subtle accent glow in top corner */}
                <motion.div
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.35 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "80px",
                    height: "80px",
                    borderRadius: "0 18px 0 80px",
                    background: `${step.accentAlpha}0.08)`,
                    pointerEvents: "none",
                  }}
                />

                {/* ── Card header info ── */}
                <div style={{ padding: "20px 20px 18px" }}>
                  {/* Step number */}
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: isHovered
                        ? step.iconColor
                        : "var(--muted-foreground)",
                      letterSpacing: "0.06em",
                      marginBottom: "12px",
                      transition: "color 0.28s ease",
                    }}
                  >
                    {step.num}
                  </div>

                  {/* Icon */}
                  <motion.div
                    animate={{
                      background: isHovered ? step.iconBg : "var(--muted)",
                      scale: isHovered ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.28 }}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        color: isHovered
                          ? step.iconColor
                          : "var(--muted-foreground)",
                        transition: "color 0.28s ease",
                      }}
                    />
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    animate={{
                      color: isHovered ? step.accent : "var(--foreground)",
                    }}
                    transition={{ duration: 0.28 }}
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginBottom: "8px",
                    }}
                  >
                    {step.title}
                  </motion.h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: "var(--muted-foreground)",
                      lineHeight: 1.55,
                      marginBottom: "12px",
                    }}
                  >
                    {step.desc}
                  </p>

                  {/* Tags */}
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                  >
                    {step.tags.map((tag) => (
                      <motion.span
                        key={tag}
                        animate={{
                          background: isHovered
                            ? `${step.accentAlpha}0.1)`
                            : "var(--muted)",
                          color: isHovered
                            ? step.iconColor
                            : "var(--muted-foreground)",
                          borderColor: isHovered
                            ? `${step.accentAlpha}0.25)`
                            : "var(--border)",
                        }}
                        transition={{ duration: 0.28 }}
                        style={{
                          fontSize: "8px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "100px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>

                  {/* "See animation" hint */}
                  <motion.div
                    animate={{
                      opacity: isHovered ? 0 : 1,
                      y: isHovered ? 4 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "9.5px",
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Hover to preview <ArrowRight size={10} />
                  </motion.div>
                </div>

                {/* ── Animation panel — expands below card info on hover ── */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      key="anim-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: ANIM_HEIGHT, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.42, ease: EXPO }}
                      style={{ overflow: "hidden" }}
                    >
                      {/* Divider with accent */}
                      <div
                        style={{
                          height: "1px",
                          background: `linear-gradient(90deg, transparent, ${step.accentAlpha}0.35), transparent)`,
                        }}
                      />

                      {/* Animation container */}
                      <div
                        style={{ height: `${ANIM_HEIGHT}px`, padding: "12px" }}
                      >
                        <step.Animation />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ── Connector arrows between cards (decorative) ── */}
        {/* Handled via CSS pseudo-approach – skip on mobile */}
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .hiw-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 520px) {
          .hiw-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
