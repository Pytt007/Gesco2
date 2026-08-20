import React from 'react';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { Menu, Moon, Sun, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import { VIEW_LABELS } from '../../constants/routes';

interface HeaderProps {
  currentView: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCommandPalette?: () => void;
  onToggleMobileMenu?: () => void;
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

export default function Header({
  currentView,
  isDarkMode,
  onToggleDarkMode,
  onOpenCommandPalette,
  onToggleMobileMenu,
}: HeaderProps) {
  const { schoolYear } = useSchoolYear();
  const { currentUser } = useAuth();
  const { schoolInfo } = useSettings();

  const groupLabel = BREADCRUMB_GROUPS[currentView] || 'GESCO';
  const pageTitle = VIEW_LABELS[currentView] || currentView;
  const schoolName = schoolInfo?.name || 'Établissement GESCO';

  return (
    <header className="header">
      
      {/* ── GAUCHE: BOUTON MENU MOBILE + FIL D'ARIANE ──────────────────────── */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {onToggleMobileMenu && (
          <button
            className="btn btn-ghost btn-sm mobile-menu-toggle"
            onClick={onToggleMobileMenu}
            aria-label="Ouvrir le menu"
            style={{ padding: '7px', borderRadius: '10px' }}
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ minWidth: 0 }}>
          <nav aria-label="Fil d'ariane" className="header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
            <span className="breadcrumb-school-name" style={{ fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {schoolName}
            </span>
            <ChevronRight size={12} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{groupLabel}</span>
            <ChevronRight size={12} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>{pageTitle}</span>
          </nav>
          <h1 className="header-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* ── DROITE: ACTIONS (RECHERCHE CTRL+K, ANNÉE, ENTERPRISE, THEME) ────── */}
      <div className="header-actions">
        
        {/* Badge Enterprise Dataviz */}
        <div className="header-badge-enterprise" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-primary-light, #eff6ff)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>
          <ShieldCheck size={14} color="var(--color-primary, #2563eb)" /> Enterprise Edition
        </div>

        {/* Raccourci Command Palette (CTRL + K) */}
        <button
          onClick={onOpenCommandPalette}
          className="btn btn-ghost btn-sm header-search-btn"
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
          <span className="search-btn-text">Recherche...</span>
          <span className="search-btn-shortcut" style={{ fontSize: '0.65rem', background: 'var(--border)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: 'var(--text-muted)' }}>
            ⌘K
          </span>
        </button>

        {/* Badge Année Scolaire Active (Lecture seule) */}
        <div
          className="header-badge-year"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: schoolYear ? 'var(--color-success-light, #ecfdf5)' : 'var(--bg-surface-hover, #f8fafc)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '5px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: schoolYear ? 'var(--color-success, #047857)' : 'var(--text-muted, #64748b)',
            boxShadow: schoolYear ? '0 2px 6px rgba(16, 185, 129, 0.1)' : 'none',
          }}
          title="Année scolaire active unique configurée dans Paramètres"
        >
          <span style={{ fontSize: '0.75rem' }}>{schoolYear ? '🟢' : '⚪'}</span>
          <span className="badge-year-prefix">Année :</span>
          <span style={{ fontWeight: 700, color: schoolYear ? 'var(--color-success, #065f46)' : 'var(--text-muted, #94a3b8)' }}>
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
