-- Student roster Phase 2: manual cohort tagging. Phase 1 (020) gave every
-- guest attempt a stable identity via taker_email; this adds the ability
-- to group those emails into named batches ("JECA 2026 Batch A") for
-- cohort-level stats, on top of that identity - cohort_members references
-- taker_email directly (not a students table, since none exists - a
-- "student" is still just a distinct taker_email value derived from
-- exam_attempts, same as in students.repository.js).

CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One cohort name per workspace - prevents two reviewers from each
-- creating their own "Batch A" and splitting the same cohort's data
-- across two rows by accident.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cohorts_workspace_name
  ON cohorts (workspace_id, name);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  taker_email CITEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, taker_email)
);

-- listStudents' cohort filter and getCohortDetail's reverse lookup both
-- go through taker_email - the primary key above already covers
-- (cohort_id, taker_email) lookups, this covers the other direction
-- ("which cohorts is this email in").
CREATE INDEX IF NOT EXISTS idx_cohort_members_taker_email
  ON cohort_members (taker_email);
