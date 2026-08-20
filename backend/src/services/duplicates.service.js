import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as duplicatesRepo from "../repositories/duplicates.repository.js";
import * as questionsRepo from "../repositories/questions.repository.js";

function serializeSide(row, prefix) {
  return {
    questionId: row[`${prefix}_id`],
    questionNo: row[`${prefix}_no`],
    subtopic: row[`${prefix}_subtopic`],
    passage: row[`${prefix}_passage`],
    text: row[`${prefix}_text`],
    explanation: row[`${prefix}_explanation`],
    hasCode: row[`${prefix}_has_code`],
    codeLanguage: row[`${prefix}_code_language`],
    codeSnippet: row[`${prefix}_code_snippet`],
    options: row[`${prefix}_options`],
    mockTestId: row[`mock_test_${prefix.slice(-1)}_id`],
    mockTestName: row[`mock_test_${prefix.slice(-1)}_name`],
  };
}

function serializePair(row) {
  return {
    id: row.id,
    similarityScore: Number(row.similarity_score),
    detectedAt: row.detected_at,
    questionA: serializeSide(row, "question_a"),
    questionB: serializeSide(row, "question_b"),
  };
}

export async function listPendingDuplicates(workspaceId) {
  const rows = await duplicatesRepo.listPendingDuplicates(workspaceId);
  return rows.map(serializePair);
}

export async function countPendingDuplicates(workspaceId) {
  return duplicatesRepo.countPendingDuplicates(workspaceId);
}

// action: 'merge' keeps keepQuestionId and rejects the OTHER side of the
// pair; 'dismiss' resolves the pair without touching either question (a
// reviewer's call that these are similar-but-not-actually-duplicate
// questions - e.g. shared boilerplate phrasing).
//
// The non-kept question is soft-deleted (status = 'rejected'), not hard
// deleted - it's still sitting inside a real mock test with a
// question_no, and hard-deleting would leave a gap. Renumbering the mock
// test after removal is explicitly out of scope here (that's
// mock-tests.service.js territory, and risks reordering an
// already-in-progress attempt's questions if that test is live) - a
// rejected question just stops appearing in future attempts and reviews,
// same as any other question a reviewer rejects through the normal
// review flow.
export async function resolveDuplicate(
  workspaceId,
  pairId,
  { action, keepQuestionId, resolvedBy },
) {
  if (action !== "merge" && action !== "dismiss") {
    throw httpError(400, "action must be 'merge' or 'dismiss'");
  }

  const pair = await duplicatesRepo.findPendingPairById(pairId, workspaceId);
  if (!pair) {
    throw httpError(404, "Duplicate pair not found or already resolved");
  }

  if (action === "dismiss") {
    const resolved = await duplicatesRepo.resolveDuplicatePair(
      pool,
      pairId,
      workspaceId,
      { status: "dismissed", resolvedBy },
    );
    return { pairId: resolved.id, status: resolved.status };
  }

  if (
    keepQuestionId !== pair.question_id_a &&
    keepQuestionId !== pair.question_id_b
  ) {
    throw httpError(
      400,
      "keepQuestionId must be one of this pair's two questions",
    );
  }
  const rejectQuestionId =
    keepQuestionId === pair.question_id_a
      ? pair.question_id_b
      : pair.question_id_a;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await questionsRepo.updateQuestion(client, rejectQuestionId, workspaceId, {
      status: "rejected",
    });
    const resolved = await duplicatesRepo.resolveDuplicatePair(
      client,
      pairId,
      workspaceId,
      { status: "confirmed", resolvedBy },
    );

    if (!resolved) {
      // Someone else resolved this pair between our SELECT and here.
      throw httpError(409, "This pair was already resolved");
    }

    await client.query("COMMIT");
    return {
      pairId: resolved.id,
      status: resolved.status,
      keptQuestionId: keepQuestionId,
      rejectedQuestionId: rejectQuestionId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
