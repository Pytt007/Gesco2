import { beforeEach, afterAll, vi, expect } from 'vitest';
import { resetDatabase, closeDatabase } from './postgres';
import { seedServiceFixtures } from './fixtures';
vi.mock('../../src/services/common/supabaseClient', async () => {
  const { client } = await import('./postgres');
  return {supabase:client,database:client,createIsolatedClient:()=>client,usernameToEmail:(u:string)=>`${u.toLowerCase()}@gesco-v1.local`,emailToUsername:(e:string)=>e.replace('@gesco-v1.local','')};
});
beforeEach(async()=>{ await resetDatabase(); await seedServiceFixtures(expect.getState().testPath||''); },60000);
afterAll(closeDatabase,60000);
