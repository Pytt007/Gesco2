-- Give canteen and transport operators access only to their module's legacy settings rows.
-- General school settings remain restricted by the policies in 001_core.sql.
CREATE POLICY settings_canteen_read ON public.school_settings
  FOR SELECT TO authenticated
  USING (
    id IN ('canteen_fee_schedules', 'canteen_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_CANTINE')
  );
CREATE POLICY settings_canteen_write ON public.school_settings
  FOR ALL TO authenticated
  USING (
    id IN ('canteen_fee_schedules', 'canteen_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_CANTINE')
  )
  WITH CHECK (
    id IN ('canteen_fee_schedules', 'canteen_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_CANTINE')
  );
CREATE POLICY settings_transport_read ON public.school_settings
  FOR SELECT TO authenticated
  USING (
    id IN ('transport_lines_data', 'transport_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_TRANSPORT')
  );
CREATE POLICY settings_transport_write ON public.school_settings
  FOR ALL TO authenticated
  USING (
    id IN ('transport_lines_data', 'transport_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_TRANSPORT')
  )
  WITH CHECK (
    id IN ('transport_lines_data', 'transport_enrollments_data')
    AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_TRANSPORT')
  );
