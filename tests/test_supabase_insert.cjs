const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing insert into students...');
  const testStudentId = '00000000-0000-0000-0000-000000000001';
  const studentRes = await supabase.from('students').insert({
    id: testStudentId,
    matricule: 'MAT-TEST-001',
    first_name: 'Test',
    last_name: 'User',
    gender: 'M',
    birth_date: '2014-06-15',
    nationality: 'Ivoirienne',
    status: 'ACTIVE',
  });
  console.log('Student insert result:', studentRes);

  console.log('Testing insert into parents...');
  const testParentId = '00000000-0000-0000-0000-000000000002';
  const parentRes = await supabase.from('parents').insert({
    id: testParentId,
    first_name: 'Parent',
    last_name: 'Test',
    phone: '0102030405',
  });
  console.log('Parent insert result:', parentRes);

  // Clean up
  await supabase.from('students').delete().eq('id', testStudentId);
  await supabase.from('parents').delete().eq('id', testParentId);
}

testInsert();
