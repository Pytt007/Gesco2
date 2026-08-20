const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  const potentialTables = [
    'students',
    'parents',
    'parent_relationships',
    'staff',
    'staff_members',
    'teachers',
    'classes',
    'classrooms',
    'school_levels',
    'school_cycles',
    'subjects',
    'subject_categories',
    'subject_components',
    'level_subjects',
    'school_years',
    'school_settings',
    'general_config',
    'profiles',
    'users',
    'expenses',
    'expense_categories',
    'tuition_fees',
    'tuition_payments',
    'fee_schedules',
    'canteen_enrollments',
    'canteen_fees',
    'canteen_payments',
    'canteen_periods',
    'transport_lines',
    'transport_enrollments',
    'transport_periods',
    'transport_vehicles',
    'transport_drivers',
    'student_documents',
    'medical_records',
    'student_history',
    'attendance',
    'staff_attendance',
    'timetables',
    'assessment_sessions',
    'assessment_results',
    'report_cards'
  ];

  console.log('--- Inspecting Table Status ---');
  for (const t of potentialTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`[${t}]: ❌ ${error.code} - ${error.message}`);
    } else {
      console.log(`[${t}]: ✅ Available (sample count: ${data.length})`);
    }
  }
}

inspectSchema();
