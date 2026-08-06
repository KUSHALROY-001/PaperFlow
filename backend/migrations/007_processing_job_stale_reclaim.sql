-- A job can currently get orphaned at status='running' forever if the
-- worker process is interrupted or crashes mid-job (see worker.py's
-- process_next_job change in the same commit) - claim_next_job only ever
-- claims status='queued' rows, so nothing can pick an orphaned job back up.
--
-- retry_count lets claim_next_job safely reclaim a stale 'running' job a
-- bounded number of times before giving up and marking it 'failed'
-- outright, instead of either leaving it stuck forever or retrying a
-- reliably-crashing job in an infinite loop.
ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
