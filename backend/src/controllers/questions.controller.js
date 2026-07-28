import * as questionsService from "../services/questions.service.js";

export async function create(req, res) {
  const question = await questionsService.createQuestion(
    req.workspaceId,
    req.body,
  );
  res.status(201).json({ question });
}

export async function getOne(req, res) {
  const question = await questionsService.getQuestion(
    req.params.questionId,
    req.workspaceId,
  );
  res.json({ question });
}

export async function update(req, res) {
  const question = await questionsService.updateQuestion(
    req.params.questionId,
    req.workspaceId,
    req.body,
  );
  res.json({ question });
}

export async function remove(req, res) {
  await questionsService.deleteQuestion(req.params.questionId, req.workspaceId);
  res.status(204).send();
}
