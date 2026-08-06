import { httpError } from "./http-error.js";

export function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, `${fieldName} is required`);
  }

  return value.trim();
}

export function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function optionalNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function requiredArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw httpError(400, `${fieldName} must be a non-empty array`);
  }

  return value;
}

// Closed-set enforcement - rejects a bad enum-like value at the service
// boundary instead of letting it reach the DB or a frontend that assumes
// one of a fixed set of values. First used by extraction-templates.service.js
// (category/difficulty/color), promoted here once team.service.js needed
// the same check for member roles.
export function requiredEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw httpError(400, `${fieldName} must be one of: ${allowed.join(", ")}`);
  }

  return value;
}
