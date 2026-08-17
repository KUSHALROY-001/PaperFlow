import * as questionBankService from "../services/question-bank.service.js";

export async function search(req, res) {
  const result = await questionBankService.searchQuestionBank(
    req.workspaceId,
    req.query,
  );
  res.json(result);
}

export async function listTopics(req, res) {
  const topics = await questionBankService.listTopics(req.workspaceId);
  res.json({ topics });
}

export async function copyToMockTest(req, res) {
  const question = await questionBankService.copyQuestionToMockTest(
    req.workspaceId,
    req.params.questionId,
    req.body.targetMockTestId,
  );
  res.status(201).json({ question });
}

export async function copyManyToMockTest(req, res) {
  const result = await questionBankService.copyQuestionsToMockTest(
    req.workspaceId,
    req.body.questionIds,
    req.body.targetMockTestId,
  );
  // 200, not 201 - this is a mixed-outcome batch result (some copied,
  // maybe some failed), not the creation of one resource the way the
  // single-copy route above is.
  res.status(200).json(result);
}
