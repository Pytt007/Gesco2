-- Persist legal-guardian links and their change history in the same transaction.
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_parent_links (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id text NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);
CREATE INDEX IF NOT EXISTS parent_links_parent_idx ON public.student_parent_links(parent_id);

CREATE TABLE IF NOT EXISTS public.parent_link_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL,
  parent_id text NOT NULL,
  action text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parent_link_events_date_idx ON public.parent_link_events(created_at DESC);

ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_link_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_parent_links, public.parent_link_events FROM PUBLIC, anonymous, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_parent_links TO authenticated;
GRANT SELECT ON public.parent_link_events TO authenticated;

CREATE POLICY parent_links_read ON public.student_parent_links FOR SELECT TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE','SCOLAIRE_ENSEIGNANT','ENSEIGNANT','FINANCE','CAISSIER'));
CREATE POLICY parent_links_insert ON public.student_parent_links FOR INSERT TO authenticated
  WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'));
CREATE POLICY parent_links_update ON public.student_parent_links FOR UPDATE TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'))
  WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'));
CREATE POLICY parent_links_delete ON public.student_parent_links FOR DELETE TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR'));
CREATE POLICY parent_link_events_read ON public.parent_link_events FOR SELECT TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'));

CREATE OR REPLACE FUNCTION public.record_parent_link_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  record_row public.student_parent_links%ROWTYPE;
  action_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_row := OLD;
    action_name := 'Retrait du lien de parenté';
  ELSIF TG_OP = 'INSERT' THEN
    record_row := NEW;
    action_name := 'Ajout lien (' || coalesce(NEW.data->>'relationshipType', 'Tuteur Légal') || ')';
  ELSE
    record_row := NEW;
    action_name := 'Modification du lien de parenté';
  END IF;
  INSERT INTO public.parent_link_events(student_id, parent_id, action, data)
  VALUES (record_row.student_id, record_row.parent_id, action_name, record_row.data);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_parent_link_change() FROM PUBLIC, anonymous, authenticated;
DROP TRIGGER IF EXISTS parent_link_change ON public.student_parent_links;
CREATE TRIGGER parent_link_change AFTER INSERT OR UPDATE OR DELETE ON public.student_parent_links
FOR EACH ROW EXECUTE FUNCTION public.record_parent_link_change();

CREATE OR REPLACE FUNCTION public.reassign_parent_link_on_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  replacement_id text;
  needs_primary boolean;
  needs_payer boolean;
BEGIN
  SELECT id INTO replacement_id FROM public.student_parent_links
    WHERE student_id = OLD.student_id AND id <> OLD.id
    ORDER BY created_at, id LIMIT 1;
  IF replacement_id IS NULL THEN RETURN OLD; END IF;
  needs_primary := coalesce((OLD.data->>'isPrimary')::boolean, false)
    AND NOT EXISTS (SELECT 1 FROM public.student_parent_links WHERE student_id=OLD.student_id AND id<>OLD.id AND coalesce((data->>'isPrimary')::boolean,false));
  needs_payer := coalesce((OLD.data->>'isPayer')::boolean, false)
    AND NOT EXISTS (SELECT 1 FROM public.student_parent_links WHERE student_id=OLD.student_id AND id<>OLD.id AND coalesce((data->>'isPayer')::boolean,false));
  IF needs_primary OR needs_payer THEN
    UPDATE public.student_parent_links SET
      data = data || jsonb_build_object(
        'isPrimary', coalesce((data->>'isPrimary')::boolean,false) OR needs_primary,
        'isPayer', coalesce((data->>'isPayer')::boolean,false) OR needs_payer,
        'isFinancialEmergencyContact', coalesce((data->>'isFinancialEmergencyContact')::boolean,false) OR needs_payer),
      updated_at = now()
    WHERE id = replacement_id;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.reassign_parent_link_on_delete() FROM PUBLIC, anonymous, authenticated;
DROP TRIGGER IF EXISTS parent_link_reassign ON public.student_parent_links;
CREATE TRIGGER parent_link_reassign BEFORE DELETE ON public.student_parent_links
FOR EACH ROW EXECUTE FUNCTION public.reassign_parent_link_on_delete();

COMMIT;
