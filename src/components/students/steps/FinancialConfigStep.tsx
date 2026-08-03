// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 3 : Configuration Financière & Échéancier
// Assistant d'Inscription Unifié (src/components/students/steps/FinancialConfigStep.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Calendar, CreditCard, ShieldAlert, Award, ArrowRight, Clock, Plus, Trash2 } from 'lucide-react';
import { tuitionFeesService } from '../../../services/finance/tuitionFeesService';
import { PaymentMode, TuitionFeeSchedule } from '../../../services/finance/types';

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
  schoolYear?: string;
  errors: Record<string, string>;
}

export const FinancialConfigStep: React.FC<Props> = ({
  data,
  onChange,
  levelCode = 'CP1',
  schoolYear = '2024-2025',
  errors,
}) => {
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [tariffSchedule, setTariffSchedule] = useState<TuitionFeeSchedule | null>(null);

  // Chargement automatique de la grille tarifaire configurée
  useEffect(() => {
    setLoadingTariffs(true);
    tuitionFeesService.getSchedulesByYear(schoolYear).then((schedules) => {
      const match = schedules.find((s) => s.levelCode === levelCode);
      if (match) {
        setTariffSchedule(match);
        onChange({
          registrationFee: match.registrationFee,
          tuitionFee: match.tuitionFee,
        });
      } else {
        setTariffSchedule(null);
      }
      setLoadingTariffs(false);
    });
  }, [levelCode, schoolYear]);

  // Calculs financiers automatiques
  const grossTotal = data.registrationFee + data.tuitionFee + data.canteenFee + data.transportFee + data.otherFees;
  const discountAmount =
    data.discountType === 'FIXED'
      ? data.discountValue
      : Math.round((data.tuitionFee * data.discountValue) / 100);

  const netTotal = Math.max(0, grossTotal - discountAmount);
  const remainingBalance = Math.max(0, netTotal - data.paidAmount);

  // Génération automatique des 8 échéances par défaut si non personnalisées
  const generateDefaultInstallments = (): InstallmentItem[] => {
    if (netTotal <= 0) return [];
    const count = 8;
    const baseAmount = Math.floor(netTotal / count);
    const remainder = netTotal - baseAmount * count;

    const currentYear = new Date().getFullYear();
    const months = ['10', '11', '12', '01', '02', '03', '04', '05'];

    return Array.from({ length: count }, (_, i) => {
      const yr = i >= 3 ? currentYear + 1 : currentYear;
      const amount = i === 0 ? baseAmount + remainder : baseAmount;
      return {
        number: i + 1,
        label: `Échéance ${i + 1}`,
        dueDate: `${yr}-${months[i]}-05`,
        amountDue: amount,
      };
    });
  };

  const activeInstallments = data.customInstallments || generateDefaultInstallments();

  // Mise à jour d'une échéance personnalisée
  const handleUpdateInstallment = (index: number, field: 'dueDate' | 'amountDue', value: any) => {
    const copy = [...activeInstallments];
    copy[index] = { ...copy[index], [field]: value };
    onChange({ customInstallments: copy });
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
              Brut Annuel ({levelCode})
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#ffffff' }}>
              {grossTotal.toLocaleString('fr-FR')} FCFA
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Frais d'inscription + scolarité</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Montant Net Annuel
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#38bdf8' }}>
              {netTotal.toLocaleString('fr-FR')} FCFA
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
              {data.paidAmount.toLocaleString('fr-FR')} FCFA
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
                color: remainingBalance === 0 ? '#4ade80' : '#f87171',
              }}
            >
              {remainingBalance.toLocaleString('fr-FR')} FCFA
            </h3>
            <span style={{ fontSize: '0.75rem', color: remainingBalance === 0 ? '#4ade80' : '#fca5a5' }}>
              {remainingBalance === 0 ? '✓ Intégralement Soldé' : 'Selon l\'échéancier'}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1 : TARIFS DE BASE DU NIVEAU ───────────────────────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={18} color="#2563eb" /> Tarifs Officiels Récupérés ({levelCode})
          </h5>
          {loadingTariffs && <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Chargement des tarifs...</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Droits d'Inscription (FCFA)</label>
            <input
              type="number"
              className="form-input"
              value={data.registrationFee}
              onChange={(e) => onChange({ registrationFee: Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Frais de Scolarité (FCFA)</label>
            <input
              type="number"
              className="form-input"
              value={data.tuitionFee}
              onChange={(e) => onChange({ tuitionFee: Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Cantine (Optionnel)</label>
            <input
              type="number"
              className="form-input"
              value={data.canteenFee}
              onChange={(e) => onChange({ canteenFee: Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Transport (Optionnel)</label>
            <input
              type="number"
              className="form-input"
              value={data.transportFee}
              onChange={(e) => onChange({ transportFee: Math.max(0, Number(e.target.value)) })}
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
              value={data.discountValue}
              onChange={(e) => onChange({ discountValue: Math.max(0, Number(e.target.value)) })}
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

      {/* ── SECTION 3 : ÉCHÉANCIER AUTOMATIQUE DE RÈGLEMENT ───────────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#0284c7" /> Échéancier de Règlement Automatique ({activeInstallments.length} Échéances)
            </h5>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Le montant net est découpé automatiquement. Vous pouvez ajuster les dates et montants d'échéances.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                <th style={{ padding: '8px 12px' }}>N°</th>
                <th style={{ padding: '8px 12px' }}>Libellé</th>
                <th style={{ padding: '8px 12px' }}>Date d'Échéance</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Montant Dû (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {activeInstallments.map((inst, idx) => (
                <tr key={inst.number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0284c7' }}>N° {inst.number}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{inst.label}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={inst.dueDate}
                      onChange={(e) => handleUpdateInstallment(idx, 'dueDate', e.target.value)}
                      style={{ width: 160 }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <input
                      type="number"
                      className="form-control form-control-sm text-end"
                      value={inst.amountDue}
                      onChange={(e) => handleUpdateInstallment(idx, 'amountDue', Math.max(0, Number(e.target.value)))}
                      style={{ width: 140, fontWeight: 700, marginLeft: 'auto' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 4 : VERSEMENT INITIAL LORS DE L'INSCRIPTION ────────────── */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} color="#1d4ed8" /> Versement d'Inscription Immédiat (Acompte)
        </h5>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Montant Encaissé (FCFA) *
            </label>
            <input
              type="number"
              className="form-input"
              value={data.paidAmount}
              onChange={(e) => onChange({ paidAmount: Math.max(0, Number(e.target.value)) })}
              style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1d4ed8' }}
            />
            {errors.paidAmount && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{errors.paidAmount}</span>}
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Mode de Règlement *
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
              <option value="TRANSFER">Virement Bancaire</option>
              <option value="CHECK">Chèque Bancaire</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#1e40af' }}>
              Référence / N° de Transaction
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="ex: WV-948201 / N° Chèque"
              value={data.paymentReference}
              onChange={(e) => onChange({ paymentReference: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
