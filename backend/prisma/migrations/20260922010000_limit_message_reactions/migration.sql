-- Keep the most recent reaction before enforcing one reaction per user and message.
DELETE FROM "message_reactions"
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      row_number() OVER (
        PARTITION BY message_id, user_id
        ORDER BY created_at DESC, emoji ASC
      ) AS row_number
    FROM "message_reactions"
  ) AS duplicate_reactions
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "message_reactions_one_reaction_per_user"
ON "message_reactions"(message_id, user_id);
