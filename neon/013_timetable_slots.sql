-- Persistent timetable slots. The academic year and catalog records are managed by
-- existing application services, so their IDs are kept as text rather than FKs.
BEGIN;

CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id text PRIMARY KEY,
  academic_year_id text NOT NULL,
  class_id text NOT NULL,
  teacher_id text NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timetable_slot_time_order CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS timetable_slots_year_class_idx ON public.timetable_slots(academic_year_id, class_id);
CREATE INDEX IF NOT EXISTS timetable_slots_year_teacher_idx ON public.timetable_slots(academic_year_id, teacher_id);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.timetable_slots FROM PUBLIC, anonymous, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;

DROP POLICY IF EXISTS timetable_read ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_insert ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_update ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_delete ON public.timetable_slots;
CREATE POLICY timetable_read ON public.timetable_slots FOR SELECT TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE','SCOLAIRE_ENSEIGNANT','ENSEIGNANT'));
CREATE POLICY timetable_insert ON public.timetable_slots FOR INSERT TO authenticated
  WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE','SCOLAIRE_ENSEIGNANT','ENSEIGNANT'));
CREATE POLICY timetable_update ON public.timetable_slots FOR UPDATE TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE','SCOLAIRE_ENSEIGNANT','ENSEIGNANT'))
  WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE','SCOLAIRE_ENSEIGNANT','ENSEIGNANT'));
CREATE POLICY timetable_delete ON public.timetable_slots FOR DELETE TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR'));

COMMIT;
