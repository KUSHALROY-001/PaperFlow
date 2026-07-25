// ─────────────────────────────────────────────────────────────────────────────
// PDFScene.jsx  –  scenes 0-2: floating messy PDF with scroll + cursor click
// ─────────────────────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { MESSY_LINES, EXPO, SMOOTH } from "./constants";

/** Click ripple effect — two concentric rings fade out on click */
export function ClickRipple({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer ring */}
          <motion.div
            key="ripple-outer"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid rgba(234,88,12,0.7)",
              position: "absolute",
            }}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 4.5, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
          {/* Inner filled circle */}
          <motion.div
            key="ripple-inner"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(234,88,12,0.25)",
              position: "absolute",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.8, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.48, ease: "easeOut", delay: 0.06 }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

/** The messy handwritten PDF card content */
export function MessyPDF({ scrolled }) {
  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(160deg, #fdf9f0 0%, #fef8e8 100%)",
        minHeight: "320px",
        overflow: "hidden",
      }}
    >
      {/* Notebook blue lines */}
      {Array.from({ length: 22 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${4 + i * 4.5}%`,
            height: "1px",
            background: "rgba(147,186,230,0.2)",
          }}
        />
      ))}

      {/* Red left-margin line */}
      <div
        style={{
          position: "absolute",
          left: "20px",
          top: 0,
          bottom: 0,
          width: "1px",
          background: "rgba(220,80,80,0.22)",
        }}
      />

      {/* Content */}
      <div style={{ padding: "14px 16px 14px 24px" }}>
        {/* Paper header / title */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              width: "55%",
              height: "9px",
              borderRadius: "1px 5px 2px 1px",
              background: "rgba(60,30,10,0.55)",
              transform: "skewX(-0.6deg)",
              marginBottom: "4px",
            }}
          />
          <div
            style={{
              width: "38%",
              height: "6px",
              borderRadius: "1px 4px 2px 1px",
              background: "rgba(60,30,10,0.35)",
              transform: "skewX(0.4deg)",
            }}
          />
        </div>

        {/* Messy scrawl lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {MESSY_LINES.map((l, i) => (
            <div
              key={i}
              style={{
                width: `${l.w}%`,
                height: `${l.h}px`,
                borderRadius: "1px 4px 2px 1px",
                background: `rgba(55,28,8,${l.op * 0.58})`,
                transform: `skewX(${l.sk}deg)`,
                marginLeft: `${l.ml}px`,
              }}
            />
          ))}
        </div>

        {/* Garbled OCR text */}
        <div
          style={{
            marginTop: "12px",
            fontSize: "6px",
            fontFamily: "monospace",
            lineHeight: 1.7,
            color: "rgba(100,50,10,0.4)",
            filter: "blur(0.35px)",
          }}
        >
          Qu3s7ion 14) Wh1ch d@ta structu|e f0ll0ws L1FO...
          <br />
          @nsw3r: (B) St@ck — mem0ry alloc@t!0n str@tegy
        </div>
      </div>

      {/* Page number */}
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          right: "14px",
          fontSize: "6px",
          color: "rgba(80,40,10,0.3)",
          fontFamily: "monospace",
        }}
      >
        Page 3 / 8
      </div>
    </div>
  );
}

/** Full PDF scene — handles scroll animation internally based on scene */
export default function PDFScene({ scene, visible }) {
  const shouldScroll = scene >= 1;
  const showRipple = scene === 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pdf-scene"
          initial={{ x: 0, opacity: 1 }}
          exit={{
            x: "-118%",
            opacity: 0,
            transition: { type: "spring", stiffness: 200, damping: 26 },
          }}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          {/* Scrolling wrapper */}
          <motion.div
            animate={{ y: shouldScroll ? "-32%" : "0%" }}
            transition={{
              duration: 2.1,
              ease: SMOOTH,
              delay: shouldScroll ? 0.15 : 0,
            }}
          >
            <MessyPDF scrolled={shouldScroll} />
            {/* Second "page" below — creates natural scroll illusion */}
            <div
              style={{
                background: "linear-gradient(160deg, #fdf6e8 0%, #fef4e0 100%)",
                padding: "14px 16px 14px 24px",
                minHeight: "200px",
                borderTop: "1px dashed rgba(150,100,50,0.25)",
                position: "relative",
              }}
            >
              {/* Red margin line */}
              <div
                style={{
                  position: "absolute",
                  left: "20px",
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "rgba(220,80,80,0.22)",
                }}
              />
              {/* More scrawl lines on page 2 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  paddingLeft: "4px",
                }}
              >
                {MESSY_LINES.slice(4, 10).map((l, i) => (
                  <div
                    key={i}
                    style={{
                      width: `${l.w + (i % 2 === 0 ? -10 : 5)}%`,
                      height: `${l.h}px`,
                      borderRadius: "1px 4px 2px 1px",
                      background: `rgba(55,28,8,${l.op * 0.5})`,
                      transform: `skewX(${l.sk * -0.8}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Ripple overlay */}
          <ClickRipple active={showRipple} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
