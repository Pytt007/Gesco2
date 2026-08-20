const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectColumns() {
  const tables = [
    'school_settings',
    'staff_members',
    'students',
    'parents',
    'classes',
    'classrooms',
    'subjects',
    'school_years',
    'profiles',
    'expenses',
    'tuition_payments',
    'canteen_enrollments',
    'canteen_periods',
    'transport_lines',
    'transport_enrollments',
    'transport_periods',
    'staff_attendance',
    'assessment_sessions',
    'assessment_results',
    'report_cards'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`Table [${t}] sample row keys:`, data[0] ? Object.keys(data[0]) : 'empty table');
    }
  }
}

inspectColumns();
