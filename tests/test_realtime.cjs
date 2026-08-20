const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
  console.log('Setting up realtime subscription...');
  const channel = supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'school_settings' },
      (payload) => {
        console.log('Realtime change received on school_settings:', payload);
      }
    )
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });

  setTimeout(async () => {
    console.log('Sending an update to school_settings to trigger event...');
    await supabase.from('school_settings').upsert({
      id: 'realtime_test',
      data: { test: true, timestamp: Date.now() },
      updated_at: new Date().toISOString()
    });
  }, 2000);

  setTimeout(async () => {
    await supabase.from('school_settings').delete().eq('id', 'realtime_test');
    console.log('Cleaned up. Closing subscription.');
    supabase.removeChannel(channel);
    process.exit(0);
  }, 5000);
}

testRealtime();
