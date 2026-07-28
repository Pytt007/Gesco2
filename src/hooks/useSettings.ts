// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook Paramètres
// Hook encapsulant la logique d'état et d'appel aux services Paramètres
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  fetchSchoolInfo,
  updateSchoolInfo,
  fetchSchoolYearsList,
  saveSchoolYearsList,
  setActiveSchoolYear,
  closeSchoolYear,
  fetchAcademicTermsList,
  saveAcademicTermsList,
  fetchGeneralConfig,
  updateGeneralConfig,
} from '../services/settings/settingsService';
import { SchoolInfo, SchoolYearItem, AcademicTerm, GeneralConfig } from '../types';

export function useSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYearItem[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig | null>(null);

  const loadAllSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [info, years, terms, config] = await Promise.all([
        fetchSchoolInfo(),
        fetchSchoolYearsList(),
        fetchAcademicTermsList(),
        fetchGeneralConfig(),
      ]);
      setSchoolInfo(info);
      setSchoolYears(years);
      setAcademicTerms(terms);
      setGeneralConfig(config);
    } catch (err: any) {
      console.error('[useSettings] Erreur de chargement:', err);
      setError(err.message || 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);

  // Sauvegarder les infos établissement
  const handleSaveSchoolInfo = async (info: SchoolInfo): Promise<{ error?: string }> => {
    if (!info.name.trim()) return { error: 'Le nom de l\'établissement est requis.' };
    if (!info.email.trim()) return { error: 'L\'email est requis.' };

    setSaving(true);
    const res = await updateSchoolInfo(info);
    if (!res.error) setSchoolInfo(info);
    setSaving(false);
    return res;
  };

  // Créer une nouvelle année scolaire
  const handleAddSchoolYear = async (newYear: { label: string; startDate: string; endDate: string }): Promise<{ error?: string }> => {
    if (!newYear.label.trim()) return { error: 'Le libellé est requis.' };
    if (newYear.startDate >= newYear.endDate) return { error: 'La date de début doit être antérieure à la date de fin.' };

    setSaving(true);
    const newItem: SchoolYearItem = {
      id: `sy-${Date.now()}`,
      label: newYear.label.trim(),
      startDate: newYear.startDate,
      endDate: newYear.endDate,
      isActive: false,
      isClosed: false,
    };
    const updated = [...schoolYears, newItem];
    const res = await saveSchoolYearsList(updated);
    if (!res.error) setSchoolYears(updated);
    setSaving(false);
    return res;
  };

  // Activer une année scolaire (désactive toutes les autres)
  const handleActivateSchoolYear = async (yearId: string): Promise<{ error?: string }> => {
    setSaving(true);
    const res = await setActiveSchoolYear(yearId);
    if (!res.error) {
      setSchoolYears((prev) => prev.map((y) => ({ ...y, isActive: y.id === yearId })));
    }
    setSaving(false);
    return res;
  };

  // Clôturer une année scolaire
  const handleCloseSchoolYear = async (yearId: string): Promise<{ error?: string }> => {
    setSaving(true);
    const res = await closeSchoolYear(yearId);
    if (!res.error) {
      setSchoolYears((prev) => prev.map((y) => (y.id === yearId ? { ...y, isClosed: true, isActive: false } : y)));
    }
    setSaving(false);
    return res;
  };

  // Sauvegarder les trimestres
  const handleSaveTerms = async (terms: AcademicTerm[]): Promise<{ error?: string }> => {
    setSaving(true);
    const res = await saveAcademicTermsList(terms);
    if (!res.error) setAcademicTerms(terms);
    setSaving(false);
    return res;
  };

  // Sauvegarder la configuration générale
  const handleSaveGeneralConfig = async (config: GeneralConfig): Promise<{ error?: string }> => {
    setSaving(true);
    const res = await updateGeneralConfig(config);
    if (!res.error) setGeneralConfig(config);
    setSaving(false);
    return res;
  };

  return {
    loading,
    saving,
    error,
    schoolInfo,
    schoolYears,
    academicTerms,
    generalConfig,
    reload: loadAllSettings,
    saveSchoolInfo: handleSaveSchoolInfo,
    addSchoolYear: handleAddSchoolYear,
    activateSchoolYear: handleActivateSchoolYear,
    closeSchoolYear: handleCloseSchoolYear,
    saveTerms: handleSaveTerms,
    saveGeneralConfig: handleSaveGeneralConfig,
  };
}
