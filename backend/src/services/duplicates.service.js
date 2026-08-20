import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as duplicatesRepo from "../repositories/duplicates.repository.js";

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

// action: 'merge' repoints the losing slot's content onto keepQuestionId's
// (migration 030's actual storage dedup - both mock tests' questions now
// share one question_contents row); 'dismiss' resolves the pair without
// touching either question (a reviewer's call that these are
// similar-but-not-actually-duplicate questions - e.g. shared boilerplate
// phrasing).
//
// Neither side's status changes on merge - the losing slot stays exactly
// as visible/reviewable as it was before (still a real question in its
// own mock test, still counted, still playable if approved), it just now
// displays the SAME text/options/answer as the side it was merged into.
// If the loser had previously been rejected by an older flow (before this
// migration, 'merge' used to reject the loser - see migration 030's step
// 6 backfill for that one-time cleanup), it stays rejected; this action
// only ever establishes sharing, never changes review status either way.
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

    const winnerContentId = await duplicatesRepo.getSlotContentId(
      client,
      keepQuestionId,
      workspaceId,
    );
    if (!winnerContentId) {
      throw httpError(404, "Question to keep not found");
    }
    const loserContentId = await duplicatesRepo.getSlotContentId(
      client,
      rejectQuestionId,
      workspaceId,
    );
    if (!loserContentId) {
      throw httpError(404, "Question to merge not found");
    }

    if (loserContentId !== winnerContentId) {
      await duplicatesRepo.repointSlotContent(
        client,
        rejectQuestionId,
        winnerContentId,
        workspaceId,
      );
      // Safe no-op if some other slot still points at loserContentId
      // (e.g. it had already been shared with a third mock test before
      // this merge) - the NOT EXISTS guard inside only deletes it when
      // this repoint really was the last reference.
      await duplicatesRepo.deleteOrphanedContent(client, loserContentId);
    }

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
      // Field name kept as-is for frontend compatibility (DuplicatePairCard.jsx
      // already reads rejectedQuestionId to know which side to visually
      // collapse) - the losing slot isn't actually rejected anymore, just
      // merged into the winner's content.
      rejectedQuestionId: rejectQuestionId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
