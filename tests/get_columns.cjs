const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testColumns() {
  const tables = ['students', 'parents', 'staff_members', 'expenses', 'canteen_enrollments', 'transport_lines', 'transport_enrollments', 'tuition_payments'];
  for (const t of tables) {
    const { error } = await supabase.from(t).insert({ __fake_col__: 1 });
    console.log(`Table [${t}] schema hint:`, error?.message);
  }
}

testColumns();
