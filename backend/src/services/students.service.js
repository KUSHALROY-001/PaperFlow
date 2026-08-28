import { httpError } from "../lib/http-error.js";
import { resolveAvatarUrl } from "../lib/cloudinary-storage.js";
import * as studentsRepo from "../repositories/students.repository.js";
import * as cohortsRepo from "../repositories/cohorts.repository.js";

// A student counts as "weak" in a topic when their own accuracy on it
// falls below this. 60% isn't derived from anything in the app - it's a
// reasonable first cut for "this needs attention" in an exam-prep
// context, kept as one named constant so it's easy to find and change
// later (e.g. if it becomes a per-workspace setting) rather than a bare
// number repeated in a query.
const WEAK_ACCURACY_THRESHOLD = 0.6;

// AVG(...) comes back from pg as a string (numeric type), same reason
// serializeAttempt (attempts.service.js) casts score with Number() -
// done once here so every caller gets a real number, not a string that
// happens to look like one.
function serializeStudent(row) {
  return {
    email: row.email,
    name: row.name || null,
    attemptsTaken: row.attemptsTaken,
    averageScore:
      row.averageScore === null ? null : Number(row.averageScore),
    lastActive: row.lastActive,
    avatarUrl: resolveAvatarUrl({
      avatarPublicId: row.avatarPublicId,
      avatarUpdatedAt: row.avatarUpdatedAt,
      avatarUrl: row.avatarUrl,
    }),
  };
}

function serializeAttemptSummary(row) {
  return {
    id: row.id,
    mockTestId: row.mockTestId,
    mockTestName: row.mockTestName,
    topics: row.topics,
    status: row.status,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    totalQuestions: row.totalQuestions,
    attemptedCount: row.attemptedCount,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    unattemptedCount: row.unattemptedCount,
    score: Number(row.score),
  };
}

function serializeTopicAccuracy(row) {
  return {
    topic: row.topic,
    questionsAnswered: row.questionsAnswered,
    correctCount: row.correctCount,
    // Derived here rather than stored/queried as its own value - always
    // recomputable from the two counts above, so there's nothing to keep
    // in sync.
    accuracy:
      row.questionsAnswered > 0
        ? Number(((row.correctCount / row.questionsAnswered) * 100).toFixed(1))
        : 0,
  };
}

export async function getWeakTopics(workspaceId, cohortId) {
  if (cohortId) {
    const cohort = await cohortsRepo.findCohortById(cohortId, workspaceId);
    if (!cohort) {
      throw httpError(404, "Cohort not found");
    }
  }

  const rows = await studentsRepo.getWeakTopics(
    workspaceId,
    WEAK_ACCURACY_THRESHOLD,
    cohortId || null,
  );

  const topics = rows.map((r) => r.topic);
  const shares = await studentsRepo.findShareableMockTestsForTopics(
    workspaceId,
    topics,
  );
  // First matching active share per topic - if a topic is covered by
  // several shared mock tests, showing every option isn't worth the
  // complexity for what this panel is for (getting the admin to
  // *something* clickable fast); they can still go pick a different one
  // from Clusters if they want.
  const shareByTopic = new Map();
  for (const s of shares) {
    if (!shareByTopic.has(s.topic)) {
      shareByTopic.set(s.topic, {
        mockTestId: s.mockTestId,
        mockTestName: s.mockTestName,
        shareToken: s.shareToken,
      });
    }
  }

  return rows.map((row) => ({
    topic: row.topic,
    weakStudentCount: row.weakStudentCount,
    totalStudentCount: row.totalStudentCount,
    avgAccuracy: Number(row.avgAccuracy),
    practiceLink: shareByTopic.get(row.topic) || null,
  }));
}

export async function listStudents(workspaceId, search, cohortId) {
  const trimmedSearch = search && search.trim() ? search.trim() : null;
  if (cohortId) {
    // 404s here if the cohort doesn't belong to this workspace, same as
    // every other "resource id scoped to workspace" check in the
    // codebase - a guessed/stale cohortId from another workspace should
    // never silently filter to nothing (or worse, be usable at all).
    const cohort = await cohortsRepo.findCohortById(cohortId, workspaceId);
    if (!cohort) {
      throw httpError(404, "Cohort not found");
    }
  }
  const rows = await studentsRepo.listStudents(
    workspaceId,
    trimmedSearch,
    cohortId || null,
  );
  return rows.map(serializeStudent);
}

export async function getStudentDetail(workspaceId, email) {
  const normalizedEmail = email && email.trim() ? email.trim() : null;
  if (!normalizedEmail) {
    throw httpError(400, "email is required");
  }

  const [name, attempts, topicAccuracy, avatarRow] = await Promise.all([
    studentsRepo.getLatestNameForStudent(workspaceId, normalizedEmail),
    studentsRepo.listAttemptsForStudent(workspaceId, normalizedEmail),
    studentsRepo.getTopicAccuracyForStudent(workspaceId, normalizedEmail),
    studentsRepo.getAvatarForStudentEmail(normalizedEmail),
  ]);

  // Unlike listStudents (which only ever returns emails that already
  // have at least one attempt, by construction of its GROUP BY), a
  // student detail page can be reached directly by URL - a typo'd or
  // never-attempted email should 404, not render an empty-but-valid page.
  if (attempts.length === 0) {
    throw httpError(404, "No attempts found for this student");
  }

  const submittedScores = attempts.map((a) => Number(a.score));
  const averageScore =
    submittedScores.reduce((sum, s) => sum + s, 0) / submittedScores.length;

  return {
    email: normalizedEmail,
    name: name || null,
    attemptsTaken: attempts.length,
    averageScore: Number(averageScore.toFixed(2)),
    lastActive: attempts[0]?.submittedAt || null,
    avatarUrl: resolveAvatarUrl({
      avatarPublicId: avatarRow?.avatarPublicId,
      avatarUpdatedAt: avatarRow?.avatarUpdatedAt,
      avatarUrl: avatarRow?.avatarUrl,
    }),
    attempts: attempts.map(serializeAttemptSummary),
    topicAccuracy: topicAccuracy.map(serializeTopicAccuracy),
  };
}
