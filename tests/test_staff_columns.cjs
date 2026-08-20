const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStaff() {
  const id = '00000000-0000-0000-0000-000000000099';
  const res = await supabase.from('staff_members').insert({
    id,
    first_name: 'Jean',
    last_name: 'Kouassi',
    role: 'TEACHER',
    email: 'jean.kouassi@test.local',
    phone: '0102030405',
    hire_date: '2025-09-01',
    base_salary: 250000,
    status: 'ACTIVE'
  }).select();
  console.log('Staff insert:', res);
  if (res.data) {
    console.log('Staff inserted row keys:', Object.keys(res.data[0]));
    await supabase.from('staff_members').delete().eq('id', id);
  }
}

testStaff();
