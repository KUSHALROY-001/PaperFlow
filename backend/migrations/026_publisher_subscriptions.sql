-- Migration 026: Publisher Subscriptions
-- Allows visitors and registered users to subscribe to publishers (workspaces that have a public catalog).

CREATE TABLE IF NOT EXISTS publisher_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_key TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT publisher_subscriptions_key_workspace_unique UNIQUE (subscriber_key, workspace_id)
);

CREATE INDEX IF NOT EXISTS publisher_subscriptions_subscriber_key_idx
  ON publisher_subscriptions (subscriber_key);
