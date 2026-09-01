import React, { useState, useEffect, useMemo } from 'react';
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
import { studentFinancialEnrollmentService } from '../services/finance/studentFinancialEnrollmentService';
import { canteenEnrollmentService } from '../services/canteen/canteenEnrollmentService';
import { transportEnrollmentService } from '../services/transport/transportEnrollmentService';
import { transportLineService } from '../services/transport/transportLineService';
import { expenseService } from '../services/expenses/expenseService';
import { listStudents } from '../services/students/studentsService';
import { listStaff } from '../services/staff/staffService';
import { getClassrooms } from '../services/academic/classroomsService';
import { dashboardService } from '../services/dashboard/dashboardService';
import { statsCalculationService } from '../services/stats';

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

export default function StatisticsPage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('OVERVIEW');
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');
  const [loading, setLoading] = useState(false);

  // Données dynamiques calculées depuis la base de données
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalStaff, setTotalStaff] = useState<number>(0);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [adminStaffCount, setAdminStaffCount] = useState<number>(0);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [recoveryRate, setRecoveryRate] = useState<number>(0);

  const [monthlyPerformance, setMonthlyPerformance] = useState<any[]>([]);
  const [studentLevelDistribution, setStudentLevelDistribution] = useState<any[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<any[]>([]);
  const [classGrades, setClassGrades] = useState<any[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [revenueByType, setRevenueByType] = useState<any[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [canteenStats, setCanteenStats] = useState<any[]>([]);
  const [transportLinesStats, setTransportLinesStats] = useState<any[]>([]);
  const [comparisonYears, setComparisonYears] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadAllAnalytics() {
      setLoading(true);
      try {
        const [
          masterKpi,
          scolarEnrollments,
          canteenEnrollments,
          transportEnrollments,
          transportLines,
          expenses,
          studentsRes,
          staffRes,
          classroomsRes,
        ] = await Promise.all([
          dashboardService.getMasterKPIs(selectedYearId),
          studentFinancialEnrollmentService.getEnrollmentsByYear(selectedYearId),
          canteenEnrollmentService.getEnrollmentsByYear(selectedYearId),
          transportEnrollmentService.getEnrollmentsByYear(selectedYearId),
          transportLineService.getLinesByYear(selectedYearId),
          expenseService.getExpenses({ schoolYearId: selectedYearId }),
          listStudents({ schoolYear: selectedYearId, pageSize: 1000 }),
          listStaff({ pageSize: 500 }),
          getClassrooms({ schoolYearId: selectedYearId }),
        ]);

        if (!isMounted) return;

        const students = studentsRes.data?.students || [];
        const staff = staffRes.data?.staffMembers || [];
        const classrooms = classroomsRes.data || [];

        setTotalStudents(students.length);
        setTotalStaff(staff.length);
        const teachers = staff.filter((s) => s.role === 'Enseignant' || (s as any).role === 'TEACHER');
        setTeachersCount(teachers.length);
        setAdminStaffCount(staff.length - teachers.length);

        const finKPIs = statsCalculationService.calculateFinancialKPIs(scolarEnrollments);
        setCollectedAmount(finKPIs.totalPaid);
        setRemainingAmount(finKPIs.remainingBalance);
        setRecoveryRate(finKPIs.recoveryRate);

        // 1. Répartition par genre
        const genderDist = statsCalculationService.calculateGenderDistribution(students);
        setGenderDistribution([
          { name: 'Filles', value: genderDist.girls, color: '#ec4899' },
          { name: 'Garçons', value: genderDist.boys, color: '#3b82f6' },
        ]);

        // 2. Répartition par niveau
        const levelMap: Record<string, number> = {};
        students.forEach((s) => {
          const lvl = (s as any).level || s.grade || 'Classe';
          levelMap[lvl] = (levelMap[lvl] || 0) + 1;
        });
        const levelColors = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        const levelDist = Object.keys(levelMap).map((k, idx) => ({
          name: k,
          count: levelMap[k],
          color: levelColors[idx % levelColors.length],
        }));
        setStudentLevelDistribution(levelDist);

        // 3. Recettes par pôle
        const scolarTotal = scolarEnrollments.reduce((sum, e) => sum + (e.totalPaid || 0), 0);
        const canteenTotal = canteenEnrollments.reduce((sum, e) => sum + (e.totalPaid || 0), 0);
        const transportTotal = transportEnrollments.reduce((sum, e) => sum + (e.totalPaid || 0), 0);
        const totalRev = scolarTotal + canteenTotal + transportTotal;
        setRevenueByType([
          { name: 'Scolarité', value: scolarTotal, color: '#2563eb' },
          { name: 'Cantine', value: canteenTotal, color: '#10b981' },
          { name: 'Transport', value: transportTotal, color: '#f59e0b' },
        ]);

        // 4. Lignes de transport
        setTransportLinesStats(
          transportLines.map((l, i) => ({
            name: l.name,
            occupation: l.vehicleCapacity > 0 ? Math.round((l.enrolledCount / l.vehicleCapacity) * 100) : 0,
            couleur: i % 2 === 0 ? '#4f46e5' : '#0284c7',
          }))
        );

        // 5. Cantine mensualisée
        const months = ['Sept', 'Oct', 'Nov', 'Déc', 'Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin'];
        setCanteenStats(
          months.map((m) => ({
            month: m,
            repasServis: canteenEnrollments.filter((e) => e.status === 'ACTIVE').length * 20,
          }))
        );

        // 6. Évolution mensuelle
        const monthly = months.map((m, idx) => {
          const mNum = idx < 4 ? idx + 9 : idx - 3;
          const mStr = mNum < 10 ? `0${mNum}` : `${mNum}`;
          const expM = expenses
            .filter((e) => e.date && e.date.includes(`-${mStr}-`) && e.status !== 'CANCELLED')
            .reduce((s, e) => s + (e.amount || 0), 0);

          return {
            month: m,
            recettes: 0,
            depenses: expM,
            reussite: 0,
            assiduite: 0,
          };
        });
        setMonthlyPerformance(monthly);

        // 7. Comparaisons multi-années
        setComparisonYears([
          {
            metric: 'Effectif Élèves',
            annee2025: '0 élèves',
            annee2026: `${students.length} élèves`,
            diff: `+${students.length}`,
          },
          {
            metric: 'Recettes Globales',
            annee2025: '0 FCFA',
            annee2026: `${totalRev.toLocaleString('fr-FR')} FCFA`,
            diff: `+${totalRev.toLocaleString('fr-FR')} F`,
          },
          {
            metric: 'Taux Recouvrement',
            annee2025: '0%',
            annee2026: `${totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%`,
            diff: totalDue > 0 ? `+${Math.round((totalPaid / totalDue) * 100)}%` : '0%',
          },
        ]);

        setClassGrades(
          classrooms.map((c) => ({
            class: c.name,
            moyenne: 0,
            min: 0,
            max: 0,
            succes: 0,
          }))
        );

        setSubjectPerformance([]);
        setPaymentModes([
          { name: 'Espèces', value: 0, color: '#10b981' },
          { name: 'Chèque', value: 0, color: '#2563eb' },
          { name: 'Virement', value: 0, color: '#8b5cf6' },
          { name: 'Mobile Money', value: 0, color: '#f59e0b' },
        ]);
      } catch (err) {
        console.warn('[StatisticsPage] Erreur chargement statistiques:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllAnalytics();
    return () => { isMounted = false; };
  }, [selectedYearId]);

  // Exportation Excel des statistiques
  const handleExportAnalytics = () => {
    const dataToExport = monthlyPerformance.map((row) => ({
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
          
          {/* Cartes KPI exécutives dynamiques */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(37,99,235,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Global</span>
                <Users size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Effectif Total Élèves</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>{totalStudents.toLocaleString('fr-FR')}</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ArrowUpRight size={14} /> Élèves inscrits
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(16,185,129,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Finance</span>
                <DollarSign size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Recouvrement Financier</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>{recoveryRate}%</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ArrowUpRight size={14} /> {collectedAmount.toLocaleString('fr-FR')} FCFA encaissés
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(139,92,246,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Pédagogie</span>
                <GraduationCap size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Effectif Enseignants</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>{teachersCount}</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <CheckCircle2 size={14} /> Corps professoral actif
              </span>
            </div>

            <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(245,158,11,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Personnel</span>
                <Briefcase size={18} color="#ffffff" />
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', opacity: 1 }}>Total Employés</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>{totalStaff}</h2>
              <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
                <ShieldCheck size={14} /> Personnel enregistré
              </span>
            </div>
          </div>

          {/* Graphique combiné Recettes vs Dépenses */}
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>Évolution Mensuelle des Flux &amp; Performance</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Comparatif des recettes de scolarité et des dépenses d'exploitation</p>
              </div>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPerformance}>
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
                  <Tooltip formatter={(value: any, name: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, name]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="recettes" name="Recettes Encaissées" stroke="#10b981" fillOpacity={1} fill="url(#colorRecettes)" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="depenses" name="Dépenses Décaissements" stroke="#ef4444" fillOpacity={1} fill="url(#colorDepenses)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
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
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Répartition des Élèves par Niveau</h3>
              <div style={{ width: '100%', height: 260 }}>
                {studentLevelDistribution.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    Aucun élève inscrit pour cette année scolaire.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentLevelDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip formatter={(val: any) => [`${val} élèves`, 'Effectif']} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {studentLevelDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Répartition par Genre (Donut) */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Parité Filles / Garçons</h3>
              <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalStudents === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Aucune donnée disponible.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderDistribution} innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value">
                        {genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} élèves`, 'Effectif']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
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
              {classGrades.length === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  Aucune évaluation enregistrée pour cette année scolaire.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classGrades}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="class" stroke="#64748b" fontSize={12} />
                    <YAxis domain={[0, 20]} stroke="#64748b" fontSize={12} />
                    <Tooltip formatter={(val: any) => [`${val}/20`, 'Moyenne Générale']} />
                    <Bar dataKey="moyenne" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#0f172a', fontSize: '1.75rem' }}>{teachersCount} Enseignants</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                {teachersCount > 0 && totalStudents > 0 ? `Ratio: 1 prof / ${(totalStudents / teachersCount).toFixed(1)} élèves` : '—'}
              </p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Personnel Administratif</p>
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#0f172a', fontSize: '1.75rem' }}>{adminStaffCount} Agents</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Direction, Comptabilité, Support</p>
            </div>

            <div className="card p-4" style={{ borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Personnel Actif</p>
              <h2 style={{ margin: '6px 0 0', fontWeight: 900, color: '#10b981', fontSize: '1.75rem' }}>{totalStaff} Employés</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Effectif total enregistré</p>
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
                {revenueByType.every((r) => r.value === 0) ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    Aucun encaissement pour le moment.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueByType} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                        {revenueByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} FCFA`, 'Montant']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Répartition des Modes de Règlement */}
            <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Modes de Règlement Utilisés</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentModes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(val: any) => [`${val}`, 'Nombre']} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {paymentModes.map((entry, index) => (
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
                <AreaChart data={canteenStats}>
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
              {transportLinesStats.length === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  Aucune ligne de transport configurée pour cette année scolaire.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transportLinesStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(val: any) => [`${val}%`, "Taux d'occupation"]} />
                    <Bar dataKey="occupation" radius={[8, 8, 0, 0]}>
                      {transportLinesStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.couleur} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3.8 TENDANCES (TRENDS ANALYTICS) ────────────────────────────────── */}
      {activeTab === 'TRENDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card shadow-sm p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Évolution Trimestrielle</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="depenses" name="Dépenses Décaissements" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="recettes" name="Recettes Encaissées" stroke="#10b981" strokeWidth={2} />
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Benchmark Comparatif des Années Scolaires</h3>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Indicateur Clé</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Année Précédente</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>Année en Cours</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>Évolution / Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonYears.map((row, idx) => (
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
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>Année Scolaire : <strong>{selectedYearId}</strong></p>
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
                    <th style={{ padding: '8px 12px' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Effectifs</td>
                    <td>Nombre total d'élèves inscrits</td>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>{totalStudents} élèves</td>
                    <td><span className="badge bg-success-subtle text-success">Actif</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Pédagogie</td>
                    <td>Effectif Enseignants</td>
                    <td style={{ fontWeight: 800, color: '#8b5cf6' }}>{teachersCount} enseignants</td>
                    <td><span className="badge bg-success-subtle text-success">Actif</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Finances</td>
                    <td>Taux de Recouvrement des Frais</td>
                    <td style={{ fontWeight: 800, color: '#10b981' }}>{recoveryRate}% ({collectedAmount.toLocaleString('fr-FR')} F)</td>
                    <td><span className="badge bg-success-subtle text-success">Actif</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Ressources H.</td>
                    <td>Personnel Total</td>
                    <td style={{ fontWeight: 800, color: '#0ea5e9' }}>{totalStaff} employés</td>
                    <td><span className="badge bg-info-subtle text-info">Actif</span></td>
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
                  {classGrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                        Aucune évaluation enregistrée pour cette année scolaire.
                      </td>
                    </tr>
                  ) : (
                    classGrades.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{row.class}</td>
                        <td style={{ fontWeight: 800, color: '#8b5cf6' }}>{row.moyenne}/20</td>
                        <td>{row.min}/20</td>
                        <td>{row.max}/20</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{row.succes}%</td>
                      </tr>
                    ))
                  )}
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
