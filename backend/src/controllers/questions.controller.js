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

export async function bulkUpdateStatus(req, res) {
  const result = await questionsService.bulkUpdateStatus(
    req.workspaceId,
    req.body,
  );
  res.json(result);
}

export async function remove(req, res) {
  await questionsService.deleteQuestion(req.params.questionId, req.workspaceId);
  res.status(204).send();
}

export async function reorder(req, res) {
  await questionsService.reorderQuestions(
    req.params.mockTestId,
    req.workspaceId,
    req.body.items,
  );
  res.json({ success: true });
}
