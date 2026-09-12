import * as duplicatesRepo from "../repositories/duplicates.repository.js";

function serializeSide(row, prefix) {
  return {
    questionId: row[`${prefix}_id`],
    questionNo: row[`${prefix}_no`],
    subtopic: row[`${prefix}_subtopic`],
    passage: row[`${prefix}_passage`],
    text: row[`${prefix}_text`],
    explanation: row[`${prefix}_explanation`],
    options: row[`${prefix}_options`],
    mockTestId: row[`mock_test_${prefix.slice(-1)}_id`],
    mockTestName: row[`mock_test_${prefix.slice(-1)}_name`],
  };
}

// Union-find over question ids: two pairs sharing a question (A-B, B-C)
// belong in the same group even though A-C was never directly compared -
// that's the actual point of grouping instead of showing raw pairs (a
// question reused across 4 mock tests would otherwise show up as up to 6
// separate pairwise cards).
function find(parents, id) {
  if (!(id in parents)) parents[id] = id;
  while (parents[id] !== id) {
    parents[id] = parents[parents[id]]; // path compression
    id = parents[id];
  }
  return id;
}

function union(parents, a, b) {
  const rootA = find(parents, a);
  const rootB = find(parents, b);
  if (rootA !== rootB) parents[rootA] = rootB;
}

// Groups pending pairs by transitive connectivity. Each group carries
// every distinct question involved (deduped - the same question can be a
// member of several pairs) and the highest similarity score among the
// pairs that connect it, as the one representative number to show.
// Largest groups first, then most similar - the clearest, most obviously
// duplicated content surfaces first in a report with no other ordering
// signal (no "resolve this" urgency to sort by anymore).
function groupPairs(rows) {
  const parents = {};
  const questionsById = new Map();

  for (const row of rows) {
    const a = serializeSide(row, "question_a");
    const b = serializeSide(row, "question_b");
    questionsById.set(a.questionId, a);
    questionsById.set(b.questionId, b);
    union(parents, a.questionId, b.questionId);
  }

  const groupsByRoot = new Map();
  for (const row of rows) {
    const aId = row.question_a_id;
    const bId = row.question_b_id;
    const root = find(parents, aId);
    const score = Number(row.similarity_score);

    if (!groupsByRoot.has(root)) {
      groupsByRoot.set(root, { questionIds: new Set(), maxScore: 0 });
    }
    const group = groupsByRoot.get(root);
    group.questionIds.add(aId);
    group.questionIds.add(bId);
    group.maxScore = Math.max(group.maxScore, score);
  }

  const groups = Array.from(groupsByRoot.values()).map((group) => {
    const questions = Array.from(group.questionIds)
      .map((id) => questionsById.get(id))
      .sort((x, y) => x.mockTestName.localeCompare(y.mockTestName));
    return {
      // Smallest question id in the group - stable across reloads as long
      // as the group's membership doesn't change, which is all a React
      // key needs.
      id: questions.map((q) => q.questionId).sort()[0],
      similarityScore: group.maxScore,
      questions,
    };
  });

  groups.sort(
    (a, b) =>
      b.questions.length - a.questions.length ||
      b.similarityScore - a.similarityScore,
  );

  return groups;
}

export async function listDuplicateGroups(workspaceId) {
  const rows = await duplicatesRepo.listDuplicatePairs(workspaceId);
  return groupPairs(rows);
}

export async function countDuplicateGroups(workspaceId) {
  const groups = await listDuplicateGroups(workspaceId);
  return groups.length;
}
