import React, { useState, useMemo } from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useAcademicYears } from '../hooks/academic';
import { downloadExcel } from '../utils/exportUtils';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import {
  BarChart3, TrendingUp, Users, GraduationCap, Briefcase, DollarSign,
  UtensilsCrossed, Bus, FileText, Calendar, Filter, CheckCircle2,
  AlertCircle, BookOpen, Award, Sparkles, ArrowUpRight, ShieldCheck,
  LayoutGrid, SlidersHorizontal, FileSpreadsheet, Printer, Download,
} from 'lucide-react';

// ─── TYPES & ONGLET ──────────────────────────────────────────────────────────

type AnalyticsTab =
  | 'OVERVIEW'
  | 'STUDENTS'
  | 'PEDAGOGY'
  | 'STAFF'
  | 'FINANCE'
  | 'CANTEEN'
  | 'TRANSPORT'
  | 'TRENDS'
  | 'COMPARISONS'
  | 'REPORTS';

const TABS: { id: AnalyticsTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'OVERVIEW',    label: "Vue d'ensemble", icon: <LayoutGrid size={15} />,       color: '#2563eb' },
  { id: 'STUDENTS',    label: 'Élèves',         icon: <Users size={15} />,            color: '#0284c7' },
  { id: 'PEDAGOGY',    label: 'Pédagogie',      icon: <GraduationCap size={15} />,    color: '#8b5cf6' },
  { id: 'STAFF',       label: 'Personnel',      icon: <Briefcase size={15} />,        color: '#f59e0b' },
  { id: 'FINANCE',     label: 'Finances',       icon: <DollarSign size={15} />,       color: '#10b981' },
  { id: 'CANTEEN',     label: 'Cantine',        icon: <UtensilsCrossed size={15} />,  color: '#059669' },
  { id: 'TRANSPORT',   label: 'Transport',      icon: <Bus size={15} />,              color: '#4f46e5' },
  { id: 'TRENDS',      label: 'Tendances',      icon: <TrendingUp size={15} />,       color: '#ec4899' },
  { id: 'COMPARISONS', label: 'Comparaisons',   icon: <SlidersHorizontal size={15} />,color: '#06b6d4' },
  { id: 'REPORTS',     label: 'Rapports',       icon: <FileText size={15} />,         color: '#64748b' },
];

// ─── DONNÉES SIMULÉES DE HAUTE PRÉCISION POUR LE PILOTAGE ──────────────────────

// ─── DONNÉES DE PILOTAGE (Vierge par défaut) ──────────────────────────────────

const MOCK_MONTHLY_PERFORMANCE: any[] = [];
const MOCK_STUDENT_LEVEL_DISTRIBUTION: any[] = [];
const MOCK_GENDER_DISTRIBUTION: any[] = [];
const MOCK_CLASS_GRADES: any[] = [];
const MOCK_SUBJECT_PERFORMANCE: any[] = [];
const MOCK_REVENUE_BY_TYPE: any[] = [];
const MOCK_PAYMENT_MODES: any[] = [];
const MOCK_CANTEEN_STATS: any[] = [];
const MOCK_TRANSPORT_LINES_STATS: any[] = [];
const MOCK_COMPARISON_YEARS: any[] = [];


export default function StatisticsPage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('OVERVIEW');
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');

  // Exportation Excel des statistiques
  const handleExportAnalytics = () => {
    const dataToExport = MOCK_MONTHLY_PERFORMANCE.map((row) => ({
      Mois: row.month,
      'Recettes (FCFA)': row.recettes,
      'Dépenses (FCFA)': row.depenses,
      'Taux Réussite (%)': `${row.reussite}%`,
      'Taux Assiduité (%)': `${row.assiduite}%`,
    }));
    downloadExcel(dataToExport, `Bilan_Decisionnel_GESCO_${selectedYearId}`, 'Indicateurs');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── 1. BANNIÈRE HERO DECISIONNELLE SAAS ─────────────────────────────── */}
      <div
        className="card shadow-lg no-print"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(37,99,235,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                <Sparkles size={12} color="#60a5fa" /> Centre de Pilotage Décisionnel
              </div>
              <h1 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Statistiques &amp; Performance Établissement
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                Analyses prédictives, indicateurs financiers, pédagogiques et opérationnels en temps réel
              </p>
            </div>
          </div>

          {/* Barres d'actions et filtres rapides */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="#93c5fd" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.8125rem', outline: 'none', cursor: 'pointer' }}
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id} style={{ color: '#0f172a', background: '#ffffff' }}>
                    Année {ay.name} {ay.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ONGLETS DE NAVIGATION PAR SOUCHE D'ANALYSE (10 SOUS-ONGLETS) ── */}
      <div className="no-print" style={{ display: 'flex', gap: 6, padding: '6px', background: '#f1f5f9', borderRadius: 14, overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px',
                background: active ? tab.color : 'transparent',
                color: active ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
                boxShadow: active ? `0 4px 12px ${tab.color}45` : 'none',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 3. CONTENU DÉTAILLÉ DE L'ONGLET ACTIF ───────────────────────────── */}

      {/* ── 3.1 VUE D'ENSEMBLE (EXECUTIVE OVERVIEW) ────────────────────────── */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Cartes KPI exécutives avec texte blanc ultra-lisible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(37,99,235,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Global</span>
                <Users size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Effectif Total Élèves</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>1,140</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ArrowUpRight size={14} /> +8.5% vs année précédente
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(16,185,129,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Finance</span>
                <DollarSign size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Recouvrement Financier</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>92.4%</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ArrowUpRight size={14} /> 239,000,000 FCFA encaissés
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(139,92,246,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Pédagogie</span>
                <GraduationCap size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Taux de Réussite Écoles</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>89.2%</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <CheckCircle2 size={14} /> Moyenne générale : 14.5/20
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(245,158,11,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Assiduité</span>
                <CheckCircle2 size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Présence Élèves</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>95.8%</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ShieldCheck size={14} /> Faible taux d'absentéisme
              </span>
            </div>
          </div>

          {/* Graphique combiné Recettes vs Dépenses vs Performance */}
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>Évolution Mensuelle des Flux &amp; Performance</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Comparatif des recettes de scolarité, dépenses d'exploitation et taux de réussite</p>
              </div>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_MONTHLY_PERFORMANCE}>
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
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#2563eb" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: any, name: any) => name === 'Taux Réussite' ? [`${value}%`, name] : [`${Number(value).toLocaleString('fr-FR')} FCFA`, name]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="recettes" name="Recettes Encaissées" stroke="#10b981" fillOpacity={1} fill="url(#colorRecettes)" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="depenses" name="Dépenses Décaissements" stroke="#ef4444" fillOpacity={1} fill="url(#colorDepenses)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="reussite" name="Taux Réussite" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grille décisionnelle Insights IA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="card p-4" style={{ borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#1d4ed8', fontWeight: 800 }}>
                <Sparkles size={18} /> Point fort Pédagogique
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                La classe de <strong>CM2 A</strong> affiche la meilleure moyenne de l'école (15.1/20) avec un taux de réussite de 95% aux compositions mensuelles.
              </p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#15803d', fontWeight: 800 }}>
                <CheckCircle2 size={18} /> Optimisation Financière
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#14532d', lineHeight: 1.5 }}>
                Le taux de recouvrement atteint <strong>92.4%</strong> ce trimestre (+4.3% par rapport à l'année précédente grâce aux rappels SMS automatiques).
              </p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#b45309', fontWeight: 800 }}>
                <AlertCircle size={18} /> Vigilance Transport
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.5 }}>
                La <strong>Ligne 1 (Riviera)</strong> est saturée à 95% d'occupation. L'ajout d'un minibus supplémentaire est recommandé pour le prochain trimestre.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── 3.2 ÉLÈVES (STUDENT ANALYTICS) ──────────────────────────────────── */}
      {activeTab === 'STUDENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Répartition par niveau */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Répartition des Élèves par Cycle</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_STUDENT_LEVEL_DISTRIBUTION}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(val: any) => [`${val} élèves`, 'Effectif']} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {MOCK_STUDENT_LEVEL_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Répartition par Genre (Donut) */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Parité Filles / Garçons</h3>
              <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={MOCK_GENDER_DISTRIBUTION} innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value">
                      {MOCK_GENDER_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${val} élèves`, 'Effectif']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 3.3 PÉDAGOGIE (ACADEMIC ANALYTICS) ─────────────────────────────── */}
      {activeTab === 'PEDAGOGY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Moyennes par classe */}
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Performance Moyenne par Classe (/20)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_CLASS_GRADES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="class" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[0, 20]} stroke="#64748b" fontSize={12} />
                  <Tooltip formatter={(val: any) => [`${val}/20`, 'Moyenne Général']} />
                  <Bar dataKey="moyenne" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance par Matière */}
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Taux de Réussite par Discipline</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_SUBJECT_PERFORMANCE} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="subject" stroke="#64748b" fontSize={12} width={130} />
                  <Tooltip formatter={(val: any) => [`${val}%`, 'Taux de réussite']} />
                  <Bar dataKey="reussite" fill="#2563eb" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ── 3.4 PERSONNEL (STAFF ANALYTICS) ─────────────────────────────────── */}
      {activeTab === 'STAFF' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card p-4" style={{ borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Effectif Enseignant</p>
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#0f172a', fontSize: '1.75rem' }}>48 Enseignants</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Ratio: 1 prof / 23.7 élèves</p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Personnel Administratif</p>
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#0f172a', fontSize: '1.75rem' }}>14 Agents</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Comptabilité, Direction, Secretaire</p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assiduité Personnel</p>
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#10b981', fontSize: '1.75rem' }}>98.2%</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Pointage biométrique</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.5 FINANCES (FINANCIAL ANALYTICS) ─────────────────────────────── */}
      {activeTab === 'FINANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Ventilation des Recettes par Service */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Recettes Encaissées par Pôle</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={MOCK_REVENUE_BY_TYPE} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {MOCK_REVENUE_BY_TYPE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} FCFA`, 'Montant']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Répartition des Modes de Règlement */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Modes de Règlement Utilisés (%)</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_PAYMENT_MODES}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(val: any) => [`${val}%`, 'Part']} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {MOCK_PAYMENT_MODES.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 3.6 CANTINE (CANTEEN ANALYTICS) ─────────────────────────────────── */}
      {activeTab === 'CANTEEN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Volume de Repas Servis Mensuellement</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CANTEEN_STATS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="repasServis" name="Repas servis" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.7 TRANSPORT (TRANSPORT ANALYTICS) ─────────────────────────────── */}
      {activeTab === 'TRANSPORT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Taux d'Occupation par Ligne de Navette (%)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_TRANSPORT_LINES_STATS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(val: any) => [`${val}%`, "Taux d'occupation"]} />
                  <Bar dataKey="occupation" radius={[8, 8, 0, 0]}>
                    {MOCK_TRANSPORT_LINES_STATS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.couleur} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.8 TENDANCES (TRENDS ANALYTICS) ────────────────────────────────── */}
      {activeTab === 'TRENDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Projections de Croissance Trimestrielles</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_MONTHLY_PERFORMANCE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reussite" name="Assiduité Pédagogique (%)" stroke="#ec4899" strokeWidth={3} />
                  <Line type="monotone" dataKey="assiduite" name="Présence Globale (%)" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.9 COMPARAISONS (COMPARATIVE BENCHMARKS) ───────────────────────── */}
      {activeTab === 'COMPARISONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="card-header p-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Benchmark Comparatif Année N vs Année N-1</h3>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Indicateur Clé</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Année 2024-2025</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>Année 2025-2026 (En cours)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>Évolution / Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_COMPARISON_YEARS.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{row.metric}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{row.annee2025}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563eb' }}>{row.annee2026}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge bg-success-subtle text-success fw-bold px-3 py-1" style={{ borderRadius: 12 }}>
                          {row.diff}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3.10 RAPPORTS DÉCISIONNELS (REPORTS & EXPORTS) ─────────────────── */}
      {activeTab === 'REPORTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barre d'action d'impression (Masquée à l'impression via no-print) */}
          <div className="card shadow-sm p-4 no-print" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>Bilan Synthétique du Centre de Pilotage</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  Générez un rapport exécutif imprimable propre et officiel regroupant toutes les synthèses.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline-secondary fw-bold" onClick={() => window.print()} style={{ borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Printer size={15} /> Imprimer le Bilan Officiel
                </button>
                <button className="btn btn-primary fw-bold" onClick={handleExportAnalytics} style={{ borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={15} /> Exporter Excel
                </button>
              </div>
            </div>
          </div>

          {/* ── DOCUMENT DE BILAN EXECUTIVE OFFICIEL (AFFICHE & IMPRIMABLE PROPRE) ── */}
          <div
            className="card shadow-sm printable-report"
            style={{
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              padding: '32px 36px',
              color: '#0f172a',
            }}
          >
            {/* En-tête Officiel d'Impression */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #2563eb', paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                    G
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      COMPLEXE SCOLAIRE D'EXCELLENCE GESCO
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      ERP DE GESTION DE L'ÉTABLISSEMENT — DIRECTION GÉNÉRALE
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#475569' }}>
                <p style={{ margin: 0, fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>BILAN SYNTHÉTIQUE DE PILOTAGE</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>Année Scolaire : <strong>2025-2026</strong></p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Date d'édition : {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            {/* Section 1 : Synthèse des KPIs Majeurs */}
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1e3a8a', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderLeft: '4px solid #2563eb', paddingLeft: 10 }}>
                1. Indicateurs Clés de Performance
              </h4>
              <table className="table table-bordered align-middle" style={{ fontSize: '0.875rem', width: '100%' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Domaine</th>
                    <th style={{ padding: '8px 12px' }}>Indicateur</th>
                    <th style={{ padding: '8px 12px' }}>Valeur</th>
                    <th style={{ padding: '8px 12px' }}>Statut / Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Effectifs</td>
                    <td>Nombre total d'élèves inscrits</td>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>1,140 élèves</td>
                    <td><span className="badge bg-success-subtle text-success">+8.5% N vs N-1</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Pédagogie</td>
                    <td>Moyenne Générale &amp; Taux de Réussite</td>
                    <td style={{ fontWeight: 800, color: '#8b5cf6' }}>14.5/20 (89.2%)</td>
                    <td><span className="badge bg-success-subtle text-success">Excellente</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Finances</td>
                    <td>Taux de Recouvrement des Frais</td>
                    <td style={{ fontWeight: 800, color: '#10b981' }}>92.4% (239,000,000 F)</td>
                    <td><span className="badge bg-success-subtle text-success">Conforme</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Ressources H.</td>
                    <td>Assiduité du Personnel Enseignant</td>
                    <td style={{ fontWeight: 800, color: '#0ea5e9' }}>98.2%</td>
                    <td><span className="badge bg-info-subtle text-info">Optimale</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2 : Répartition Pédagogique */}
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1e3a8a', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderLeft: '4px solid #8b5cf6', paddingLeft: 10 }}>
                2. Moyennes et Réussite par Classe
              </h4>
              <table className="table table-bordered align-middle" style={{ fontSize: '0.8125rem', width: '100%' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Classe</th>
                    <th style={{ padding: '8px 12px' }}>Moyenne Générale</th>
                    <th style={{ padding: '8px 12px' }}>Note Min</th>
                    <th style={{ padding: '8px 12px' }}>Note Max</th>
                    <th style={{ padding: '8px 12px' }}>Taux de Succès</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CLASS_GRADES.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{row.class}</td>
                      <td style={{ fontWeight: 800, color: '#8b5cf6' }}>{row.moyenne}/20</td>
                      <td>{row.min}/20</td>
                      <td>{row.max}/20</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{row.succes}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3 : Signature et Visa Officiel */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <div style={{ textAlign: 'center', width: 220 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>Le Chef Comptable</p>
                <div style={{ height: 60 }}></div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Signature &amp; Cachet</p>
              </div>

              <div style={{ textAlign: 'center', width: 220 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#2563eb' }}>Le Directeur Général</p>
                <div style={{ height: 60 }}></div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Visa &amp; Sceau Officiel</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
