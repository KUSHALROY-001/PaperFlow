import { createContext, useContext, useMemo } from "react";

// Provides the CURRENT question's slot_key -> asset map to any descendant
// MathText/QuestionTable instance, so a ![[img:slot_key]] marker embedded
// anywhere in that question's text/options/table cells resolves to the
// right image - without threading an `images` prop through every single
// call site that renders question content. There are close to a dozen of
// them (SessionQuestionView, ReviewTab, OutputTab, QuestionCard,
// DuplicatePairCard, and more), each rendering a question's text and its
// options as genuinely separate, sibling component trees, not one parent
// passing props down to the other - a shared prop would have to be
// threaded through every one of those trees independently. Context
// sidesteps that: each consumer wraps its own top-level render in ONE
// Provider, and every MathText/QuestionTable anywhere inside that subtree
// (text, each option, every table cell) picks the assets up automatically.
//
// Deliberately scoped PER QUESTION, not per page/list - a list of many
// questions (a mock test's full question list, a review queue page) wraps
// EACH question's own rendering in its own Provider instance, keyed by
// that one question's diagramAssets, so two different questions on the
// same page never have their slot_keys collide even though "default" is
// reused by nearly every question that only has one image.
const DiagramAssetsContext = createContext({});

// assets: the diagramAssets array attachDiagramUrls attaches to a question
// server-side ([{slotKey, url}, ...] - see
// question-assets.service.js). Missing/undefined is fine (renders an empty
// map, same as a question with no images at all) - callers don't need a
// conditional wrap for questions that happen to have zero diagrams.
export function DiagramAssetsProvider({ assets, children }) {
  const bySlotKey = useMemo(() => {
    const map = {};
    for (const asset of assets || []) {
      // Prefer camelCase from attachDiagramUrls; accept snake_case if a
      // mapper ever forwards a raw DB row.
      const key = asset.slotKey || asset.slot_key;
      if (key) map[key] = asset;
    }
    return map;
  }, [assets]);

  return (
    <DiagramAssetsContext.Provider value={bySlotKey}>
      {children}
    </DiagramAssetsContext.Provider>
  );
}

export function useDiagramAssets() {
  return useContext(DiagramAssetsContext);
}
