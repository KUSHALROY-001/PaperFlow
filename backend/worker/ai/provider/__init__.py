"""Re-exports this subpackage's public surface, the same way ai/__init__.py
does for the whole ai/ package - so ai/__init__.py itself can just do
`from .provider import (...)` without knowing which submodule (provider.py,
marking_scheme.py, metadata_generation.py, ...) each function lives in.
"""

from .duplicate_regeneration import regenerate_flagged_duplicates
from .marking_scheme import prepare_questions_for_persistence
from .metadata_generation import generate_questions_from_metadata
from .provider import enhance_questions_with_ai, get_provider
from .template_generation import generate_template_from_exam_name

__all__ = [
    "enhance_questions_with_ai",
    "generate_questions_from_metadata",
    "generate_template_from_exam_name",
    "get_provider",
    "prepare_questions_for_persistence",
    "regenerate_flagged_duplicates",
]
