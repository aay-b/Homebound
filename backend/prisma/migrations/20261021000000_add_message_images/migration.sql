BEGIN;

-- Existing text messages keep a NULL image path and remain unchanged.
-- Store only the object path; image files belong in the private message-images bucket.
ALTER TABLE public."Messages" ADD COLUMN "image_path" text;

-- An uploaded object belongs to a single message. Multiple text messages may have NULL paths.
CREATE UNIQUE INDEX "messages_image_path_key" ON public."Messages" ("image_path");

COMMIT;
