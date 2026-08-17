import * as studentsService from "../services/students.service.js";

export async function getWeakTopics(req, res) {
  const weakTopics = await studentsService.getWeakTopics(
    req.workspaceId,
    req.query.cohortId,
  );
  res.json({ weakTopics });
}

export async function listStudents(req, res) {
  const students = await studentsService.listStudents(
    req.workspaceId,
    req.query.search,
    req.query.cohortId,
  );
  res.json({ students });
}

export async function getStudentDetail(req, res) {
  // req.params.email is already decoded once by Express's router (it runs
  // decodeURIComponent on every path param) - the encodeURIComponent on
  // the frontend side (api.js#getStudentDetail) is what makes an email
  // containing "+" or "@" safe to embed in the URL path in the first
  // place; decoding it again here would be a bug, not an extra safety
  // step, for any email that happens to contain a literal "%".
  const student = await studentsService.getStudentDetail(
    req.workspaceId,
    req.params.email,
  );
  res.json({ student });
}
