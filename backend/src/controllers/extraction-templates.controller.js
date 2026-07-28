import * as templatesService from "../services/extraction-templates.service.js";

export async function list(req, res) {
  const { templates, categories } = await templatesService.listTemplates(
    req.workspaceId,
    req.query,
  );
  res.json({ templates, categories });
}

export async function getOne(req, res) {
  const template = await templatesService.getTemplateOrFail(
    req.params.templateId,
    req.workspaceId,
  );
  res.json({ template });
}

export async function create(req, res) {
  const template = await templatesService.createTemplate(
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ template });
}

export async function update(req, res) {
  const template = await templatesService.updateTemplate(
    req.params.templateId,
    req.workspaceId,
    req.body,
  );
  res.json({ template });
}

export async function remove(req, res) {
  await templatesService.deleteTemplate(req.params.templateId, req.workspaceId);
  res.status(204).send();
}

export async function apply(req, res) {
  const result = await templatesService.applyTemplate(
    req.params.templateId,
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json(result);
}
