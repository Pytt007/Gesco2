// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Client Supabase Unique
// - `supabase` : Client principal (session persistée)
// - `createIsolatedClient` : Client isolé pour inscription sans déconnecter l'Admin
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn('[GESCO] Variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes dans votre fichier .env.local.');
  }
}

/** Client principal — session persistée dans localStorage */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'gesco-session',
  },
});

/** Client Supabase isolé sans persistance de session */
export function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `gesco-isolated-${Date.now()}`,
    },
  });
}

/** Convertit un identifiant en email synthétique pour Supabase Auth */
export const usernameToEmail = (username: string): string =>
  `${username.toLowerCase().trim()}@gesco-v1.local`;

/** Extrait l'identifiant depuis un email synthétique */
export const emailToUsername = (email: string): string =>
  email.replace('@gesco-v1.local', '');
