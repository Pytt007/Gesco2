-- Align financial expense access with the GESCO UI roles. Run after 007.
BEGIN;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['expense_categories', 'expense_budgets', 'expenses'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS module_read ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS module_write ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS expense_read ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS expense_write ON public.%I', table_name);
    EXECUTE format('REVOKE DELETE ON public.%I FROM authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY expense_read ON public.%I FOR SELECT TO authenticated USING (public.gesco_role() IN (''ADMIN_GENERALE'', ''DIRECTEUR''))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY expense_write ON public.%I FOR ALL TO authenticated USING (public.gesco_role() IN (''ADMIN_GENERALE'', ''DIRECTEUR'')) WITH CHECK (public.gesco_role() IN (''ADMIN_GENERALE'', ''DIRECTEUR''))',
      table_name
    );
  END LOOP;
END $$;

COMMIT;
