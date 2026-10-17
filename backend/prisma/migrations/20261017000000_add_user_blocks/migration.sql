BEGIN;

-- Store active blocks independently of conversations so deleting a chat does not unblock anyone.
CREATE TABLE public."UserBlocks" (
    "blocker_id" bigint NOT NULL,
    "blocked_id" bigint NOT NULL,
    "blocked_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBlocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
    CONSTRAINT "user_blocks_no_self_block_check" CHECK ("blocker_id" <> "blocked_id"),
    CONSTRAINT "UserBlocks_blocker_id_fkey" FOREIGN KEY ("blocker_id")
        REFERENCES public."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBlocks_blocked_id_fkey" FOREIGN KEY ("blocked_id")
        REFERENCES public."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Support a user's blocked list (newest first) and reverse lookups of who blocked a user.
CREATE INDEX "user_blocks_blocker_blocked_at_index"
    ON public."UserBlocks" ("blocker_id", "blocked_at" DESC);
CREATE INDEX "user_blocks_blocked_id_index"
    ON public."UserBlocks" ("blocked_id");

-- Access will go through authenticated backend endpoints rather than direct browser queries.
ALTER TABLE public."UserBlocks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."UserBlocks" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."UserBlocks" TO service_role;

COMMIT;
