"""Re-exports this subpackage's public surface - db_connection.py,
db_jobs.py, db_questions.py, db_duplicates.py - so callers do
`from .db import X` / `from ..db import X` without needing to know which
submodule X actually lives in (this is exactly what importing from `db.py`
looked like before the 2026 split - see backend/worker/ARCHITECTURE.md).
"""

from .db_connection import get_connection
from .db_duplicates import (
    delete_duplicate_pair,
    find_flagged_duplicate_slots,
    replace_slot_content,
)
from .db_jobs import JobCancelled, add_job_event, claim_next_job, is_job_cancelled, update_job
from .db_questions import (
    count_questions_for_mock_test,
    flag_orphaned_question_slots,
    get_existing_question_numbers,
    mark_mock_test_after_processing,
    replace_questions,
    upsert_question_batch,
)

__all__ = [
    "JobCancelled",
    "add_job_event",
    "claim_next_job",
    "count_questions_for_mock_test",
    "delete_duplicate_pair",
    "find_flagged_duplicate_slots",
    "flag_orphaned_question_slots",
    "get_connection",
    "get_existing_question_numbers",
    "is_job_cancelled",
    "mark_mock_test_after_processing",
    "replace_questions",
    "replace_slot_content",
    "update_job",
    "upsert_question_batch",
]
