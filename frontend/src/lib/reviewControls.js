// Pure helpers for the result-review controls (show/hide real answer,
// collapse/expand). Kept free of React so the selection logic is easy to
// reason about and test.

/** Returns a new Set with `id` added/removed. */
export function toggleInSet(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Returns a new Set with every id in `ids` added (on) or removed (off). */
export function setMany(set, ids, on) {
  const next = new Set(set);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** How many of `ids` are currently in `set`. */
export function countIn(set, ids) {
  let count = 0;
  for (const id of ids) if (set.has(id)) count += 1;
  return count;
}

/** "none" | "some" | "all" for count-out-of-total (empty total → "none"). */
export function getBulkState(count, total) {
  if (total <= 0 || count <= 0) return "none";
  if (count >= total) return "all";
  return "some";
}

/**
 * One-line, plain-text stand-in for a question, shown in the header of a
 * collapsed card so the user can still tell which question it is.
 */
export function getQuestionPreview(question, maxLength = 110) {
  const source = question?.text || question?.passage || "";
  const plain = String(source)
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/!\[\[img:[^\]]*\]\]/g, " [diagram] ")
    .replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
}
