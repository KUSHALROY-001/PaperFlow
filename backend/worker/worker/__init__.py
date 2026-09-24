"""Public surface for worker job processing.

``process_next_job`` is imported lazily so running ``python -m
worker.worker.worker`` does not load the target module while Python is still
initializing this package.
"""

__all__ = ["process_next_job"]


def __getattr__(name):
    if name == "process_next_job":
        from .worker import process_next_job

        return process_next_job
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
