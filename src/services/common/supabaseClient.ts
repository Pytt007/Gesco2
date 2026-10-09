import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataUrl = import.meta.env.VITE_NEON_DATA_API_URL;
const proxyAuthUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth` : authUrl;
function makeClient(isolated = false) {
  if (!authUrl || !dataUrl) throw new Error('Configuration Neon manquante : VITE_NEON_AUTH_URL et VITE_NEON_DATA_API_URL.');
  return createClient({
    // Same-origin auth lets the server proxy keep the recovery address private.
    auth: { url: proxyAuthUrl, adapter: SupabaseAuthAdapter(isolated ? { fetchOptions: { credentials: 'omit' } } : {}) },
    dataApi: { url: dataUrl },
  });
}
export const database = makeClient();
// Compatibility alias for existing PostgREST callers; all requests go to Neon.
export const supabase = database;
export const createIsolatedClient = () => makeClient(true);
export const usernameToEmail = (username: string): string => {
  const value = username.toLowerCase().trim();
  return value.includes('@') ? value : `${value}@gesco-v1.local`;
};
export const emailToUsername = (email: string): string => email.replace('@gesco-v1.local', '');
