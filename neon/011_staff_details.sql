-- Preserve all staff form fields in the canonical staff_members row.
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;
