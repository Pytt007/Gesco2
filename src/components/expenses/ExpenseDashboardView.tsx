import React, { useState, useEffect } from 'react';
import { useExpenseDashboard } from '../../hooks/expenses/useExpenseDashboard';
import { expenseService } from '../../services/expenses/expenseService';
import { ExpenseCategoryItem } from '../../services/expenses/types';
import { useAcademicYears } from '../../hooks/academic';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { downloadExcel } from '../../utils/exportUtils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingDown, DollarSign, Building, Shield, Hash, Calculator,
  AlertTriangle, Filter, Download, Printer, ArrowUpRight,
  CheckCircle2, Clock, Info, Tag, Calendar,
} from 'lucide-react';

export const ExpenseDashboardView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear?.id || 'ay-2026');

  const {
    stats,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedMonth,
    setSelectedMonth,
  } = useExpenseDashboard(selectedYearId);

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
    downloadExcel(topData, 'Top Dépenses', `dashboard_depenses_gesco_${selectedYearId}`);
  };

  // Impression / PDF
  const handlePrintOrPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tableau de Bord des Dépenses — GESCO</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
            h1 { font-size: 20px; color: #1e3a5f; margin-bottom: 4px; }
            p.sub { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background: #f8fafc; }
            .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .kpi-val { font-size: 16px; font-weight: bold; margin-top: 4px; color: #1e293b; }
            .alert-box { background: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #991b1b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .amount { text-align: right; font-weight: bold; color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Tableau de Bord des Dépenses</h1>
          <p class="sub">École Privée GESCO · Année Scolaire ${selectedYearId} · Imprimé le ${new Date().toLocaleDateString('fr-FR')}</p>

          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Dépenses du mois</div><div class="kpi-val">${formatFCFA(stats.totalMonth)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Dépenses annuelles</div><div class="kpi-val">${formatFCFA(stats.totalYear)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Budget annuel</div><div class="kpi-val">${formatFCFA(stats.annualBudget)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Budget restant</div><div class="kpi-val">${formatFCFA(stats.remainingBudget)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Nombre total de dépenses</div><div class="kpi-val">${stats.totalExpenseCount}</div></div>
            <div class="kpi-card"><div class="kpi-label">Dépense moyenne / mois</div><div class="kpi-val">${formatFCFA(stats.averagePerMonth)}</div></div>
          </div>

          ${stats.alerts.length > 0 ? `
            <div class="alert-box">
              <strong>Alertes financières actives (${stats.alerts.length}) :</strong>
              <ul>
                ${stats.alerts.map((a) => `<li><strong>${a.title}</strong> : ${a.message}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <h3>Top 10 Dépenses</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Description</th>
                <th>Fournisseur</th>
                <th class="amount">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.topExpenses.map((e) => `
                <tr>
                  <td>${e.date}</td>
                  <td>${e.categoryName}</td>
                  <td>${e.description}</td>
                  <td>${e.supplier || '—'}</td>
                  <td class="amount">${e.amount.toLocaleString('fr-FR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
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

      {/* FILTRES D'ANALYSE */}
      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="#64748b" />

          {/* Filtre Année */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color="#2563eb" />
            <select
              className="form-select form-select-sm fw-semibold"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              style={{ width: 150 }}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name} {ay.isCurrent ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Filtre Mois */}
          <input
            type="month"
            className="form-control form-control-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: 160 }}
          />

          {/* Filtre Catégorie */}
          <select
            className="form-select form-select-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {(selectedCategory !== 'ALL' || selectedMonth) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => { setSelectedCategory('ALL'); setSelectedMonth(''); }}
              style={{ borderRadius: 8 }}
            >
              Réinitialiser
            </button>
          )}
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
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {stats.categoryDistribution.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Montant']}
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
                <BarChart data={stats.monthlyEvolution} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`} />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, 'Dépenses']} />
                  <Bar dataKey="amount" name="Montant mensuel" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
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
