-- The function deliberately locks the Session row before creating the six
-- creations. Credit reservation/debit and job creation share the same database
-- transaction, so a failed launch cannot leave a partial charge or partial run.
CREATE OR REPLACE FUNCTION public.launch_mirava_session_shoot(
  p_user_id TEXT,
  p_session_id TEXT,
  p_shots JSONB
) RETURNS TABLE("creationId" TEXT, "shotIndex" INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_shot JSONB;
  v_creation_id TEXT;
  v_index INTEGER;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_session FROM "StudioSession"
  WHERE "id" = p_session_id AND "userId" = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MIRAVA_SESSION_NOT_FOUND'; END IF;

  SELECT count(*) INTO v_count FROM "StudioCreation" WHERE "sessionId" = p_session_id;
  IF v_count > 0 THEN
    IF v_count <> 6 THEN RAISE EXCEPTION 'MIRAVA_SESSION_PARTIAL_RUN'; END IF;
    RETURN QUERY SELECT "id", "shotIndex" FROM "StudioCreation" WHERE "sessionId" = p_session_id ORDER BY "shotIndex";
    RETURN;
  END IF;

  IF jsonb_typeof(p_shots) <> 'array' OR jsonb_array_length(p_shots) <> 6 THEN
    RAISE EXCEPTION 'MIRAVA_SESSION_INVALID_SHOTS';
  END IF;

  FOR v_shot IN SELECT value FROM jsonb_array_elements(p_shots) LOOP
    v_index := (v_shot->>'shotIndex')::INTEGER;
    v_creation_id := gen_random_uuid()::TEXT;
    INSERT INTO "StudioCreation" (
      "id", "userId", "identityProfileId", "sessionId", "shotIndex", "shotIntent",
      "creativeOptions", "status", "masterPrompt", "negativePrompt", "creditReservationKey",
      "createdAt", "updatedAt"
    ) VALUES (
      v_creation_id, p_user_id, v_session."identityProfileId", p_session_id, v_index,
      v_shot->>'shotIntent', '{"seriesSize":1}'::jsonb, 'GENERATION_QUEUED',
      v_shot->>'masterPrompt', v_shot->>'negativePrompt', 'mirava-session-reservation:' || p_session_id || ':' || v_index,
      NOW(), NOW()
    );
    PERFORM public.reserve_mirava_credit(p_user_id, v_creation_id, 'mirava-session-reservation:' || p_session_id || ':' || v_index, 1);
    PERFORM public.debit_mirava_credit_reservation(p_user_id, v_creation_id, 'mirava-session-debit:' || p_session_id || ':' || v_index);
    INSERT INTO "StudioJob" ("id", "creationId", "kind", "status", "attempts", "nextRunAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::TEXT, v_creation_id, 'GENERATE', 'PENDING', 0, NOW(), NOW(), NOW());
  END LOOP;

  RETURN QUERY SELECT "id", "shotIndex" FROM "StudioCreation" WHERE "sessionId" = p_session_id ORDER BY "shotIndex";
END;
$$;

REVOKE EXECUTE ON FUNCTION public.launch_mirava_session_shoot(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.launch_mirava_session_shoot(TEXT, TEXT, JSONB) TO service_role;
