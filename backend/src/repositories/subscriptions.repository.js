import { pool } from "../db/pool.js";

export async function listSubscriptions(subscriberKey) {
  const result = await pool.query(
    `
    SELECT
      ps.id,
      ps.workspace_id AS "workspaceId",
      ps.created_at AS "subscribedAt",
      w.name AS "workspaceName",
      w.public_slug AS "slug"
    FROM publisher_subscriptions ps
    JOIN workspaces w ON w.id = ps.workspace_id
    WHERE ps.subscriber_key = $1
      AND w.public_slug IS NOT NULL
    ORDER BY ps.created_at DESC
    `,
    [subscriberKey],
  );
  return result.rows;
}

export async function addSubscription(subscriberKey, userId, workspaceId) {
  const result = await pool.query(
    `
    INSERT INTO publisher_subscriptions (subscriber_key, user_id, workspace_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (subscriber_key, workspace_id) DO UPDATE SET created_at = now()
    RETURNING id, subscriber_key AS "subscriberKey", workspace_id AS "workspaceId", created_at AS "subscribedAt"
    `,
    [subscriberKey, userId || null, workspaceId],
  );
  return result.rows[0];
}

export async function removeSubscription(subscriberKey, workspaceId) {
  await pool.query(
    `
    DELETE FROM publisher_subscriptions
    WHERE subscriber_key = $1 AND workspace_id = $2
    `,
    [subscriberKey, workspaceId],
  );
}

export async function isSubscribed(subscriberKey, workspaceId) {
  const result = await pool.query(
    `
    SELECT 1 FROM publisher_subscriptions
    WHERE subscriber_key = $1 AND workspace_id = $2
    `,
    [subscriberKey, workspaceId],
  );
  return result.rows.length > 0;
}
