import { requiredString } from "../lib/validators.js";
import * as authService from "../services/auth.service.js";

export async function signup(req, res) {
  const name = requiredString(req.body.name, "name");
  const email = requiredString(req.body.email, "email").toLowerCase();
  const password = requiredString(req.body.password, "password");

  const result = await authService.signup({ name, email, password });
  res.status(201).json(result);
}

export async function login(req, res) {
  const email = requiredString(req.body.email, "email").toLowerCase();
  const password = requiredString(req.body.password, "password");

  const result = await authService.login({ email, password });
  res.json(result);
}

export async function me(req, res) {
  const workspaces = await authService.listWorkspacesForUser(req.user.id);
  res.json({ user: req.user, workspaceId: req.workspaceId, workspaces });
}

export async function getProfile(req, res) {
  const profile = await authService.getProfile(req.user.id);
  res.json({ profile });
}

export async function updateProfile(req, res) {
  const profile = await authService.updateProfile(req.user.id, req.body);
  res.json({ profile });
}

export async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.body);
  res.status(204).send();
}

export async function deleteAccount(req, res) {
  await authService.deleteAccount(req.user.id, req.body);
  res.status(204).send();
}
