import { httpError } from "../lib/http-error.js";
import { requiredString } from "../lib/validators.js";
import * as cohortsRepo from "../repositories/cohorts.repository.js";

function serializeCohort(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    memberCount: row.memberCount,
    averageScore:
      row.averageScore === null ? null : Number(row.averageScore),
  };
}

function serializeMember(row) {
  return {
    email: row.email,
    name: row.name || null,
    attemptsTaken: row.attemptsTaken,
    averageScore:
      row.averageScore === null ? null : Number(row.averageScore),
    lastActive: row.lastActive,
  };
}

export async function getCohortOrFail(cohortId, workspaceId) {
  const cohort = await cohortsRepo.findCohortById(cohortId, workspaceId);
  if (!cohort) {
    throw httpError(404, "Cohort not found");
  }
  return cohort;
}

export async function listCohorts(workspaceId) {
  const rows = await cohortsRepo.listCohorts(workspaceId);
  return rows.map(serializeCohort);
}

export async function createCohort(workspaceId, body) {
  const name = requiredString(body.name, "name");
  try {
    return await cohortsRepo.createCohort(workspaceId, name);
  } catch (error) {
    // 23505 = unique_violation, from idx_cohorts_workspace_name
    // (021_cohorts.sql) - surfaced as a normal 409 rather than a raw
    // Postgres error, same reasoning as auth.service.js's duplicate-email
    // handling on signup.
    if (error.code === "23505") {
      throw httpError(409, `A cohort named "${name}" already exists`);
    }
    throw error;
  }
}

export async function listCohortMembers(cohortId, workspaceId) {
  await getCohortOrFail(cohortId, workspaceId);
  const rows = await cohortsRepo.listCohortMembers(cohortId, workspaceId);
  return rows.map(serializeMember);
}

export async function addCohortMember(cohortId, workspaceId, body) {
  await getCohortOrFail(cohortId, workspaceId);
  const email = requiredString(body.email, "email");
  await cohortsRepo.addCohortMember(cohortId, email);
}

export async function removeCohortMember(cohortId, workspaceId, email) {
  await getCohortOrFail(cohortId, workspaceId);
  await cohortsRepo.removeCohortMember(cohortId, email);
}
