BEGIN;

CREATE TABLE public."ShelterStaff" (
    auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shelter_id bigint NOT NULL REFERENCES public."Shelters"(id) ON DELETE CASCADE,
    PRIMARY KEY (auth_user_id, shelter_id)
);

-- Staff assignments must be made by a trusted administrator, not by registration.
ALTER TABLE public."ShelterStaff" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ShelterStaff" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ShelterStaff" TO service_role;

ALTER TABLE public."Listings" ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public."Listings" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Listings" TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pet-photos', 'pet-photos', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

COMMIT;
