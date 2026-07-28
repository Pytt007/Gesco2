// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Contexte Année Scolaire
// Délègue la persistance à schoolYearService
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchSchoolYearSetting, persistSchoolYearSetting } from '../services/common/schoolYearService';
import { SCHOOL_YEARS } from '../constants/config';

interface SchoolYearContextValue {
  schoolYear: string;
  schoolYears: string[];
  setSchoolYear: (year: string) => Promise<void>;
}

const SchoolYearContext = createContext<SchoolYearContextValue | null>(null);

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [schoolYear, setSchoolYearState] = useState<string>('2024-2025');
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Charger l'année scolaire depuis schoolYearService
  useEffect(() => {
    fetchSchoolYearSetting().then(({ id, currentSchoolYear }) => {
      setSettingsId(id);
      if (currentSchoolYear) {
        setSchoolYearState(currentSchoolYear);
      }
    });
  }, []);

  // Changer l'année scolaire
  const setSchoolYear = useCallback(async (year: string) => {
    setSchoolYearState(year);
    const newId = await persistSchoolYearSetting(settingsId, year);
    if (newId) setSettingsId(newId);
  }, [settingsId]);

  return (
    <SchoolYearContext.Provider value={{ schoolYear, schoolYears: SCHOOL_YEARS, setSchoolYear }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear(): SchoolYearContextValue {
  const ctx = useContext(SchoolYearContext);
  if (!ctx) throw new Error('useSchoolYear must be used within <SchoolYearProvider>');
  return ctx;
}
