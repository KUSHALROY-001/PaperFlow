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
  res.json({ user: req.user, workspaceId: req.workspaceId });
}
