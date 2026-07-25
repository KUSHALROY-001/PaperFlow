// ─────────────────────────────────────────────────────────────────────────────
// constants.js  –  shared timing, easing, and data for the hero animation
// ─────────────────────────────────────────────────────────────────────────────

/** How long each scene stays on screen (ms) */
export const SCENE_DURATIONS = [
  900, // 0 – browser appears
  2400, // 1 – pdf scrolls
  1400, // 2 – cursor click + ripple
  1800, // 3 – AI star burst
  3400, // 4 – scan beam + OCR boxes
  2200, // 5 – text morphs clean
  1200, // 6 – slide transition
  3200, // 7 – MCQ interaction
  1200, // 8 – zoom out & reset
];

export const TOTAL_SCENES = SCENE_DURATIONS.length; // 9

/** Cubic-bezier easing presets */
export const EXPO = [0.16, 1, 0.3, 1];
export const SMOOTH = [0.4, 0, 0.2, 1];
export const SPRING = { type: "spring", stiffness: 280, damping: 24 };

/** Messy scrawl lines rendered inside the PDF card */
export const MESSY_LINES = [
  { w: 89, sk: -1.3, h: 7, op: 0.68, ml: 0 },
  { w: 71, sk: 0.9, h: 6, op: 0.54, ml: 6 },
  { w: 94, sk: -0.5, h: 7, op: 0.72, ml: 0 },
  { w: 43, sk: 1.6, h: 5, op: 0.48, ml: 10 },
  { w: 83, sk: -0.3, h: 8, op: 0.63, ml: 0 },
  { w: 77, sk: 0.7, h: 6, op: 0.7, ml: 3 },
  { w: 91, sk: -1.1, h: 7, op: 0.58, ml: 0 },
  { w: 56, sk: 0.5, h: 5, op: 0.44, ml: 8 },
  { w: 86, sk: -0.8, h: 7, op: 0.65, ml: 0 },
  { w: 68, sk: 1.2, h: 6, op: 0.52, ml: 5 },
  { w: 92, sk: -0.4, h: 7, op: 0.7, ml: 0 },
  { w: 49, sk: 1.0, h: 5, op: 0.46, ml: 12 },
  { w: 80, sk: -0.7, h: 6, op: 0.6, ml: 0 },
  { w: 64, sk: 0.6, h: 5, op: 0.5, ml: 7 },
];

/** SVG bounding boxes that draw in during the scan phase */
export const OCR_BOXES = [
  {
    x: 5,
    y: 7,
    w: 88,
    h: 9,
    delay: 0.0,
    stroke: "rgba(251,146,60,0.8)",
    label: "Q14",
  },
  {
    x: 5,
    y: 22,
    w: 68,
    h: 9,
    delay: 0.3,
    stroke: "rgba(251,146,60,0.65)",
    label: "stem",
  },
  {
    x: 5,
    y: 37,
    w: 80,
    h: 9,
    delay: 0.6,
    stroke: "rgba(251,146,60,0.75)",
    label: "opt A",
  },
  {
    x: 5,
    y: 52,
    w: 52,
    h: 9,
    delay: 0.9,
    stroke: "rgba(167,139,250,0.7)",
    label: "opt B",
  },
  {
    x: 5,
    y: 67,
    w: 76,
    h: 9,
    delay: 1.2,
    stroke: "rgba(251,146,60,0.7)",
    label: "opt C",
  },
  {
    x: 5,
    y: 82,
    w: 60,
    h: 9,
    delay: 1.5,
    stroke: "rgba(251,146,60,0.6)",
    label: "opt D",
  },
];

/** Confidence percentage labels shown next to each OCR box */
export const OCR_CONFIDENCE = [0.97, 0.93, 0.95, 0.89, 0.94, 0.91];

/** Multiple-choice question used in the clean / MCQ scene */
export const MCQ_QUESTION = "Which data structure follows LIFO ordering?";
export const MCQ_OPTIONS = [
  { label: "A", text: "Binary Tree", correct: false },
  { label: "B", text: "Stack", correct: true },
  { label: "C", text: "Queue", correct: false },
  { label: "D", text: "Hash Map", correct: false },
];

/** Particle burst angles (degrees) for the AI star scene */
export const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
