// Global test setup for Vitest with jsdom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const createMockChain = () => {
  const chain: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'single') return async () => ({ data: null, error: { message: 'Supabase mock fallback' } });
      if (prop === 'maybeSingle') return async () => ({ data: null, error: null });
      if (prop === 'then') return (resolve: any) => resolve({ data: null, error: { message: 'Supabase mock fallback' } });
      if (typeof prop === 'symbol') return undefined;
      return () => chain;
    }
  });
  return chain;
};

vi.mock('../src/services/common/supabaseClient', () => {
  return {
    supabase: {
      from: () => createMockChain(),
      rpc: async () => ({ data: null, error: { message: 'Supabase mock fallback' } }),
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
    },
    createIsolatedClient: () => ({
      from: () => createMockChain(),
      auth: {
        signUp: async () => ({ data: { user: null }, error: null }),
      },
    }),
    usernameToEmail: (u: string) => `${u.toLowerCase().trim()}@gesco-v1.local`,
    emailToUsername: (e: string) => e.replace('@gesco-v1.local', ''),
  };
});

