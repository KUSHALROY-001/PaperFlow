import { httpError } from "../lib/http-error.js";
import * as jobsRepo from "../repositories/processing-jobs.repository.js";

export async function listJobs(workspaceId, query) {
  const status = query.status || null;
  const mockTestId = query.mockTestId || null;

  return jobsRepo.listJobs(workspaceId, { status, mockTestId });
}

export async function getJob(jobId, workspaceId) {
  const job = await jobsRepo.findJobById(jobId, workspaceId);

  if (!job) {
    throw httpError(404, "Processing job not found");
  }

  return job;
}

export async function updateJob(jobId, workspaceId, body) {
  const job = await jobsRepo.updateJob(jobId, workspaceId, {
    status: body.status || null,
    currentStageProvided: body.currentStage !== undefined,
    currentStage: body.currentStage || null,
    progressPercent: body.progressPercent ?? null,
    outputSummary: body.outputSummary || null,
    errorMessageProvided: body.errorMessage !== undefined,
    errorMessage: body.errorMessage || null,
  });

  if (!job) {
    throw httpError(404, "Processing job not found");
  }

  await jobsRepo.insertJobEvent({
    jobId: job.id,
    stage: job.current_stage || job.status,
    message: `Job updated to ${job.status}`,
    payload: { status: job.status, progressPercent: job.progress_percent },
  });

  return job;
}
