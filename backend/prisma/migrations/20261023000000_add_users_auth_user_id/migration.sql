BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Keep the numeric Users.id and all existing message/block/report references unchanged.
-- Existing accounts remain unlinked until their Auth identities are verified and backfilled.
ALTER TABLE public."Users"
    ADD COLUMN "auth_user_id" uuid;

CREATE UNIQUE INDEX "users_auth_user_id_key"
    ON public."Users" ("auth_user_id");

-- Unlink a deleted Auth account without deleting the application user or its history.
ALTER TABLE public."Users"
    ADD CONSTRAINT "Users_auth_user_id_fkey"
    FOREIGN KEY ("auth_user_id") REFERENCES auth.users("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
