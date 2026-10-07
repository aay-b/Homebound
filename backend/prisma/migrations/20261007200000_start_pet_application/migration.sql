BEGIN;

CREATE FUNCTION public.start_pet_application(p_listing_id bigint, p_applicant_uid uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    pet_available boolean;
    application_id bigint;
BEGIN
    IF p_applicant_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'PT401';
    END IF;

    -- Lock the listing until the transaction finishes to prevent duplicate starts.
    SELECT available INTO pet_available
    FROM public."Listings"
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pet listing not found.' USING ERRCODE = 'PT404';
    END IF;
    IF pet_available IS NOT TRUE THEN
        RAISE EXCEPTION 'This pet is no longer available for adoption.' USING ERRCODE = 'PT409';
    END IF;

    SELECT id INTO application_id
    FROM public."Applications"
    WHERE listing_id = p_listing_id
      AND applicant_uid = p_applicant_uid
      AND application_status IN ('In Progress', 'Pending', 'Approved')
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN application_id::text;
    END IF;

    INSERT INTO public."Applications"
        (listing_id, applicant_uid, application_status, user_notes, commitment_question)
    VALUES (p_listing_id, p_applicant_uid, 'In Progress', '', false)
    RETURNING id INTO application_id;

    INSERT INTO public."ApplicationResponses" (application_id, question_id, response)
    SELECT application_id, id, ''
    FROM public."AdoptionQuestions"
    WHERE listing_id = p_listing_id;

    RETURN application_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.start_pet_application(bigint, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_pet_application(bigint, uuid) TO service_role;

COMMIT;
