import React, { useState } from 'react';
import { useExpenses } from '../hooks/expenses/useExpenses';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import { ExpenseDashboardView } from '../components/expenses/ExpenseDashboardView';
import {
  ExpenseRecord,
  ExpensePaymentMode,
  ExpenseStatus,
} from '../services/expenses/types';
import { EXPENSE_PAYMENT_MODE_LABELS } from '../services/expenses/expenseService';
import { downloadExcel } from '../utils/exportUtils';
import { documentEngineEnterprise } from '../services/documents/DocumentEngine/index';
import { safePrintHtml } from '../services/documents/safePrintService';
import {
  Plus, Search, Download, X, Save, TrendingDown, DollarSign,
  Printer, FileText, Edit2, Ban, Tag, Shield, Building,
  BarChart2, ListFilter, Filter, Calendar, Clock, SlidersHorizontal,
} from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const STATUS_BADGES: Record<ExpenseStatus, { label: string; bg: string; color: string; border: string }> = {
  VALIDATED: { label: '🟢 Validée', bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  PENDING:   { label: '🟡 En attente', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  CANCELLED: { label: '🔴 Annulée', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

const PAYMENT_MODES: ExpensePaymentMode[] = [
  'CASH', 'CHECK', 'TRANSFER', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE',
];

type MainTab = 'DASHBOARD' | 'LIST';

export default function ExpensesPage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');
  const [activeTab, setActiveTab] = useState<MainTab>('DASHBOARD');

  const {
    expenses,
    categories,
    kpis,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedMonth,
    setSelectedMonth,
    reload: reloadExpenses,
    addCategory,
    createExpense,
    updateExpense,
    cancelExpense,
    updateBudget,
  } = useExpenses(selectedYearId);

  // Synchronisation temps réel automatique
  useRealtimeSync({
    tables: ['expenses', 'school_settings'],
    onDataChange: () => reloadExpenses(),
  });

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [cancellingExpense, setCancellingExpense] = useState<ExpenseRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Formulaire Nouvelle / Modif Dépense
  const [form, setForm] = useState<{
    date: string;
    categoryId: string;
    description: string;
    amount: string;
    paymentMode: ExpensePaymentMode;
    supplier: string;
    attachmentUrl: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    description: '',
    amount: '',
    paymentMode: 'CASH',
    supplier: '',
    attachmentUrl: '',
  });

  // Formulaire Nouvelle Catégorie
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [savingCat, setSavingCat] = useState(false);

  // Formulaire Budget
  const [newBudgetVal, setNewBudgetVal] = useState(String(kpis.annualBudget));
  const [savingBudget, setSavingBudget] = useState(false);

  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingExpense(null);
    setForm({
      date: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id || '',
      description: '',
      amount: '',
      paymentMode: 'CASH',
      supplier: '',
      attachmentUrl: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    if (exp.status === 'CANCELLED') return;
    setEditingExpense(exp);
    setForm({
      date: exp.date,
      categoryId: exp.categoryId,
      description: exp.description,
      amount: String(exp.amount),
      paymentMode: exp.paymentMode,
      supplier: exp.supplier || '',
      attachmentUrl: exp.attachmentUrl || '',
    });
    setShowAddModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) return;

    setSaving(true);
    if (editingExpense) {
      const res = await updateExpense(editingExpense.id, {
        date: form.date,
        categoryId: form.categoryId,
        description: form.description,
        amount: amountNum,
        paymentMode: form.paymentMode,
        supplier: form.supplier,
      });
      if (res.success) setShowAddModal(false);
    } else {
      const res = await createExpense({
        date: form.date,
        categoryId: form.categoryId || (categories[0]?.id ?? ''),
        description: form.description,
        amount: amountNum,
        paymentMode: form.paymentMode,
        supplier: form.supplier,
        attachmentUrl: form.attachmentUrl,
        academicYearId: selectedYearId,
      });
      if (res.success) setShowAddModal(false);
    }
    setSaving(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    const res = await addCategory(catName.trim(), catColor);
    setSavingCat(false);
    if (res.success) {
      setCatName('');
      setShowCatModal(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBudgetVal);
    if (isNaN(val) || val < 0) return;
    setSavingBudget(true);
    const res = await updateBudget(val);
    setSavingBudget(false);
    if (res.success) setShowBudgetModal(false);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingExpense) return;
    await cancelExpense(cancellingExpense.id, cancelReason);
    setCancellingExpense(null);
    setCancelReason('');
  };

  const handleExportExcel = () => {
    const data = expenses.map((e) => ({
      Date: e.date,
      Catégorie: e.categoryName,
      Description: e.description,
      Fournisseur: e.supplier || '—',
      'Montant (FCFA)': e.amount,
      'Mode de paiement': EXPENSE_PAYMENT_MODE_LABELS[e.paymentMode] || e.paymentMode,
      Statut: e.status === 'VALIDATED' ? 'Validée' : e.status === 'PENDING' ? 'En attente' : 'Annulée',
    }));
    downloadExcel(data, 'Dépenses', `depenses_gesco_${selectedYearId}`);
  };

  const handlePrintOrPDF = async () => {
    const safeExpenses = expenses || [];
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10px; background: #ffffff !important;">
        <thead>
          <tr style="background-color: #5B4E9E !important; color: #ffffff !important;">
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Date</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Catégorie</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Description</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Fournisseur</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Mode</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">Statut</th>
            <th style="padding: 8px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; text-align: right;">Montant (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          ${safeExpenses.map((e, idx) => {
            const bg = idx % 2 === 1 ? 'background-color: #F5F4FA !important;' : 'background-color: #ffffff !important;';
            const modeText = EXPENSE_PAYMENT_MODE_LABELS[e.paymentMode] || e.paymentMode || '—';
            const amountText = (e.amount || 0).toLocaleString('fr-FR');
            return `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.date || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.categoryName || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.description || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.supplier || '—'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${modeText}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; ${bg}">${e.status === 'VALIDATED' ? 'Validée' : e.status === 'PENDING' ? 'En attente' : 'Annulée'}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #D8D5E4; font-weight: 800; text-align: right; ${bg}">${amountText} FCFA</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;

    const totalVal = safeExpenses.reduce((acc, curr) => acc + (curr.status === 'VALIDATED' ? (curr.amount || 0) : 0), 0);

    const doc = await documentEngineEnterprise.compileDocument({
      documentType: 'ÉTAT_FINANCIER',
      title: 'JOURNAL DES DÉPENSES',
      subtitle: `RAPPORT FINANCIER DES DÉPENSES — ANNEÉ ${selectedYearId}`,
      meta: {
        NOMBRE: `${safeExpenses.length} opération(s)`,
        TOTAL: `${totalVal.toLocaleString('fr-FR')} FCFA`,
      },
      data: { count: safeExpenses.length },
      sectionsHtml: tableHtml,
    });

    safePrintHtml(doc.fullHtml, 'Journal des Dépenses GESCO');
  };

  const formatFCFA = (val: number) => `${val.toLocaleString('fr-FR')} FCFA`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ONGLETS PRINCIPAUX */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === 'DASHBOARD' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('DASHBOARD')}
            style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BarChart2 size={16} /> Tableau de bord des dépenses
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'LIST' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('LIST')}
            style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ListFilter size={16} /> Liste des dépenses ({expenses.length})
          </button>
        </div>

        {activeTab === 'LIST' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handlePrintOrPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Printer size={14} /> Imprimer / PDF
            </button>
            <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handleExportExcel} disabled={expenses.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Download size={14} /> Excel
            </button>
            <button className="btn btn-outline-primary text-sm fw-semibold" onClick={() => setShowCatModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Tag size={14} /> Nouvelle Catégorie
            </button>
            <button className="btn btn-primary fw-semibold text-sm" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Plus size={14} /> Saisir une dépense
            </button>
          </div>
        )}
      </div>

      {/* ONGLET 1 : TABLEAU DE BORD DES DÉPENSES */}
      {activeTab === 'DASHBOARD' && (
        <ExpenseDashboardView />
      )}

      {/* ONGLET 2 : LISTE DES DÉPENSES & GESTION */}
      {activeTab === 'LIST' && (
        <>
          {/* INDICATEURS RAPIDES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Dépenses du mois */}
            <div style={{ borderRadius: 18, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '18px 20px', color: '#ffffff', boxShadow: '0 4px 20px rgba(220,38,38,0.30)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingDown size={22} color="#ffffff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', lineHeight: 1.1 }}>{formatFCFA(kpis.totalMonth)}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Dépenses du mois</p>
              </div>
            </div>

            {/* Dépenses annuelles */}
            <div style={{ borderRadius: 18, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '18px 20px', color: '#ffffff', boxShadow: '0 4px 20px rgba(37,99,235,0.30)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={22} color="#ffffff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', lineHeight: 1.1 }}>{formatFCFA(kpis.totalYear)}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Dépenses annuelles</p>
              </div>
            </div>

            {/* Budget (cliquable) */}
            <div
              style={{ borderRadius: 18, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '18px 20px', color: '#ffffff', boxShadow: '0 4px 20px rgba(16,185,129,0.30)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => { setNewBudgetVal(String(kpis.annualBudget)); setShowBudgetModal(true); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(16,185,129,0.40)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(16,185,129,0.30)'; }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building size={22} color="#ffffff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', lineHeight: 1.1 }}>{formatFCFA(kpis.annualBudget)}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Budget (Cliquer p. modifier)</p>
              </div>
            </div>

            {/* Budget restant */}
            <div style={{ borderRadius: 18, background: kpis.remainingBudget >= 0 ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '18px 20px', color: '#ffffff', boxShadow: kpis.remainingBudget >= 0 ? '0 4px 20px rgba(124,58,237,0.30)' : '0 4px 20px rgba(249,115,22,0.30)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={22} color="#ffffff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', lineHeight: 1.1 }}>{formatFCFA(kpis.remainingBudget)}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Budget restant</p>
              </div>
            </div>
          </div>


          {/* BARRE DE FILTRES AÉRÉE SAAS */}
          <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px' }}>
              
              {/* Header des filtres */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>Filtres des dépenses</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Recherchez et filtrez l'historique complet des décaissements</p>
                  </div>
                </div>

                {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedMonth || searchQuery) && (
                  <button
                    className="btn btn-sm btn-outline-secondary fw-semibold"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSelectedStatus('ALL');
                      setSelectedMonth('');
                      setSearchQuery('');
                    }}
                    style={{ borderRadius: 10, padding: '6px 14px' }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>

              {/* Grille responsive aérée pour les filtres */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                
                {/* 1. RECHERCHE TEXTE */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                      <Search size={13} />
                    </span>
                    Recherche par Mot-clé
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Catégorie, description, fournisseur..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ height: '42px', paddingLeft: 36, borderRadius: '10px', fontWeight: 500, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                {/* 2. ANNÉE SCOLAIRE */}
                {/* 2. ANNÉE SCOLAIRE ACTIVE */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                      <Calendar size={13} />
                    </span>
                    Année Scolaire Active
                  </label>
                  <div style={{ height: '42px', borderRadius: '10px', fontWeight: 700, border: '1px solid #a7f3d0', fontSize: '0.875rem', width: '100%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                    <span>🟢</span> {schoolYear}
                  </div>
                </div>

                {/* 3. CATÉGORIE */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#f3e8ff', color: '#9333ea', borderRadius: 6 }}>
                      <Tag size={13} />
                    </span>
                    Catégorie
                  </label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
                  >
                    <option value="ALL">Toutes les catégories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 4. STATUT */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#d1fae5', color: '#059669', borderRadius: 6 }}>
                      <Shield size={13} />
                    </span>
                    Statut Validation
                  </label>
                  <select
                    className="form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="VALIDATED">🟢 Validée</option>
                    <option value="PENDING">🟡 En attente</option>
                    <option value="CANCELLED">🔴 Annulée</option>
                  </select>
                </div>

                {/* 5. MOIS */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#fef3c7', color: '#d97706', borderRadius: 6 }}>
                      <Clock size={13} />
                    </span>
                    Mois d'imputation
                  </label>
                  <input
                    type="month"
                    className="form-control"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* TABLEAU */}
          <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    {['Date', 'Catégorie', 'Description', 'Fournisseur', 'Mode de paiement', 'Montant', 'Statut', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 14px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: i === 5 ? 'right' : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-5 text-muted">Chargement...</td></tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5">
                        <TrendingDown size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>Aucune dépense trouvée.</p>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => {
                      const stBadge = STATUS_BADGES[exp.status];
                      return (
                        <tr key={exp.id} style={{ opacity: exp.status === 'CANCELLED' ? 0.6 : 1 }}>
                          <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                            {exp.date}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              fontSize: '0.75rem', fontWeight: 600,
                              color: exp.categoryColor || '#475569',
                              background: `${exp.categoryColor || '#64748b'}15`,
                              border: `1px solid ${exp.categoryColor || '#64748b'}30`,
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
                          <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#475569' }}>
                            {EXPENSE_PAYMENT_MODE_LABELS[exp.paymentMode] || exp.paymentMode}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: exp.status === 'CANCELLED' ? '#94a3b8' : '#dc2626' }}>
                            {exp.status === 'CANCELLED' ? '<s>' : ''}- {exp.amount.toLocaleString('fr-FR')} FCFA{exp.status === 'CANCELLED' ? '</s>' : ''}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              background: stBadge.bg, color: stBadge.color,
                              border: `1px solid ${stBadge.border}`,
                              borderRadius: 20, padding: '3px 10px',
                              fontSize: '0.75rem', fontWeight: 600,
                            }}>
                              {stBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {exp.status !== 'CANCELLED' && (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Modifier"
                                    onClick={() => openEditModal(exp)}
                                    style={{ padding: '3px 8px' }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    title="Annuler"
                                    onClick={() => { setCancellingExpense(exp); setCancelReason(''); }}
                                    style={{ padding: '3px 8px' }}
                                  >
                                    <Ban size={13} />
                                  </button>
                                </>
                              )}
                              {exp.attachmentUrl && (
                                <a
                                  href={exp.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                  title="Pièce justificative"
                                  style={{ padding: '3px 8px' }}
                                >
                                  <FileText size={13} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {expenses.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.8125rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                <span>{expenses.length} dépense{expenses.length > 1 ? 's' : ''} affichée{expenses.length > 1 ? 's' : ''}</span>
                <span>Total : <strong style={{ color: '#dc2626' }}>{expenses.filter(e => e.status !== 'CANCELLED').reduce((s, e) => s + e.amount, 0).toLocaleString('fr-FR')} FCFA</strong></span>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL NOUVELLE / MODIF DÉPENSE */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 540, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingDown size={20} color="white" />
                <h5 style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '1.0625rem' }}>
                  {editingExpense ? 'Modifier la dépense' : 'Saisir une nouvelle dépense'}
                </h5>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="form-label fw-semibold text-sm">Date *</label>
                    <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label fw-semibold text-sm">Catégorie *</label>
                    <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">— Choisir —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm">Description *</label>
                  <input type="text" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex : Achat fournitures de bureau" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="form-label fw-semibold text-sm">Montant (FCFA) *</label>
                    <input type="number" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min={1} step={100} placeholder="Ex : 50000" required />
                  </div>
                  <div>
                    <label className="form-label fw-semibold text-sm">Mode de paiement *</label>
                    <select className="form-select" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as ExpensePaymentMode })} required>
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>{EXPENSE_PAYMENT_MODE_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm">Fournisseur / Bénéficiaire (optionnel)</label>
                  <input type="text" className="form-control" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Ex : Librairie de France" />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm">Lien pièce justificative / Photo (optionnel)</label>
                  <input type="text" className="form-control" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Annuler</button>
                <button type="submit" className="btn btn-primary fw-semibold" disabled={saving}>
                  {saving ? 'Enregistrement...' : <><Save size={15} className="me-2" />Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE CATÉGORIE */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag size={18} color="white" />
                <h6 style={{ margin: 0, fontWeight: 700, color: 'white' }}>Nouvelle catégorie</h6>
              </div>
              <button onClick={() => setShowCatModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="form-label fw-semibold text-sm">Nom de la catégorie *</label>
                  <input type="text" className="form-control" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex : Fêtes & Événements" required />
                </div>
                <div>
                  <label className="form-label fw-semibold text-sm" style={{ display: 'block', marginBottom: 6 }}>Couleur d'identification</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatColor(c)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: c,
                          border: catColor === c ? '3px solid #0f172a' : '2px solid #ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowCatModal(false)} disabled={savingCat}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm fw-semibold" disabled={savingCat}>
                  {savingCat ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER BUDGET */}
      {showBudgetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building size={18} color="white" />
                <h6 style={{ margin: 0, fontWeight: 700, color: 'white' }}>Budget annuel de l'école</h6>
              </div>
              <button onClick={() => setShowBudgetModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="form-label fw-semibold text-sm">Budget prévu (FCFA) *</label>
                  <input type="number" className="form-control" value={newBudgetVal} onChange={(e) => setNewBudgetVal(e.target.value)} min={0} step={100000} required />
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowBudgetModal(false)} disabled={savingBudget}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm fw-semibold" disabled={savingBudget}>
                  {savingBudget ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION ANNULATION */}
      {cancellingExpense && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1070, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 440, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#fef2f2', borderBottom: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ban size={22} color="#dc2626" />
              <div>
                <h6 style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>Annuler la dépense</h6>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c' }}>Cette action conserve l'historique mais invalide la dépense.</p>
              </div>
            </div>
            <div style={{ padding: 24, display: 'grid', gap: 14 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>
                Êtes-vous sûr de vouloir annuler la dépense <strong>"{cancellingExpense.description}"</strong> d'un montant de <strong>{cancellingExpense.amount.toLocaleString('fr-FR')} FCFA</strong> ?
              </p>
              <div>
                <label className="form-label fw-semibold text-sm">Motif de l'annulation (optionnel)</label>
                <textarea className="form-control" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="Ex : Erreur de saisie, doublon..." />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setCancellingExpense(null)}>Retour</button>
              <button className="btn btn-danger btn-sm fw-semibold" onClick={handleConfirmCancel}>Confirmer l'annulation</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
