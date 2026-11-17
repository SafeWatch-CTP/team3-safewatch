-- A recipient can clear an alert out of their feed. Dismissing is not the same
-- as reading: a read alert stays in the feed, a dismissed one leaves it, which
-- is why this is its own column rather than a second meaning for "readAt".
ALTER TABLE "AlertLog"
  ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);

-- The feed's own query: one user's undismissed logs.
CREATE INDEX IF NOT EXISTS "AlertLog_userId_dismissedAt_idx"
  ON "AlertLog"("userId", "dismissedAt");
