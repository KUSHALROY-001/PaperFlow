"""Re-exports this subpackage's public surface - just process_next_job,
the one thing http_server.py needs (`from .worker import process_next_job`)
- so that import keeps working unchanged even though worker.py now lives a
level deeper, inside this subpackage. See backend/worker/ARCHITECTURE.md.
"""

from .worker import process_next_job

__all__ = ["process_next_job"]
