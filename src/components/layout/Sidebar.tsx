// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Sidebar Navigation Premium (src/components/layout/Sidebar.tsx)
// Architecture 5 Domaines Métiers : Scolarité / Finance / Gestion / Analyses / Paramètres
// Rétractable, Favoris Épinglables, Groupes Repliables & Raccourci Command Palette
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, Briefcase, UtensilsCrossed,
  Bus, ClipboardList, TrendingDown, FileBarChart, BarChart2, History,
  Settings, BookOpen, LogOut, Calendar, ChevronDown, ChevronRight,
  Star, Command, PanelLeftClose, PanelLeft, DollarSign, Building2,
  BarChart3, ClipboardCheck, BookMarked, ShieldCheck, Wallet, FileText, X,
} from 'lucide-react';
import { ROLE_LABELS } from '../../constants/permissions';
import { useSettings } from '../../hooks/useSettings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  groupKey: 'SCOLARITY' | 'FINANCE' | 'GESTION' | 'ANALYSIS' | 'ADMIN';
  badge?: string;
}

interface NavGroup {
  key: 'SCOLARITY' | 'FINANCE' | 'GESTION' | 'ANALYSIS' | 'ADMIN';
  title: string;
  emoji: string;
  color: string;
}

// ─── Groupes de Navigation ────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  { key: 'SCOLARITY', title: 'SCOLARITÉ',  emoji: '🎓', color: '#6366f1' },
  { key: 'FINANCE',   title: 'FINANCE',    emoji: '💰', color: '#16a34a' },
  { key: 'GESTION',   title: 'GESTION',    emoji: '🏢', color: '#ea580c' },
  { key: 'ANALYSIS',  title: 'ANALYSES',   emoji: '📊', color: '#0284c7' },
  { key: 'ADMIN',     title: 'PARAMÈTRES', emoji: '⚙️', color: '#64748b' },
];

// ─── Items de Navigation ──────────────────────────────────────────────────────

const ALL_NAV_ITEMS: NavItem[] = [
  // 🎓 SCOLARITÉ
  { id: 'STUDENTS',    label: 'Élèves',            icon: <Users size={17} />,          groupKey: 'SCOLARITY' },
  { id: 'PARENTS',     label: 'Parents',            icon: <UserCheck size={17} />,      groupKey: 'SCOLARITY' },
  { id: 'CLASSES',     label: 'Classes',            icon: <GraduationCap size={17} />,  groupKey: 'SCOLARITY' },
  { id: 'STAFF',       label: 'Personnel',          icon: <Briefcase size={17} />,      groupKey: 'SCOLARITY' },
  { id: 'ATTENDANCE',  label: 'Présences',          icon: <ClipboardCheck size={17} />, groupKey: 'SCOLARITY' },
  { id: 'TIMETABLE',   label: 'Emploi du Temps',    icon: <Calendar size={17} />,       groupKey: 'SCOLARITY' },
  { id: 'NOTES',       label: 'Notes & Éval.',      icon: <BookOpen size={17} />,       groupKey: 'SCOLARITY' },
  { id: 'BULLETINS',   label: 'Bulletins',          icon: <FileText size={17} />,       groupKey: 'SCOLARITY' },

  // 💰 FINANCE
  { id: 'FINANCE_PAYMENTS',  label: 'Encaissements',       icon: <Wallet size={17} />,       groupKey: 'FINANCE' },
  { id: 'FINANCE_TRACKING',  label: 'Dossiers Financiers', icon: <ClipboardList size={17} />, groupKey: 'FINANCE' },

  // 🏢 GESTION
  { id: 'CANTEEN',   label: 'Cantine',   icon: <UtensilsCrossed size={17} />, groupKey: 'GESTION' },
  { id: 'TRANSPORT', label: 'Transport', icon: <Bus size={17} />,             groupKey: 'GESTION' },
  { id: 'EXPENSES',  label: 'Dépenses',  icon: <TrendingDown size={17} />,    groupKey: 'GESTION' },

  // 📊 ANALYSES
  { id: 'REPORTS',    label: 'Rapports',        icon: <FileBarChart size={17} />, groupKey: 'ANALYSIS' },
  { id: 'STATISTICS', label: 'Statistiques',    icon: <BarChart3 size={17} />,   groupKey: 'ANALYSIS' },
  { id: 'HISTORY',    label: 'Journal d\'Audit', icon: <History size={17} />,    groupKey: 'ANALYSIS' },

  // ⚙️ PARAMÈTRES
  { id: 'SETTINGS', label: 'Paramètres', icon: <Settings size={17} />, groupKey: 'ADMIN' },
];

// ─── Composant Sidebar ────────────────────────────────────────────────────────

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenCommandPalette?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  currentView,
  onNavigate,
  onOpenCommandPalette,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { currentUser, logout, canAccess } = useAuth();
  const { schoolYear } = useSchoolYear();
  const { schoolInfo } = useSettings();

  // État repli Sidebar (interne ou contrôlé)
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    return localStorage.getItem('gesco_sidebar_collapsed') === 'true';
  });

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      localStorage.setItem('gesco_sidebar_collapsed', String(next));
    }
  };

  // État groupes repliables
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gesco_sidebar_groups') || '{}');
    } catch { return {}; }
  });

  // Favoris épinglés
  const [pinnedViews, setPinnedViews] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gesco_pinned_views');
      return saved ? JSON.parse(saved) : ['STUDENTS', 'FINANCE_PAYMENTS', 'NOTES'];
    } catch { return ['STUDENTS', 'FINANCE_PAYMENTS', 'NOTES']; }
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('gesco_sidebar_groups', JSON.stringify(next));
      return next;
    });
  };

  const togglePin = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    setPinnedViews((prev) => {
      const next = prev.includes(viewId) ? prev.filter((id) => id !== viewId) : [...prev, viewId];
      localStorage.setItem('gesco_pinned_views', JSON.stringify(next));
      return next;
    });
  };

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  const visibleItems = ALL_NAV_ITEMS.filter((item) => canAccess(item.id));
  const pinnedItems = visibleItems.filter((item) => pinnedViews.includes(item.id));

  return (
    <>
      {/* Backdrop sombre sur mobile */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Navigation principale"
      >
        {/* ── BANDEAU SUPÉRIEUR (LOGO & PROFIL) ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
          flexShrink: 0,
        }}>
          {/* Ligne 1: Logo & Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
            <img
              src={schoolInfo?.logoUrl || '/gesco_logo.png'}
              alt={schoolInfo?.name || 'GESCO ERP'}
              style={{ width: 38, height: 38, borderRadius: '10px', objectFit: 'contain', background: '#ffffff', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}
            />

            {/* Bouton fermer sur mobile */}
            {isMobileOpen && (
              <button
                className="btn btn-ghost btn-sm mobile-close-btn"
                onClick={onCloseMobile}
                style={{ color: '#ffffff', padding: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            )}

            {!isCollapsed && !isMobileOpen && (
              <button
                className="btn btn-ghost btn-sm desktop-toggle-btn"
                onClick={toggleCollapse}
                title="Réduire"
                style={{ color: '#ffffff', padding: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}
              >
                <PanelLeftClose size={16} />
              </button>
            )}
            {isCollapsed && !isMobileOpen && (
              <button
                className="btn btn-ghost btn-sm desktop-toggle-btn"
                onClick={toggleCollapse}
                title="Déplier"
                style={{ color: '#ffffff', padding: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}
              >
                <PanelLeft size={16} />
              </button>
            )}
          </div>

        {/* Nom établissement */}
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.9375rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.25, wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {schoolInfo?.name || 'GESCO'}
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ERP Scolaire
            </span>
          </div>
        )}

        {/* Profil utilisateur */}
        {!isCollapsed && currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt={currentUser.fullName}
              style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                {currentUser.fullName || currentUser.username || 'Utilisateur'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 3, fontSize: '0.625rem', color: '#ffffff', fontWeight: 700, background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '2px 7px', maxWidth: 'fit-content' }}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── CORPS NAVIGATION (SCROLLABLE) ─────────────────────────────────── */}
      <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '0.375rem 0' }}>

        {/* 🔍 RACCOURCI COMMAND PALETTE */}
        {!isCollapsed && onOpenCommandPalette && (
          <div style={{ padding: '0.5rem 0.75rem 0.25rem' }}>
            <button
              onClick={onOpenCommandPalette}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.78125rem', fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <Command size={13} />
              <span style={{ flex: 1, textAlign: 'left' }}>Recherche rapide...</span>
              <span style={{ fontSize: '0.625rem', background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>⌘K</span>
            </button>
          </div>
        )}

        {/* 🏠 Dashboard */}
        {canAccess('DASHBOARD') && (
          <button
            className={`sidebar-item${currentView === 'DASHBOARD' ? ' active' : ''}`}
            onClick={() => handleNavClick('DASHBOARD')}
            style={{ margin: '0.25rem 0.625rem', borderRadius: '8px' }}
            title={isCollapsed ? 'Tableau de bord' : undefined}
          >
            <span className="sidebar-item-icon"><LayoutDashboard size={17} /></span>
            {!isCollapsed && <span style={{ fontWeight: 600 }}>Tableau de bord</span>}
          </button>
        )}

        {/* ⭐ FAVORIS ÉPINGLÉS */}
        {!isCollapsed && pinnedItems.length > 0 && (
          <div style={{ margin: '0.625rem 0 0.125rem' }}>
            <div
              className="sidebar-section-label"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 800, letterSpacing: '0.06em', fontSize: '0.6875rem' }}
            >
              <Star size={11} fill="#f59e0b" /> MES FAVORIS
            </div>
            {pinnedItems.map((item) => (
              <button
                key={`pin-${item.id}`}
                className={`sidebar-item${currentView === item.id ? ' active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                style={{ margin: '0.0625rem 0.625rem', borderRadius: '8px', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <Star
                  size={13}
                  className="sidebar-pin-star pinned"
                  fill="#f59e0b"
                  color="#f59e0b"
                  onClick={(e) => togglePin(e, item.id)}
                  title="Retirer des favoris"
                />
              </button>
            ))}
          </div>
        )}

        {/* 📂 GROUPES MÉTIERS REPLIABLES */}
        {NAV_GROUPS.map((group) => {
          const items = visibleItems.filter((i) => i.groupKey === group.key);
          if (items.length === 0) return null;
          const isGroupCollapsed = collapsedGroups[group.key];

          return (
            <div key={group.key} style={{ margin: '0.375rem 0' }}>
              {!isCollapsed ? (
                <div
                  className="sidebar-section-label"
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '0.375rem 1rem',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: group.color, fontWeight: 800, fontSize: '0.6875rem', letterSpacing: '0.06em' }}>
                    <span style={{ fontSize: '0.75rem' }}>{group.emoji}</span>
                    {group.title}
                  </span>
                  {isGroupCollapsed ? <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />}
                </div>
              ) : (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 10px' }} />
              )}

              {!isGroupCollapsed && items.map((item) => {
                const isPinned = pinnedViews.includes(item.id);
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item${currentView === item.id ? ' active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    style={{ margin: '0.0625rem 0.625rem', borderRadius: '8px', justifyContent: 'space-between' }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="sidebar-item-icon">{item.icon}</span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      <Star
                        size={13}
                        className={`sidebar-pin-star${isPinned ? ' pinned' : ''}`}
                        fill={isPinned ? '#f59e0b' : 'none'}
                        color={isPinned ? '#f59e0b' : 'var(--text-muted)'}
                        onClick={(e) => togglePin(e, item.id)}
                        title={isPinned ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        style={{ opacity: isPinned ? 1 : 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as SVGElement).style.opacity = '1'; }}
                        onMouseLeave={(e) => { (e.currentTarget as SVGElement).style.opacity = isPinned ? '1' : '0'; }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Espace en bas */}
        <div style={{ height: '1rem' }} />
      </div>

      {/* ── FOOTER UTILISATEUR & DÉCONNEXION ─────────────────────────────── */}
      {currentUser && (
        <div className="sidebar-footer" style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div
            className="sidebar-user"
            onClick={() => handleNavClick('SETTINGS')}
            title={isCollapsed ? 'Paramètres' : 'Paramètres du compte'}
            style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt={currentUser.fullName}
              className="sidebar-avatar"
              style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
            />
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>{currentUser.fullName}</div>
                <div className="sidebar-user-role" style={{ fontSize: '0.6875rem', color: '#93c5fd', fontWeight: 600 }}>
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </div>
              </div>
            )}
          </div>

          <button
            className="sidebar-item"
            onClick={logout}
            style={{ margin: '0.25rem 0.25rem 0', color: '#fca5a5', borderRadius: '8px' }}
            title={isCollapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={15} style={{ flexShrink: 0, color: '#fca5a5' }} />
            {!isCollapsed && <span style={{ color: '#fca5a5', fontSize: '0.8125rem' }}>Déconnexion</span>}
          </button>
        </div>
      )}
    </nav>
    </>
  );
}
