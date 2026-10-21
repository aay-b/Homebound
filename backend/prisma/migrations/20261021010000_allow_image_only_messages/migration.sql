BEGIN;

-- Do not wait indefinitely if another transaction is currently changing Messages.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- The original text-only constraint rejects image messages whose content is an empty string.
-- Retain validation: a message contains either nonblank text or one image, never both.
ALTER TABLE public."Messages"
    DROP CONSTRAINT "messages_content_check",
    ADD CONSTRAINT "messages_content_check" CHECK (
        ("image_path" IS NULL AND char_length(trim("content")) > 0)
        OR
        ("image_path" IS NOT NULL AND char_length(trim("image_path")) > 0 AND "content" = '')
    );

COMMIT;
