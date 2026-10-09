import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { SchoolSettingsData } from '../types';

const DEFAULT_SETTINGS: SchoolSettingsData = {
  schoolName: '',
  directorName: '',
  logo: '/logo-light.png',
  email: '',
  phone: '',
  address: '',
};

/**
 * Hook pour les paramètres de l'école (ligne unique dans la table school_settings).
 * Reproduit l'API de useLocalStorage<SchoolSettingsData> avec sync Supabase.
 */
function useSupabaseSettings(): [
  SchoolSettingsData,
  (data: SchoolSettingsData) => void,
  boolean
] {
  const localKey = 'gesco_school_settings';

  const getLocalBackup = (): SchoolSettingsData => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SETTINGS;
  };

  const [settings, setSettings] = useState<SchoolSettingsData>(getLocalBackup);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  // ─── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('school_settings')
          .select('*')
          .limit(1);

        if (cancelled) return;

        if (error) {
          console.warn('[useSupabaseSettings] fetch error, fallback to localStorage:', error.message);
          setSettings(getLocalBackup());
        } else if (rows && rows.length > 0) {
          const row = rows[0];
          setRowId(row.id);
          const loadedSettings: SchoolSettingsData = {
            schoolName: row.school_name || '',
            directorName: row.director_name || '',
            logo: row.logo || '/logo-light.png',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            currentSchoolYear: row.current_school_year || '2024-2025',
          };
          setSettings(loadedSettings);
          try {
            localStorage.setItem(localKey, JSON.stringify(loadedSettings));
          } catch {}
        } else {
          setSettings(getLocalBackup());
        }
      } catch {
        if (!cancelled) setSettings(getLocalBackup());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSettings();

    // Écouter les changements des paramètres en temps réel (Realtime)
    const timer = window.setInterval(() => { if (!cancelled && document.visibilityState === 'visible') fetchSettings(); }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // ─── Setter — sauvegarde en base ET local ─────────────────────────────────
  const saveSettings = useCallback(
    async (data: SchoolSettingsData) => {
      setSettings(data);
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch {}

      const payload = {
        school_name: data.schoolName,
        director_name: data.directorName,
        logo: data.logo,
        email: data.email,
        phone: data.phone,
        address: data.address,
        current_school_year: data.currentSchoolYear || '2024-2025',
        updated_at: new Date().toISOString(),
      };

      try {
        if (rowId) {
          // Mise à jour de la ligne existante
          const { error } = await supabase
            .from('school_settings')
            .update(payload)
            .eq('id', rowId);
          if (error) console.error('[useSupabaseSettings] update error:', error.message);
        } else {
          // Première insertion
          const { data: inserted, error } = await supabase
            .from('school_settings')
            .insert(payload)
            .select('id')
            .single();
          if (error) {
            console.error('[useSupabaseSettings] insert error:', error.message);
          } else if (inserted) {
            setRowId(inserted.id);
          }
        }
      } catch (err) {
        console.error('[useSupabaseSettings] exception:', err);
      }
    },
    [rowId]
  );

  return [settings, saveSettings, loading];
}

export default useSupabaseSettings;
