// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Client Supabase Unique
// - `supabase` : Client principal (session persistée)
// - `createIsolatedClient` : Client isolé pour inscription sans déconnecter l'Admin
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://eebotkglkfwrsbgzmrbd.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlYm90a2dsa2Z3cnNiZ3ptcmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTMwNDQsImV4cCI6MjA5OTc4OTA0NH0.3FVA0PV_rHgiVwxZ8ucSB1WBtb63G0Sq5skorUiumFc';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || defaultUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || defaultKey;

// SEC-005 : Avertissement interne minimal — ne jamais exposer les noms de variables en production
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  if (import.meta.env.DEV) {
    console.warn('[GESCO] Configuration de connexion manquante. Utilisation de la configuration par défaut.');
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
