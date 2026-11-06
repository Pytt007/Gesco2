-- Apply after 015. NULL roles must fail closed, including suspended profiles.
-- Preserve the existing function owner, ACL and business transaction.
BEGIN;
DO $migration$
DECLARE definition text;
BEGIN
  definition := pg_get_functiondef('public.create_complete_student_enrollment(text,jsonb)'::regprocedure);
  IF strpos(definition, 'IF role_name NOT IN') = 0
     AND strpos(definition, 'IF coalesce(role_name,'''') NOT IN') = 0 THEN
    RAISE EXCEPTION 'Unexpected registration function: inspect before applying migration 016';
  END IF;
  definition := replace(definition, 'IF role_name NOT IN', 'IF coalesce(role_name,'''') NOT IN');
  definition := replace(definition, 'OR parent_input->>''financialPayer'' NOT IN', 'OR coalesce(parent_input->>''financialPayer'','''') NOT IN');
  definition := replace(definition, 'AND payment_input->>''paymentMode'' NOT IN', 'AND coalesce(payment_input->>''paymentMode'','''') NOT IN');
  EXECUTE definition;
END $migration$;
COMMIT;
