// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Contexte Année Scolaire
// Délègue la persistance à schoolYearService
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchSchoolYearSetting, persistSchoolYearSetting } from '../services/common/schoolYearService';
import { fetchSchoolYearsList } from '../services/settings/settingsService';
import { SchoolYearItem } from '../types';

interface SchoolYearContextValue {
  schoolYear: string;
  schoolYears: string[];
  setSchoolYear: (year: string) => Promise<void>;
}

const SchoolYearContext = createContext<SchoolYearContextValue | null>(null);

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [schoolYear, setSchoolYearState] = useState<string>('2024-2025');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [schoolYearsItems, setSchoolYearsItems] = useState<SchoolYearItem[]>([]);

  const loadYearsList = useCallback(async () => {
    const list = await fetchSchoolYearsList();
    setSchoolYearsItems(list);
    const active = list.find((y) => y.isActive);
    if (active) {
      setSchoolYearState(active.label);
    }
  }, []);

  // Charger l'année scolaire et la liste dynamique
  useEffect(() => {
    fetchSchoolYearSetting().then(({ id, currentSchoolYear }) => {
      setSettingsId(id);
      if (currentSchoolYear) {
        setSchoolYearState(currentSchoolYear);
      }
    });

    loadYearsList();

    const handleYearsUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<SchoolYearItem[]>;
      if (Array.isArray(customEvt.detail)) {
        setSchoolYearsItems(customEvt.detail);
        const active = customEvt.detail.find((y) => y.isActive);
        if (active) setSchoolYearState(active.label);
      } else {
        loadYearsList();
      }
    };

    window.addEventListener('gesco_school_years_updated', handleYearsUpdated);
    window.addEventListener('storage', handleYearsUpdated);

    return () => {
      window.removeEventListener('gesco_school_years_updated', handleYearsUpdated);
      window.removeEventListener('storage', handleYearsUpdated);
    };
  }, [loadYearsList]);

  // Changer l'année scolaire
  const setSchoolYear = useCallback(async (year: string) => {
    setSchoolYearState(year);
    const newId = await persistSchoolYearSetting(settingsId, year);
    if (newId) setSettingsId(newId);
  }, [settingsId]);

  const availableYearLabels = schoolYearsItems.length > 0
    ? schoolYearsItems.map((y) => y.label)
    : [schoolYear];

  return (
    <SchoolYearContext.Provider value={{ schoolYear, schoolYears: availableYearLabels, setSchoolYear }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear(): SchoolYearContextValue {
  const ctx = useContext(SchoolYearContext);
  if (!ctx) throw new Error('useSchoolYear must be used within <SchoolYearProvider>');
  return ctx;
}
