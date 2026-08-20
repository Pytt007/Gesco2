const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase connection...');
  
  const tables = [
    'students',
    'parents',
    'staff',
    'classes',
    'school_settings',
    'school_years',
    'users',
    'expenses',
    'canteen_enrollments',
    'transport_lines'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (error) {
      console.log(`Table [${t}]: ERROR ->`, error.message, error.details || '', error.code);
    } else {
      console.log(`Table [${t}]: OK, count =`, data?.length);
    }
  }
}

test();
