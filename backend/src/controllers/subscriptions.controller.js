import * as subscriptionsService from "../services/subscriptions.service.js";

function getSubscriberKey(req) {
  return (
    req.headers["x-subscriber-key"] ||
    (req.user?.id ? `user_${req.user.id}` : null)
  );
}

export async function getSubscriptions(req, res) {
  const subscriberKey = getSubscriberKey(req);
  const subscriptions = await subscriptionsService.getSubscriptions(subscriberKey);
  res.json({ subscriptions });
}

export async function subscribePublisher(req, res) {
  const subscriberKey = getSubscriberKey(req);
  const { slug } = req.body;
  const userId = req.user?.id || null;
  const subscription = await subscriptionsService.subscribePublisher(
    subscriberKey,
    userId,
    slug,
  );
  res.status(201).json({ subscription });
}

export async function unsubscribePublisher(req, res) {
  const subscriberKey = getSubscriberKey(req);
  const { slug } = req.params;
  const result = await subscriptionsService.unsubscribePublisher(
    subscriberKey,
    slug,
  );
  res.json(result);
}
