// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Sidebar Navigation Premium (src/components/layout/Sidebar.tsx)
// Rétractable, Favoris Épinglables, Groupes Repliables & Raccourci Command Palette
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, Briefcase, UtensilsCrossed,
  Bus, Trophy, ClipboardList, TrendingDown, FileBarChart,
  History, BarChart2, Settings, BookOpen, LogOut, Calendar,
  ChevronDown, ChevronRight, Star, Command, PanelLeftClose, PanelLeft,
  ShieldCheck, Search
} from 'lucide-react';
import { ROLE_LABELS } from '../../constants/permissions';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  groupKey: 'PEDAGOGY' | 'FINANCE' | 'ANALYSIS' | 'ADMINISTRATION';
  badge?: string;
}

interface NavGroup {
  key: 'PEDAGOGY' | 'FINANCE' | 'ANALYSIS' | 'ADMINISTRATION';
  title: string;
  icon: React.ReactNode;
}

const NAV_GROUPS: NavGroup[] = [
  { key: 'PEDAGOGY', title: 'PÉDAGOGIE', icon: <GraduationCap size={13} /> },
  { key: 'FINANCE', title: 'FINANCES', icon: <TrendingDown size={13} /> },
  { key: 'ANALYSIS', title: 'ANALYSES', icon: <FileBarChart size={13} /> },
  { key: 'ADMINISTRATION', title: 'ADMINISTRATION', icon: <Settings size={13} /> },
];

const ALL_NAV_ITEMS: NavItem[] = [
  // PÉDAGOGIE
  { id: 'STUDENTS', label: 'Élèves', icon: <Users size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'PARENTS', label: 'Parents', icon: <UserCheck size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'CLASSES', label: 'Classes', icon: <GraduationCap size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'STAFF', label: 'Personnel', icon: <Briefcase size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'ATTENDANCE', label: 'Présences', icon: <UserCheck size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'TIMETABLE', label: 'Emploi du Temps', icon: <Calendar size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'NOTES', label: 'Notes & Éval.', icon: <BookOpen size={18} />, groupKey: 'PEDAGOGY' },
  { id: 'REPORT_CARDS', label: 'Bulletins', icon: <FileBarChart size={18} />, groupKey: 'PEDAGOGY' },

  // FINANCES
  { id: 'SCOLARITY', label: 'Scolarité', icon: <ClipboardList size={18} />, groupKey: 'FINANCE' },
  { id: 'CANTEEN', label: 'Cantine', icon: <UtensilsCrossed size={18} />, groupKey: 'FINANCE' },
  { id: 'TRANSPORT', label: 'Transport', icon: <Bus size={18} />, groupKey: 'FINANCE' },
  { id: 'EXPENSES', label: 'Dépenses', icon: <TrendingDown size={18} />, groupKey: 'FINANCE' },

  // ANALYSES
  { id: 'REPORTS', label: 'Rapports', icon: <FileBarChart size={18} />, groupKey: 'ANALYSIS' },
  { id: 'STATISTICS', label: 'Statistiques', icon: <BarChart2 size={18} />, groupKey: 'ANALYSIS' },

  // ADMINISTRATION
  { id: 'SETTINGS', label: 'Paramètres', icon: <Settings size={18} />, groupKey: 'ADMINISTRATION' },
  { id: 'HISTORY', label: 'Journal d\'Audit', icon: <History size={18} />, groupKey: 'ADMINISTRATION' },
];

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenCommandPalette?: () => void;
}

export default function Sidebar({ currentView, onNavigate, onOpenCommandPalette }: SidebarProps) {
  const { currentUser, logout, canAccess } = useAuth();
  const { schoolYear } = useSchoolYear();

  // État de repli de la Sidebar (Compact vs Étendu)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('gesco_sidebar_collapsed') === 'true';
  });

  // État des groupes repliables
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // État des favoris épinglés (stocké en local)
  const [pinnedViews, setPinnedViews] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gesco_pinned_views');
      return saved ? JSON.parse(saved) : ['STUDENTS', 'SCOLARITY', 'NOTES'];
    } catch {
      return ['STUDENTS', 'SCOLARITY', 'NOTES'];
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('gesco_sidebar_collapsed', String(next));
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePin = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    setPinnedViews((prev) => {
      const next = prev.includes(viewId) ? prev.filter((id) => id !== viewId) : [...prev, viewId];
      localStorage.setItem('gesco_pinned_views', JSON.stringify(next));
      return next;
    });
  };

  const visibleItems = ALL_NAV_ITEMS.filter((item) => canAccess(item.id));
  const pinnedItems = visibleItems.filter((item) => pinnedViews.includes(item.id));

  return (
    <nav
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Navigation principale"
      style={{
        width: isCollapsed ? '72px' : '250px',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── BANDEAU BLEU ROYAL SUPÉRIEUR (LOGO & PROFIL) ───────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#ffffff',
        padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
      }}>
        {/* Ligne Logo & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              fontWeight: 900,
              fontSize: '1rem',
              color: '#ffffff',
            }}>
              G
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.0625rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                  GESCO
                </span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ERP Scolaire
                </span>
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Déplier' : 'Réduire'}
            style={{ color: '#ffffff', padding: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Profil Utilisateur Intégré au Bandeau Violet (Format Dataviz Mockup) */}
        {!isCollapsed && currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '0.625rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt={currentUser.fullName}
              style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.84375rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.fullName}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── LISTE DE NAVIGATION PRINCIPALE ─────────────────────────────────── */}
      <div className="sidebar-nav" style={{ padding: '0.5rem 0' }}>
        
        {/* 🏠 Dashboard */}
        {canAccess('DASHBOARD') && (
          <button
            className={`sidebar-item${currentView === 'DASHBOARD' ? ' active' : ''}`}
            onClick={() => onNavigate('DASHBOARD')}
            style={{ margin: '0.125rem 0.75rem', borderRadius: '8px' }}
          >
            <span className="sidebar-item-icon"><LayoutDashboard size={18} /></span>
            {!isCollapsed && <span>Tableau de bord</span>}
          </button>
        )}

        {/* ⭐ FAVORIS ÉPINGLÉS */}
        {!isCollapsed && pinnedItems.length > 0 && (
          <div style={{ margin: '0.75rem 0 0.25rem' }}>
            <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
              <Star size={12} fill="#f59e0b" /> FAVORIS ÉPINGLÉS
            </div>
            {pinnedItems.map((item) => (
              <button
                key={`pin-${item.id}`}
                className={`sidebar-item${currentView === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
                style={{ margin: '0.0625rem 0.75rem', borderRadius: '8px', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <Star
                  size={15}
                  className="sidebar-pin-star pinned"
                  onClick={(e) => togglePin(e, item.id)}
                  title="Désépingler"
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
            <div key={group.key} style={{ margin: '0.5rem 0' }}>
              {!isCollapsed ? (
                <div
                  className="sidebar-section-label"
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{group.icon} {group.title}</span>
                  {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </div>
              ) : (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 12px' }} />
              )}

              {!isGroupCollapsed &&
                items.map((item) => {
                  const isPinned = pinnedViews.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-item${currentView === item.id ? ' active' : ''}`}
                      onClick={() => onNavigate(item.id)}
                      style={{ margin: '0.0625rem 0.75rem', borderRadius: '8px', justifyContent: 'space-between' }}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>

                      {!isCollapsed && (
                        <Star
                          size={15}
                          className={`sidebar-pin-star${isPinned ? ' pinned' : ''}`}
                          onClick={(e) => togglePin(e, item.id)}
                          title={isPinned ? 'Désépingler' : 'Épingler dans les favoris'}
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* ── FOOTER UTILISATEUR & DÉCONNEXION ─────────────────────────────────── */}
      {currentUser && (
        <div className="sidebar-footer" style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--border)' }}>
          <div
            className="sidebar-user"
            onClick={() => onNavigate('SETTINGS')}
            title="Paramètres du compte"
            style={{ padding: '0.5rem', borderRadius: '8px' }}
          >
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt={currentUser.fullName}
              className="sidebar-avatar"
              style={{ width: 34, height: 34 }}
            />
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name" style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>{currentUser.fullName}</div>
                <div className="sidebar-user-role" style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </div>
              </div>
            )}
          </div>

          <button
            className="sidebar-item"
            onClick={logout}
            style={{ margin: '0.25rem 0.5rem 0', color: '#ef4444', borderRadius: '8px' }}
            title={isCollapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      )}
    </nav>
  );
}
