// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Master Dashboard (src/pages/DashboardPage.tsx)
// Centre de Pilotage Métier ERP pour Écoles Primaires Ivoiriennes
// Architecture : Modulaire, Drag & Drop, Multi-Profils, Graphiques & Design System
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/dashboard';
import {
  Users, Briefcase, GraduationCap, DollarSign, UtensilsCrossed,
  Bus, TrendingDown, Award, Search, Plus, CreditCard, BookOpen,
  FileText, BarChart2, Calendar, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ArrowRight, X, ShieldAlert, Sparkles,
  Maximize2, RefreshCw, EyeOff, MoreVertical, Layers, TrendingUp,
  Bell, Check, Filter, User, HelpCircle, LayoutGrid, CheckSquare
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

interface DashboardPageProps {
  onNavigate?: (view: string) => void;
}

type PeriodFilter = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

// Structure de Widget Modulaire
interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-kpis', title: 'Indicateurs Clés (KPIs)', visible: true, order: 1 },
  { id: 'w-quick-actions', title: 'Actions Rapides Métiers', visible: true, order: 2 },
  { id: 'w-financial-chart', title: 'Bilan Financier & Recouvrement', visible: true, order: 3 },
  { id: 'w-attendance-chart', title: 'Taux de Présence Quotidien', visible: true, order: 4 },
  { id: 'w-gender-chart', title: 'Répartition des Effectifs par Niveau & Genre', visible: true, order: 5 },
  { id: 'w-alerts', title: 'Centre d\'Alertes Intelligentes', visible: true, order: 6 },
  { id: 'w-activities', title: 'Journal des Activités Récentes', visible: true, order: 7 },
  { id: 'w-calendar', title: 'Événements & Calendrier Scolaire', visible: true, order: 8 },
];

// Graphique Financier Recettes vs Dépenses (Données dynamiques / fallback)
const FINANCIAL_CHART_DATA = [
  { mois: 'Sept', Recettes: 8500000, Dépenses: 3200000 },
  { mois: 'Oct', Recettes: 6200000, Dépenses: 2800000 },
  { mois: 'Nov', Recettes: 5400000, Dépenses: 3100000 },
  { mois: 'Déc', Recettes: 4800000, Dépenses: 2900000 },
  { mois: 'Janv', Recettes: 7100000, Dépenses: 3400000 },
  { mois: 'Fév', Recettes: 5900000, Dépenses: 2950000 },
];

// Graphique Présences
const ATTENDANCE_PIE_DATA = [
  { name: 'Présents', value: 98.2, color: '#10b981' },
  { name: 'Absents Justifiés', value: 1.2, color: '#f59e0b' },
  { name: 'Absences Non Justifiées', value: 0.6, color: '#ef4444' },
];

// Graphique Répartition Genre par Niveau
const GENDER_LEVEL_DATA = [
  { niveau: 'Maternelle', Filles: 35, Garçons: 32 },
  { niveau: 'CP1', Filles: 28, Garçons: 26 },
  { niveau: 'CP2', Filles: 25, Garçons: 27 },
  { niveau: 'CE1', Filles: 30, Garçons: 28 },
  { niveau: 'CE2', Filles: 24, Garçons: 22 },
  { niveau: 'CM1', Filles: 26, Garçons: 25 },
  { niveau: 'CM2', Filles: 29, Garçons: 27 },
];

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { schoolYear } = useSchoolYear();
  const { currentUser, canAccess } = useAuth();
  
  const currentAcademicYearId = schoolYear?.id || 'ay-2026';
  
  const {
    kpis,
    alerts,
    recentActivities,
    calendarEvents,
    searchQuery,
    searchResults,
    isSearching,
    loading,
    handleGlobalSearch,
    clearSearch,
    reloadAll,
  } = useDashboard(currentAcademicYearId);

  // État Période Temporelle
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');

  // Gestion des widgets personnalisables (sauvegardé par utilisateur/rôle)
  const userRoleId = currentUser?.role || 'ADMIN_GENERALE';
  const storageKey = `gesco_dashboard_widgets_${userRoleId}`;

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgets));
    } catch {}
  }, [widgets, storageKey]);

  const toggleWidgetVisibility = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const moveWidget = (id: string, direction: 'UP' | 'DOWN') => {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((w, i) => ({ ...w, order: i + 1 }));
    });
  };

  const formatFCFA = (val: number) =>
    val >= 1_000_000
      ? `${(val / 1_000_000).toFixed(1)} M FCFA`
      : `${val.toLocaleString('fr-FR')} FCFA`;

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const userName = currentUser?.fullName || currentUser?.username || 'Direction Générale';
  const roleLabel = currentUser?.role === 'ADMIN_GENERALE' ? 'Directeur Général'
    : currentUser?.role === 'FINANCE' ? 'Responsable Financier'
    : currentUser?.role === 'SCOLAIRE_ENSEIGNANT' ? 'Enseignant'
    : 'Agent Administratif';

  // Cartes KPI dynamiques
  const allKpis = useMemo(() => [
    {
      id: 'kpi-students',
      label: 'Élèves actifs',
      value: kpis ? `${kpis.totalStudents}` : '142',
      trend: '+4.2%',
      trendUp: true,
      icon: <Users size={22} />,
      color: '#4f46e5',
      bg: 'var(--primary-50, #eef2ff)',
      targetView: 'STUDENTS',
      requiredPermission: 'STUDENTS',
      sparkline: [20, 35, 45, 60, 80, 110, 142],
    },
    {
      id: 'kpi-recovery',
      label: 'Taux de Recouvrement',
      value: kpis ? `${kpis.recoveryRatePercent}%` : '84%',
      subtext: kpis ? `Encaissé : ${formatFCFA(kpis.collectedAmount)}` : 'Encaissé : 24.5 M FCFA',
      trend: '+6.8%',
      trendUp: true,
      icon: <DollarSign size={22} />,
      color: '#10b981',
      bg: 'var(--success-50, #ecfdf5)',
      targetView: 'SCOLARITY',
      requiredPermission: 'SCOLARITY',
      sparkline: [40, 50, 65, 70, 78, 81, 84],
    },
    {
      id: 'kpi-expenses',
      label: 'Dépenses du mois',
      value: kpis ? formatFCFA(kpis.monthlyExpenses) : '1.4 M FCFA',
      trend: '-2.1%',
      trendUp: true,
      icon: <TrendingDown size={22} />,
      color: '#ef4444',
      bg: 'var(--danger-50, #fff1f2)',
      targetView: 'EXPENSES',
      requiredPermission: 'EXPENSES',
      sparkline: [80, 75, 90, 85, 70, 65, 60],
    },
    {
      id: 'kpi-staff',
      label: 'Personnel & RH',
      value: kpis ? `${kpis.totalStaff}` : '24',
      trend: '100% Présent',
      trendUp: true,
      icon: <Briefcase size={22} />,
      color: '#0ea5e9',
      bg: 'var(--info-50, #f0f9ff)',
      targetView: 'STAFF',
      requiredPermission: 'STAFF',
      sparkline: [24, 24, 24, 24, 24, 24, 24],
    },
    {
      id: 'kpi-classes',
      label: 'Classes académiques',
      value: kpis ? `${kpis.totalClasses}` : '12',
      trend: 'Capacité 92%',
      trendUp: true,
      icon: <GraduationCap size={22} />,
      color: '#a855f7',
      bg: 'var(--purple-50, #faf5ff)',
      targetView: 'CLASSES',
      requiredPermission: 'CLASSES',
      sparkline: [12, 12, 12, 12, 12, 12, 12],
    },
    {
      id: 'kpi-canteen',
      label: 'Abonnés Cantine',
      value: kpis ? `${kpis.canteenSubscribersCount}` : '118',
      trend: '83% des élèves',
      trendUp: true,
      icon: <UtensilsCrossed size={22} />,
      color: '#f59e0b',
      bg: 'var(--warning-50, #fffbeb)',
      targetView: 'CANTEEN',
      requiredPermission: 'CANTEEN',
      sparkline: [60, 75, 85, 95, 105, 112, 118],
    },
    {
      id: 'kpi-transport',
      label: 'Élèves Transportés',
      value: kpis ? `${kpis.transportEnrolledCount}` : '86',
      trend: '4 Lignes actives',
      trendUp: true,
      icon: <Bus size={22} />,
      color: '#f97316',
      bg: 'var(--orange-50, #fff7ed)',
      targetView: 'TRANSPORT',
      requiredPermission: 'TRANSPORT',
      sparkline: [40, 52, 60, 72, 80, 84, 86],
    },
    {
      id: 'kpi-grades',
      label: 'Moyenne générale',
      value: kpis ? `${kpis.lastAverageGrade} / 20` : '14.85 / 20',
      trend: '+0.4 pt',
      trendUp: true,
      icon: <Award size={22} />,
      color: '#6366f1',
      bg: 'var(--indigo-50, #eef2ff)',
      targetView: 'NOTES',
      requiredPermission: 'NOTES',
      sparkline: [13.5, 13.8, 14.0, 14.2, 14.5, 14.7, 14.85],
    },
  ], [kpis]);

  const mainKpis = useMemo(() => allKpis.filter((kpi) => canAccess(kpi.requiredPermission)), [allKpis, canAccess]);

  const allQuickActions = useMemo(() => [
    { label: 'Nouvel élève', icon: <Plus size={18} />, color: '#4f46e5', bg: '#eef2ff', targetView: 'STUDENTS' },
    { label: 'Enregistrer versement', icon: <CreditCard size={18} />, color: '#10b981', bg: '#ecfdf5', targetView: 'SCOLARITY' },
    { label: 'Saisir les notes', icon: <BookOpen size={18} />, color: '#f59e0b', bg: '#fffbeb', targetView: 'NOTES' },
    { label: 'Générer les bulletins', icon: <FileText size={18} />, color: '#a855f7', bg: '#faf5ff', targetView: 'BULLETINS' },
    { label: 'Centre des rapports', icon: <BarChart2 size={18} />, color: '#0ea5e9', bg: '#f0f9ff', targetView: 'REPORTS' },
    { label: 'Appel & Présences', icon: <Clock size={18} />, color: '#14b8a6', bg: '#f0fdfa', targetView: 'ATTENDANCE' },
  ], []);

  const quickActions = useMemo(() => allQuickActions.filter((qa) => canAccess(qa.targetView)), [allQuickActions, canAccess]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'ALL') return recentActivities;
    return recentActivities.filter((a) => a.type === activityFilter);
  }, [recentActivities, activityFilter]);

  const handleNavigate = (view: string) => {
    if (onNavigate && canAccess(view)) onNavigate(view);
  };

  const isWidgetVisible = (id: string) => {
    const w = widgets.find((item) => item.id === id);
    return w ? w.visible : true;
  };

  return (
    <div className="gesco-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* ── HEADER PREMIUM DASHBOARD ────────────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid var(--border-color, #e2e8f0)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}>
              {userName.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Bonjour, {userName} 👋
                </h1>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{roleLabel}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
                <Calendar size={13} style={{ display: 'inline', marginRight: 4, marginBottom: 2 }} />
                {dateStr} · Année scolaire active : <strong style={{ color: '#4f46e5' }}>2026-2027</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Barre de Recherche Globale Instantanée */}
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Recherche rapide (Élève, Parent, Classe...)"
                value={searchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: searchQuery ? 32 : 12, height: 40, borderRadius: 10, fontSize: '0.8125rem' }}
              />
              {searchQuery && (
                <button onClick={clearSearch} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              )}

              {/* Résultat Autocomplété */}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: 46, left: 0, right: 0, zIndex: 100, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    Résultats ({searchResults.length})
                  </div>
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => { clearSearch(); handleNavigate(res.targetView); }}
                      className="btn btn-ghost w-100 text-start"
                      style={{ borderRadius: 0, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{res.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{res.subtitle}</div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{res.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Actualiser */}
            <button className="btn btn-outline btn-sm" title="Actualiser les données" onClick={() => reloadAll()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            {/* Personnaliser Widgets */}
            <button className="btn btn-outline btn-sm" title="Personnaliser les widgets" onClick={() => setShowWidgetConfig(!showWidgetConfig)}>
              <LayoutGrid size={14} /> Layout
            </button>

          </div>
        </div>
      </div>

      {/* ── PANNEAU DE PERSONNALISATION DES WIDGETS ─────────────────────────── */}
      {showWidgetConfig && (
        <div className="card p-3 shadow-sm animate-fade-in" style={{ borderRadius: '12px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h6 style={{ margin: 0, fontWeight: 700, color: '#3730a3', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={16} /> Personnalisation de votre Tableau de Bord
            </h6>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowWidgetConfig(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {widgets.map((w) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600, color: w.visible ? '#0f172a' : '#94a3b8' }}>{w.title}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className={`btn btn-sm ${w.visible ? 'btn-success' : 'btn-outline'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => toggleWidgetVisibility(w.id)}>
                    {w.visible ? 'Visible' : 'Masqué'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HEADER & BADGE ANNÉE SCOLAIRE ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
          Dashboard
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '6px 14px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#475569',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <Calendar size={16} color="#2563eb" />
          <span>Année Scolaire <strong style={{ color: '#0f172a' }}>{schoolYear}</strong></span>
        </div>
      </div>

      {/* ── WIDGET 1 : CARTES KPI AVEC DÉGRADÉS FLUIDES (IMAGE REF) ───────── */}
      {isWidgetVisible('w-kpis') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          
          {/* Card 1 : Royal Blue */}
          <div
            className="card-hover"
            onClick={() => handleNavigate('STUDENTS')}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Élèves</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                Actifs +2
              </span>
            </div>

            <div style={{ marginTop: '0.875rem' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                {kpis?.totalStudents ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', fontWeight: 500 }}>
                Total inscrits cette année
              </div>
            </div>
          </div>

          {/* Card 2 : Purple Violet (Lector Card 2) */}
          <div
            className="card-hover"
            onClick={() => handleNavigate('CANTEEN')}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UtensilsCrossed size={18} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Cantine</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                Abonnés 83%
              </span>
            </div>

            <div style={{ marginTop: '0.875rem' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                {kpis?.canteenSubscribersCount ?? 118}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', fontWeight: 500 }}>
                Inscrits au service repas
              </div>
            </div>
          </div>

          {/* Card 3 : Cyan Teal (Lector Card 3) */}
          <div
            className="card-hover"
            onClick={() => handleNavigate('SCOLARITY')}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Revenus</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                Encaissements
              </span>
            </div>

            <div style={{ marginTop: '0.875rem' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                {`${(kpis?.collectedAmount ?? 0).toLocaleString('fr-FR')} F`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', fontWeight: 600 }}>
                ↗ +0.5% ce mois
              </div>
            </div>
          </div>

          {/* Card 4 : Orange Amber (Lector Card 4) */}
          <div
            className="card-hover"
            onClick={() => handleNavigate('STAFF')}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Personnel</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                Enseignant RH
              </span>
            </div>

            <div style={{ marginTop: '0.875rem' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                18
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', fontWeight: 500 }}>
                Professeurs & Remplaçants
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── WIDGET 2 : ACTIONS RAPIDES MÉTIERS ─────────────────────────────── */}
      {isWidgetVisible('w-quick-actions') && quickActions.length > 0 && (
        <div>
          <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: 700, fontSize: '0.875rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="#4f46e5" /> Actions Rapides & Raccourcis Métiers
          </h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleNavigate(qa.targetView)}
                className="btn btn-outline text-start p-3 card-hover"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: qa.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qa.color, flexShrink: 0 }}>
                  {qa.icon}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                  {qa.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DISPOSITION EN GRILLE DES WIDGETS ANONYMES (2 COLONNES) ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        
        {/* WIDGET 3 : BILAN FINANCIER & RECOUVREMENT (GRAPHIC AREA) */}
        {isWidgetVisible('w-financial-chart') && (
          <div className="card shadow-sm p-6" style={{ borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.375rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Recouvrement 84%
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>
                Bilan Financier Mensuel
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78125rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Recettes scolarité vs Dépenses validées (FCFA)</p>
            </div>

            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={FINANCIAL_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, '']} />
                  <Area type="monotone" dataKey="Recettes" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecettes)" />
                  <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDepenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 4 : TAUX DE PRÉSENCE QUOTIDIEN (DONUT CHART) */}
        {isWidgetVisible('w-attendance-chart') && (
          <div className="card shadow-sm p-6" style={{ borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.375rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  98.2% Présence
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>
                Assiduité & Présences du Jour
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78125rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Taux de présence globale des élèves</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0.5rem 0' }}>
              <div style={{ width: 170, height: 170, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ATTENDANCE_PIE_DATA} innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                      {ATTENDANCE_PIE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${val}%`, 'Taux']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Légende toujours positionnée en bas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap', width: '100%', paddingTop: '0.5rem' }}>
                {ATTENDANCE_PIE_DATA.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '3px', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary, #475569)', fontSize: '0.8125rem' }}>
                      {item.name} :
                    </span>
                    <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.8125rem' }}>
                      {item.value}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 5 : RÉPARTITION PAR NIVEAU ET GENRE (BAR CHART) */}
        {isWidgetVisible('w-gender-chart') && (
          <div className="card shadow-sm p-6" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.375rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  142 Élèves Total
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>
                Répartition des Effectifs par Niveau & Genre
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78125rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Proportion Filles / Garçons par classe</p>
            </div>

            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={GENDER_LEVEL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="niveau" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Filles" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Garçons" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* ── DISPOSITION INFERIEURE : ALERTES INTEL & CHRONOLOGIE ACTIVITÉS ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        
        {/* WIDGET 6 : CENTRE D'ALERTES INTELLIGENTES */}
        {isWidgetVisible('w-alerts') && alerts.length > 0 && (
          <div className="card shadow-sm p-4" style={{ borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.375rem' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {alerts.length} alerte(s)
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.25 }}>
                <ShieldAlert size={18} color="#d97706" /> Centre d'Alertes Intelligentes
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${alt.colorHex}`,
                  }}
                >
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{alt.title}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78125rem', color: '#64748b' }}>{alt.message}</p>
                  </div>
                  {alt.actionView && canAccess(alt.actionView) && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleNavigate(alt.actionView!)}
                      style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', flexShrink: 0, marginLeft: 8 }}
                    >
                      {alt.actionText || 'Consulter'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WIDGET 7 : CHRONOLOGIE DES ACTIVITÉS RÉCENTES */}
        {isWidgetVisible('w-activities') && (
          <div className="card shadow-sm p-4" style={{ borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '0.375rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Flux Direct
                </span>
                <select
                  className="form-select"
                  style={{ width: 130, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '12px' }}
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                >
                  <option value="ALL">Toutes</option>
                  <option value="PAYMENT">Paiements</option>
                  <option value="ENROLLMENT">Inscriptions</option>
                  <option value="EXPENSE">Dépenses</option>
                  <option value="REPORT">Bulletins</option>
                </select>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#6f42c1" /> Activités Récentes & Audit Logs
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredActivities.slice(0, 5).map((act) => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: act.badgeColor, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{act.title}</div>
                    <div style={{ fontSize: '0.78125rem', color: '#64748b', marginTop: '2px' }}>{act.description}</div>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{act.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
