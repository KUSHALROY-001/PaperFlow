import { pool } from "../db/pool.js";

// Roster list: one row per distinct taker_email within this workspace,
// aggregated across every submitted attempt they've made (any mock test).
// Display name uses the MOST RECENT guestName for that email (DISTINCT ON
// ... ORDER BY started_at DESC) rather than e.g. the first one, since a
// student might fix a typo in their name on a later attempt and the
// latest spelling is the one worth showing.
//
// search matches name OR email, case-insensitively (ILIKE - taker_email
// being CITEXT already makes equality checks case-insensitive, but ILIKE
// is still needed for partial/substring matches).
//
// cohortId (optional, Phase 2) narrows the roster to just that cohort's
// members - validated to belong to this workspace by the caller
// (students.service.js) before reaching here, same as every other
// "resource id scoped to workspace" check in the codebase (see
// mock-tests.service.js#getMockTestOrFail).
export async function listStudents(workspaceId, search, cohortId) {
  const result = await pool.query(
    `
    WITH latest_name AS (
      SELECT DISTINCT ON (taker_email)
        taker_email,
        metadata->>'guestName' AS name
      FROM exam_attempts
      WHERE workspace_id = $1
        AND taker_email IS NOT NULL
      ORDER BY taker_email, started_at DESC
    )
    SELECT
      ea.taker_email AS email,
      ln.name,
      COUNT(*) FILTER (WHERE ea.status = 'submitted')::int AS "attemptsTaken",
      AVG(ea.score) FILTER (WHERE ea.status = 'submitted') AS "averageScore",
      MAX(ea.submitted_at) AS "lastActive"
    FROM exam_attempts ea
    JOIN latest_name ln ON ln.taker_email = ea.taker_email
    WHERE ea.workspace_id = $1
      AND ea.taker_email IS NOT NULL
      AND (
        $2::text IS NULL
        OR ea.taker_email ILIKE '%' || $2 || '%'
        OR ln.name ILIKE '%' || $2 || '%'
      )
      AND (
        $3::uuid IS NULL
        OR EXISTS (
          SELECT 1 FROM cohort_members cm
          WHERE cm.cohort_id = $3 AND cm.taker_email = ea.taker_email
        )
      )
    GROUP BY ea.taker_email, ln.name
    ORDER BY "lastActive" DESC NULLS LAST
    `,
    [workspaceId, search || null, cohortId || null],
  );

  return result.rows;
}

// Every submitted attempt by this email in this workspace, most recent
// first - the detail view's attempt history list.
export async function listAttemptsForStudent(workspaceId, email) {
  const result = await pool.query(
    `
    SELECT
      ea.id,
      ea.mock_test_id AS "mockTestId",
      mt.name AS "mockTestName",
      ea.topics,
      ea.status,
      ea.started_at AS "startedAt",
      ea.submitted_at AS "submittedAt",
      ea.total_questions AS "totalQuestions",
      ea.attempted_count AS "attemptedCount",
      ea.correct_count AS "correctCount",
      ea.wrong_count AS "wrongCount",
      ea.unattempted_count AS "unattemptedCount",
      ea.score
    FROM exam_attempts ea
    JOIN mock_tests mt ON mt.id = ea.mock_test_id
    WHERE ea.workspace_id = $1
      AND ea.taker_email = $2
      AND ea.status = 'submitted'
    ORDER BY ea.submitted_at DESC
    `,
    [workspaceId, email],
  );

  return result.rows;
}

// Per-topic accuracy across EVERY submitted attempt this email has made in
// this workspace (not just one attempt) - weakest topic first, so the
// detail page can show "weak in X" without any extra client-side sorting.
// Questions with no topic set are excluded (nothing meaningful to group
// them under).
export async function getTopicAccuracyForStudent(workspaceId, email) {
  const result = await pool.query(
    `
    SELECT
      q.topic,
      COUNT(*)::int AS "questionsAnswered",
      COUNT(*) FILTER (WHERE ea2.is_correct)::int AS "correctCount"
    FROM exam_answers ea2
    JOIN exam_attempts att ON att.id = ea2.attempt_id
    JOIN questions q ON q.id = ea2.question_id
    WHERE att.workspace_id = $1
      AND att.taker_email = $2
      AND att.status = 'submitted'
      AND q.topic IS NOT NULL
    GROUP BY q.topic
    ORDER BY
      (COUNT(*) FILTER (WHERE ea2.is_correct))::numeric / NULLIF(COUNT(*), 0) ASC,
      q.topic ASC
    `,
    [workspaceId, email],
  );

  return result.rows;
}

// The latest guestName on record for this email, same "most recent wins"
// reasoning as listStudents' latest_name CTE - used by getStudentDetail
// (students.service.js) so the detail page has a display name even
// though it isn't stored anywhere as its own row.
export async function getLatestNameForStudent(workspaceId, email) {
  const result = await pool.query(
    `
    SELECT metadata->>'guestName' AS name
    FROM exam_attempts
    WHERE workspace_id = $1
      AND taker_email = $2
    ORDER BY started_at DESC
    LIMIT 1
    `,
    [workspaceId, email],
  );

  return result.rows[0]?.name || null;
}

// Phase 3: "12 students are weak in Rotational Motion". A student counts
// as weak in a topic if THEIR OWN accuracy on that topic (across every
// submitted attempt, any mock test) is below threshold - this is
// deliberately computed per-student first (the per_student_topic CTE),
// not as one workspace-wide accuracy number, because "40% of students
// individually struggle with X" and "the class average on X happens to be
// 55%" are different findings and only the first is actually actionable
// per-student. Only topics with at least one weak student are returned
// (the HAVING clause) - a topic everyone's doing fine on has nothing to
// surface.
//
// cohortId (optional) narrows this to one cohort's members, same pattern
// as listStudents' cohort filter.
export async function getWeakTopics(workspaceId, threshold, cohortId) {
  const result = await pool.query(
    `
    WITH per_student_topic AS (
      SELECT
        att.taker_email,
        q.topic,
        COUNT(*) AS questions_answered,
        COUNT(*) FILTER (WHERE ea.is_correct) AS correct_count
      FROM exam_answers ea
      JOIN exam_attempts att ON att.id = ea.attempt_id
      JOIN questions q ON q.id = ea.question_id
      WHERE att.workspace_id = $1
        AND att.status = 'submitted'
        AND att.taker_email IS NOT NULL
        AND q.topic IS NOT NULL
        AND (
          $3::uuid IS NULL
          OR EXISTS (
            SELECT 1 FROM cohort_members cm
            WHERE cm.cohort_id = $3 AND cm.taker_email = att.taker_email
          )
        )
      GROUP BY att.taker_email, q.topic
    )
    SELECT
      topic,
      COUNT(*) FILTER (
        WHERE correct_count::numeric / NULLIF(questions_answered, 0) < $2
      )::int AS "weakStudentCount",
      COUNT(*)::int AS "totalStudentCount",
      ROUND(
        AVG(correct_count::numeric / NULLIF(questions_answered, 0)) * 100,
        1
      ) AS "avgAccuracy"
    FROM per_student_topic
    GROUP BY topic
    HAVING COUNT(*) FILTER (
      WHERE correct_count::numeric / NULLIF(questions_answered, 0) < $2
    ) > 0
    ORDER BY "weakStudentCount" DESC, "avgAccuracy" ASC
    `,
    [workspaceId, threshold, cohortId || null],
  );

  return result.rows;
}

// For each weak topic, find mock tests that (a) actually contain that
// topic and (b) currently have an active, non-expired share link - i.e.
// a link that could genuinely be handed to students right now. This is
// what turns "12 students are weak in X" into something clickable
// ("Copy Practice Link") rather than just a stat - see
// shared.service.js#getSharedMockTest/startSharedAttempt, extended
// alongside this feature to actually honor a `topics` filter for guests,
// not just logged-in members.
export async function findShareableMockTestsForTopics(workspaceId, topics) {
  if (!topics.length) return [];
  const result = await pool.query(
    `
    SELECT DISTINCT
      q.topic,
      mt.id AS "mockTestId",
      mt.name AS "mockTestName",
      smt.share_token AS "shareToken"
    FROM questions q
    JOIN mock_tests mt ON mt.id = q.mock_test_id
    JOIN shared_mock_tests smt ON smt.mock_test_id = mt.id
      AND smt.is_active = TRUE
      AND (smt.expires_at IS NULL OR smt.expires_at > now())
    WHERE mt.workspace_id = $1
      AND q.topic = ANY($2::text[])
    ORDER BY q.topic, mt.name
    `,
    [workspaceId, topics],
  );

  return result.rows;
}
