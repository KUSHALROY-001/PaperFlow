CREATE TABLE IF NOT EXISTS extraction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Variable')),
  question_count INT NOT NULL CHECK (question_count > 0),
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  marks_per_correct NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (marks_per_correct >= 0),
  negative_marks_per_wrong NUMERIC(6,2) NOT NULL DEFAULT 0.25 CHECK (negative_marks_per_wrong >= 0),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  color TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(tags) = 'array'),
  CHECK (jsonb_typeof(sections) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extraction_templates_global_slug
ON extraction_templates(slug)
WHERE workspace_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extraction_templates_workspace_slug
ON extraction_templates(workspace_id, slug)
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_extraction_templates_workspace_id
ON extraction_templates(workspace_id);

CREATE INDEX IF NOT EXISTS idx_extraction_templates_category
ON extraction_templates(category);

DROP TRIGGER IF EXISTS trg_extraction_templates_updated_at ON extraction_templates;
CREATE TRIGGER trg_extraction_templates_updated_at
BEFORE UPDATE ON extraction_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO extraction_templates (
  workspace_id,
  slug,
  name,
  description,
  category,
  difficulty,
  question_count,
  duration_minutes,
  marks_per_correct,
  negative_marks_per_wrong,
  tags,
  sections,
  color,
  is_popular,
  usage_count,
  rating,
  settings
)
VALUES
  (
    NULL,
    'gate-cs',
    'GATE CS',
    'Full GATE Computer Science exam format with subject-wise sections, 65 questions, 3hr duration.',
    'Entrance Exam',
    'Hard',
    65,
    180,
    1,
    0.33,
    '["CS", "Engineering", "GATE"]'::jsonb,
    '["Engineering Mathematics", "Digital Logic", "Computer Organization", "Programming & DS", "Algorithms", "Theory of Computation", "OS", "DBMS", "Networks"]'::jsonb,
    'orange',
    TRUE,
    1240,
    4.9,
    '{"sectionStrategy": "subject-wise", "answerMode": "mixed"}'::jsonb
  ),
  (
    NULL,
    'jeca-entrance',
    'JECA Entrance',
    'MCA entrance exam format for Jadavpur University. 100 MCQs with negative marking.',
    'Entrance Exam',
    'Medium',
    100,
    120,
    1,
    0.25,
    '["MCA", "Computer Science", "West Bengal"]'::jsonb,
    '["Mathematics", "Analytical Ability", "Computer Awareness"]'::jsonb,
    'blue',
    TRUE,
    890,
    4.8,
    '{"sectionStrategy": "subject-wise", "answerMode": "single"}'::jsonb
  ),
  (
    NULL,
    'jee-mains',
    'JEE Mains',
    'IIT JEE Mains style with Physics, Chemistry, Math. 90 questions, +4/-1 marking.',
    'Entrance Exam',
    'Hard',
    90,
    180,
    4,
    1,
    '["IIT", "Engineering", "PCM"]'::jsonb,
    '["Physics", "Chemistry", "Mathematics"]'::jsonb,
    'emerald',
    TRUE,
    3450,
    4.9,
    '{"sectionStrategy": "subject-wise", "answerMode": "mixed"}'::jsonb
  ),
  (
    NULL,
    'upsc-prelims',
    'UPSC Prelims',
    'General Studies Paper I format. 100 questions, 2 hours.',
    'Government Exam',
    'Hard',
    100,
    120,
    2,
    0.66,
    '["UPSC", "GS", "Civil Services"]'::jsonb,
    '["History", "Geography", "Polity", "Economics", "Science & Tech", "Environment"]'::jsonb,
    'amber',
    FALSE,
    2100,
    4.7,
    '{"sectionStrategy": "topic-wise", "answerMode": "single"}'::jsonb
  ),
  (
    NULL,
    'bank-po-ibps',
    'Bank PO (IBPS)',
    'IBPS PO Prelims format with 3 sections. 100 questions, 60 minutes.',
    'Banking Exam',
    'Medium',
    100,
    60,
    1,
    0.25,
    '["Banking", "IBPS", "Finance"]'::jsonb,
    '["English Language", "Quantitative Aptitude", "Reasoning Ability"]'::jsonb,
    'rose',
    FALSE,
    1780,
    4.6,
    '{"sectionStrategy": "section-wise", "answerMode": "single"}'::jsonb
  ),
  (
    NULL,
    'class-10-science',
    'Class 10 Science',
    'CBSE Class 10 Science chapter-wise MCQ format. 40 questions.',
    'School Exam',
    'Easy',
    40,
    90,
    1,
    0,
    '["CBSE", "Class 10", "Science"]'::jsonb,
    '["Physics", "Chemistry", "Biology"]'::jsonb,
    'teal',
    FALSE,
    560,
    4.5,
    '{"sectionStrategy": "chapter-wise", "answerMode": "single"}'::jsonb
  ),
  (
    NULL,
    'quick-quiz-20q',
    'Quick Quiz (20Q)',
    'Short 20-question quick quiz format. Ideal for practice sessions.',
    'Custom',
    'Variable',
    20,
    20,
    1,
    0,
    '["Quick", "Practice", "General"]'::jsonb,
    '["Mixed Topics"]'::jsonb,
    'purple',
    TRUE,
    4200,
    4.4,
    '{"sectionStrategy": "mixed", "answerMode": "single"}'::jsonb
  ),
  (
    NULL,
    'subject-notes-extractor',
    'Subject Notes Extractor',
    'Extracts key concepts and definitions from study notes into Q&A format.',
    'Study Notes',
    'Variable',
    50,
    NULL,
    1,
    0,
    '["Notes", "Concepts", "Q&A"]'::jsonb,
    '["Key Concepts", "Definitions", "Formulas"]'::jsonb,
    'indigo',
    FALSE,
    730,
    4.6,
    '{"sectionStrategy": "content-derived", "answerMode": "single"}'::jsonb
  )
ON CONFLICT DO NOTHING;
