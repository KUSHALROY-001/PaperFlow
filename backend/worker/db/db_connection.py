"""The single DB connection factory every other db_*.py file and every
worker.py/job_*.py/grading.py/duplicate_detector.py caller uses - nothing
inside this package calls it itself (every function here takes an
already-open `connection` as its first argument instead). Split out of
db.py - see backend/worker/ARCHITECTURE.md.
"""

import psycopg
from contextlib import contextmanager
from psycopg.rows import dict_row

from ..config import DATABASE_URL, DB_CA_CERT_PATH

@contextmanager
def get_connection():
    # verify-full (not the libpq default of "prefer") means this actually
    # checks the server cert against DB_CA_CERT_PATH, matching what
    # src/db/pool.js does for the Node backend - without this, the
    # connection is encrypted but not authenticated, which is enough for a
    # network MITM to succeed against.
    connect_kwargs = {}
    if DB_CA_CERT_PATH:
        connect_kwargs["sslmode"] = "verify-full"
        connect_kwargs["sslrootcert"] = DB_CA_CERT_PATH

    with psycopg.connect(
        DATABASE_URL, row_factory=dict_row, **connect_kwargs
    ) as connection:
        yield connection
