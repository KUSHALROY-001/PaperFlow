import * as jobsService from "../services/processing-jobs.service.js";

export async function list(req, res) {
  const jobs = await jobsService.listJobs(req.workspaceId, req.query);
  res.json({ jobs });
}

export async function getOne(req, res) {
  const job = await jobsService.getJob(req.params.jobId, req.workspaceId);
  res.json({ job });
}

export async function update(req, res) {
  const job = await jobsService.updateJob(
    req.params.jobId,
    req.workspaceId,
    req.body,
  );
  res.json({ job });
}
