BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Match verified, active Auth accounts by email only when the match is unique on both sides.
-- Do not guess from display names, replace existing links, or claim an already linked Auth ID.
WITH application_accounts AS (
    SELECT "id", lower(btrim("email")) AS email,
        count(*) OVER (PARTITION BY lower(btrim("email"))) AS email_count
    FROM public."Users"
), auth_accounts AS (
    SELECT id, lower(btrim(email)) AS email, email_confirmed_at, deleted_at,
        count(*) OVER (PARTITION BY lower(btrim(email))) AS email_count
    FROM auth.users
    WHERE email IS NOT NULL AND btrim(email) <> ''
)
UPDATE public."Users" AS target
SET "auth_user_id" = auth_account.id
FROM application_accounts AS account
JOIN auth_accounts AS auth_account ON auth_account.email = account.email
WHERE target."id" = account."id"
    AND target."auth_user_id" IS NULL
    AND lower(btrim(target."email")) = account.email
    AND account.email_count = 1
    AND auth_account.email_count = 1
    AND auth_account.email_confirmed_at IS NOT NULL
    AND auth_account.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM public."Users" AS linked
        WHERE linked."auth_user_id" = auth_account.id
    );

COMMIT;
