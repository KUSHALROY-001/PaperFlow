CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE mock_test_status AS ENUM ('draft', 'processing', 'review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE processing_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE question_type AS ENUM ('single', 'multi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE question_status AS ENUM ('needs_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  exam_year INT,
  duration_minutes INT NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  total_questions INT NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  marks_per_correct NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (marks_per_correct >= 0),
  negative_marks_per_wrong NUMERIC(6,2) NOT NULL DEFAULT 0.25 CHECK (negative_marks_per_wrong >= 0),
  status mock_test_status NOT NULL DEFAULT 'draft',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cluster_id, name)
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  sha256_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  uploaded_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status processing_status NOT NULL DEFAULT 'queued',
  current_stage TEXT,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  input_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_no INT NOT NULL CHECK (question_no > 0),
  topic TEXT,
  subtopic TEXT,
  passage TEXT,
  question_text TEXT NOT NULL,
  explanation TEXT,
  question_type question_type NOT NULL DEFAULT 'single',
  correct_option_indexes INT[] NOT NULL,
  marks_per_correct NUMERIC(6,2) CHECK (marks_per_correct IS NULL OR marks_per_correct >= 0),
  negative_marks_per_wrong NUMERIC(6,2) CHECK (negative_marks_per_wrong IS NULL OR negative_marks_per_wrong >= 0),
  source_page INT CHECK (source_page IS NULL OR source_page > 0),
  confidence NUMERIC(5,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  status question_status NOT NULL DEFAULT 'needs_review',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mock_test_id, question_no),
  CHECK (cardinality(correct_option_indexes) > 0)
);

CREATE TABLE IF NOT EXISTS question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0),
  option_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_index)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  total_questions INT NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  attempted_count INT NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  correct_count INT NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  wrong_count INT NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  unattempted_count INT NOT NULL DEFAULT 0 CHECK (unattempted_count >= 0),
  score NUMERIC(8,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_indexes INT[] NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  marks_awarded NUMERIC(6,2) NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS shared_mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW practice_jeca_questions AS
SELECT
  q.mock_test_id,
  q.question_no AS "questionNo",
  q.topic,
  q.question_text AS text,
  COALESCE(
    (
      SELECT jsonb_agg(qo.option_text ORDER BY qo.option_index)
      FROM question_options qo
      WHERE qo.question_id = q.id
    ),
    '[]'::jsonb
  ) AS options,
  to_jsonb(q.correct_option_indexes) AS "correctOptionIndex",
  q.question_type AS "questionType",
  q.explanation
FROM questions q
ORDER BY q.mock_test_id, q.question_no;

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clusters_workspace_id ON clusters(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_workspace_id ON mock_tests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_cluster_id ON mock_tests(cluster_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_status ON mock_tests(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_mock_test_id ON uploaded_files(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_mock_test_id ON processing_jobs(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_job_events_job_id ON processing_job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_questions_mock_test_id ON questions(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_mock_test_id ON exam_attempts(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_shared_mock_tests_token ON shared_mock_tests(share_token);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_mock_test_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM questions
      WHERE mock_test_id = OLD.mock_test_id
    )
    WHERE id = OLD.mock_test_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE mock_tests
    SET total_questions = (
      SELECT count(*)::INT
      FROM questions
      WHERE mock_test_id = NEW.mock_test_id
    )
    WHERE id = NEW.mock_test_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_clusters_updated_at ON clusters;
CREATE TRIGGER trg_clusters_updated_at
BEFORE UPDATE ON clusters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mock_tests_updated_at ON mock_tests;
CREATE TRIGGER trg_mock_tests_updated_at
BEFORE UPDATE ON mock_tests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER trg_processing_jobs_updated_at
BEFORE UPDATE ON processing_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_questions_refresh_mock_test_count_insert ON questions;
CREATE TRIGGER trg_questions_refresh_mock_test_count_insert
AFTER INSERT ON questions
FOR EACH ROW EXECUTE FUNCTION refresh_mock_test_question_count();

DROP TRIGGER IF EXISTS trg_questions_refresh_mock_test_count_delete ON questions;
CREATE TRIGGER trg_questions_refresh_mock_test_count_delete
AFTER DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION refresh_mock_test_question_count();

DROP TRIGGER IF EXISTS trg_questions_refresh_mock_test_count_update ON questions;
CREATE TRIGGER trg_questions_refresh_mock_test_count_update
AFTER UPDATE OF mock_test_id ON questions
FOR EACH ROW EXECUTE FUNCTION refresh_mock_test_question_count();
