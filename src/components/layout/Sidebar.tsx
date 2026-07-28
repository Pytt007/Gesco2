import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, Briefcase, UtensilsCrossed,
  Bus, Trophy, ClipboardList, TrendingDown, FileBarChart,
  History, BarChart2, Settings, BookOpen, LogOut, Calendar,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'DASHBOARD',   label: 'Tableau de Bord',  icon: <LayoutDashboard size={18} />,   section: 'NAVIGATION' },
  { id: 'STUDENTS',    label: 'Élèves',            icon: <Users size={18} />,             section: 'SCOLAIRE' },
  { id: 'PARENTS',     label: 'Parents',           icon: <UserCheck size={18} />,         section: 'SCOLAIRE' },
  { id: 'CLASSES',     label: 'Classes',           icon: <GraduationCap size={18} />,     section: 'SCOLAIRE' },
  { id: 'STAFF',            label: 'Personnel',          icon: <Briefcase size={18} />,         section: 'SCOLAIRE' },
  { id: 'STAFF_ATTENDANCE', label: 'Présence Personnel', icon: <UserCheck size={18} />,         section: 'SCOLAIRE' },
  { id: 'TIMETABLE',        label: 'Emploi du Temps',    icon: <Calendar size={18} />,          section: 'SCOLAIRE' },
  { id: 'ATTENDANCE',  label: 'Présences',         icon: <UserCheck size={18} />,         section: 'SCOLAIRE' },
  { id: 'NOTES',       label: 'Notes & Éval.',     icon: <BookOpen size={18} />,          section: 'SCOLAIRE' },
  { id: 'ACTIVITIES',  label: 'Activités',         icon: <Trophy size={18} />,            section: 'SCOLAIRE' },
  { id: 'CANTEEN',     label: 'Cantine',           icon: <UtensilsCrossed size={18} />,   section: 'SERVICES' },
  { id: 'TRANSPORT',   label: 'Transport',         icon: <Bus size={18} />,               section: 'SERVICES' },
  { id: 'SCOLARITY',   label: 'Scolarité',         icon: <ClipboardList size={18} />,     section: 'FINANCE' },
  { id: 'EXPENSES',    label: 'Dépenses',          icon: <TrendingDown size={18} />,      section: 'FINANCE' },
  { id: 'REPORTS',     label: 'Rapports',          icon: <FileBarChart size={18} />,      section: 'FINANCE' },
  { id: 'STATISTICS',  label: 'Statistiques',      icon: <BarChart2 size={18} />,         section: 'GESTION' },
  { id: 'HISTORY',     label: 'Historique',        icon: <History size={18} />,           section: 'GESTION' },
  { id: 'SETTINGS',    label: 'Paramètres',        icon: <Settings size={18} />,          section: 'GESTION' },
];

const SECTIONS = ['NAVIGATION', 'SCOLAIRE', 'SERVICES', 'FINANCE', 'GESTION'];

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

import { ROLE_LABELS } from '../../constants/permissions';

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { currentUser, logout, canAccess } = useAuth();
  const { schoolYear } = useSchoolYear();

  const visibleItems = ALL_NAV_ITEMS.filter((item) => canAccess(item.id));

  return (
    <nav className="sidebar" aria-label="Navigation principale">
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="/logo-dark.png"
          alt="GESCO"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">GESCO</span>
          <span className="sidebar-logo-subtitle">Gestion Scolaire</span>
        </div>
      </div>

      {/* Année scolaire (badge) */}
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          background: 'rgba(79,70,229,0.2)',
          borderRadius: '6px',
          padding: '0.25rem 0.6rem',
          letterSpacing: '0.04em',
        }}>
          📅 Année {schoolYear}
        </span>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {SECTIONS.map((section) => {
          const items = visibleItems.filter((item) => item.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section}>
              {section !== 'NAVIGATION' && (
                <div className="sidebar-section-label">{section}</div>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-item${currentView === item.id ? ' active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  id={`nav-${item.id.toLowerCase()}`}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer Utilisateur */}
      {currentUser && (
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => onNavigate('SETTINGS')} title="Paramètres du compte">
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt={currentUser.fullName}
              className="sidebar-avatar"
            />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentUser.fullName}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[currentUser.role] || currentUser.role}</div>
            </div>
          </div>
          <button
            className="sidebar-item"
            onClick={logout}
            style={{ marginTop: '0.25rem', color: 'rgba(239,68,68,0.8)' }}
            id="btn-logout"
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}
