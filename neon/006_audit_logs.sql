BEGIN;

-- The caller cannot forge actor_id, user name, role or timestamp.
CREATE OR REPLACE FUNCTION public.append_audit_log(p_action text, p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor text := auth.user_id()::text;
  profile public.profiles%ROWTYPE;
  saved public.audit_logs%ROWTYPE;
  payload jsonb;
BEGIN
  IF actor IS NULL OR public.gesco_role() IS NULL THEN
    RAISE EXCEPTION 'Session GESCO requise' USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(p_action), '') IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Événement d’audit invalide';
  END IF;
  SELECT * INTO profile FROM public.profiles WHERE id = actor AND status = 'ACTIF';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil GESCO inactif' USING ERRCODE = '42501';
  END IF;
  payload := (p_data - 'user' - 'role') || jsonb_build_object(
    'user', coalesce(nullif(profile.full_name, ''), profile.username),
    'role', profile.role
  );
  INSERT INTO public.audit_logs(actor_id, action, data)
  VALUES (actor, trim(p_action), payload) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END $$;

REVOKE ALL ON FUNCTION public.append_audit_log(text,jsonb) FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.append_audit_log(text,jsonb) TO authenticated;

COMMIT;
