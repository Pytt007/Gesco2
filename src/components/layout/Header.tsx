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
  // Standalone
  DASHBOARD:          'Tableau de bord',

  // 🎓 Scolarité
  STUDENTS:           'Scolarité',
  PARENTS:            'Scolarité',
  CLASSES:            'Scolarité',
  STAFF:              'Scolarité',
  ATTENDANCE:         'Scolarité',
  STAFF_ATTENDANCE:   'Scolarité',
  TIMETABLE:          'Scolarité',
  NOTES:              'Scolarité',
  BULLETINS:          'Scolarité',
  REPORT_CARDS:       'Scolarité',

  // 💰 Finance
  FINANCE_PAYMENTS:   'Finance',
  FINANCE_TRACKING:   'Finance',
  SCOLARITY:          'Finance',

  // 🏢 Gestion
  CANTEEN:            'Gestion',
  TRANSPORT:          'Gestion',
  EXPENSES:           'Gestion',

  // 📊 Analyses
  REPORTS:            'Analyses',
  STATISTICS:         'Analyses',
  HISTORY:            'Analyses',

  // ⚙️ Paramètres
  SETTINGS:           'Paramètres',

  // ⚠️ DEV ONLY
  DEV_PORTAL:         '⚡ Dev',
};

export default function Header({ currentView, isDarkMode, onToggleDarkMode, onOpenCommandPalette }: HeaderProps) {
  const { schoolYear } = useSchoolYear();
  const { currentUser } = useAuth();
  const { schoolInfo } = useSettings();

  const groupLabel = BREADCRUMB_GROUPS[currentView] || 'GESCO';
  const pageTitle = VIEW_LABELS[currentView] || currentView;
  const schoolName = schoolInfo?.name || 'Établissement GESCO';

  return (
    <header className="header" style={{ padding: '0.875rem 2rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
      
      {/* ── FIL D'ARIANE (BREADCRUMB DATAVIZ) ────────────────────────────────── */}
      <div>
        <nav aria-label="Fil d'ariane" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>
            {schoolName}
          </span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{groupLabel}</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 700, color: '#2563eb' }}>{pageTitle}</span>
        </nav>
        <h1 className="header-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary, #0f172a)' }}>
          {pageTitle}
        </h1>
      </div>

      {/* ── ACTIONS DROITE (RECHERCHE CTRL+K, ANNÉE, ENTERPRISE BADGE, THEME) ── */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Badge Enterprise Dataviz */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-primary-light, #eff6ff)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>
          <ShieldCheck size={14} color="var(--color-primary, #2563eb)" /> Enterprise Edition
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
          <Search size={14} color="var(--color-primary, #2563eb)" />
          <span>Recherche...</span>
          <span style={{ fontSize: '0.65rem', background: 'var(--border)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: 'var(--text-muted)' }}>
            ⌘K
          </span>
        </button>

        {/* Badge Année Scolaire Active (Lecture seule) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: schoolYear ? 'var(--color-success-light, #ecfdf5)' : 'var(--bg-surface-hover, #f8fafc)',
            border: schoolYear ? '1px solid var(--border)' : '1px solid var(--border)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: schoolYear ? 'var(--color-success, #047857)' : 'var(--text-muted, #64748b)',
            boxShadow: schoolYear ? '0 2px 6px rgba(16, 185, 129, 0.1)' : 'none',
          }}
          title="Année scolaire active unique configurée dans Paramètres"
        >
          <span style={{ fontSize: '0.75rem' }}>{schoolYear ? '🟢' : '⚪'}</span>
          <span>Année scolaire active :</span>
          <span style={{ fontWeight: 500, color: schoolYear ? 'var(--color-success, #065f46)' : 'var(--text-muted, #94a3b8)' }}>
            {schoolYear || 'Non configurée'}
          </span>
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
