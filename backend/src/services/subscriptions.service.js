import { httpError } from "../lib/http-error.js";
import * as catalogRepo from "../repositories/catalog.repository.js";
import * as subscriptionsRepo from "../repositories/subscriptions.repository.js";

async function resolveWorkspaceBySlug(slug) {
  const workspace = await catalogRepo.findWorkspaceBySlug(slug);
  if (!workspace) {
    throw httpError(404, "Publisher catalog not found");
  }
  return workspace;
}

export async function getSubscriptions(subscriberKey) {
  if (!subscriberKey) return [];
  return subscriptionsRepo.listSubscriptions(subscriberKey);
}

export async function subscribePublisher(subscriberKey, userId, slug) {
  if (!subscriberKey) {
    throw httpError(400, "Subscriber key is required");
  }
  const workspace = await resolveWorkspaceBySlug(slug);
  const sub = await subscriptionsRepo.addSubscription(
    subscriberKey,
    userId,
    workspace.id,
  );
  return {
    ...sub,
    slug: workspace.public_slug || slug,
    workspaceName: workspace.name,
  };
}

export async function unsubscribePublisher(subscriberKey, slug) {
  if (!subscriberKey) {
    throw httpError(400, "Subscriber key is required");
  }
  const workspace = await resolveWorkspaceBySlug(slug);
  await subscriptionsRepo.removeSubscription(subscriberKey, workspace.id);
  return { success: true, slug };
}
