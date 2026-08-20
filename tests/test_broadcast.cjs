const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkofvccysqlacyysujdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';

const clientA = createClient(supabaseUrl, supabaseAnonKey);
const clientB = createClient(supabaseUrl, supabaseAnonKey);

async function testBroadcast() {
  console.log('Testing Supabase Realtime Broadcast between Client A and Client B...');
  
  const channelB = clientB.channel('gesco-sync-channel');
  let received = false;

  channelB.on('broadcast', { event: 'db_change' }, (payload) => {
    console.log('Client B received broadcast:', payload);
    received = true;
  });

  channelB.subscribe(async (status) => {
    console.log('Client B subscription status:', status);
    if (status === 'SUBSCRIBED') {
      const channelA = clientA.channel('gesco-sync-channel');
      channelA.subscribe(async (statusA) => {
        if (statusA === 'SUBSCRIBED') {
          console.log('Client A sending broadcast event...');
          await channelA.send({
            type: 'broadcast',
            event: 'db_change',
            payload: { table: 'staff_members', action: 'create', id: '123' },
          });
        }
      });
    }
  });

  setTimeout(() => {
    console.log('Broadcast test result:', received ? '✅ SUCCESS' : '❌ FAILED');
    process.exit(0);
  }, 4000);
}

testBroadcast();
