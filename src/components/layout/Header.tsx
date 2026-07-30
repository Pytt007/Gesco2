// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Header Header & Breadcrumb (src/components/layout/Header.tsx)
// Fil d'Ariane dynamique, Sélecteur d'Année, Raccourci Command Palette & Mode Sombre
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { CalendarRange, Moon, Sun, ChevronDown, ChevronRight, Search, Command, Sparkles, ShieldCheck, Building2 } from 'lucide-react';
import { VIEW_LABELS } from '../../constants/routes';

interface HeaderProps {
  currentView: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCommandPalette?: () => void;
}

// Mappage du Groupe Métier pour le Fil d'Ariane
const BREADCRUMB_GROUPS: Record<string, string> = {
  DASHBOARD: 'Tableau de bord',
  STUDENTS: 'Pédagogie',
  PARENTS: 'Pédagogie',
  CLASSES: 'Pédagogie',
  STAFF: 'Pédagogie',
  ATTENDANCE: 'Pédagogie',
  TIMETABLE: 'Pédagogie',
  NOTES: 'Pédagogie',
  REPORT_CARDS: 'Pédagogie',
  SCOLARITY: 'Finances',
  CANTEEN: 'Finances',
  TRANSPORT: 'Finances',
  EXPENSES: 'Finances',
  REPORTS: 'Analyses',
  STATISTICS: 'Analyses',
  SETTINGS: 'Administration',
  HISTORY: 'Administration',
};

export default function Header({ currentView, isDarkMode, onToggleDarkMode, onOpenCommandPalette }: HeaderProps) {
  const { schoolYear, schoolYears, setSchoolYear } = useSchoolYear();
  const { currentUser } = useAuth();
  const { schoolInfo } = useSettings();
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const handleYearChange = async (year: string) => {
    await setSchoolYear(year);
    setYearDropdownOpen(false);
  };

  const groupLabel = BREADCRUMB_GROUPS[currentView] || 'GESCO';
  const pageTitle = VIEW_LABELS[currentView] || currentView;
  const schoolName = schoolInfo?.name || 'Établissement GESCO';

  return (
    <header className="header" style={{ padding: '0.875rem 2rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
      
      {/* ── FIL D'ARIANE (BREADCRUMB DATAVIZ) ────────────────────────────────── */}
      <div>
        <nav aria-label="Fil d'ariane" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 700, color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Building2 size={13} color="#2563eb" /> {schoolName}
          </span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{groupLabel}</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 700, color: '#2563eb' }}>{pageTitle}</span>
        </nav>
        <h1 className="header-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
          {pageTitle}
        </h1>
      </div>

      {/* ── ACTIONS DROITE (RECHERCHE CTRL+K, ANNÉE, ENTERPRISE BADGE, THEME) ── */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Badge Enterprise Dataviz */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8' }}>
          <ShieldCheck size={14} color="#2563eb" /> Enterprise Edition
        </div>

        {/* Raccourci Command Palette (CTRL + K) */}
        <button
          onClick={onOpenCommandPalette}
          className="btn btn-ghost btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '6px 14px',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
          title="Rechercher partout (CTRL + K)"
        >
          <Search size={14} color="#2563eb" />
          <span>Recherche...</span>
          <span style={{ fontSize: '0.65rem', background: 'var(--border)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: 'var(--text-muted)' }}>
            ⌘K
          </span>
        </button>

        {/* Sélecteur d'Année Scolaire Bouton Bleu Royal */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-year-selector"
            className="btn"
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            aria-expanded={yearDropdownOpen}
            aria-haspopup="listbox"
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.8125rem', background: '#2563eb', color: '#ffffff', border: 'none', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)' }}
          >
            <CalendarRange size={15} style={{ color: '#ffffff' }} />
            <span style={{ fontWeight: 700 }}>{schoolYear}</span>
            <ChevronDown
              size={13}
              style={{
                color: '#ffffff',
                transform: yearDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {yearDropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setYearDropdownOpen(false)}
              />
              <div
                role="listbox"
                aria-label="Sélectionner l'année scolaire"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  minWidth: '160px',
                  overflow: 'hidden',
                  animation: 'slideUp 0.15s ease',
                }}
              >
                {schoolYears.map((year) => (
                  <button
                    key={year}
                    role="option"
                    aria-selected={year === schoolYear}
                    onClick={() => handleYearChange(year)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: year === schoolYear ? 700 : 500,
                      color: year === schoolYear ? '#4f46e5' : 'var(--text-primary)',
                      background: year === schoolYear ? 'var(--color-primary-light)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {year} {year === schoolYear ? '✓' : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bouton Mode Sombre / Clair */}
        <button
          id="btn-toggle-theme"
          className="btn btn-ghost btn-sm"
          onClick={onToggleDarkMode}
          aria-label={isDarkMode ? 'Passer au mode clair' : 'Passer au mode sombre'}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          style={{ padding: '8px', borderRadius: '10px' }}
        >
          {isDarkMode ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} />}
        </button>

      </div>
    </header>
  );
}
