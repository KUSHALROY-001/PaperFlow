import * as cohortsService from "../services/cohorts.service.js";

export async function listCohorts(req, res) {
  const cohorts = await cohortsService.listCohorts(req.workspaceId);
  res.json({ cohorts });
}

export async function createCohort(req, res) {
  const cohort = await cohortsService.createCohort(req.workspaceId, req.body);
  res.status(201).json({ cohort });
}

export async function listCohortMembers(req, res) {
  const members = await cohortsService.listCohortMembers(
    req.params.cohortId,
    req.workspaceId,
  );
  res.json({ members });
}

export async function addCohortMember(req, res) {
  await cohortsService.addCohortMember(
    req.params.cohortId,
    req.workspaceId,
    req.body,
  );
  res.status(201).json({ ok: true });
}

export async function removeCohortMember(req, res) {
  await cohortsService.removeCohortMember(
    req.params.cohortId,
    req.workspaceId,
    req.params.email,
  );
  res.json({ ok: true });
}
