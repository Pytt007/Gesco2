import React, { useState, useMemo } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useTuitionFees } from '../../hooks/finance/useTuitionFees';
import { TuitionFeeSchedule, TuitionLevelCode } from '../../services/finance/types';
import { TuitionFeeModal } from './TuitionFeeModal';
import {
  Plus,
  Copy,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Search,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  RotateCcw,
  TrendingUp,
  GraduationCap,
  Percent,
  Coins,
  Check,
  Info,
} from 'lucide-react';
import { useSchoolYear } from '../../context/SchoolYearContext';

type CycleFilter = 'ALL' | 'PRE' | 'PRI';

export const TuitionFeesConfigView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const activeYear = schoolYear || '2024-2025';
  const confirm = useConfirm();

  const {
    schedules,
    loading,
    error,
    saving,
    grandTotals,
    createFeeSchedule,
    updateFeeSchedule,
    deleteFeeSchedule,
    resetToDefault,
    duplicatePreviousYear,
  } = useTuitionFees(activeYear);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<TuitionFeeSchedule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const existingLevelCodes = schedules.map((s) => s.levelCode);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (schedule: TuitionFeeSchedule) => {
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  const handleSaveModal = async (data: {
    levelCode: TuitionLevelCode;
    registrationFee: number;
    tuitionFee: number;
    allowFixedDiscount: boolean;
    allowPercentDiscount: boolean;
    maxDiscountPercent: number;
  }) => {
    if (editingSchedule) {
      const ok = await updateFeeSchedule(editingSchedule.id, data);
      if (ok) {
        notifySuccess(`Tarifs du niveau ${data.levelCode} mis à jour avec succès.`);
      }
      return ok;
    } else {
      const ok = await createFeeSchedule(data);
      if (ok) {
        notifySuccess(`Tarifs pour le niveau ${data.levelCode} créés avec succès.`);
      }
      return ok;
    }
  };

  const handleDelete = async (schedule: TuitionFeeSchedule) => {
    const isConfirmed = await confirm({
      title: 'Supprimer ce tarif de niveau',
      message: `Êtes-vous sûr de vouloir supprimer définitivement la tarification du niveau "${schedule.levelName}" pour l'année ${activeYear} ?`,
      confirmText: 'Oui, supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (isConfirmed) {
      const ok = await deleteFeeSchedule(schedule.id);
      if (ok) {
        notifySuccess(`Tarif du niveau ${schedule.levelName} supprimé.`);
      }
    }
  };

  const handleResetDefaults = async () => {
    const isConfirmed = await confirm({
      title: 'Réinitialiser aux tarifs officiels',
      message: `Voulez-vous réinitialiser tous les tarifs de l'année scolaire ${activeYear} aux grilles officielles par défaut (PS à CM2) ?`,
      confirmText: 'Oui, réinitialiser',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (isConfirmed) {
      const ok = await resetToDefault();
      if (ok) {
        notifySuccess('Grille tarifaire réinitialisée aux standards officiels.');
      }
    }
  };

  const handleDuplicatePrevious = async () => {
    const prevYearId = activeYear === '2024-2025' ? '2023-2024' : '2024-2025';
    const isConfirmed = await confirm({
      title: 'Dupliquer la grille tarifaire',
      message: `Dupliquer tous les tarifs de l'année précédente (${prevYearId}) vers l'année active (${activeYear}) ?`,
      confirmText: 'Oui, dupliquer',
      cancelText: 'Annuler',
      variant: 'info',
    });
    if (isConfirmed) {
      const ok = await duplicatePreviousYear(prevYearId);
      if (ok) {
        notifySuccess(`Les tarifs de l'année précédente ont été dupliqués avec succès.`);
      }
    }
  };

  // Filtrage intelligent
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.levelName.toLowerCase().includes(q) ||
        s.levelCode.toLowerCase().includes(q) ||
        s.totalAnnualFee.toString().includes(q) ||
        s.registrationFee.toString().includes(q) ||
        s.tuitionFee.toString().includes(q);

      if (!matchesSearch) return false;

      const isPreschool = ['GARDERIE', 'PS', 'MS', 'GS'].includes(s.levelCode);
      const isPrimary = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'].includes(s.levelCode);

      if (cycleFilter === 'PRE') return isPreschool;
      if (cycleFilter === 'PRI') return isPrimary;
      return true;
    });
  }, [schedules, searchQuery, cycleFilter]);

  const preschoolCount = schedules.filter((s) => ['GARDERIE', 'PS', 'MS', 'GS'].includes(s.levelCode)).length;
  const primaryCount = schedules.filter((s) => ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'].includes(s.levelCode)).length;
  const avgAnnual = schedules.length > 0 ? Math.round(grandTotals.totalAnnual / schedules.length) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── BANNIÈRE HERO / STATISTIQUES SAAS ──────────────────────────────── */}
      <div
        className="card"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ padding: '6px 10px', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase' }}>
                Module CRUD Finance
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Session active : <strong style={{ color: '#38bdf8' }}>{activeYear}</strong></span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Configuration des frais de scolarité
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.84375rem', color: '#94a3b8' }}>
              Gestion centralisée des droits d'inscription, écolages et règles de remise par niveau scolaire.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={handleResetDefaults}
              disabled={saving}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.8125rem',
                background: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
              title="Restaurer la grille tarifaire standard officielle"
            >
              <RotateCcw size={15} /> Réinitialiser standards
            </button>

            <button
              className="btn"
              onClick={handleDuplicatePrevious}
              disabled={saving}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.8125rem',
                background: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Copy size={15} /> Dupliquer les tarifs
            </button>

            <button
              className="btn"
              onClick={handleOpenCreate}
              disabled={saving}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '0.84375rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Ajouter un tarif
            </button>
          </div>
        </div>

        {/* CARTES KPI SYNTHÉTIQUES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Annuel Cumulé</span>
              <Coins size={16} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8' }}>
              {grandTotals.totalAnnual.toLocaleString('fr-FR')} FCFA
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Somme des grilles configurées</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Droits d'Inscription</span>
              <DollarSign size={16} color="#4ade80" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80' }}>
              {grandTotals.totalRegistration.toLocaleString('fr-FR')} FCFA
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Montant total inscription</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Frais de Scolarité</span>
              <GraduationCap size={16} color="#a78bfa" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a78bfa' }}>
              {grandTotals.totalTuition.toLocaleString('fr-FR')} FCFA
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Montant total scolarité</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Moyenne / Niveau</span>
              <TrendingUp size={16} color="#fbbf24" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>
              {avgAnnual.toLocaleString('fr-FR')} FCFA
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{schedules.length} niveaux enregistrés</span>
          </div>
        </div>
      </div>

      {/* MESSAGES ALERTE */}
      {error && (
        <div className="alert alert-danger p-3 text-sm" style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success p-3 text-sm" style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="#16a34a" /> {successMessage}
        </div>
      )}

      {/* ── BARRE D'OUTILS FILTRES, RECHERCHE ET VUES ─────────────────────── */}
      <div
        className="card p-3"
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg-surface, #ffffff)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Cycle Tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: '4px', borderRadius: 10 }}>
          <button
            type="button"
            onClick={() => setCycleFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: cycleFilter === 'ALL' ? '#ffffff' : 'transparent',
              color: cycleFilter === 'ALL' ? '#1e293b' : '#64748b',
              boxShadow: cycleFilter === 'ALL' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Tous les niveaux ({schedules.length})
          </button>

          <button
            type="button"
            onClick={() => setCycleFilter('PRE')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: cycleFilter === 'PRE' ? '#ffffff' : 'transparent',
              color: cycleFilter === 'PRE' ? '#0284c7' : '#64748b',
              boxShadow: cycleFilter === 'PRE' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Préscolaire ({preschoolCount})
          </button>

          <button
            type="button"
            onClick={() => setCycleFilter('PRI')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: cycleFilter === 'PRI' ? '#ffffff' : 'transparent',
              color: cycleFilter === 'PRI' ? '#2563eb' : '#64748b',
              boxShadow: cycleFilter === 'PRI' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Primaire ({primaryCount})
          </button>
        </div>

        {/* Search & Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher niveau ou tarif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34, height: 38, borderRadius: 10, fontSize: '0.8125rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: '3px', borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
              title="Vue Tableau"
            >
              <List size={15} /> Tableau
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
              title="Vue Grille de Cartes"
            >
              <LayoutGrid size={15} /> Cartes
            </button>
          </div>
        </div>
      </div>

      {/* ── VUE 1 : TABLEAU MODERNE DU CRUD ────────────────────────────────── */}
      {viewMode === 'table' ? (
        <div
          className="card"
          style={{ borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', background: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
        >
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ width: '100%' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>
                    Niveau Scolaire
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>
                    Droits d'Inscription
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>
                    Frais de Scolarité
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 800, color: '#1e293b', textAlign: 'right', backgroundColor: '#f0f9ff' }}>
                    Total Annuel
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>
                    Politique de Remises
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                    Actions CRUD
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      Chargement de la grille tarifaire...
                    </td>
                  </tr>
                ) : filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5" style={{ color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Info size={28} color="#94a3b8" />
                        <span>Aucun tarif trouvé pour ce filtre.</span>
                        <button className="btn btn-sm btn-primary" onClick={handleOpenCreate} style={{ marginTop: 6, fontWeight: 700 }}>
                          + Ajouter un tarif
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((sch) => (
                    <tr key={sch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Niveau & Code */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: ['GARDERIE', 'PS', 'MS', 'GS'].includes(sch.levelCode) ? '#e0f2fe' : '#e0e7ff',
                              color: ['GARDERIE', 'PS', 'MS', 'GS'].includes(sch.levelCode) ? '#0284c7' : '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.78125rem',
                            }}
                          >
                            {sch.levelCode}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                              {sch.levelName}
                            </span>
                            <span style={{ fontSize: '0.71875rem', color: '#64748b' }}>
                              {['GARDERIE', 'PS', 'MS', 'GS'].includes(sch.levelCode) ? 'Cycle Préscolaire' : 'Cycle Primaire'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Inscription */}
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                        {sch.registrationFee.toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FCFA</span>
                      </td>

                      {/* Scolarité */}
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                        {sch.tuitionFee.toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FCFA</span>
                      </td>

                      {/* Total Annuel */}
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.9375rem', fontWeight: 900, color: '#1d4ed8', backgroundColor: '#f0f9ff' }}>
                        {sch.totalAnnualFee.toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>FCFA</span>
                      </td>

                      {/* Remises autorisées */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {sch.allowFixedDiscount && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: '0.71875rem',
                                fontWeight: 700,
                              }}
                            >
                              <Check size={12} /> Fixe
                            </span>
                          )}
                          {sch.allowPercentDiscount && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                fontSize: '0.71875rem',
                                fontWeight: 700,
                              }}
                            >
                              <Percent size={12} /> Max {sch.maxDiscountPercent}%
                            </span>
                          )}
                          {!sch.allowFixedDiscount && !sch.allowPercentDiscount && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Aucune remise</span>
                          )}
                        </div>
                      </td>

                      {/* Boutons d'Action CRUD */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleOpenEdit(sch)}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: 8,
                              padding: '5px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Modifier ce tarif"
                          >
                            <Edit2 size={13} /> Modifier
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleDelete(sch)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              borderRadius: 8,
                              padding: '5px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Supprimer ce tarif"
                          >
                            <Trash2 size={13} /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Ligne Total Cumulé */}
              {filteredSchedules.length > 0 && (
                <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <tr>
                    <td style={{ padding: '14px 18px', fontWeight: 900, color: '#0f172a' }}>
                      Total Cumulé ({filteredSchedules.length} Niveaux)
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {filteredSchedules.reduce((s, i) => s + i.registrationFee, 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {filteredSchedules.reduce((s, i) => s + i.tuitionFee, 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 900, color: '#1e40af', fontSize: '1rem', backgroundColor: '#dbeafe' }}>
                      {filteredSchedules.reduce((s, i) => s + i.totalAnnualFee, 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* ── VUE 2 : GRILLE DE CARTES SAAS ──────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredSchedules.map((sch) => {
            const isPre = ['GARDERIE', 'PS', 'MS', 'GS'].includes(sch.levelCode);
            const regPercent = sch.totalAnnualFee > 0 ? Math.round((sch.registrationFee / sch.totalAnnualFee) * 100) : 0;
            const tuiPercent = 100 - regPercent;

            return (
              <div
                key={sch.id}
                className="card p-4"
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Top card bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isPre ? '#e0f2fe' : '#e0e7ff',
                        color: isPre ? '#0284c7' : '#4338ca',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                      }}
                    >
                      {sch.levelCode}
                    </span>
                    <span style={{ fontSize: '0.71875rem', color: '#64748b', fontWeight: 600 }}>
                      {isPre ? 'Maternelle' : 'Primaire'}
                    </span>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {sch.levelName}
                  </h4>

                  {/* Total Amount badge */}
                  <div style={{ margin: '12px 0 8px', padding: '10px 12px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700 }}>Total Annuel</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7' }}>
                      {sch.totalAnnualFee.toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem' }}>FCFA</span>
                    </div>
                  </div>

                  {/* Breakdown Gauge */}
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '8px 0', display: 'flex' }}>
                    <div style={{ width: `${regPercent}%`, background: '#22c55e' }} title={`Inscription: ${regPercent}%`} />
                    <div style={{ width: `${tuiPercent}%`, background: '#3b82f6' }} title={`Scolarité: ${tuiPercent}%`} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginBottom: 8 }}>
                    <span>Inscription : <strong>{sch.registrationFee.toLocaleString('fr-FR')}</strong></span>
                    <span>Scolarité : <strong>{sch.tuitionFee.toLocaleString('fr-FR')}</strong></span>
                  </div>

                  {/* Discount Chips */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sch.allowFixedDiscount && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#334155', fontSize: '0.6875rem', fontWeight: 600 }}>
                        Remise Fixe
                      </span>
                    )}
                    {sch.allowPercentDiscount && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a', fontSize: '0.6875rem', fontWeight: 600 }}>
                        % max {sch.maxDiscountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(sch)}
                    className="btn btn-outline-primary btn-sm"
                    style={{ flex: 1, fontWeight: 700, fontSize: '0.78125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <Edit2 size={13} /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sch)}
                    className="btn btn-outline-danger btn-sm"
                    style={{ fontWeight: 700, padding: '6px 10px' }}
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALE CRUD DE CRÉATION / MODIFICATION ─────────────────────────── */}
      <TuitionFeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingSchedule}
        existingLevels={existingLevelCodes}
      />
    </div>
  );
};
