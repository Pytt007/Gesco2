import React, { useState, useEffect } from 'react';
import { useExpenseDashboard } from '../../hooks/expenses/useExpenseDashboard';
import { expenseService } from '../../services/expenses/expenseService';
import { ExpenseCategoryItem } from '../../services/expenses/types';
import { useAcademicYears } from '../../hooks/academic';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { downloadExcel } from '../../utils/exportUtils';
import { documentEngineEnterprise } from '../../services/documents/DocumentEngine/index';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import {
  TrendingDown, DollarSign, Building, Shield, Hash, Calculator,
  AlertTriangle, Filter, Download, Printer, ArrowUpRight,
  CheckCircle2, Clock, Info, Tag, Calendar,
} from 'lucide-react';

export const ExpenseDashboardView: React.FC = () => {
  const { schoolYear } = useSchoolYear();

  const {
    stats,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedMonth,
    setSelectedMonth,
    reload,
  } = useExpenseDashboard(schoolYear);

  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);

  useEffect(() => {
    expenseService.getCategories().then(setCategories);
  }, []);

  const formatFCFA = (val: number) => `${val.toLocaleString('fr-FR')} FCFA`;

  // Export Excel
  const handleExportExcel = () => {
    const topData = stats.topExpenses.map((e) => ({
      Date: e.date,
      Catégorie: e.categoryName,
      Description: e.description,
      Fournisseur: e.supplier || '—',
      'Montant (FCFA)': e.amount,
      'Mode de paiement': e.paymentMode,
    }));
    downloadExcel(topData, 'Top Dépenses', `dashboard_depenses_gesco_${schoolYear}`);
  };

  // Impression / PDF via DocumentEngine Enterprise
  const handlePrintOrPDF = async () => {
    const valTotal = stats?.totalValidatedAmount ?? stats?.totalMonth ?? 0;
    const pendingTotal = stats?.totalPendingAmount ?? 0;
    const monthlyBudgetVal = stats?.monthlyBudget ?? stats?.annualBudget ?? 0;
    const topList = stats?.topExpenses || [];

    const kpiHtml = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
        <div style="background-color: #F5F4FA !important; border: 1px solid #D8D5E4; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #6B6684 !important; text-transform: uppercase;">Total Dépenses Validées</div>
          <div style="font-size: 16px; font-weight: 900; color: #5B4E9E !important; margin-top: 2px;">${valTotal.toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div style="background-color: #F5F4FA !important; border: 1px solid #D8D5E4; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #6B6684 !important; text-transform: uppercase;">En Attente de Validation</div>
          <div style="font-size: 16px; font-weight: 900; color: #F59E0B !important; margin-top: 2px;">${pendingTotal.toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div style="background-color: #F5F4FA !important; border: 1px solid #D8D5E4; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 800; color: #6B6684 !important; text-transform: uppercase;">Budget Mensuel</div>
          <div style="font-size: 16px; font-weight: 900; color: #10B981 !important; margin-top: 2px;">${monthlyBudgetVal ? monthlyBudgetVal.toLocaleString('fr-FR') + ' FCFA' : '—'}</div>
        </div>
      </div>
    `;

    const tableHtml = `
      <div style="margin-bottom: 12px; font-size: 11px; font-weight: 800; color: #453D7A !important; text-transform: uppercase;">Top Plus Grandes Dépenses :</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10px; background: #ffffff !important;">
        <thead>
          <tr style="background-color: #5B4E9E !important; color: #ffffff !important;">
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Date</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Catégorie</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Description</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Fournisseur</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; text-align: right;">Montant (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          ${topList.map((e, idx) => {
            const bg = idx % 2 === 1 ? 'background-color: #F5F4FA !important;' : 'background-color: #ffffff !important;';
            const amtText = (e.amount || 0).toLocaleString('fr-FR');
            return `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.date || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.categoryName || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.description || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.supplier || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; font-weight: 800; text-align: right; ${bg}">${amtText} FCFA</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;

    const doc = await documentEngineEnterprise.compileDocument({
      documentType: 'ÉTAT_FINANCIER',
      title: 'SYNTHÈSE DES DÉPENSES',
      subtitle: `DASHBOARD FINANCIER DÉPENSES — ANNEÉ ${schoolYear}`,
      meta: {
        BUDGET: monthlyBudgetVal ? `${monthlyBudgetVal.toLocaleString('fr-FR')} FCFA` : 'Non défini',
      },
      data: stats || {},
      sectionsHtml: kpiHtml + tableHtml,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(doc.fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const kpiCards = [
    { label: 'Dépenses du mois', value: formatFCFA(stats.totalMonth), icon: <TrendingDown size={15} color="#ffffff" />, tag: 'Mensuel', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.25)' },
    { label: 'Dépenses annuelles', value: formatFCFA(stats.totalYear), icon: <DollarSign size={15} color="#ffffff" />, tag: 'Cumul', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', shadow: 'rgba(37, 99, 235, 0.25)' },
    { label: 'Budget annuel', value: formatFCFA(stats.annualBudget), icon: <Building size={15} color="#ffffff" />, tag: 'Alloué', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
    { label: 'Budget restant', value: formatFCFA(stats.remainingBudget), icon: <Shield size={15} color="#ffffff" />, tag: 'Solde', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', shadow: 'rgba(6, 182, 212, 0.25)' },
    { label: 'Nombre de dépenses', value: `${stats.totalExpenseCount}`, icon: <Hash size={15} color="#ffffff" />, tag: 'Nombre', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', shadow: 'rgba(139, 92, 246, 0.25)' },
    { label: 'Moyenne par mois', value: formatFCFA(stats.averagePerMonth), icon: <Calculator size={15} color="#ffffff" />, tag: 'Moyenne', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249, 115, 22, 0.25)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Tableau de bord des dépenses
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Vision globale et instantanée de la santé financière et du budget de l'établissement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handlePrintOrPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handleExportExcel} disabled={stats.topExpenses.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <Download size={15} /> Exporter Excel
          </button>
        </div>
      </div>

      {/* BARRE DE FILTRES AÉRÉE SAAS */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px' }}>
          
          {/* Header des filtres */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Filter size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff' }}>Filtres d'analyse des dépenses</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Filtrez le tableau de bord par Année, Mois ou Catégorie de charge</p>
              </div>
            </div>

            {(selectedCategory !== 'ALL' || selectedMonth) && (
              <button
                className="btn btn-sm fw-semibold"
                onClick={() => { setSelectedCategory('ALL'); setSelectedMonth(''); }}
                style={{ borderRadius: 10, padding: '6px 14px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Grille responsive aérée pour les filtres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            
            {/* 1. ANNÉE SCOLAIRE */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: '#7dd3fc', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Calendar size={12} />
                Année Scolaire Active
              </label>
              <div style={{ height: '42px', borderRadius: '10px', fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem', width: '100%', background: 'rgba(255,255,255,0.12)', color: '#ffffff', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6 }}>
                <span>🟢</span> {schoolYear}
              </div>
            </div>

            {/* 2. MOIS D'IMPUTATION */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: '#fde68a', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Clock size={12} />
                Mois d'imputation
              </label>
              <input
                type="month"
                className="form-control"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.875rem', width: '100%', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
              />
            </div>

            {/* 3. CATÉGORIE DE DÉPENSE */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, color: '#d8b4fe', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Tag size={12} />
                Catégorie de Dépense
              </label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.875rem', width: '100%', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
              >
                <option value="ALL" style={{ background: '#1e293b', color: '#ffffff' }}>Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#ffffff' }}>{c.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>


      {/* INDICATEURS (6 KPIs - STYLE DASHBOARD DYNAMIQUE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="card-hover"
            style={{
              background: kpi.gradient,
              borderRadius: '14px',
              padding: '1.25rem',
              color: '#ffffff',
              boxShadow: `0 6px 20px ${kpi.shadow}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                {kpi.tag}
              </span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{kpi.label}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* BLOC ALERTES FINANCIÈRES AUTOMATIQUES */}
      {stats.alerts.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {stats.alerts.map((alt) => {
            const isDanger = alt.severity === 'danger';
            const isWarn = alt.severity === 'warning';
            const bg = isDanger ? '#fef2f2' : isWarn ? '#fffbeb' : '#eff6ff';
            const border = isDanger ? '#fca5a5' : isWarn ? '#fde68a' : '#bfdbfe';
            const color = isDanger ? '#991b1b' : isWarn ? '#92400e' : '#1e40af';

            return (
              <div key={alt.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertTriangle size={20} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h6 style={{ margin: 0, fontWeight: 700, color, fontSize: '0.9375rem' }}>{alt.title}</h6>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color, opacity: 0.9 }}>{alt.message}</p>
                  {alt.details && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color, opacity: 0.75 }}>{alt.details}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GRAPHIQUES (Camembert + Évolution mensuelle) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        
        {/* Graphique 1 : Camembert Répartition par catégorie */}
        <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div className="card-body p-4">
            <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={16} color="#2563eb" /> Répartition des dépenses par catégorie
            </h6>

            {stats.categoryDistribution.length === 0 ? (
              <div className="text-center py-5 text-muted">Aucune donnée disponible pour la période.</div>
            ) : (
              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryDistribution}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      innerRadius={70}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {stats.categoryDistribution.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Montant']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Graphique 2 : Évolution mensuelle (BarChart) */}
        <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div className="card-body p-4">
            <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} color="#2563eb" /> Évolution mensuelle des dépenses
            </h6>

            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyEvolution} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Dépenses']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '0.8125rem' }}
                  />
                  <Line type="natural" dataKey="amount" name="Montant mensuel" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 10 DÉPENSES */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="card-body p-4" style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpRight size={18} color="#dc2626" /> Top 10 des dépenses les plus importantes
          </h6>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                {['#', 'Date', 'Catégorie', 'Description', 'Fournisseur', 'Montant (FCFA)'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 14px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: i === 5 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">Chargement...</td></tr>
              ) : stats.topExpenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">Aucune dépense enregistrée.</td></tr>
              ) : (
                stats.topExpenses.map((exp, idx) => (
                  <tr key={exp.id}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.8125rem', color: '#94a3b8', width: 40 }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                      {exp.date}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: exp.categoryColor || '#2563eb',
                        background: `${exp.categoryColor || '#2563eb'}15`,
                        padding: '3px 10px', borderRadius: 20,
                      }}>
                        {exp.categoryName}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {exp.description}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#64748b' }}>
                      {exp.supplier || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: '0.9375rem', color: '#dc2626' }}>
                      {exp.amount.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
