// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 3 : Configuration Financière & Échéancier
// Assistant d'Inscription Unifié (src/components/students/steps/FinancialConfigStep.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Calendar, CreditCard, ShieldAlert, Award, ArrowRight, Clock, Plus, Trash2, Layers } from 'lucide-react';
import { tuitionFeesService, normalizeLevelCode } from '../../../services/finance/tuitionFeesService';
import { PaymentMode, TuitionFeeSchedule } from '../../../services/finance/types';
import { getLevels, SchoolLevel } from '../../../services/academic/schoolLevelsService';

export interface InstallmentItem {
  number: number;
  label: string;
  dueDate: string;
  amountDue: number;
}

export interface FinancialConfigStepData {
  registrationFee: number;
  tuitionFee: number;
  canteenFee: number;
  transportFee: number;
  otherFees: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  discountReason?: string;
  paidAmount: number;
  paymentMode: PaymentMode;
  paymentReference: string;
  remarks: string;
  customInstallments?: InstallmentItem[];
}

interface Props {
  data: FinancialConfigStepData;
  onChange: (updates: Partial<FinancialConfigStepData>) => void;
  levelCode?: string;
  onLevelChange?: (levelId: string) => void;
  schoolYear?: string;
  errors: Record<string, string>;
}

export const FinancialConfigStep: React.FC<Props> = ({
  data,
  onChange,
  levelCode = 'CP1',
  onLevelChange,
  schoolYear = '2024-2025',
  errors,
}) => {
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [tariffSchedule, setTariffSchedule] = useState<TuitionFeeSchedule | null>(null);
  const [availableLevels, setAvailableLevels] = useState<SchoolLevel[]>([]);

  // Chargement des niveaux scolaires disponibles
  useEffect(() => {
    getLevels().then((res) => {
      if (res.success && res.data) {
        setAvailableLevels(res.data);
      }
    });
  }, []);

  // Chargement automatique de la grille tarifaire configurée pour le niveau actif
  useEffect(() => {
    setLoadingTariffs(true);
    tuitionFeesService.getScheduleByLevel(levelCode, schoolYear).then((match) => {
      if (match) {
        setTariffSchedule(match);
        const reg = match.registrationFee || 0;
        const tui = match.tuitionFee || 0;
        onChange({
          registrationFee: reg,
          tuitionFee: tui,
          paidAmount: (data.paidAmount === 85000 || data.paidAmount === 50000 || data.paidAmount === 0 || reg === 0) ? reg : data.paidAmount,
        });
      } else {
        setTariffSchedule(null);
        onChange({
          registrationFee: 0,
          tuitionFee: 0,
          paidAmount: 0,
        });
      }
      setLoadingTariffs(false);
    });
  }, [levelCode, schoolYear]);

  // Nom lisible du niveau
  const currentLevelObj = availableLevels.find(
    (l) => l.id === levelCode || l.code === levelCode || l.code === normalizeLevelCode(levelCode)
  );
  const displayLevelName = tariffSchedule?.levelName || currentLevelObj?.name || normalizeLevelCode(levelCode);

  // Calculs financiers automatiques
  const grossTotal = data.registrationFee + data.tuitionFee + data.canteenFee + data.transportFee + data.otherFees;
  const discountAmount =
    data.discountType === 'FIXED'
      ? data.discountValue
      : Math.round((data.tuitionFee * data.discountValue) / 100);

  const netTotal = Math.max(0, grossTotal - discountAmount);
  const remainingBalance = Math.max(0, netTotal - data.paidAmount);

  // Générateur dynamique d'échéances pour un nombre donné
  const generateInstallmentsForCount = (count: number, total: number = netTotal): InstallmentItem[] => {
    if (count <= 0) return [];
    const baseAmount = total > 0 ? Math.floor(total / count) : 0;
    const remainder = total > 0 ? total - baseAmount * count : 0;

    let startYear = new Date().getFullYear();
    if (schoolYear) {
      const parts = schoolYear.split(/[-/]/);
      const parsed = parseInt(parts[0], 10);
      if (!isNaN(parsed) && parsed > 2000) {
        startYear = parsed;
      }
    }
    const months = ['10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09'];

    return Array.from({ length: count }, (_, i) => {
      const yr = i >= 3 ? startYear + 1 : startYear;
      const monthStr = months[i % 12];
      const amount = i === 0 ? baseAmount + remainder : baseAmount;
      return {
        number: i + 1,
        label: count === 1 ? 'Paiement Unique (Comptant)' : count === 3 ? `Trimestre ${i + 1}` : `Échéance ${i + 1}`,
        dueDate: `${yr}-${monthStr}-05`,
        amountDue: amount,
      };
    });
  };

  const activeInstallments = data.customInstallments || generateInstallmentsForCount(8, netTotal);

  // Mise à jour d'un champ d'une échéance personnalisée
  const handleUpdateInstallment = (index: number, field: 'dueDate' | 'amountDue' | 'label', value: any) => {
    const copy = [...activeInstallments];
    copy[index] = { ...copy[index], [field]: value };
    onChange({ customInstallments: copy });
  };

  // Ajout d'une nouvelle échéance
  const handleAddInstallment = () => {
    const list = [...activeInstallments];
    const nextNumber = list.length + 1;
    let nextDueDate = `${new Date().getFullYear()}-10-05`;
    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last.dueDate) {
        const parts = last.dueDate.split('-');
        if (parts.length === 3) {
          let y = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          m += 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
          nextDueDate = `${y}-${String(m).padStart(2, '0')}-${parts[2]}`;
        }
      }
    }
    list.push({
      number: nextNumber,
      label: `Échéance ${nextNumber}`,
      dueDate: nextDueDate,
      amountDue: 0,
    });
    onChange({ customInstallments: list });
  };

  // Suppression d'une échéance
  const handleDeleteInstallment = (index: number) => {
    const list = activeInstallments.filter((_, i) => i !== index);
    const renumbered = list.map((item, i) => ({
      ...item,
      number: i + 1,
      label: item.label.startsWith('Échéance ') ? `Échéance ${i + 1}` : item.label,
    }));
    onChange({ customInstallments: renumbered });
  };

  // Sélection rapide du nombre d'échéances
  const handleSetInstallmentsCount = (count: number) => {
    const generated = generateInstallmentsForCount(count, netTotal);
    onChange({ customInstallments: generated });
  };

  // Répartition équitable sur toutes les échéances existantes
  const handleDistributeEvenly = () => {
    if (activeInstallments.length === 0) return;
    const count = activeInstallments.length;
    const base = Math.floor(netTotal / count);
    const rem = netTotal - base * count;
    const distributed = activeInstallments.map((inst, i) => ({
      ...inst,
      amountDue: i === 0 ? base + rem : base,
    }));
    onChange({ customInstallments: distributed });
  };

  // Ajustement de l'écart sur la dernière échéance
  const handleAdjustOnLast = () => {
    if (activeInstallments.length === 0) return;
    const currentSum = activeInstallments.reduce((s, i) => s + (Number(i.amountDue) || 0), 0);
    const diff = netTotal - currentSum;
    const list = [...activeInstallments];
    const lastIdx = list.length - 1;
    list[lastIdx] = {
      ...list[lastIdx],
      amountDue: Math.max(0, (Number(list[lastIdx].amountDue) || 0) + diff),
    };
    onChange({ customInstallments: list });
  };

  const installmentsSum = activeInstallments.reduce((sum, inst) => sum + (Number(inst.amountDue) || 0), 0);
  const difference = netTotal - installmentsSum;

  const handleLevelSelect = (newLevelId: string) => {
    if (onLevelChange) {
      onLevelChange(newLevelId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── BANNIÈRE RÉCAPITULATIF FINANCIER DYNAMIQUE ──────────────────────── */}
      <div
        className="card p-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: 16,
          border: 'none',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Brut Annuel ({displayLevelName})
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#ffffff' }}>
              {grossTotal > 0 ? `${grossTotal.toLocaleString('fr-FR')} FCFA` : '—'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Frais d'inscription + scolarité</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Montant Net Annuel
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#38bdf8' }}>
              {netTotal > 0 ? `${netTotal.toLocaleString('fr-FR')} FCFA` : '—'}
            </h3>
            {discountAmount > 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
                Remise déduite: -{discountAmount.toLocaleString('fr-FR')} FCFA
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Aucune remise appliquée</span>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Montant Versé Immédiat
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#f59e0b' }}>
              {data.paidAmount > 0 ? `${data.paidAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Règlement lors de l'inscription</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Solde Restant Dû
            </span>
            <h3
              style={{
                margin: '4px 0 0',
                fontSize: '1.375rem',
                fontWeight: 900,
                color: grossTotal === 0 ? '#94a3b8' : (remainingBalance === 0 ? '#4ade80' : '#f87171'),
              }}
            >
              {grossTotal > 0 ? `${remainingBalance.toLocaleString('fr-FR')} FCFA` : '—'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: grossTotal === 0 ? '#94a3b8' : (remainingBalance === 0 ? '#4ade80' : '#fca5a5') }}>
              {grossTotal === 0 ? 'En attente de tarif' : (remainingBalance === 0 ? '✓ Intégralement Soldé' : 'Selon l\'échéancier')}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1 : TARIFS DE BASE DU NIVEAU & SÉLECTEUR DE NIVEAU ──────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={18} color="#2563eb" /> Tarifs Officiels Récupérés — {displayLevelName}
            </h5>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Montants synchronisés automatiquement avec la configuration des frais de scolarité
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={15} color="#2563eb" /> Niveau :
            </label>
            <select
              className="form-select form-select-sm"
              value={levelCode}
              onChange={(e) => handleLevelSelect(e.target.value)}
              style={{ fontWeight: 700, minWidth: 160, borderRadius: 8, padding: '4px 10px', fontSize: '0.8125rem' }}
            >
              {availableLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name} ({lvl.code})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange({ registrationFee: 0, tuitionFee: 0, canteenFee: 0, transportFee: 0, otherFees: 0, paidAmount: 0 })}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              title="Remettre tous les montants à 0"
            >
              Mettre à 0
            </button>
            {loadingTariffs && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Chargement...</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Droits d'Inscription (FCFA)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.registrationFee ? data.registrationFee : ''}
              onChange={(e) => onChange({ registrationFee: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Frais de Scolarité (FCFA)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.tuitionFee ? data.tuitionFee : ''}
              onChange={(e) => onChange({ tuitionFee: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Cantine (Optionnel)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.canteenFee ? data.canteenFee : ''}
              onChange={(e) => onChange({ canteenFee: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Transport (Optionnel)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.transportFee ? data.transportFee : ''}
              onChange={(e) => onChange({ transportFee: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 2 : REMISES & EXONÉRATIONS ────────────────────────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={18} color="#16a34a" /> Remises & Exonérations Accordées
        </h5>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 180px 1fr', gap: 14, alignItems: 'end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Type de Remise</label>
            <select
              className="form-select"
              value={data.discountType}
              onChange={(e) => onChange({ discountType: e.target.value as any, discountValue: 0 })}
            >
              <option value="FIXED">Montant Fixe (FCFA)</option>
              <option value="PERCENTAGE">Pourcentage (%)</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>
              Valeur ({data.discountType === 'FIXED' ? 'FCFA' : '%'})
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.discountValue ? data.discountValue : ''}
              onChange={(e) => onChange({ discountValue: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 700, color: '#16a34a' }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Motif / Justificatif de la Remise</label>
            <input
              type="text"
              className="form-input"
              placeholder="ex: Boursier, Enfant de personnel, Famille nombreuse..."
              value={data.discountReason || ''}
              onChange={(e) => onChange({ discountReason: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 3 : ÉCHÉANCIER PERSONNALISABLE DE RÈGLEMENT ───────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#0284c7" /> Échéancier de Règlement ({activeInstallments.length} {activeInstallments.length > 1 ? 'Échéances' : 'Échéance'})
            </h5>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Choisissez le nombre d'échéances ou ajustez manuellement les libellés, dates et montants.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Raccourcis nombre d'échéances */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '3px 6px', borderRadius: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: 4 }}>Nb :</span>
              {[1, 2, 3, 4, 6, 8, 10].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleSetInstallmentsCount(cnt)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeInstallments.length === cnt ? '#0284c7' : '#ffffff',
                    color: activeInstallments.length === cnt ? '#ffffff' : '#334155',
                    boxShadow: activeInstallments.length === cnt ? '0 2px 4px rgba(2, 132, 199, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {cnt === 1 ? '1x' : cnt === 3 ? '3x' : `${cnt}x`}
                </button>
              ))}
            </div>

            {/* Bouton Répartir */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDistributeEvenly}
              disabled={activeInstallments.length === 0}
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
              title="Répartir le montant net équitablement sur toutes les échéances"
            >
              ⚖️ Répartir
            </button>

            {/* Bouton Ajouter */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleAddInstallment}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Ajouter une échéance
            </button>
          </div>
        </div>

        {/* Tableau des échéances */}
        {activeInstallments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '0.875rem' }}>
              Aucune échéance configurée pour le moment.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleAddInstallment}
              style={{ fontWeight: 700, borderRadius: 8 }}
            >
              <Plus size={14} className="me-1" /> Ajouter une première échéance
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.875rem', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', width: 60 }}>N°</th>
                  <th style={{ padding: '10px 12px' }}>Libellé</th>
                  <th style={{ padding: '10px 12px', width: 170 }}>Date d'Échéance</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', width: 180 }}>Montant Dû (FCFA)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeInstallments.map((inst, idx) => (
                  <tr key={inst.number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                        }}
                      >
                        {inst.number}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={inst.label}
                        onChange={(e) => handleUpdateInstallment(idx, 'label', e.target.value)}
                        placeholder={`Échéance ${inst.number}`}
                        style={{ fontWeight: 600, fontSize: '0.8125rem', borderRadius: 6 }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={inst.dueDate}
                        onChange={(e) => handleUpdateInstallment(idx, 'dueDate', e.target.value)}
                        style={{ fontSize: '0.8125rem', borderRadius: 6 }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control form-control-sm text-end"
                        placeholder="0"
                        value={inst.amountDue ? inst.amountDue : ''}
                        onChange={(e) => handleUpdateInstallment(idx, 'amountDue', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                        style={{ width: 140, fontWeight: 700, marginLeft: 'auto', borderRadius: 6 }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteInstallment(idx)}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: 6,
                          color: '#dc2626',
                          width: 28,
                          height: 28,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.15s ease',
                        }}
                        title="Supprimer cette échéance"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                <tr>
                  <td colSpan={2} style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    {netTotal > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {difference === 0 ? (
                          <span style={{ fontSize: '0.78125rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Total échéances conforme au montant net
                          </span>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.78125rem', color: difference > 0 ? '#d97706' : '#dc2626', fontWeight: 700 }}>
                              {difference > 0 ? `Reste à allouer : ${difference.toLocaleString('fr-FR')} FCFA` : `Dépassement : ${Math.abs(difference).toLocaleString('fr-FR')} FCFA`}
                            </span>
                            <button
                              type="button"
                              onClick={handleAdjustOnLast}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                borderRadius: 6,
                                padding: '2px 8px',
                                fontSize: '0.71875rem',
                                fontWeight: 700,
                                color: '#0284c7',
                                cursor: 'pointer',
                              }}
                            >
                              Ajuster sur la dernière
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                    Total Échéancier :
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '0.9375rem' }}>
                    {installmentsSum > 0 ? `${installmentsSum.toLocaleString('fr-FR')} FCFA` : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 4 : VERSEMENT INITIAL LORS DE L'INSCRIPTION ────────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} color="#1d4ed8" /> Versement d'Inscription Immédiat (Acompte)
        </h5>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Montant Encaissé (FCFA)
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={data.paidAmount ? data.paidAmount : ''}
              onChange={(e) => onChange({ paidAmount: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1d4ed8' }}
            />
            {errors.paidAmount && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{errors.paidAmount}</span>}
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Mode de Règlement
            </label>
            <select
              className="form-select"
              value={data.paymentMode}
              onChange={(e) => onChange({ paymentMode: e.target.value as PaymentMode })}
              style={{ fontWeight: 700 }}
            >
              <option value="CASH">Espèces (Guichet)</option>
              <option value="WAVE">Wave Money</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="MTN_MONEY">MTN Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Référence / N° de Transaction
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="ex: WV-948201 / Réf. Transaction"
              value={data.paymentReference}
              onChange={(e) => onChange({ paymentReference: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
