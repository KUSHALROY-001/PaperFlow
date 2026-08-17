import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import { optionalString, requiredEnum } from "../lib/validators.js";
import * as questionBankRepo from "../repositories/question-bank.repository.js";
import * as questionAssetsService from "./question-assets.service.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_BULK_COPY = 50;
const STATUS_VALUES = ["needs_review", "approved", "rejected"];
const QUESTION_TYPE_VALUES = ["single", "multi"];

// Opaque to the caller by design (frontend just round-trips whatever
// string this returns as the next request's ?cursor=), so the actual
// shape (created_at + id) is free to change later without a frontend
// contract to keep in lockstep - same reasoning most cursor-based APIs
// use base64 opacity for, not because created_at/id are sensitive.
function encodeCursor(row) {
  return Buffer.from(
    JSON.stringify({ createdAt: row.created_at, id: row.id }),
  ).toString("base64");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    if (!decoded.createdAt || !decoded.id) return null;
    return decoded;
  } catch {
    // A malformed/tampered cursor is treated as "start from the
    // beginning" rather than a 400 - the bank's own filter state can
    // change between requests (a topic filter added mid-scroll), which
    // would make an old cursor's position meaningless anyway; failing
    // soft here matches that same "just restart the scroll" experience
    // rather than surfacing a confusing error for something the user
    // never directly controls.
    return null;
  }
}

function parseOptionalBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function searchQuestionBank(workspaceId, query) {
  const limit = Math.min(
    Math.max(Number(query.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const rows = await questionBankRepo.searchQuestions(workspaceId, {
    search: optionalString(query.search),
    topic: optionalString(query.topic),
    subtopic: optionalString(query.subtopic),
    hasCode: parseOptionalBoolean(query.hasCode),
    hasDiagram: parseOptionalBoolean(query.hasDiagram),
    status: query.status
      ? requiredEnum(query.status, STATUS_VALUES, "status")
      : undefined,
    questionType: query.questionType
      ? requiredEnum(query.questionType, QUESTION_TYPE_VALUES, "questionType")
      : undefined,
    clusterId: optionalString(query.clusterId),
    cursor: decodeCursor(query.cursor),
    // Fetch one extra row, don't return it - its mere presence is the
    // "is there a next page" signal, cheaper than a separate COUNT(*)
    // query that would need to re-run the same filter WHERE clause a
    // second time just to answer a boolean.
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Bank cards render full <QuestionContent> (see BankQuestionCard.jsx),
  // same as the Output/Review tabs - which means they need a real
  // diagramUrl, not just the boolean the WHERE-clause EXISTS filter above
  // already used to narrow the rows. Reuses the exact same batch-lookup
  // helper mock-tests.service.js#listQuestions already calls for the
  // editor's own question list, with idField: "id" for the same reason
  // that call site passes it - this repository's rows use a plain `id`
  // column too, not the `questionId` shape the attempts/play flows use.
  const pageWithDiagrams = await questionAssetsService.attachDiagramUrls(
    page,
    workspaceId,
    { idField: "id" },
  );

  return {
    questions: pageWithDiagrams,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function listTopics(workspaceId) {
  return questionBankRepo.listDistinctTopics(workspaceId);
}

// Wraps the DB copy (question row + options, inside one transaction so a
// crash mid-insert never leaves an orphaned question with no options) and
// then, only once that's committed, best-effort clones the diagram asset
// if there is one - see question-assets.service.js#cloneDiagramAsset's
// own comment for why that's a separate, non-transactional, non-fatal
// step: it's real file I/O, and a copy that succeeds with its question
// text/options intact but silently missing its diagram image is a much
// better outcome than the whole copy failing over a disk error, matching
// worker.py's own best-effort diagram-write pattern for freshly extracted
// questions.
export async function copyQuestionToMockTest(
  workspaceId,
  questionId,
  targetMockTestId,
) {
  if (!targetMockTestId) {
    throw httpError(400, "targetMockTestId is required");
  }

  const client = await pool.connect();
  let newQuestion;

  try {
    await client.query("BEGIN");

    // Locked (not just SELECTed) for the duration of this transaction so
    // two concurrent copies into the same target mock test can't both
    // compute the same "next" question_no and collide on the
    // (mock_test_id, question_no) UNIQUE constraint - see
    // question-bank.repository.js#lockMockTestForCopy.
    const targetMockTest = await questionBankRepo.lockMockTestForCopy(
      client,
      targetMockTestId,
      workspaceId,
    );
    if (!targetMockTest) {
      throw httpError(404, "Target mock test not found");
    }

    const source = await questionBankRepo.findQuestionWithOptionsById(
      client,
      questionId,
      workspaceId,
    );
    if (!source) {
      throw httpError(404, "Source question not found");
    }

    const questionNo = await questionBankRepo.nextQuestionNo(
      client,
      targetMockTestId,
    );

    newQuestion = await questionBankRepo.insertCopiedQuestion(client, {
      workspaceId,
      targetMockTestId,
      questionNo,
      source,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await questionAssetsService.cloneDiagramAsset({
      sourceQuestionId: questionId,
      targetQuestionId: newQuestion.id,
      targetMockTestId,
      targetWorkspaceId: workspaceId,
    });
  } catch (error) {
    // Logged, not thrown - see this function's own docstring above. The
    // question row is already committed and correct either way; losing
    // one diagram to a disk error shouldn't turn an otherwise-successful
    // copy into a failed request.
    console.error(
      `[question-bank] failed to clone diagram asset for copied question ${newQuestion.id}:`,
      error.message,
    );
  }

  return newQuestion;
}

// Phase 3: bulk copy, built by looping the single-question path above
// rather than reinventing locking/transaction logic for N questions at
// once - "once single-copy is proven out", per the plan. Each question is
// its own independent attempt (own lock acquisition, own transaction, own
// diagram clone) rather than one big transaction for the whole batch,
// deliberately: a single bad id in a 30-question selection (one the user
// picked, then someone else deleted a moment later) shouldn't fail the
// other 29 - it should copy what it can and report exactly what didn't
// make it, so the caller can retry just the failures instead of the whole
// batch. The cost is N separate lock/transaction round trips instead of
// one, which is a fine trade at "bulk select from a list" scale (capped
// at MAX_BULK_COPY) rather than a bulk-import scale where that cost would
// actually matter.
export async function copyQuestionsToMockTest(
  workspaceId,
  questionIds,
  targetMockTestId,
) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw httpError(400, "questionIds must be a non-empty array");
  }
  if (questionIds.length > MAX_BULK_COPY) {
    throw httpError(
      400,
      `Cannot copy more than ${MAX_BULK_COPY} questions at once`,
    );
  }
  if (!targetMockTestId) {
    throw httpError(400, "targetMockTestId is required");
  }

  const copied = [];
  const failed = [];

  for (const questionId of questionIds) {
    try {
      const question = await copyQuestionToMockTest(
        workspaceId,
        questionId,
        targetMockTestId,
      );
      copied.push(question);
    } catch (error) {
      // Any single failure (question not found, wrong workspace, target
      // mock test disappeared mid-loop) is captured per-item rather than
      // aborting the remaining questionIds - see this function's own
      // docstring above for why partial success is the right shape here.
      failed.push({
        questionId,
        message: error.message || "Could not copy this question",
      });
    }
  }

  return { copied, failed };
}
