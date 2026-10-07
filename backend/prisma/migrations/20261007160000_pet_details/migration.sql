BEGIN;

ALTER TABLE public."Listings"
    ADD COLUMN species text NOT NULL DEFAULT '',
    ADD COLUMN breed text NOT NULL DEFAULT '',
    ADD COLUMN age text NOT NULL DEFAULT '',
    ADD COLUMN description text NOT NULL DEFAULT '',
    ADD COLUMN health_info text NOT NULL DEFAULT '',
    ADD COLUMN allergies text NOT NULL DEFAULT '',
    ADD COLUMN photo_paths text[] NOT NULL DEFAULT '{}',
    ADD COLUMN available boolean NOT NULL DEFAULT true;

COMMIT;
