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
