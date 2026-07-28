import React from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/dashboard';
import {
  Users, Briefcase, GraduationCap, DollarSign, UtensilsCrossed,
  Bus, TrendingDown, Award, Search, Plus, CreditCard, BookOpen,
  FileText, BarChart2, Calendar, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ArrowRight, X, ShieldAlert, Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (view: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { schoolYear } = useSchoolYear();
  const { currentUser, canAccess } = useAuth();
  
  // FIX ANOMALIE-MIN-01 : Transmission de l'identifiant string (schoolYear.id)
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
  } = useDashboard(currentAcademicYearId);

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

  const userName = currentUser?.fullName || currentUser?.name || 'Gestionnaire';

  // 8 Cartes d'indicateurs principaux (avec contrôle d'accès selon permission rôle - FIX ANOMALIE-MAJ-02)
  const allKpis = [
    {
      id: 'kpi-students',
      label: 'Élèves actifs',
      value: kpis ? `${kpis.totalStudents}` : '—',
      icon: <Users size={22} />,
      color: '#2563eb',
      bg: '#eff6ff',
      targetView: 'STUDENTS',
      requiredPermission: 'STUDENTS',
    },
    {
      id: 'kpi-staff',
      label: 'Membres du personnel',
      value: kpis ? `${kpis.totalStaff}` : '—',
      icon: <Briefcase size={22} />,
      color: '#0ea5e9',
      bg: '#f0f9ff',
      targetView: 'STAFF',
      requiredPermission: 'STAFF',
    },
    {
      id: 'kpi-classes',
      label: 'Classes',
      value: kpis ? `${kpis.totalClasses}` : '—',
      icon: <GraduationCap size={22} />,
      color: '#9333ea',
      bg: '#faf5ff',
      targetView: 'CLASSES',
      requiredPermission: 'CLASSES',
    },
    {
      id: 'kpi-recovery',
      label: 'Recouvrement',
      value: kpis ? `${kpis.recoveryRatePercent}%` : '—',
      subtext: kpis ? `Encaissé : ${formatFCFA(kpis.collectedAmount)}` : '',
      icon: <DollarSign size={22} />,
      color: '#16a34a',
      bg: '#f0fdf4',
      targetView: 'SCOLARITY',
      requiredPermission: 'SCOLARITY',
    },
    {
      id: 'kpi-canteen',
      label: 'Abonnés cantine',
      value: kpis ? `${kpis.canteenSubscribersCount}` : '—',
      icon: <UtensilsCrossed size={22} />,
      color: '#f59e0b',
      bg: '#fffbeb',
      targetView: 'CANTEEN',
      requiredPermission: 'CANTEEN',
    },
    {
      id: 'kpi-transport',
      label: 'Élèves transportés',
      value: kpis ? `${kpis.transportEnrolledCount}` : '—',
      icon: <Bus size={22} />,
      color: '#dc2626',
      bg: '#fef2f2',
      targetView: 'TRANSPORT',
      requiredPermission: 'TRANSPORT',
    },
    {
      id: 'kpi-expenses',
      label: 'Dépenses du mois',
      value: kpis ? formatFCFA(kpis.monthlyExpenses) : '—',
      icon: <TrendingDown size={22} />,
      color: '#e11d48',
      bg: '#fff1f2',
      targetView: 'EXPENSES',
      requiredPermission: 'EXPENSES',
    },
    {
      id: 'kpi-grades',
      label: 'Moyenne générale',
      value: kpis ? `${kpis.lastAverageGrade} / 20` : '—',
      icon: <Award size={22} />,
      color: '#4f46e5',
      bg: '#eef2ff',
      targetView: 'NOTES',
      requiredPermission: 'NOTES',
    },
  ];

  const mainKpis = allKpis.filter((kpi) => canAccess(kpi.requiredPermission));

  // Raccourcis Filtrés par Rôle
  const allQuickActions = [
    { label: 'Nouvel élève', icon: <Plus size={20} />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', targetView: 'STUDENTS' },
    { label: 'Nouveau paiement', icon: <CreditCard size={20} />, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', targetView: 'SCOLARITY' },
    { label: 'Saisir les notes', icon: <BookOpen size={20} />, color: '#d97706', bg: '#fffbeb', border: '#fde68a', targetView: 'NOTES' },
    { label: 'Générer les bulletins', icon: <FileText size={20} />, color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', targetView: 'BULLETINS' },
    { label: 'Voir les rapports', icon: <BarChart2 size={20} />, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', targetView: 'REPORTS' },
  ];

  const quickActions = allQuickActions.filter((qa) => canAccess(qa.targetView));

  const handleNavigate = (view: string) => {
    if (onNavigate && canAccess(view)) onNavigate(view);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* EN-TÊTE DU DASHBOARD & RECHERCHE GLOBALE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Tableau de bord
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', textTransform: 'capitalize' }}>
            Bienvenue, <strong>{userName}</strong> · <Calendar size={13} style={{ display: 'inline', marginBottom: 2 }} /> Aujourd'hui : {dateStr}
          </p>
        </div>

        {/* Barre de Recherche Globale */}
        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Recherche globale (Élève, Parent, Classe...)"
            value={searchQuery}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            style={{ paddingLeft: 38, paddingRight: searchQuery ? 32 : 12, borderRadius: 12, height: 42, fontSize: '0.875rem' }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}

          {/* Result Dropdown */}
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                Résultats de la recherche ({searchResults.length})
              </div>
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => { clearSearch(); handleNavigate(res.targetView); }}
                  className="btn btn-light w-100 text-start"
                  style={{ borderRadius: 0, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{res.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{res.subtitle}</div>
                  </div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>
                    {res.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* INDICATEURS PRINCIPAUX FILTRÉS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {mainKpis.map((kpi) => (
          <div
            key={kpi.id}
            className="card card-hover"
            onClick={() => handleNavigate(kpi.targetView)}
            style={{ borderRadius: 14, border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div className="card-body p-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
                {kpi.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: kpi.color, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  {kpi.value}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {kpi.label}
                </p>
                {kpi.subtext && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {kpi.subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RACCOURCIS RAPIDES (GROS BOUTONS FILTRÉS) */}
      {quickActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="#2563eb" /> Actions & Raccourcis rapides
          </h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleNavigate(qa.targetView)}
                className="btn text-start p-3"
                style={{
                  background: qa.bg,
                  border: `1.5px solid ${qa.border}`,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: qa.color, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {qa.icon}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                  {qa.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DISPOSITION PRINCIPALE DU DASHBOARD (2 COLONNES) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        
        {/* Colonne Gauche : Alertes & Activités Récentes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Bloc Alertes Détectées */}
          {alerts.length > 0 && (
            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div className="card-body p-4" style={{ borderBottom: '1px solid #e2e8f0', background: '#fffdf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h6 style={{ margin: 0, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} color="#d97706" /> Notifications & Alertes système ({alerts.length})
                </h6>
              </div>

              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      borderLeft: `4px solid ${alt.colorHex}`,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{alt.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{alt.message}</p>
                    </div>
                    {alt.actionView && canAccess(alt.actionView) && (
                      <button
                        className="btn btn-sm btn-outline-primary fw-semibold"
                        onClick={() => handleNavigate(alt.actionView!)}
                        style={{ borderRadius: 8, fontSize: '0.75rem', flexShrink: 0, marginLeft: 12 }}
                      >
                        {alt.actionText || 'Voir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloc Activités Récentes (10 Dernières Actions) */}
          <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="card-body p-4" style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#2563eb" /> 10 Dernières activités récentes
              </h6>
            </div>

            <div style={{ padding: '8px 16px' }}>
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: act.badgeColor, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{act.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.775rem', color: '#64748b' }}>{act.description}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
                    {act.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Colonne Droite : Événements du Calendrier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="card-body p-4" style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#2563eb" /> Événements à venir
              </h6>
            </div>

            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              {calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: '#f8fafc',
                    borderRadius: 10,
                    padding: '12px 14px',
                    borderLeft: `4px solid ${evt.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ background: `${evt.color}15`, color: evt.color, padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700 }}>
                      {evt.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {new Date(evt.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{evt.title}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
