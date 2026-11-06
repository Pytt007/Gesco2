-- Restore the only column missing from the compact module schema applied to Neon.
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS created_by text;
